# 📖 API Usage Guide

Guia completo de como usar a FlixPatrol Top 10 API.

---

## 🔑 Autenticação

Todas as requisições requerem uma **API Key** no header:

```http
X-API-Key: sua_chave_aqui
```

**Não tem uma chave?** [Solicite acesso](mailto:alecust123@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20API%20Key)

---

## 📡 Base URL

```
https://seu-app.onrender.com
```

---

## 🎯 Endpoints Principais

### 1. Top 10 Completo

Retorna overall + filmes + séries (30 itens total).

```http
GET /api/top-10/{service}?tmdb=true
```

**Parâmetros:**
- `{service}` - `netflix`, `disney`, `hbo`, `prime`, ou `all`
- `?tmdb=true` - Enriquece com dados do TMDB (recomendado)
- `?save=false` - Não salva no Firebase (opcional)

**Exemplo:**
```bash
curl -H "X-API-Key: sua_chave" \
  "https://api.com/api/top-10/netflix?tmdb=true"
```

**Resposta:**
```json
{
  "service": "Netflix",
  "date": "2025-12-12",
  "overall": [ /* 10 itens */ ],
  "movies": [ /* 10 filmes */ ],
  "tvShows": [ /* 10 séries */ ]
}
```

---

### 2. Apenas Filmes

Retorna somente os 10 filmes.

```http
GET /api/top-10/{service}/movies?tmdb=true
```

**Exemplo:**
```bash
curl -H "X-API-Key: sua_chave" \
  "https://api.com/api/top-10/netflix/movies?tmdb=true"
```

**Resposta:**
```json
{
  "service": "Netflix",
  "date": "2025-12-12",
  "type": "movies",
  "items": [
    {
      "position": 1,
      "title": "Título do Filme",
      "popularity": 9234,
      "year": 2024,
      "type": "movie",
      "tmdb": {
        "id": 12345,
        "title": "Título em PT-BR",
        "overview": "Sinopse em português...",
        "poster_path": "/abc123.jpg",
        "backdrop_path": "/xyz789.jpg",
        "vote_average": 7.8,
        "vote_count": 5432,
        "release_date": "2024-01-15",
        "genres": ["Ação", "Aventura"]
      },
      "timestamp": "2025-12-12T18:30:00.000Z"
    }
    // ... mais 9 filmes
  ]
}
```

---

### 3. Apenas Séries

Retorna somente as 10 séries.

```http
GET /api/top-10/{service}/series?tmdb=true
```

**Exemplo:**
```bash
curl -H "X-API-Key: sua_chave" \
  "https://api.com/api/top-10/netflix/series?tmdb=true"
```

---

### 4. Apenas Overall

Retorna o ranking geral (baseado em popularidade).

```http
GET /api/top-10/{service}/overall?tmdb=true
```

---

### 5. Todos os Streamings

Busca dados de todos os 4 streamings de uma vez.

```http
GET /api/top-10/all?tmdb=true
```

**Resposta:**
```json
{
  "date": "2025-12-12",
  "netflix": { /* dados completos */ },
  "disney": { /* dados completos */ },
  "hbo": { /* dados completos */ },
  "prime": { /* dados completos */ }
}
```

---

## 🎬 Dados Históricos (Firebase)

### Último Top 10 Salvo

```http
GET /api/firebase/latest/{service}/{type}
```

**Parâmetros:**
- `{service}` - `netflix`, `disney`, `hbo`, `prime`
- `{type}` - `movie`, `series`, `overall`

**Exemplo:**
```bash
curl -H "X-API-Key: sua_chave" \
  "https://api.com/api/firebase/latest/netflix/overall"
```

**Resposta:**
```json
{
  "date": "2025-12-12",
  "items": [ /* 10 itens com TMDB */ ]
}
```

### Top 10 de Data Específica

```http
GET /api/firebase/history/{service}/{type}/{date}
```

**Exemplo:**
```bash
curl -H "X-API-Key: sua_chave" \
  "https://api.com/api/firebase/history/netflix/movie/2025-12-10"
```

### Listar Datas Disponíveis

```http
GET /api/firebase/dates/{service}/{type}
```

**Resposta:**
```json
["2025-12-12", "2025-12-11", "2025-12-10", ...]
```

---

## 💻 Exemplos de Código

### JavaScript (Fetch)

```javascript
const apiKey = 'sua_chave_aqui';

fetch('https://api.com/api/top-10/netflix?tmdb=true', {
    headers: {
        'X-API-Key': apiKey
    }
})
.then(response => response.json())
.then(data => {
    console.log('Top 10 Netflix:', data.overall);
    
    // Exibir no HTML
    const html = data.overall.map(item => `
        <div class="movie-card">
            <img src="https://image.tmdb.org/t/p/w500${item.tmdb.poster_path}">
            <h3>#${item.position} - ${item.tmdb.title}</h3>
            <p>${item.tmdb.overview}</p>
            <span>⭐ ${item.tmdb.vote_average}/10</span>
        </div>
    `).join('');
    
    document.getElementById('top10').innerHTML = html;
})
.catch(error => console.error('Erro:', error));
```

### JavaScript (Axios)

