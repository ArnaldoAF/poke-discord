require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');

const { POKEMON_LIST, RARITY_CONFIG, findPokemonByQuery, getPokemonById } = require('./data/pokemon');
const { POKEBALLS, SPECIAL_ITEMS, resolveBall, resolveShopItem } = require('./data/items');
const db = require('./services/database');
const game = require('./services/gameEngine');

const PREFIX = process.env.COMMAND_PREFIX || '!';
const SPAWN_DURATION_SEC = Number(process.env.SPAWN_DURATION_SECONDS) || 90;

// Validação amigável do Token antes de iniciar
const token = (process.env.DISCORD_TOKEN || '').trim();
if (!token || token === 'COLE_SEU_TOKEN_AQUI') {
  console.log('\n================================================================');
  console.log('⚠️  ATENÇÃO: O TOKEN DO BOT AINDA NÃO FOI CONFIGURADO!');
  console.log('================================================================');
  console.log('Para colocar seu bot online:');
  console.log('1. Dê dois cliques no arquivo "1_CONFIGURAR_BOT.bat"');
  console.log('   (ou abra o arquivo ".env" no Bloco de Notas e cole seu Token).');
  console.log('2. Depois, execute "2_INICIAR_BOT.bat" ou rode "npm start".');
  console.log('================================================================\n');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Controle do último spawn automático por servidor
const lastAutoSpawnMap = new Map();

/**
 * Monta os botões interativos do card de Spawn
 */
function buildSpawnButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('catch_pokeball')
      .setLabel('Poké Ball (Grátis)')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('catch_greatball')
      .setLabel('Great Ball')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('catch_ultraball')
      .setLabel('Ultra Ball')
      .setEmoji('🟡')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('pokecheck_current')
      .setLabel('PokéCheck')
      .setEmoji('🔍')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

/**
 * Faz aparecer um Pokémon selvagem em um canal
 */
async function triggerSpawnInChannel(channel, triggeredByText = 'Um Pokémon selvagem apareceu!') {
  const guildId = channel.guild.id;
  const spawn = game.createSpawn(guildId, channel.id, SPAWN_DURATION_SEC);
  const pkm = spawn.pokemon;

  const titlePrefix = pkm.isShiny ? '✨ UM POKÉMON SHINY SELVAGEM APARECEU! ✨' : `🌿 ${triggeredByText}`;
  const embed = new EmbedBuilder()
    .setColor(pkm.isShiny ? 0xffd700 : pkm.rarityInfo.color)
    .setTitle(titlePrefix)
    .setDescription(
      `Um **${pkm.isShiny ? '✨ Shiny ' : ''}${pkm.name}** (#${String(pkm.id).padStart(3, '0')}) surgiu no chat!\n\n` +
      `🏷️ **Raridade:** ${pkm.rarityInfo.badge}\n` +
      `🧬 **Tipo:** ${pkm.types.join(' / ')}\n` +
      `⚔️ **Poder (CP):** \`${pkm.cp} CP\`\n` +
      `⏱️ **Foge em:** \`${SPAWN_DURATION_SEC} segundos\`\n\n` +
      `🎯 **Como capturar pelo chat (estilo Twitch):**\n` +
      `• Digite \`${PREFIX}pokecatch\` *(ou \`${PREFIX}pokecatch greatball\` / \`ultraball\`)*\n` +
      `• Digite \`${PREFIX}pokecheck\` para ver se você já tem na Pokédex\n` +
      `• *Ou clique nos botões abaixo!*`
    )
    .setImage(pkm.displaySprite)
    .setFooter({ text: `Cada treinador tem 1 tentativa de captura! • Use ${PREFIX}pokehelp para ver todos os comandos` })
    .setTimestamp();

  const sentMsg = await channel.send({
    embeds: [embed],
    components: [buildSpawnButtons(false)]
  });

  spawn.messageId = sentMsg.id;

  // Timer para quando o tempo de captura acabar
  spawn.timeout = setTimeout(async () => {
    const current = game.activeSpawns.get(guildId);
    if (!current || current.messageId !== sentMsg.id) return;

    game.activeSpawns.delete(guildId);

    const caughtList =
      current.caughtBy.length > 0
        ? current.caughtBy.map((c) => `${c.ballEmoji} **${c.username}**${c.isShiny ? ' ✨' : ''}`).join(', ')
        : 'Ninguém conseguiu capturar desta vez!';

    const expiredEmbed = EmbedBuilder.from(embed)
      .setColor(0x555555)
      .setTitle(`💨 O ${pkm.isShiny ? '✨ Shiny ' : ''}${pkm.name} selvagem foi embora!`)
      .setDescription(
        `O tempo de captura para **${pkm.name}** (\`${pkm.cp} CP\`) encerrou.\n\n` +
        `🏆 **Treinadores que capturaram (${current.caughtBy.length}):**\n${caughtList}`
      )
      .setFooter({ text: 'Aguarde o próximo Pokémon aparecer!' });

    try {
      await sentMsg.edit({
        embeds: [expiredEmbed],
        components: [buildSpawnButtons(true)]
      });
    } catch {
      // Ignora caso a mensagem tenha sido apagada
    }
  }, SPAWN_DURATION_SEC * 1000);
}

/**
 * Formata a resposta de tentativa de captura (!pokecatch ou botão)
 */
function buildCatchResultEmbed(result, username) {
  const { caught, ball, pokemon: pkm, chancePercent } = result;

  if (caught) {
    const bonusText = result.bonuses.length > 0 ? `\n${result.bonuses.join('\n')}` : '';
    return new EmbedBuilder()
      .setColor(result.personalShiny ? 0xffd700 : 0x2ecc71)
      .setTitle(`🎉 GOTCHA! ${username} capturou ${result.personalShiny ? '✨ Shiny ' : ''}${pkm.name}!`)
      .setThumbnail(result.personalShiny ? pkm.shinySprite : pkm.sprite)
      .setDescription(
        `${ball.emoji} Lançou **${ball.name}** *(Chance: ${chancePercent}%)*\n` +
        `⚔️ **Poder:** \`${pkm.cp} CP\` | 🏷️ ${pkm.rarityInfo.badge}\n` +
        `💰 **Recompensa:** \`+${result.coinsEarned} PokéCoins\` *(Saldo: ${result.user.coins} 💰)*` +
        bonusText
      );
  } else {
    const shakeDots = '🟢 '.repeat(result.shakes) + '💥';
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`💨 Quase! ${pkm.name} escapou da ${ball.name} de ${username}!`)
      .setDescription(
        `${ball.emoji} A Pokébola balançou ${result.shakes}x (${shakeDots}) e abriu! *(Chance era de ${chancePercent}%)*\n` +
        `🪙 Você recebeu **+${result.consolationCoins} PokéCoins** por tentar!`
      );
  }
}

