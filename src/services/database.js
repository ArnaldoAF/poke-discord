const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');
const BACKUP_PATH = path.join(DATA_DIR, 'database.backup.json');

const DEFAULT_DB = {
  users: {},
  guilds: {}
};

class Database {
  constructor() {
    this.data = { users: {}, guilds: {} };
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = {};
        if (!this.data.guilds) this.data.guilds = {};
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
        this.save();
      }
    } catch (err) {
      console.error('⚠️ Erro ao carregar banco de dados, tentando backup...', err.message);
      if (fs.existsSync(BACKUP_PATH)) {
        const rawBackup = fs.readFileSync(BACKUP_PATH, 'utf8');
        this.data = JSON.parse(rawBackup);
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
      }
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const json = JSON.stringify(this.data, null, 2);
      if (fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, BACKUP_PATH);
      }
      fs.writeFileSync(DB_PATH, json, 'utf8');
    } catch (err) {
      console.error('❌ Erro ao salvar banco de dados:', err.message);
    }
  }

  getUser(userId, username = 'Treinador') {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        id: userId,
        username,
        coins: 500, // Kit inicial de boas-vindas!
        xp: 0,
        balls: {
          greatball: 5,
          ultraball: 2,
          masterball: 0
        },
        items: {
          incense: 1,
          shinycharm: 0
        },
        pokemons: [], // Lista de capturas: { uid, id, name, cp, isShiny, rarity, caughtAt, ballUsed }
        pokedex: {}, // { [pokemonId]: { count, shinyCount, maxCp } }
        stats: {
          throws: 0,
          catches: 0,
          shinies: 0,
          fled: 0
        },
        daily: {
          lastClaim: 0,
          streak: 0
        },
        createdAt: Date.now()
      };
      this.save();
    } else if (username && this.data.users[userId].username !== username) {
      this.data.users[userId].username = username;
    }
    return this.data.users[userId];
  }

  getGuild(guildId) {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {
        id: guildId,
        spawnChannelId: null,
        spawnIntervalMinutes: Number(process.env.DEFAULT_SPAWN_MINUTES) || 15,
        totalSpawns: 0
      };
      this.save();
    }
    return this.data.guilds[guildId];
  }

  setGuildSpawnChannel(guildId, channelId, intervalMinutes) {
    const guild = this.getGuild(guildId);
    guild.spawnChannelId = channelId;
    if (intervalMinutes && !isNaN(intervalMinutes)) {
      guild.spawnIntervalMinutes = Math.max(1, Math.min(180, Number(intervalMinutes)));
    }
    this.save();
    return guild;
  }

  getAllUsers() {
    return Object.values(this.data.users);
  }
}

module.exports = new Database();
