# 🎬 FlixPatrol API

API para extrair dados do FlixPatrol e enriquecer com informações do TMDB.

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env e adicione sua chave do TMDB
```

## 🔑 Obter Chave do TMDB

1. Acesse https://www.themoviedb.org/
2. Crie uma conta (grátis)
3. Vá em Configurações → API
4. Solicite uma chave de API (escolha "Developer")
5. Copie a chave e cole no arquivo `.env`

## 📡 Como Usar

### Iniciar o servidor

```bash
# Modo normal
npm start

# Modo desenvolvimento (reinicia automaticamente)
npm run dev
```

### Endpoints Disponíveis

#### 1. Disney+
```bash
GET http://localhost:3000/api/disney
GET http://localhost:3000/api/disney?tmdb=true
```

#### 2. Netflix
```bash
GET http://localhost:3000/api/netflix
GET http://localhost:3000/api/netflix?tmdb=true
```

#### 3. HBO Max
```bash
GET http://localhost:3000/api/hbo
GET http://localhost:3000/api/hbo?tmdb=true
```

#### 4. Amazon Prime
```bash
GET http://localhost:3000/api/prime
GET http://localhost:3000/api/prime?tmdb=true
```

#### 5. Todos os streamings
```bash
GET http://localhost:3000/api/all
GET http://localhost:3000/api/all?tmdb=true
```

### Gerenciar Cache

```bash
# Ver estatísticas do cache
GET http://localhost:3000/api/cache/stats

# Limpar cache
DELETE http://localhost:3000/api/cache
```

## 📊 Estrutura da Resposta

### Sem TMDB (`?tmdb=false` ou sem parâmetro)

```json
{
  "service": "Disney+",
  "date": "2025-12-11",
  "overall": [
    {
      "position": 1,
      "title": "Zootopia",
      "popularity": 569,
      "link": "https://flixpatrol.com/title/zootopia/",
      "type": "movie"
    }
  ],
  "movies": [...],
  "tvShows": [...]
}
```

### Com TMDB (`?tmdb=true`)

```json
{
  "service": "Disney+",
  "date": "2025-12-11",
  "overall": [
    {
      "position": 1,
      "title": "Zootopia",
      "popularity": 569,
      "link": "https://flixpatrol.com/title/zootopia/",
      "type": "movie",
      "tmdb": {
        "tmdb_id": 269149,
        "type": "movie",
        "title": "Zootopia",
        "original_title": "Zootopia",
        "overview": "Uma cidade onde...",
        "release_date": "2016-02-11",
        "poster_path": "https://image.tmdb.org/t/p/w500/...",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/...",
        "vote_average": 7.8,
        "vote_count": 15420,
        "popularity": 89.5,
        "language": "en"
      }
    }
  ],
  "movies": [...],
  "tvShows": [...]
}
```

## 🎯 Como Funciona

1. **Scraping com Puppeteer**: Usa navegador headless para executar o JavaScript do FlixPatrol
2. **Extração de Dados**: Captura título, popularidade e links
3. **Ranking Overall**: Combina filmes e séries por popularidade
4. **Enriquecimento TMDB**: Busca informações adicionais (opcional)
5. **Cache**: Armazena dados por 1 hora para reduzir scraping

## ⚙️ Configuração

### Variáveis de Ambiente (`.env`)

```env
# TMDB API Key
TMDB_API_KEY=sua_chave_aqui

# Porta da API
PORT=3000

# Tempo de cache (segundos)
CACHE_TTL=3600
```

## 📁 Estrutura do Projeto

```
flixpatrol2/
├── src/
│   ├── config/
│   │   └── streamingServices.js   # Configurações dos streamings
│   ├── scrapers/
│   │   └── flixpatrolScraper.js   # Scraper do FlixPatrol
│   ├── services/
│   │   ├── tmdbService.js         # Integração com TMDB
│   │   └── cacheService.js        # Sistema de cache
│   ├── routes/
│   │   └── streamingRoutes.js     # Rotas da API
│   └── server.js                   # Servidor Express
├── .env.example                    # Exemplo de variáveis
├── package.json
└── README.md
```

## 🔧 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Puppeteer** - Automação de navegador (scraping)
- **TMDB API** - Dados de filmes e séries
- **node-cache** - Cache em memória

## ⚠️ Observações

- O scraping pode ser lento (5-15 segundos por streaming)
- Use cache para evitar scraping excessivo
- Respeite os termos de uso do FlixPatrol e TMDB
- A API do TMDB tem limite de 40 requisições por segundo

## 📝 Próximos Passos

Após testar, você pode:
1. Adicionar mais streamings
2. Implementar busca por data específica
3. Salvar histórico em banco de dados
4. Adicionar mais informações do TMDB
5. Criar frontend para visualizar os dados