/**
 * Monta o texto de PokéCheck para um usuário e Pokémon
 */
function buildPokeCheckText(user, targetPokemon) {
  const entry = user.pokedex[targetPokemon.id];
  const totalOwned = entry ? entry.count : 0;
  const shinyOwned = entry ? entry.shinyCount : 0;
  const maxCp = entry ? entry.maxCp : 0;

  if (totalOwned > 0) {
    return (
      `🔍 **PokéCheck — ${user.username}:**\n` +
      `✅ Você **JÁ POSSUI** **#${String(targetPokemon.id).padStart(3, '0')} ${targetPokemon.name}** na sua Pokédex!\n` +
      `📊 Capturados: \`${totalOwned}x\` | ✨ Shinies: \`${shinyOwned}x\` | ⚔️ Maior CP: \`${maxCp} CP\``
    );
  } else {
    return (
      `🔍 **PokéCheck — ${user.username}:**\n` +
      `❌ Você **AINDA NÃO TEM** **#${String(targetPokemon.id).padStart(3, '0')} ${targetPokemon.name}** registrado na sua Pokédex! Boa sorte!`
    );
  }
}

// ============================================================================
// EVENTOS DO DISCORD
// ============================================================================

client.once('ready', () => {
  console.log('\n================================================================');
  console.log(`✅ BOT ONLINE COM SUCESSO! Logado como: ${client.user.tag}`);
  console.log(`🎮 Prefixo de comandos: "${PREFIX}" (Ex: ${PREFIX}pokehelp, ${PREFIX}pokeset, ${PREFIX}pokecatch)`);
  console.log('================================================================\n');

  client.user.setActivity(`${PREFIX}pokecatch | ${PREFIX}pokehelp`, { type: 0 });

  // Loop de Spawn Automático (verifica a cada 20 segundos os servidores configurados)
  setInterval(async () => {
    const now = Date.now();
    for (const [guildId, guild] of client.guilds.cache) {
      const guildCfg = db.getGuild(guildId);
      if (!guildCfg.spawnChannelId) continue;

      const intervalMs = (guildCfg.spawnIntervalMinutes || 15) * 60 * 1000;
      const lastSpawn = lastAutoSpawnMap.get(guildId) || 0;

      if (now - lastSpawn >= intervalMs) {
        // Não cria novo spawn se já houver um ativo
        if (game.getActiveSpawn(guildId)) continue;

        lastAutoSpawnMap.set(guildId, now);
        try {
          const channel = await guild.channels.fetch(guildCfg.spawnChannelId);
          if (channel && channel.isTextBased()) {
            await triggerSpawnInChannel(channel, 'Um Pokémon selvagem apareceu!');
          }
        } catch (err) {
          console.error(`Erro ao gerar spawn no servidor ${guild.name}:`, err.message);
        }
      }
    }
  }, 20 * 1000);
});

