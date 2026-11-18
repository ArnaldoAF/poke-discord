// Itens da PokéShop e configurações de Pokébolas

const POKEBALLS = {
  pokeball: {
    id: 'pokeball',
    name: 'Poké Ball',
    emoji: '🔴',
    multiplier: 1.0,
    price: 0, // Gratuita / infinita no comando básico igual ao PCG da Twitch
    buyable: false,
    aliases: ['pokeball', 'poke', 'pb', 'normal', 'padrao', 'padrão'],
    description: 'Pokébola básica gratuita (Chance 1.0x). Sempre disponível!'
  },
  greatball: {
    id: 'greatball',
    name: 'Great Ball',
    emoji: '🔵',
    multiplier: 1.5,
    price: 150,
    buyable: true,
    aliases: ['greatball', 'great', 'gb'],
    description: 'Pokébola de alto desempenho (Chance 1.5x).'
  },
  ultraball: {
    id: 'ultraball',
    name: 'Ultra Ball',
    emoji: '🟡',
    multiplier: 2.2,
    price: 350,
    buyable: true,
    aliases: ['ultraball', 'ultra', 'ub'],
    description: 'Pokébola ultra avançada para Pokémon raros (Chance 2.2x).'
  },
  masterball: {
    id: 'masterball',
    name: 'Master Ball',
    emoji: '🟣',
    multiplier: 999.0, // 100% garantido
    price: 5000,
    buyable: true,
    aliases: ['masterball', 'master', 'mb'],
    description: 'A Pokébola suprema! Captura qualquer Pokémon com 100% de certeza.'
  }
};

const SPECIAL_ITEMS = {
  incense: {
    id: 'incense',
    name: 'Incenso Selvagem',
    emoji: '🌸',
    price: 400,
    buyable: true,
    aliases: ['incense', 'incenso', 'lure', 'spawn'],
    description: 'Atrai imediatamente um Pokémon selvagem para o canal ao usar `!pokespawn`!'
  },
  shinycharm: {
    id: 'shinycharm',
    name: 'Shiny Charm',
    emoji: '✨',
    price: 3500,
    buyable: true,
    maxOwned: 1,
    aliases: ['shinycharm', 'charm', 'amuleto', 'shiny'],
    description: 'Amuleto permanente: aumenta em +15% sua taxa de captura e dobra seus pontos de sorte!'
  }
};

function resolveBall(input) {
  if (!input) return POKEBALLS.pokeball;
  const clean = String(input).trim().toLowerCase();
  for (const ball of Object.values(POKEBALLS)) {
    if (ball.aliases.includes(clean)) {
      return ball;
    }
  }
  return null;
}

function resolveShopItem(input) {
  if (!input) return null;
  const clean = String(input).trim().toLowerCase();
  for (const ball of Object.values(POKEBALLS)) {
    if (ball.buyable && ball.aliases.includes(clean)) {
      return { ...ball, category: 'ball' };
    }
  }
  for (const item of Object.values(SPECIAL_ITEMS)) {
    if (item.buyable && item.aliases.includes(clean)) {
      return { ...item, category: 'item' };
    }
  }
  return null;
}

module.exports = {
  POKEBALLS,
  SPECIAL_ITEMS,
  resolveBall,
  resolveShopItem
};
