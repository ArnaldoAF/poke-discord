# 🔴 Poké-Discord — Pokémon Community Game para Discord

Um bot completo de captura e coleção de Pokémon inspirado no **Pokémon Community Game (PCG)** da Twitch, feito para servidores de Discord!

Os membros podem capturar Pokémon usando **comandos no chat** (`!pokecatch`, `!pokecheck`, `!pokeshop`, etc.) ou clicando nos **botões interativos** embaixo de cada Pokémon que aparece.

---

## 🚀 Passo a Passo do Zero (Para quem nunca criou um bot)

### Passo 1: Criar o Bot no painel do Discord (leva 2 minutos)
1. Acesse o site oficial: **[Discord Developer Portal](https://discord.com/developers/applications)** e faça login com sua conta do Discord.
2. No canto superior direito, clique no botão azul **"New Application"**.
3. Digite um nome (ex: `PokéBot`) e clique em **Create**.
4. No menu lateral esquerdo, clique em **"Bot"**.
5. **MUITO IMPORTANTE:** Role a página um pouco para baixo até a seção **Privileged Gateway Intents** e **ATIVE** a chave:
   - ✅ **MESSAGE CONTENT INTENT** *(Sem isso o Discord não deixa o bot ler os comandos `!pokecatch` no chat!)*
   - Clique no botão verde **Save Changes** que vai aparecer.
6. Ainda na página **Bot**, suba até o topo, clique em **"Reset Token"** (ou *View Token*) e copie o código gigante que aparecer.

---

### Passo 2: Colar o Token e Convidar o Bot
1. Abra a pasta `c:\Git\poke-discord`.
2. Dê dois cliques no arquivo **`1_CONFIGURAR_BOT.bat`** (ou rode `npm run setup` no terminal).
3. Cole o Token que você copiou e aperte **ENTER**.
4. O próprio programa vai salvar tudo automaticamente e gerar na tela o **Link de Convite pronto**!
5. Abra o link gerado no seu navegador, escolha o seu servidor do Discord e clique em **Autorizar**.

---

### Passo 3: Ligar o Bot e Começar a Jogar!
1. Dê dois cliques no arquivo **`2_INICIAR_BOT.bat`** (ou rode `npm start`).
2. Vá até o canal do seu Discord onde você quer que os Pokémon apareçam e digite:
   ```text
   !pokeset 15
   ```
   *(Isso configura os Pokémon para aparecerem sozinhos a cada 15 minutos naquele canal e já faz aparecer o primeiro Pokémon na hora!)*

---

## 🎮 Lista de Comandos no Chat

| Comando | Atalhos | O que faz |
| :--- | :--- | :--- |
| `!pokecatch` | `!catch`, `!c` | Lança uma **Poké Ball gratuita** no Pokémon selvagem atual |
| `!pokecatch greatball` | `!catch gb`, `ub`, `mb` | Lança uma **Great Ball**, **Ultra Ball** ou **Master Ball** da sua mochila |
| `!pokecheck [nome/id]` | `!check` | Verifica se você já tem o Pokémon atual (ou pesquisado) na sua Pokédex |
| `!pokedaily` | `!daily`, `!diario` | Resgata seu pacote diário de **PokéCoins** + **Pokébolas grátis** |
| `!pokeshop` | `!shop`, `!loja` | Abre a loja para ver preços de Pokébolas e itens especiais |
| `!pokebuy <item> [qtd]` | `!buy`, `!comprar` | Compra itens na loja (ex: `!pokebuy greatball 5`) |
| `!pokeinv` | `!inv`, `!mochila`, `!perfil` | Mostra sua mochila, moedas, estatísticas e seu Pokémon mais forte |
| `!pokedex [página]` | `!dex`, `!pc` | Lista seus Pokémon capturados ordenados por poder (CP) |
| `!pokesell` | `!sell`, `!vender` | Transfere Pokémon repetidos (mantendo o mais forte e os Shinies) por moedas |
| `!pokerank` | `!rank`, `!top` | Mostra o Ranking dos melhores treinadores do servidor |
| `!pokespawn` | `!spawn` | Faz aparecer um Pokémon imediatamente *(Admin ou usando 1 Incenso)* |
| `!pokeset [minutos]` | `!config` | *(Admin)* Define o canal atual para spawns automáticos |
| `!pokehelp` | `!ajuda`, `!comandos` | Mostra o guia de comandos dentro do Discord |