// Interações com os botões embaixo do Pokémon
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId, guildId, user } = interaction;
  const username = interaction.member?.displayName || user.username;

  if (customId === 'pokecheck_current') {
    const spawn = game.getActiveSpawn(guildId);
    if (!spawn) {
      return interaction.reply({ content: '💨 Esse Pokémon já foi embora!', ephemeral: true });
    }
    const trainer = db.getUser(user.id, username);
    const checkMsg = buildPokeCheckText(trainer, spawn.pokemon);
    return interaction.reply({ content: checkMsg, ephemeral: true });
  }

  if (customId.startsWith('catch_')) {
    const ballKey = customId.replace('catch_', '');
    const result = game.attemptCatch(guildId, user.id, username, ballKey);

    if (!result.ok) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    const embed = buildCatchResultEmbed(result, username);
    return interaction.reply({ embeds: [embed] });
  }
});

// Comandos via linha de comando no chat (!pokecatch, !pokecheck, !pokeshop, etc.)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;
  const username = message.member?.displayName || message.author.username;
  const guildId = message.guild.id;

  // --------------------------------------------------------------------------
  // 1. !pokecatch [bola] — Tenta capturar o Pokémon selvagem atual
  // --------------------------------------------------------------------------
  if (['pokecatch', 'catch', 'capturar', 'c'].includes(command)) {
    const ballArg = args[0];
    let ball = POKEBALLS.pokeball;

    if (ballArg) {
      const resolved = resolveBall(ballArg);
      if (!resolved) {
        return message.reply(
          `❓ Pokébola **"${ballArg}"** não reconhecida! Opções válidas: \`pokeball\`, \`greatball\`, \`ultraball\`, \`masterball\`.`
        );
      }
      ball = resolved;
    }

    const result = game.attemptCatch(guildId, userId, username, ball.id);
    if (!result.ok) {
      return message.reply(result.message);
    }

    const embed = buildCatchResultEmbed(result, username);
    return message.reply({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // 2. !pokecheck [nome/id] — Verifica se você já tem o Pokémon na Pokédex
  // --------------------------------------------------------------------------
  if (['pokecheck', 'check'].includes(command)) {
    const user = db.getUser(userId, username);
    let targetPokemon = null;

    if (args.length > 0) {
      targetPokemon = findPokemonByQuery(args.join(' '));
      if (!targetPokemon) {
        return message.reply(`❓ Pokémon **"${args.join(' ')}"** não encontrado na Pokédex de Kanto (#001 a #151).`);
      }
    } else {
      const spawn = game.getActiveSpawn(guildId);
      if (!spawn) {
        return message.reply(
          `🌿 Não há Pokémon selvagem ativo no momento! Você também pode consultar qualquer Pokémon digitando \`${PREFIX}pokecheck pikachu\` ou \`${PREFIX}pokecheck 25\`.`
        );
      }
      targetPokemon = spawn.pokemon;
    }

    return message.reply(buildPokeCheckText(user, targetPokemon));
  }

  // --------------------------------------------------------------------------
  // 3. !pokedaily — Recompensa diária de PokéCoins e Pokébolas
  // --------------------------------------------------------------------------
  if (['pokedaily', 'daily', 'diario', 'diário', 'pokepass'].includes(command)) {
    const res = game.claimDaily(userId, username);
    if (!res.ok) {
      return message.reply(
        `⏳ **${username}**, você já resgatou seu kit diário hoje! Volte em **${res.hours}h ${res.minutes}min**.`
      );
    }

    const extraUltra = res.ultraBallsWon > 0 ? `\n🟡 **+${res.ultraBallsWon}x Ultra Ball**` : '';
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🎁 Recompensa Diária Resgatada — ${username}!`)
      .setDescription(
        `🔥 **Sequência Diária (Streak):** \`${res.streak} dia(s)\`\n\n` +
        `💰 **+${res.coinsWon} PokéCoins**\n` +
        `🔵 **+${res.greatBallsWon}x Great Ball**` +
        extraUltra +
        `\n\n🏦 **Saldo Atual:** \`${res.totalCoins} PokéCoins\``
      )
      .setFooter({ text: `Use ${PREFIX}pokeshop para gastar suas moedas!` });

    return message.reply({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // 4. !pokeshop — Loja de Pokébolas e Itens
  // --------------------------------------------------------------------------
  if (['pokeshop', 'shop', 'loja'].includes(command)) {
    const user = db.getUser(userId, username);

    const ballsDesc = Object.values(POKEBALLS)
      .filter((b) => b.buyable)
      .map((b) => `${b.emoji} **${b.name}** (\`${b.id}\`) — 💰 **${b.price} moedas**\n*${b.description}*`)
      .join('\n\n');

    const itemsDesc = Object.values(SPECIAL_ITEMS)
      .map((i) => `${i.emoji} **${i.name}** (\`${i.id}\`) — 💰 **${i.price} moedas**\n*${i.description}*`)
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🛒 PokéShop — Loja do Treinador')
      .setDescription(
        `Olá **${username}**! Seu saldo atual é de **💰 ${user.coins} PokéCoins**.\n` +
        `Para comprar, digite: \`${PREFIX}pokebuy <item> [quantidade]\`\n` +
        `*Exemplo: \`${PREFIX}pokebuy greatball 5\` ou \`${PREFIX}pokebuy incense 1\`*\n\n` +
        `### 🔴 Pokébolas Especiais\n*(Nota: A Poké Ball padrão é sempre grátis no \`${PREFIX}pokecatch\`!)*\n\n` +
        `${ballsDesc}\n\n` +
        `### ✨ Itens Especiais\n\n` +
        `${itemsDesc}`
      )
      .setFooter({ text: `Dica: Use ${PREFIX}pokesell para vender Pokémon repetidos ao Prof. Carvalho!` });

    return message.reply({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // 5. !pokebuy <item> [quantidade] — Compra itens na loja
  // --------------------------------------------------------------------------
  if (['pokebuy', 'buy', 'comprar'].includes(command)) {
    const itemInput = args[0];
    const qtyInput = args[1] ? parseInt(args[1], 10) : 1;

    if (!itemInput) {
      return message.reply(`🛒 Informe o que deseja comprar! Exemplo: \`${PREFIX}pokebuy greatball 3\`. Veja os itens em \`${PREFIX}pokeshop\`.`);
    }

    const shopItem = resolveShopItem(itemInput);
    if (!shopItem) {
      return message.reply(`❓ Item **"${itemInput}"** não encontrado na loja. Use \`${PREFIX}pokeshop\` para ver a lista.`);
    }

    const quantity = isNaN(qtyInput) || qtyInput < 1 ? 1 : Math.min(99, qtyInput);
    const user = db.getUser(userId, username);

    if (shopItem.maxOwned && (user.items[shopItem.id] || 0) >= shopItem.maxOwned) {
      return message.reply(`✨ Você já possui o item permanente **${shopItem.emoji} ${shopItem.name}**!`);
    }

    const finalQty = shopItem.maxOwned ? 1 : quantity;
    const totalCost = shopItem.price * finalQty;

    if (user.coins < totalCost) {
      return message.reply(
        `💸 Moedas insuficientes! **${finalQty}x ${shopItem.name}** custa **💰 ${totalCost} PokéCoins**, mas você tem **💰 ${user.coins}**.`
      );
    }

    user.coins -= totalCost;
    if (shopItem.category === 'ball') {
      user.balls[shopItem.id] = (user.balls[shopItem.id] || 0) + finalQty;
    } else {
      user.items[shopItem.id] = (user.items[shopItem.id] || 0) + finalQty;
    }

    db.save();

    return message.reply(
      `✅ **Compra realizada!** Você comprou **${finalQty}x ${shopItem.emoji} ${shopItem.name}** por **💰 ${totalCost} PokéCoins**! *(Saldo restante: 💰 ${user.coins})*`
    );
  }

  // --------------------------------------------------------------------------
  // 6. !pokeinv / !perfil — Inventário e Perfil do Treinador
  // --------------------------------------------------------------------------
  if (['pokeinv', 'inv', 'bag', 'mochila', 'perfil', 'profile'].includes(command)) {
    const user = db.getUser(userId, username);
    const uniqueCaught = Object.keys(user.pokedex).length;
    const completionPct = ((uniqueCaught / POKEMON_LIST.length) * 100).toFixed(1);
    const level = Math.floor(user.xp / 200) + 1;

    // Pokémon mais forte do treinador
    const strongest =
      user.pokemons.length > 0
        ? [...user.pokemons].sort((a, b) => b.cp - a.cp)[0]
        : null;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🎒 Perfil & Mochila de ${username}`)
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        {
          name: '🏅 Estatísticas de Treinador',
          value:
            `⭐ **Nível:** \`${level}\` (\`${user.xp} XP\`)\n` +
            `💰 **PokéCoins:** \`${user.coins}\`\n` +
            `📖 **Pokédex Kanto:** \`${uniqueCaught} / ${POKEMON_LIST.length}\` (${completionPct}%)\n` +
            `🎯 **Capturas Totais:** \`${user.stats.catches}\` | ✨ **Shinies:** \`${user.stats.shinies}\``,
          inline: false
        },
        {
          name: '🔴 Suas Pokébolas',
          value:
            `🔴 **Poké Ball:** \`Infinitas\`\n` +
            `🔵 **Great Ball:** \`${user.balls.greatball || 0}x\`\n` +
            `🟡 **Ultra Ball:** \`${user.balls.ultraball || 0}x\`\n` +
            `🟣 **Master Ball:** \`${user.balls.masterball || 0}x\``,
          inline: true
        },
        {
          name: '✨ Itens Especiais',
          value:
            `🌸 **Incenso Selvagem:** \`${user.items?.incense || 0}x\`\n` +
            `✨ **Shiny Charm:** \`${user.items?.shinycharm ? 'Ativo ✅' : 'Não possui'}\``,
          inline: true
        }
      );

    if (strongest) {
      const pkmInfo = getPokemonById(strongest.id);
      embed.addFields({
        name: '👑 Seu Pokémon Mais Forte',
        value: `**${strongest.isShiny ? '✨ Shiny ' : ''}${strongest.name}** — \`${strongest.cp} CP\` (${strongest.rarity})`,
        inline: false
      });
      if (pkmInfo) {
        embed.setThumbnail(strongest.isShiny ? pkmInfo.shinySprite : pkmInfo.sprite);
      }
    }

    return message.reply({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // 7. !pokedex [pagina] — Lista seus Pokémon e progresso da Pokédex
  // --------------------------------------------------------------------------
  if (['pokedex', 'dex', 'pc', 'meuspokemons'].includes(command)) {
    const user = db.getUser(userId, username);
    const uniqueCount = Object.keys(user.pokedex).length;

    if (user.pokemons.length === 0) {
      return message.reply(
        `📖 **${username}**, você ainda não capturou nenhum Pokémon! Use \`${PREFIX}pokecatch\` quando um Pokémon aparecer no chat.`
      );
    }

    const sorted = [...user.pokemons].sort((a, b) => b.cp - a.cp);
    const pageSize = 10;
    const totalPages = Math.ceil(sorted.length / pageSize);
    const page = Math.max(1, Math.min(totalPages, parseInt(args[0], 10) || 1));
    const slice = sorted.slice((page - 1) * pageSize, page * pageSize);

    const listText = slice
      .map((p, idx) => {
        const rank = (page - 1) * pageSize + idx + 1;
        const rarityBadge = RARITY_CONFIG[p.rarity]?.badge.split(' ')[0] || '⚪';
        return `\`${rank}.\` ${rarityBadge} **#${String(p.id).padStart(3, '0')} ${p.isShiny ? '✨ Shiny ' : ''}${p.name}** — \`${p.cp} CP\``;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`📖 Pokédex & PC de ${username}`)
      .setDescription(
        `📊 **Espécies Únicas (Kanto):** \`${uniqueCount} / ${POKEMON_LIST.length}\`\n` +
        `📦 **Total no PC:** \`${user.pokemons.length} Pokémon\` | ✨ **Shinies:** \`${user.stats.shinies}\`\n\n` +
        `### ⚔️ Seus Pokémon (Ordenados por CP):\n${listText}`
      )
      .setFooter({
        text: `Página ${page} de ${totalPages} • Use ${PREFIX}pokedex <página> ou ${PREFIX}pokesell para vender repetidos`
      });

    return message.reply({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // 8. !pokesell — Transfere Pokémon repetidos em troca de PokéCoins
  // --------------------------------------------------------------------------
  if (['pokesell', 'sell', 'vender', 'transferir'].includes(command)) {
    const res = game.sellDuplicates(userId, username);
    if (res.soldCount === 0) {
      return message.reply(
        `👨‍🔬 **Prof. Carvalho:** *"Olá **${username}**! Você não tem nenhum Pokémon repetido (não-shiny) para transferir agora!"*`
      );
    }

    return message.reply(
      `👨‍🔬 **Prof. Carvalho:** *"Obrigado pela pesquisa, **${username}**! Transferi **${res.soldCount} Pokémon repetidos** (mantendo sempre o seu de maior CP e todos os seus Shinies) e te enviei **💰 +${res.coinsEarned} PokéCoins**! (Saldo atual: 💰 ${res.totalCoins})"*`
    );
  }

  // --------------------------------------------------------------------------
  // 9. !pokerank — Ranking dos melhores treinadores
  // --------------------------------------------------------------------------
  if (['pokerank', 'rank', 'ranking', 'top', 'leaderboard'].includes(command)) {
    const allUsers = db.getAllUsers();
    if (allUsers.length === 0) {
      return message.reply('🏆 Ainda não há treinadores registrados no ranking!');
    }

    const ranked = allUsers
      .map((u) => ({
        username: u.username,
        uniqueDex: Object.keys(u.pokedex || {}).length,
        totalCatches: u.stats?.catches || 0,
        shinies: u.stats?.shinies || 0,
        coins: u.coins || 0
      }))
      .sort((a, b) => b.uniqueDex - a.uniqueDex || b.totalCatches - a.totalCatches)
      .slice(0, 10);

    const medals = ['🥇', '🥈', '🥉'];
    const lines = ranked.map((u, i) => {
      const prefix = medals[i] || `\`#${i + 1}\``;
      return `${prefix} **${u.username}** — 📖 Dex: \`${u.uniqueDex}/151\` | 🎯 Capturas: \`${u.totalCatches}\` | ✨ Shinies: \`${u.shinies}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏆 Ranking da Liga Pokémon do Servidor')
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Classificado por progresso na Pokédex de Kanto e total de capturas' });

    return message.reply({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // 10. !pokespawn — Invoca um Pokémon imediatamente (Admin ou com Incenso)
  // --------------------------------------------------------------------------
  if (['pokespawn', 'spawn'].includes(command)) {
    if (game.getActiveSpawn(guildId)) {
      return message.reply(`⚠️ Já existe um Pokémon selvagem ativo neste servidor! Use \`${PREFIX}pokecatch\` para capturá-lo!`);
    }

    const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);
    const user = db.getUser(userId, username);

    if (!isAdmin) {
      if ((user.items?.incense || 0) <= 0) {
        return message.reply(
          `🌸 Você precisa de um **Incenso Selvagem** para atrair um Pokémon manualmente (ou ser Administrador do servidor)! Compre um em \`${PREFIX}pokeshop\`.`
        );
      }
      user.items.incense -= 1;
      db.save();
    }

    const label = isAdmin
      ? `Um Pokémon selvagem foi invocado por ${username}!`
      : `🌸 ${username} usou um Incenso Selvagem e atraiu um Pokémon!`;

    await triggerSpawnInChannel(message.channel, label);
    return;
  }

  // --------------------------------------------------------------------------
  // 11. !pokeset [minutos] — Configura o canal atual para spawns automáticos
  // --------------------------------------------------------------------------
  if (['pokeset', 'setchannel', 'config'].includes(command)) {
    const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);
    if (!isAdmin) {
      return message.reply('🔒 Apenas administradores do servidor podem configurar o canal de spawns automáticos.');
    }

    const minutesArg = args[0] ? parseInt(args[0], 10) : undefined;
    const guildCfg = db.setGuildSpawnChannel(guildId, message.channel.id, minutesArg);
    lastAutoSpawnMap.set(guildId, Date.now());

    await message.reply(
      `✅ **Canal configurado com sucesso!**\n` +
      `📍 Os Pokémon selvagens aparecerão automaticamente em <#${message.channel.id}> a cada **${guildCfg.spawnIntervalMinutes} minuto(s)**.\n` +
      `💡 *Para alterar o intervalo, digite \`${PREFIX}pokeset <minutos>\` (ex: \`${PREFIX}pokeset 5\`).*\n` +
      `🎉 **Gerando o primeiro Pokémon de boas-vindas agora mesmo...**`
    );

    await triggerSpawnInChannel(message.channel, 'Primeiro Pokémon selvagem do canal!');
    return;
  }

  // --------------------------------------------------------------------------
  // 12. !pokehelp — Lista completa de comandos
  // --------------------------------------------------------------------------
  if (['pokehelp', 'ajuda', 'comandos', 'pokemon', 'help'].includes(command)) {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🎮 Pokémon Community Game — Guia de Comandos')
      .setDescription(
        `Capture Pokémon selvagens que aparecem no chat, complete os **151 Pokémon de Kanto** e colecione **Shinies**!\n\n` +
        `### 🎯 Comandos de Captura\n` +
        `• \`${PREFIX}pokecatch\` — Lança uma Poké Ball gratuita no Pokémon atual\n` +
        `• \`${PREFIX}pokecatch greatball\` *(ou \`ultraball\` / \`masterball\`)* — Usa uma bola melhor\n` +
        `• \`${PREFIX}pokecheck [nome/id]\` — Verifica se você já tem o Pokémon na Pokédex\n\n` +
        `### 🎒 Treinador & Economia\n` +
        `• \`${PREFIX}pokedaily\` — Resgata PokéCoins e Pokébolas grátis todos os dias\n` +
        `• \`${PREFIX}pokeshop\` — Abre a loja de Pokébolas e itens especiais\n` +
        `• \`${PREFIX}pokebuy <item> [qtd]\` — Compra itens na loja\n` +
        `• \`${PREFIX}pokeinv\` — Mostra sua mochila, moedas e estatísticas\n` +
        `• \`${PREFIX}pokedex [página]\` — Mostra seus Pokémon capturados e maiores CPs\n` +
        `• \`${PREFIX}pokesell\` — Transfere Pokémon repetidos ao Prof. Carvalho por moedas\n` +
        `• \`${PREFIX}pokerank\` — Ranking dos melhores treinadores do servidor\n\n` +
        `### ⚙️ Administração & Spawns\n` +
        `• \`${PREFIX}pokeset [minutos]\` — *(Admin)* Define este canal para spawns automáticos\n` +
        `• \`${PREFIX}pokespawn\` — Faz aparecer um Pokémon agora mesmo *(Admin ou usando Incenso)*`
      )
      .setFooter({ text: 'Você também pode usar os botões interativos embaixo de cada Pokémon!' });

    return message.reply({ embeds: [embed] });
  }
});

client.login(token).catch((err) => {
  console.error('\n================================================================');
  console.error('❌ ERRO AO CONECTAR O BOT NO DISCORD:', err.message);
  console.error('================================================================');
  if (err.message.includes('Used disallowed intents') || err.message.includes('Privileged intent')) {
    console.error('⚠️  FALTA ATIVAR O "MESSAGE CONTENT INTENT" NO PAINEL DO DISCORD!');
    console.error('Como resolver em 30 segundos:');
    console.error('1. Acesse https://discord.com/developers/applications');
    console.error('2. Clique no seu aplicativo e vá no menu lateral "Bot"');
    console.error('3. Role até "Privileged Gateway Intents"');
    console.error('4. Ative a chave "MESSAGE CONTENT INTENT" e clique em "Save Changes"!');
  } else if (err.message.includes('An invalid token was provided')) {
    console.error('⚠️  O Token colado no arquivo .env é inválido.');
    console.error('Execute "1_CONFIGURAR_BOT.bat" novamente e cole o Token correto da aba "Bot" do Discord.');
  }
  console.error('================================================================\n');
  process.exit(1);
});
