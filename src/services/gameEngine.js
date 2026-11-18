const { POKEMON_LIST, RARITY_CONFIG } = require('../data/pokemon');
const { POKEBALLS, SPECIAL_ITEMS } = require('../data/items');
const db = require('./database');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class GameEngine {
  constructor() {
    // Mapa de guildId -> spawn ativo
    this.activeSpawns = new Map();
  }

  /**
   * Sorteia um Pokémon selvagem baseado nos pesos de raridade
   */
  rollWildPokemon() {
    const entries = Object.entries(RARITY_CONFIG);
    const totalWeight = entries.reduce((acc, [, cfg]) => acc + cfg.weight, 0);
    let roll = Math.random() * totalWeight;

    let selectedRarity = 'Comum';
    for (const [rarity, cfg] of entries) {
      if (roll < cfg.weight) {
        selectedRarity = rarity;
        break;
      }
      roll -= cfg.weight;
    }

    const pool = POKEMON_LIST.filter((p) => p.rarity === selectedRarity);
    const basePokemon = pool[Math.floor(Math.random() * pool.length)] || POKEMON_LIST[0];
    const rarityInfo = RARITY_CONFIG[basePokemon.rarity];

    // Chance de 1 em 64 de ser SHINY no spawn global
    const isShiny = Math.random() < 1 / 64;
    const [minCp, maxCp] = rarityInfo.cpRange;
    let cp = randomInt(minCp, maxCp);
    if (isShiny) {
      cp = Math.round(cp * 1.25); // Shinies vêm com +25% de CP!
    }

    return {
      ...basePokemon,
      isShiny,
      cp,
      rarityInfo,
      displaySprite: isShiny ? basePokemon.shinySprite : basePokemon.sprite
    };
  }

  /**
   * Cria um novo spawn ativo para o servidor
   */
  createSpawn(guildId, channelId, durationSeconds = 90) {
    const existing = this.activeSpawns.get(guildId);
    if (existing && existing.timeout) {
      clearTimeout(existing.timeout);
    }

    const pokemon = this.rollWildPokemon();
    const now = Date.now();
    const spawn = {
      guildId,
      channelId,
      pokemon,
      spawnedAt: now,
      expiresAt: now + durationSeconds * 1000,
      attemptedBy: new Set(), // userId de quem já jogou bola neste spawn
      caughtBy: [], // nomes de quem conseguiu capturar
      messageId: null,
      timeout: null
    };

    this.activeSpawns.set(guildId, spawn);

    const guildData = db.getGuild(guildId);
    guildData.totalSpawns = (guildData.totalSpawns || 0) + 1;
    db.save();

    return spawn;
  }

  getActiveSpawn(guildId) {
    const spawn = this.activeSpawns.get(guildId);
    if (!spawn) return null;
    if (Date.now() > spawn.expiresAt) {
      this.activeSpawns.delete(guildId);
      return null;
    }
    return spawn;
  }

  clearSpawn(guildId) {
    const spawn = this.activeSpawns.get(guildId);
    if (spawn && spawn.timeout) {
      clearTimeout(spawn.timeout);
    }
    this.activeSpawns.delete(guildId);
  }

  /**
   * Executa a tentativa de captura de um jogador (!pokecatch)
   */
  attemptCatch(guildId, userId, username, ballInput = 'pokeball') {
    const spawn = this.getActiveSpawn(guildId);
    if (!spawn) {
      return {
        ok: false,
        reason: 'NO_SPAWN',
        message: '🌿 Não há nenhum Pokémon selvagem por perto agora! Aguarde o próximo aparecer (ou use `!pokespawn` se tiver Incenso).'
      };
    }

    if (spawn.attemptedBy.has(userId)) {
      return {
        ok: false,
        reason: 'ALREADY_TRIED',
        message: `⏳ **${username}**, você já lançou uma Pokébola neste **${spawn.pokemon.name}**! Cada treinador tem **1 tentativa** por aparição.`
      };
    }

    const user = db.getUser(userId, username);
    const ball = POKEBALLS[ballInput] || POKEBALLS.pokeball;

    // Verifica se o jogador possui a bola escolhida (Poké Ball comum é sempre gratuita)
    if (ball.id !== 'pokeball') {
      const owned = user.balls[ball.id] || 0;
      if (owned <= 0) {
        return {
          ok: false,
          reason: 'NO_BALL',
          message: `🎒 Você não tem nenhuma **${ball.emoji} ${ball.name}** na mochila! Use \`!pokecatch\` para jogar uma Poké Ball gratuita ou compre mais em \`!pokeshop\`.`
        };
      }
      user.balls[ball.id] -= 1;
    }

    // Registra a tentativa
    spawn.attemptedBy.add(userId);
    user.stats.throws += 1;

    const pkm = spawn.pokemon;

    // Cálculo de chance de captura
    let chance = pkm.catchRate * ball.multiplier;
    if (user.items?.shinycharm > 0) {
      chance += 0.15; // +15% com Shiny Charm
    }

    // Penalidade leve para CP muito alto dentro da faixa
    const [minCp, maxCp] = pkm.rarityInfo.cpRange;
    const cpFactor = Math.max(0, (pkm.cp - minCp) / Math.max(1, maxCp - minCp));
    chance = chance * (1 - cpFactor * 0.15);

    // Master Ball é sempre 100%
    const isCritical = ball.id !== 'masterball' && Math.random() < 0.06;
    if (ball.id === 'masterball' || isCritical) {
      chance = 1.0;
    } else {
      chance = Math.max(0.05, Math.min(0.95, chance));
    }

    // Se o jogador tiver Shiny Charm e o Pokémon não era shiny, tem 1/32 de chance extra de brilhar para ele!
    let personalShiny = pkm.isShiny;
    if (!personalShiny && user.items?.shinycharm > 0 && Math.random() < 1 / 32) {
      personalShiny = true;
    }

    const roll = Math.random();
    const caught = roll <= chance;

    if (caught) {
      user.stats.catches += 1;
      if (personalShiny) user.stats.shinies += 1;

      const isNewPokedex = !user.pokedex[pkm.id];
      if (!user.pokedex[pkm.id]) {
        user.pokedex[pkm.id] = {
          count: 0,
          shinyCount: 0,
          maxCp: 0
        };
      }
      user.pokedex[pkm.id].count += 1;
      if (personalShiny) user.pokedex[pkm.id].shinyCount += 1;
      if (pkm.cp > user.pokedex[pkm.id].maxCp) {
        user.pokedex[pkm.id].maxCp = pkm.cp;
      }

      // Adiciona à coleção do jogador
      user.pokemons.push({
        uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        id: pkm.id,
        name: pkm.name,
        cp: pkm.cp,
        isShiny: personalShiny,
        rarity: pkm.rarity,
        ballUsed: ball.id,
        caughtAt: Date.now()
      });

      // Recompensas de captura
      const [minCoins, maxCoins] = pkm.rarityInfo.coinsReward;
      let coinsEarned = randomInt(minCoins, maxCoins);
      const bonuses = [];

      if (isNewPokedex) {
        coinsEarned += 100;
        bonuses.push('📖 **Novo na Pokédex!** (+100 💰)');
      }
      if (personalShiny) {
        coinsEarned += 500;
        bonuses.push('✨ **Bônus SHINY!** (+500 💰)');
      }
      if (isCritical) {
        coinsEarned += 50;
        bonuses.push('⚡ **Captura Crítica!** (+50 💰)');
      }

      user.coins += coinsEarned;
      user.xp += 50;
      spawn.caughtBy.push({ username, isShiny: personalShiny, ballEmoji: ball.emoji });

      db.save();

      return {
        ok: true,
        caught: true,
        isCritical,
        isNewPokedex,
        personalShiny,
        ball,
        pokemon: pkm,
        coinsEarned,
        bonuses,
        chancePercent: Math.round(chance * 100),
        user
      };
    } else {
      // Escapou da Pokébola, mas ganha consolação por participar!
      user.stats.fled += 1;
      const consolationCoins = 15;
      user.coins += consolationCoins;
      user.xp += 10;
      db.save();

      const shakes = roll < chance * 1.3 ? 3 : roll < chance * 1.7 ? 2 : 1;

      return {
        ok: true,
        caught: false,
        shakes,
        ball,
        pokemon: pkm,
        consolationCoins,
        chancePercent: Math.round(chance * 100),
        user
      };
    }
  }

  /**
   * Recompensa diária (!pokedaily)
   */
  claimDaily(userId, username) {
    const user = db.getUser(userId, username);
    const now = Date.now();
    const COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 horas
    const STREAK_LIMIT_MS = 48 * 60 * 60 * 1000; // 48 horas

    const elapsed = now - (user.daily.lastClaim || 0);
    if (elapsed < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - elapsed;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        ok: false,
        hours,
        minutes
      };
    }

    if (user.daily.lastClaim && elapsed <= STREAK_LIMIT_MS) {
      user.daily.streak += 1;
    } else {
      user.daily.streak = 1;
    }
    user.daily.lastClaim = now;

    const streakBonus = Math.min(500, (user.daily.streak - 1) * 50);
    const coinsWon = 300 + streakBonus;
    const greatBallsWon = randomInt(2, 4);
    const ultraBallsWon = Math.random() < 0.5 ? randomInt(1, 2) : 0;

    user.coins += coinsWon;
    user.balls.greatball = (user.balls.greatball || 0) + greatBallsWon;
    if (ultraBallsWon > 0) {
      user.balls.ultraball = (user.balls.ultraball || 0) + ultraBallsWon;
    }

    db.save();

    return {
      ok: true,
      streak: user.daily.streak,
      coinsWon,
      greatBallsWon,
      ultraBallsWon,
      totalCoins: user.coins
    };
  }

  /**
   * Vende Pokémon repetidos não-shiny mantendo o de maior CP de cada espécie
   */
  sellDuplicates(userId, username) {
    const user = db.getUser(userId, username);
    if (!user.pokemons || user.pokemons.length === 0) {
      return { soldCount: 0, coinsEarned: 0 };
    }

    // Agrupa por ID de Pokémon
    const bestBySpecies = new Map();
    for (const p of user.pokemons) {
      if (p.isShiny) continue; // Nunca vende Shiny no automático!
      const currentBest = bestBySpecies.get(p.id);
      if (!currentBest || p.cp > currentBest.cp) {
        bestBySpecies.set(p.id, p);
      }
    }

    const keptPokemons = [];
    let soldCount = 0;
    let coinsEarned = 0;

    for (const p of user.pokemons) {
      if (p.isShiny) {
        keptPokemons.push(p);
        continue;
      }
      const best = bestBySpecies.get(p.id);
      if (best && best.uid === p.uid) {
        keptPokemons.push(p);
      } else {
        soldCount += 1;
        const rarityCfg = RARITY_CONFIG[p.rarity] || RARITY_CONFIG.Comum;
        coinsEarned += rarityCfg.sellValue;
      }
    }

    if (soldCount > 0) {
      user.pokemons = keptPokemons;
      user.coins += coinsEarned;
      db.save();
    }

    return { soldCount, coinsEarned, totalCoins: user.coins };
  }
}

module.exports = new GameEngine();
