# Mapa de Arquitetura - FlixPatrol API

## 1. Visão Geral
**Tipo de Projeto:** Backend API (Node.js + Express)
**Objetivo:** Extrair o Top 10 dos serviços de streaming (Netflix, Disney+, HBO, Prime Video, Apple TV) via web scraping, enriquecer via TMDB e servir JSON protegido por API Keys. Cache no Firebase Firestore.

## 2. Estrutura de Diretórios
- `public/`: Landing page estática (HTML/CSS/JS).
- `src/controllers/`: Lógica de cada endpoint.
- `src/middleware/`: Autenticação, rate limiting.
- `src/routes/`: Definições de URLs da API.
- `src/scrapers/`: Módulos de extração de dados.
  - **`lightScraper.js`** [PRIMÁRIO]: Axios + Cheerio (HTTP puro, ~3s). Circuit Breaker + Mutex embutidos.
  - **`flixpatrolScraper.js`** [FALLBACK]: Puppeteer + Chrome headless (usado apenas quando lightScraper falha).
  - **`imdbCalendarScraper.js`**: Busca lançamentos no Brasil via API do TMDB (`/movie/upcoming` e `/discover/movie`), abandonando o scraping original por conta do AWS WAF do IMDB.
- `src/services/`: Firebase, TMDB (`tmdbCalendarService.js` para séries), Sistema de Chaves.

## 3. Fluxo de Calendário (Movies & TV Shows)
- **/api/calendar/movies**: Aciona `imdbCalendarScraper` (busca na API TMDB 40~100 lançamentos BR futuros).
- **/api/calendar/tv-shows**: Aciona `tmdbCalendarService` (busca novas séries e novas temporadas via TMDB API).
- **/api/calendar/overall**: Combina ambos, salva no Firebase e retorna os dados ordenados por data.
- **Cache**: Fallback pro Firebase ocorre pra salvar requisições excessivas (TTL das rotas `/quick`).
## 4. Fluxo de Scraping (Resilience Layers)

```text
Request → Controller.getTop10()
    ├─ 1. Firebase Cache (dados de hoje?)
    │     └─ SIM → retorna dados cacheados
    │
    ├─ 2. Mutex Lock (scraping já rodando?)
    │     └─ SIM → retorna dados do Firebase (stale)
    │
    ├─ 3. LightScraper (Axios + Cheerio)
    │     └─ Circuit Breaker: 3 falhas → OPEN → 5min cooldown
    │     └─ FALHOU → vai para Puppeteer ↓
    │
    ├─ 4. Puppeteer (Chrome headless) [FALLBACK]
    │     └─ Recicla browser entre retries
    │     └─ FALHOU → vai para Firebase ↓
    │
    └─ 5. Firebase Stale Fallback
          └─ Retorna último dado válido + flag stale:true
          └─ Se não tem NADA → erro 500
```

## 5. Segurança e Acesso
- **API Keys (`apiKeyMiddleware.js`)**: `User Key` (leitura via API) | `Master Key` (scraping/cron).
- **Acesso Admin (`adminAuth.js`)**: Exige `X-Admin-Secret` para `/api/admin`.
- **Acesso Cliente (Firestore SDK)**: O acesso direto de apps à base de dados de leitura (ex: cinegenio2026) exige apenas `request.auth != null` (login válido). A camada do Frontend é responsável por validar e barrar contas recém-criadas ou não aprovadas manualmente.

## 6. Banco de Dados (Firebase Firestore)
- **Banco de Extração (flixpatrol-api):** Totalmente trancado (`allow read, write: if false;`). Interação apenas via Admin SDK na API Node.
- **Banco de Leitura Cliente:** Bases acopladas à API User (como cinegenio2026) recebem as atualizações que a API injeta.
- Auto-limpeza: mantém apenas dados do dia atual.
- Método `getLatestTop10()` busca último snapshot válido (fallback).

## 7. Variáveis de Ambiente (`.env`)
- `PORT`: Porta do servidor (3000)
- `FIREBASE_*`: Credenciais do Firebase Admin SDK
- `TMDB_API_KEY`: Enriquecimento de metadados
- `ADMIN_SECRET`: Chave mestre para `/api/admin`

*(Mapa atualizado automaticamente conforme diretriz obrigatória de AUTO-DOCUMENTAÇÃO)*

## 8. Resolução de Entidades (Matching)
**Arquivo:** `src/services/tmdbService.js`
A correspondência entre títulos Raspados (FlixPatrol) e Metadados (TMDB) utiliza uma arquitetura de pipeline em 3 etapas para garantir precisão:
1. **Multi-Query Searching:** Dispara variações do título (limpo, original, e específicos).
2. **Candidate Ranking:** Sistema de score ponderado (45% Similaridade de String Dice, 25% Popularidade Logarítmica, 15% Ano, 15% Tipo).
3. **Supplementary Filter:** Penalização inteligente para conteúdos "Bonus/Extra".
4. **Persistence:** Cache e aprendizado para IDs persistentes (TMDB ID).

---
**Mapa Atualizado em:** 19/03/2026 - 20:45 por Antigravity.
