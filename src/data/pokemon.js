// Banco de dados completo dos 151 Pokémon de Kanto (Geração 1)
// Com raridades, taxas de captura base, tipos e sprites oficiais em alta definição

const RARITY_CONFIG = {
  Comum: {
    weight: 50,
    color: 0x95a5a6,
    badge: '⚪ Comum',
    coinsReward: [35, 65],
    sellValue: 25,
    cpRange: [50, 450]
  },
  Incomum: {
    weight: 30,
    color: 0x2ecc71,
    badge: '🟢 Incomum',
    coinsReward: [70, 120],
    sellValue: 55,
    cpRange: [350, 950]
  },
  Raro: {
    weight: 14,
    color: 0x3498db,
    badge: '🔵 Raro',
    coinsReward: [140, 230],
    sellValue: 120,
    cpRange: [800, 1700]
  },
  Épico: {
    weight: 5,
    color: 0x9b59b6,
    badge: '🟣 Épico',
    coinsReward: [280, 450],
    sellValue: 250,
    cpRange: [1500, 2800]
  },
  Lendário: {
    weight: 1,
    color: 0xf1c40f,
    badge: '🌟 LENDÁRIO',
    coinsReward: [800, 1200],
    sellValue: 750,
    cpRange: [2600, 4200]
  }
};