```javascript
const axios = require('axios');

const config = {
    headers: {
        'X-API-Key': 'sua_chave_aqui'
    }
};

axios.get('https://api.com/api/top-10/netflix/movies?tmdb=true', config)
    .then(response => {
        const filmes = response.data.items;
        console.log(`${filmes.length} filmes encontrados`);
        
        filmes.forEach(filme => {
            console.log(`#${filme.position}: ${filme.tmdb.title} (${filme.tmdb.vote_average}/10)`);
        });
    })
    .catch(error => {
        if (error.response?.status === 429) {
            console.log('Rate limit excedido!');
        }
    });
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'sua_chave_aqui'
}

# Buscar Top 10
response = requests.get(
    'https://api.com/api/top-10/netflix?tmdb=true',
    headers=headers
)

data = response.json()

# Exibir filmes
for filme in data['movies']:
    print(f"#{filme['position']}: {filme['tmdb']['title']}")
    print(f"  Nota: {filme['tmdb']['vote_average']}/10")
    print(f"  {filme['tmdb']['overview'][:100]}...")
    print()
```

### PHP

```php
<?php
$apiKey = 'sua_chave_aqui';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.com/api/top-10/netflix?tmdb=true');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $apiKey
]);

$response = curl_exec($ch);
$data = json_decode($response, true);

foreach ($data['overall'] as $item) {
    echo "#{$item['position']}: {$item['tmdb']['title']}\n";
}

curl_close($ch);
?>
```

---

## 📊 Estrutura de Resposta

### Item Completo (com TMDB)

```typescript
{
  // Dados do FlixPatrol
  position: number,           // Posição no ranking (1-10)
  title: string,              // Título original
  popularity: number,         // Índice de popularidade
  link: string,               // URL FlixPatrol
  year: number,               // Ano de lançamento
  type: "movie" | "series",   // Tipo de conteúdo
  
  // Dados do TMDB (PT-BR)
  tmdb: {
    id: number,               // ID no TMDB
    title: string,            // Título em português
    original_title: string,   // Título original
    overview: string,         // Sinopse em português
    poster_path: string,      // Poster (/abc.jpg)
    backdrop_path: string,    // Backdrop (/xyz.jpg)
    vote_average: number,     // Nota (0-10)
    vote_count: number,       // Número de votos
    release_date: string,     // Data de lançamento
    genres: string[],         // Gêneros em português
    runtime?: number,         // Duração (filmes)
    number_of_seasons?: number // Temporadas (séries)
  },
  
  // Metadados
  timestamp: string           // Última atualização (ISO 8601)
}
```

### URLs de Imagens TMDB

```javascript
// Poster pequeno
`https://image.tmdb.org/t/p/w200${item.tmdb.poster_path}`

// Poster médio
`https://image.tmdb.org/t/p/w500${item.tmdb.poster_path}`

// Poster grande
`https://image.tmdb.org/t/p/original${item.tmdb.poster_path}`

// Backdrop
`https://image.tmdb.org/t/p/original${item.tmdb.backdrop_path}`
```

---

## ⚠️ Tratamento de Erros

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "API key obrigatória. Adicione header: X-API-Key: sua_chave"
}
```

**Solução:** Verifique se está enviando o header `X-API-Key`

### 403 Forbidden

```json
{
  "error": "Unauthorized",
  "message": "API key inválida"
}
```

**Solução:** Sua chave está incorreta ou foi revogada

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit excedido. Limite: 1000 requests/hora",
  "remaining": 0
}
```

**Solução:** Aguarde 1 hora ou upgrade seu plano

### 500 Internal Server Error

```json
{
  "error": "Erro interno do servidor",
  "message": "..."
}
```

**Solução:** Tente novamente em alguns minutos. Se persistir, contate o suporte.

---

## 🚦 Rate Limiting

Cada API key tem um limite de requisições por hora.

**Headers de Resposta:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
```

**Monitorar uso:**
```javascript
fetch('https://api.com/api/top-10/netflix', { headers })
    .then(res => {
        console.log('Limite:', res.headers.get('X-RateLimit-Limit'));
        console.log('Restante:', res.headers.get('X-RateLimit-Remaining'));
        return res.json();
    });
```

---

## 💡 Melhores Práticas

### 1. Cache Local

Não faça requisições a cada pageview:

```javascript
// Cache por 10 minutos
const CACHE_TIME = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

async function getTop10() {
    const now = Date.now();
    
    if (cache.data && (now - cache.timestamp) < CACHE_TIME) {
        return cache.data; // Retorna cache
    }
    
    const data = await fetch(/* ... */).then(r => r.json());
    cache = { data, timestamp: now };
    return data;
}
```

### 2. Tratamento de Erros

```javascript
async function fetchSafe(url, options) {
    try {
        const res = await fetch(url, options);
        
        if (!res.ok) {
            if (res.status === 429) {
                throw new Error('Rate limit excedido. Tente em 1 hora.');
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
    } catch (error) {
        console.error('Erro na API:', error);
        return null; // Ou valor padrão
    }
}
```

### 3. Lazy Loading de Imagens

```html
<img 
    src="placeholder.jpg"
    data-src="https://image.tmdb.org/t/p/w500/poster.jpg"
    loading="lazy"
    alt="Título do Filme"
>
```

---

## 🆘 Precisa de Ajuda?

- 📧 **Email:** alecust123@gmail.com
- 📖 **Documentação:** Este arquivo
- 🚀 **Implementação:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

**Tempo de resposta:** Até 24 horas

---

**Próximo passo:** [Implementar no seu site →](./IMPLEMENTATION_GUIDE.md)
