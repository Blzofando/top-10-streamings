# Como Fazer Deploy no Render (Recomendado para Node + Puppeteer)

O Netlify serve apenas para sites estáticos. Como seu projeto tem um "backend" (Node.js + Puppeteer) que roda o tempo todo, ele **não vai funcionar no Netlify**. A imagem de erro 404 que você viu acontece porque o Netlify não consegue rodar o servidor `server.js`.

A melhor opção gratuita para esse tipo de projeto é o **Render.com**.

## Passo a Passo no Render

1.  Crie uma conta no [Render.com](https://render.com/).
2.  No painel, clique em **"New +"** e selecione **"Web Service"**.
3.  Conecte seu repositório do GitHub (onde você subiu este código).
4.  Configure os campos:
    *   **Name**: `flixpatrol-api` (ou o que preferir)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
5.  **IMPORTANTE (Variáveis de Ambiente)**:
    *   Role para baixo até **"Environment Variables"** e clique em "Add Environment Variable".
    *   Adicione o seguinte:
        *   `TMDB_API_KEY` : (Cole sua chave do TMDB aqui)
        *   `PUPPETEER_CACHE_DIR` : `/opt/render/project/src/.cache/puppeteer`
        *   `NODE_VERSION` : `18` (Opcional, mas bom garantir)

6.  Clique em **"Create Web Service"**.

## O que eu já ajustei automaticamente para você:
1.  **`app.js`**: Mudei o link da API para ser relativo (`/api`). Isso faz com que o frontend funcione automaticamente tanto no seu PC (`localhost`) quanto no Render (`https://...`).
2.  **`flixpatrolScraper.js`**: Adicionei configurações extras (`--no-sandbox`, etc) que o Render precisa para rodar o navegador (Puppeteer) sem travar.

## Testando
O deploy pode demorar uns 3 a 5 minutos na primeira vez.
Quando terminar, o Render vai te dar uma URL (algo como `https://flixpatrol-api.onrender.com`).
## Como manter o site "acordado" (Evitar Lentidão)
O Render "adormece" o servidor após 15 minutos de inatividade no plano grátis (isso vale para Node.js, Python, Go, etc). Quando alguém entra depois disso, demora uns 30 segundos para "acordar".

**O Truque do UptimeRobot (Grátis):**
Para evitar isso, use um serviço de monitoramento gratuito para "pingar" seu site a cada 5 minutos.
1.  Crie uma conta gratuita em [UptimeRobot.com](https://uptimerobot.com/).
2.  Clique em "Add New Monitor".
3.  Tipo: **HTTP(s)**.
4.  Nome: `FlixPatrol API`.
5.  URL: `https://seu-app-no-render.com/api/netflix` (Use uma das rotas da API).
6.  Monitoring Interval: **5 min**.
7.  Pronto! Ele vai acessar seu site a cada 5 minutos, impedindo que ele durma.

## Por que não usar a Vercel?
Você perguntou sobre a Vercel. Embora seja excelente, ela tem um problema fatal para **Scraping**:
*   **Limite de Tempo**: No plano grátis, qualquer função deve terminar em **10 segundos**. Como nosso scraping + busca no TMDB pode levar mais que isso (especialmente o "Buscar Todos"), a Vercel vai parar o processo no meio e dar erro de Timeout.
*   **Tamanho**: O Puppeteer (Chrome) é pesado para as funções "Serverless" da Vercel, o que exige configurações complexas (`chrome-aws-lambda`) que frequentemente quebram.

Por isso, o **Render** (com o truque do UptimeRobot) é a melhor escolha para este projeto.