// Lista completa dos 151 Pokémon: [id, nome, tipos, raridade, chanceBaseCaptura (0.08 a 0.65)]
const RAW_POKEMON = [
  [1, 'Bulbasaur', ['🌿 Planta', '☠️ Veneno'], 'Incomum', 0.42],
  [2, 'Ivysaur', ['🌿 Planta', '☠️ Veneno'], 'Raro', 0.28],
  [3, 'Venusaur', ['🌿 Planta', '☠️ Veneno'], 'Épico', 0.16],
  [4, 'Charmander', ['🔥 Fogo'], 'Incomum', 0.42],
  [5, 'Charmeleon', ['🔥 Fogo'], 'Raro', 0.28],
  [6, 'Charizard', ['🔥 Fogo', '🪽 Voador'], 'Épico', 0.15],
  [7, 'Squirtle', ['💧 Água'], 'Incomum', 0.42],
  [8, 'Wartortle', ['💧 Água'], 'Raro', 0.28],
  [9, 'Blastoise', ['💧 Água'], 'Épico', 0.16],
  [10, 'Caterpie', ['🐛 Inseto'], 'Comum', 0.65],
  [11, 'Metapod', ['🐛 Inseto'], 'Comum', 0.55],
  [12, 'Butterfree', ['🐛 Inseto', '🪽 Voador'], 'Incomum', 0.35],
  [13, 'Weedle', ['🐛 Inseto', '☠️ Veneno'], 'Comum', 0.65],
  [14, 'Kakuna', ['🐛 Inseto', '☠️ Veneno'], 'Comum', 0.55],
  [15, 'Beedrill', ['🐛 Inseto', '☠️ Veneno'], 'Incomum', 0.35],
  [16, 'Pidgey', ['⭐ Normal', '🪽 Voador'], 'Comum', 0.65],
  [17, 'Pidgeotto', ['⭐ Normal', '🪽 Voador'], 'Incomum', 0.45],
  [18, 'Pidgeot', ['⭐ Normal', '🪽 Voador'], 'Raro', 0.25],
  [19, 'Rattata', ['⭐ Normal'], 'Comum', 0.65],
  [20, 'Raticate', ['⭐ Normal'], 'Incomum', 0.42],
  [21, 'Spearow', ['⭐ Normal', '🪽 Voador'], 'Comum', 0.62],
  [22, 'Fearow', ['⭐ Normal', '🪽 Voador'], 'Incomum', 0.38],
  [23, 'Ekans', ['☠️ Veneno'], 'Comum', 0.58],
  [24, 'Arbok', ['☠️ Veneno'], 'Incomum', 0.38],
  [25, 'Pikachu', ['⚡ Elétrico'], 'Incomum', 0.40],
  [26, 'Raichu', ['⚡ Elétrico'], 'Raro', 0.24],
  [27, 'Sandshrew', ['⛰️ Terra'], 'Comum', 0.58],
  [28, 'Sandslash', ['⛰️ Terra'], 'Incomum', 0.38],
  [29, 'Nidoran♀', ['☠️ Veneno'], 'Comum', 0.58],
  [30, 'Nidorina', ['☠️ Veneno'], 'Incomum', 0.40],
  [31, 'Nidoqueen', ['☠️ Veneno', '⛰️ Terra'], 'Raro', 0.22],
  [32, 'Nidoran♂', ['☠️ Veneno'], 'Comum', 0.58],
  [33, 'Nidorino', ['☠️ Veneno'], 'Incomum', 0.40],
  [34, 'Nidoking', ['☠️ Veneno', '⛰️ Terra'], 'Raro', 0.22],
  [35, 'Clefairy', ['🧚 Fada'], 'Incomum', 0.42],
  [36, 'Clefable', ['🧚 Fada'], 'Raro', 0.25],
  [37, 'Vulpix', ['🔥 Fogo'], 'Incomum', 0.48],
  [38, 'Ninetales', ['🔥 Fogo'], 'Raro', 0.25],
  [39, 'Jigglypuff', ['⭐ Normal', '🧚 Fada'], 'Comum', 0.52],
  [40, 'Wigglytuff', ['⭐ Normal', '🧚 Fada'], 'Incomum', 0.35],
  [41, 'Zubat', ['☠️ Veneno', '🪽 Voador'], 'Comum', 0.65],
  [42, 'Golbat', ['☠️ Veneno', '🪽 Voador'], 'Incomum', 0.40],
  [43, 'Oddish', ['🌿 Planta', '☠️ Veneno'], 'Comum', 0.60],
  [44, 'Gloom', ['🌿 Planta', '☠️ Veneno'], 'Incomum', 0.42],
  [45, 'Vileplume', ['🌿 Planta', '☠️ Veneno'], 'Raro', 0.25],
  [46, 'Paras', ['🐛 Inseto', '🌿 Planta'], 'Comum', 0.58],
  [47, 'Parasect', ['🐛 Inseto', '🌿 Planta'], 'Incomum', 0.38],
  [48, 'Venonat', ['🐛 Inseto', '☠️ Veneno'], 'Comum', 0.58],
  [49, 'Venomoth', ['🐛 Inseto', '☠️ Veneno'], 'Incomum', 0.38],
  [50, 'Diglett', ['⛰️ Terra'], 'Comum', 0.60],
  [51, 'Dugtrio', ['⛰️ Terra'], 'Incomum', 0.36],
  [52, 'Meowth', ['⭐ Normal'], 'Comum', 0.58],
  [53, 'Persian', ['⭐ Normal'], 'Incomum', 0.38],
  [54, 'Psyduck', ['💧 Água'], 'Comum', 0.55],
  [55, 'Golduck', ['💧 Água'], 'Raro', 0.28],
  [56, 'Mankey', ['🥊 Lutador'], 'Comum', 0.55],
  [57, 'Primeape', ['🥊 Lutador'], 'Incomum', 0.35],
  [58, 'Growlithe', ['🔥 Fogo'], 'Incomum', 0.45],
  [59, 'Arcanine', ['🔥 Fogo'], 'Épico', 0.18],
  [60, 'Poliwag', ['💧 Água'], 'Comum', 0.60],
  [61, 'Poliwhirl', ['💧 Água'], 'Incomum', 0.42],
  [62, 'Poliwrath', ['💧 Água', '🥊 Lutador'], 'Raro', 0.24],
  [63, 'Abra', ['🔮 Psíquico'], 'Incomum', 0.35],
  [64, 'Kadabra', ['🔮 Psíquico'], 'Raro', 0.25],
  [65, 'Alakazam', ['🔮 Psíquico'], 'Épico', 0.16],
  [66, 'Machop', ['🥊 Lutador'], 'Comum', 0.55],
  [67, 'Machoke', ['🥊 Lutador'], 'Incomum', 0.38],
  [68, 'Machamp', ['🥊 Lutador'], 'Épico', 0.18],
  [69, 'Bellsprout', ['🌿 Planta', '☠️ Veneno'], 'Comum', 0.60],
  [70, 'Weepinbell', ['🌿 Planta', '☠️ Veneno'], 'Incomum', 0.42],
  [71, 'Victreebel', ['🌿 Planta', '☠️ Veneno'], 'Raro', 0.25],
  [72, 'Tentacool', ['💧 Água', '☠️ Veneno'], 'Comum', 0.58],
  [73, 'Tentacruel', ['💧 Água', '☠️ Veneno'], 'Incomum', 0.35],
  [74, 'Geodude', ['🪨 Pedra', '⛰️ Terra'], 'Comum', 0.60],
  [75, 'Graveler', ['🪨 Pedra', '⛰️ Terra'], 'Incomum', 0.40],
  [76, 'Golem', ['🪨 Pedra', '⛰️ Terra'], 'Raro', 0.24],
  [77, 'Ponyta', ['🔥 Fogo'], 'Incomum', 0.48],
  [78, 'Rapidash', ['🔥 Fogo'], 'Raro', 0.28],
  [79, 'Slowpoke', ['💧 Água', '🔮 Psíquico'], 'Comum', 0.55],
  [80, 'Slowbro', ['💧 Água', '🔮 Psíquico'], 'Raro', 0.28],
  [81, 'Magnemite', ['⚡ Elétrico', '⚙️ Aço'], 'Comum', 0.55],
  [82, 'Magneton', ['⚡ Elétrico', '⚙️ Aço'], 'Raro', 0.30],
  [83, "Farfetch'd", ['⭐ Normal', '🪽 Voador'], 'Raro', 0.30],
  [84, 'Doduo', ['⭐ Normal', '🪽 Voador'], 'Comum', 0.58],
  [85, 'Dodrio', ['⭐ Normal', '🪽 Voador'], 'Incomum', 0.35],
  [86, 'Seel', ['💧 Água'], 'Comum', 0.55],
  [87, 'Dewgong', ['💧 Água', '❄️ Gelo'], 'Incomum', 0.35],
  [88, 'Grimer', ['☠️ Veneno'], 'Comum', 0.58],
  [89, 'Muk', ['☠️ Veneno'], 'Raro', 0.30],
  [90, 'Shellder', ['💧 Água'], 'Comum', 0.58],
  [91, 'Cloyster', ['💧 Água', '❄️ Gelo'], 'Raro', 0.28],
  [92, 'Gastly', ['👻 Fantasma', '☠️ Veneno'], 'Incomum', 0.45],
  [93, 'Haunter', ['👻 Fantasma', '☠️ Veneno'], 'Raro', 0.28],
  [94, 'Gengar', ['👻 Fantasma', '☠️ Veneno'], 'Épico', 0.16],
  [95, 'Onix', ['🪨 Pedra', '⛰️ Terra'], 'Raro', 0.30],
  [96, 'Drowzee', ['🔮 Psíquico'], 'Comum', 0.58],
  [97, 'Hypno', ['🔮 Psíquico'], 'Incomum', 0.36],
  [98, 'Krabby', ['💧 Água'], 'Comum', 0.60],
  [99, 'Kingler', ['💧 Água'], 'Incomum', 0.36],
  [100, 'Voltorb', ['⚡ Elétrico'], 'Comum', 0.58],
  [101, 'Electrode', ['⚡ Elétrico'], 'Incomum', 0.38],
  [102, 'Exeggcute', ['🌿 Planta', '🔮 Psíquico'], 'Comum', 0.55],
  [103, 'Exeggutor', ['🌿 Planta', '🔮 Psíquico'], 'Raro', 0.26],
  [104, 'Cubone', ['⛰️ Terra'], 'Incomum', 0.45],
  [105, 'Marowak', ['⛰️ Terra'], 'Raro', 0.28],
  [106, 'Hitmonlee', ['🥊 Lutador'], 'Raro', 0.26],
  [107, 'Hitmonchan', ['🥊 Lutador'], 'Raro', 0.26],
  [108, 'Lickitung', ['⭐ Normal'], 'Raro', 0.30],
  [109, 'Koffing', ['☠️ Veneno'], 'Comum', 0.58],
  [110, 'Weezing', ['☠️ Veneno'], 'Incomum', 0.36],
  [111, 'Rhyhorn', ['⛰️ Terra', '🪨 Pedra'], 'Incomum', 0.45],
  [112, 'Rhydon', ['⛰️ Terra', '🪨 Pedra'], 'Raro', 0.24],
  [113, 'Chansey', ['⭐ Normal'], 'Épico', 0.18],
  [114, 'Tangela', ['🌿 Planta'], 'Incomum', 0.40],
  [115, 'Kangaskhan', ['⭐ Normal'], 'Raro', 0.24],
  [116, 'Horsea', ['💧 Água'], 'Comum', 0.58],
  [117, 'Seadra', ['💧 Água'], 'Incomum', 0.36],
  [118, 'Goldeen', ['💧 Água'], 'Comum', 0.60],
  [119, 'Seaking', ['💧 Água'], 'Incomum', 0.38],
  [120, 'Staryu', ['💧 Água'], 'Comum', 0.55],
  [121, 'Starmie', ['💧 Água', '🔮 Psíquico'], 'Raro', 0.26],
  [122, 'Mr. Mime', ['🔮 Psíquico', '🧚 Fada'], 'Raro', 0.28],
  [123, 'Scyther', ['🐛 Inseto', '🪽 Voador'], 'Épico', 0.20],
  [124, 'Jynx', ['❄️ Gelo', '🔮 Psíquico'], 'Raro', 0.28],
  [125, 'Electabuzz', ['⚡ Elétrico'], 'Raro', 0.25],
  [126, 'Magmar', ['🔥 Fogo'], 'Raro', 0.25],
  [127, 'Pinsir', ['🐛 Inseto'], 'Raro', 0.24],
  [128, 'Tauros', ['⭐ Normal'], 'Raro', 0.25],
  [129, 'Magikarp', ['💧 Água'], 'Comum', 0.70],
  [130, 'Gyarados', ['💧 Água', '🪽 Voador'], 'Épico', 0.15],
  [131, 'Lapras', ['💧 Água', '❄️ Gelo'], 'Épico', 0.16],
  [132, 'Ditto', ['⭐ Normal'], 'Raro', 0.25],
  [133, 'Eevee', ['⭐ Normal'], 'Incomum', 0.40],
  [134, 'Vaporeon', ['💧 Água'], 'Épico', 0.18],
  [135, 'Jolteon', ['⚡ Elétrico'], 'Épico', 0.18],
  [136, 'Flareon', ['🔥 Fogo'], 'Épico', 0.18],
  [137, 'Porygon', ['⭐ Normal'], 'Épico', 0.20],
  [138, 'Omanyte', ['🪨 Pedra', '💧 Água'], 'Incomum', 0.40],
  [139, 'Omastar', ['🪨 Pedra', '💧 Água'], 'Raro', 0.24],
  [140, 'Kabuto', ['🪨 Pedra', '💧 Água'], 'Incomum', 0.40],
  [141, 'Kabutops', ['🪨 Pedra', '💧 Água'], 'Raro', 0.24],
  [142, 'Aerodactyl', ['🪨 Pedra', '🪽 Voador'], 'Épico', 0.16],
  [143, 'Snorlax', ['⭐ Normal'], 'Épico', 0.15],
  [144, 'Articuno', ['❄️ Gelo', '🪽 Voador'], 'Lendário', 0.08],
  [145, 'Zapdos', ['⚡ Elétrico', '🪽 Voador'], 'Lendário', 0.08],
  [146, 'Moltres', ['🔥 Fogo', '🪽 Voador'], 'Lendário', 0.08],
  [147, 'Dratini', ['🐉 Dragão'], 'Raro', 0.32],
  [148, 'Dragonair', ['🐉 Dragão'], 'Épico', 0.20],
  [149, 'Dragonite', ['🐉 Dragão', '🪽 Voador'], 'Épico', 0.14],
  [150, 'Mewtwo', ['🔮 Psíquico'], 'Lendário', 0.06],
  [151, 'Mew', ['🔮 Psíquico'], 'Lendário', 0.06]
];

const POKEMON_LIST = RAW_POKEMON.map(([id, name, types, rarity, catchRate]) => ({
  id,
  name,
  types,
  rarity,
  catchRate,
  sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  shinySprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
}));

function getPokemonById(id) {
  return POKEMON_LIST.find((p) => p.id === Number(id)) || null;
}

function findPokemonByQuery(query) {
  if (!query) return null;
  const clean = String(query).trim().toLowerCase();
  if (/^\d+$/.test(clean)) {
    return getPokemonById(Number(clean));
  }
  return (
    POKEMON_LIST.find((p) => p.name.toLowerCase() === clean) ||
    POKEMON_LIST.find((p) => p.name.toLowerCase().startsWith(clean)) ||
    null
  );
}

module.exports = {
  POKEMON_LIST,
  RARITY_CONFIG,
  getPokemonById,
  findPokemonByQuery
};
