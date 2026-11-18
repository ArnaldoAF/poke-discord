const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_PATH = path.join(__dirname, '..', '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('====================================================================');
console.log('🎮 CONFIGURADOR AUTOMÁTICO — POKÉ-DISCORD BOT');
console.log('====================================================================\n');
console.log('Passo rápido para pegar seu Token no Discord:');
console.log('1. Acesse: https://discord.com/developers/applications');
console.log('2. Clique em "New Application" (canto superior direito) e dê um nome.');
console.log('3. No menu esquerdo, clique em "Bot".');
console.log('4. Role para baixo até "Privileged Gateway Intents" e ATIVE a opção:');
console.log('   ✅ MESSAGE CONTENT INTENT (e clique em Save Changes)');
console.log('5. Role para o topo da página "Bot", clique em "Reset Token" e copie o Token.\n');

rl.question('👉 Cole o TOKEN do seu Bot aqui e aperte ENTER: ', (inputToken) => {
  const cleanToken = (inputToken || '').trim().replace(/^["']|["']$/g, '');

  if (!cleanToken || cleanToken.split('.').length < 3) {
    console.log('\n❌ O Token informado parece inválido (um Token do Discord tem 3 partes separadas por ponto).');
    console.log('Tente novamente executando o configurador.');
    rl.close();
    process.exit(1);
  }

  const envContent = [
    '# Token configurado automaticamente',
    `DISCORD_TOKEN=${cleanToken}`,
    '',
    '# Prefixo dos comandos no chat (padrão: !)',
    'COMMAND_PREFIX=!',
    '',
    '# Tempo padrão entre spawns automáticos de Pokémon em minutos (padrão: 15)',
    'DEFAULT_SPAWN_MINUTES=15',
    '',
    '# Tempo que o Pokémon selvagem fica disponível para captura em segundos (padrão: 90)',
    'SPAWN_DURATION_SECONDS=90',
    ''
  ].join('\n');

  fs.writeFileSync(ENV_PATH, envContent, 'utf8');
  console.log('\n✅ Token salvo com sucesso no arquivo .env!');

  // Extrai automaticamente o ID do Bot a partir da primeira parte do Token (Base64)
  try {
    const firstPart = cleanToken.split('.')[0];
    const clientId = Buffer.from(firstPart, 'base64').toString('utf8').trim();
    if (/^\d+$/.test(clientId)) {
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=274878221376&scope=bot`;
      console.log('\n====================================================================');
      console.log('🔗 LINK PRONTO PARA ADICIONAR O BOT NO SEU SERVIDOR:');
      console.log('====================================================================');
      console.log('Copie e abra este link no seu navegador para convidar o bot:\n');
      console.log(inviteUrl);
      console.log('====================================================================\n');
    }
  } catch {
    // Se não conseguir decodificar, segue normalmente
  }

  console.log('🚀 Tudo pronto! Agora basta abrir "2_INICIAR_BOT.bat" (ou rodar "npm start")!');
  rl.close();
});
