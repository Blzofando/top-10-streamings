# 📖 Guia do Cliente - Como Usar a API

Guia para desenvolvedores que querem **consumir a FlixPatrol API** em seus projetos.

---

## 🔑 Começando

### 1. Solicitar API Key

📧 **Email:** alecust123@gmail.com  
💬 **Assunto:** Solicitação de API Key  
📝 **Incluir:** Nome do projeto, site/app, uso estimado

**Resposta em até 24h** com sua chave de acesso!

### 2. Autenticação

Todas as requisições precisam do header:

```http
X-API-Key: sua_chave_recebida_por_email
```

---

## 🎯 Exemplos Rápidos

### JavaScript (Fetch)

```javascript
const apiKey = 'sua_chave_aqui';
const apiUrl = 'https://flixpatrol-api.onrender.com';

fetch(`${apiUrl}/api/top-10/netflix?tmdb=true`, {
    headers: {
        'X-API-Key': apiKey
    }
})
.then(res => res.json())
.then(data => {
    console.log('Top 10:', data.overall);
});
```

### Python

```python
import requests

headers = {'X-API-Key': 'sua_chave_aqui'}
response = requests.get(
    'https://flixpatrol-api.onrender.com/api/top-10/netflix?tmdb=true',
    headers=headers
)

data = response.json()
print(f"Top #1: {data['overall'][0]['tmdb']['title']}")
```

### cURL

```bash
curl -H "X-API-Key: sua_chave" \
  "https://flixpatrol-api.onrender.com/api/top-10/netflix?tmdb=true"
```

---

## 📡 Endpoints Disponíveis

Ver documentação completa: **[API_USAGE.md](./API_USAGE.md)**

**Principais:**
- `/api/top-10/netflix` - Top 10 completo Netflix
- `/api/top-10/netflix/movies` - Só filmes
- `/api/top-10/netflix/series` - Só séries
- `/api/top-10/all` - Todos os streamings
- `/api/firebase/latest/netflix/overall` - Histórico

---

## 🎨 Exemplo Prático - Exibir Top 10

```html
<!DOCTYPE html>
<html>
<head>
    <title>Top 10 Netflix</title>
    <style>
        .movie-card {
            display: inline-block;
            width: 200px;
            margin: 10px;
        }
        .movie-card img {
            width: 100%;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <h1>🔴 Top 10 Netflix Hoje</h1>
    <div id="top10"></div>

    <script>
        const API_KEY = 'sua_chave_aqui';
        const API_URL = 'https://flixpatrol-api.onrender.com/api/top-10/netflix?tmdb=true';

        fetch(API_URL, {
            headers: { 'X-API-Key': API_KEY }
        })
        .then(res => res.json())
        .then(data => {
            const html = data.overall.map(item => `
                <div class="movie-card">
                    <img src="https://image.tmdb.org/t/p/w500${item.tmdb.poster_path}">
                    <h3>#${item.position}: ${item.tmdb.title}</h3>
                    <p>⭐ ${item.tmdb.vote_average}/10</p>
                </div>
            `).join('');
            
            document.getElementById('top10').innerHTML = html;
        });
    </script>
</body>
</html>
```

---

## 🚦 Rate Limiting

Seu plano tem um limite de requests/hora.

**Verificar limite restante:**

```javascript
fetch(url, { headers })
    .then(res => {
        console.log('Limite:', res.headers.get('X-RateLimit-Limit'));
        console.log('Restante:', res.headers.get('X-RateLimit-Remaining'));
        return res.json();
    });
```

---

## 💡 Melhores Práticas

### 1. Cache Local (10 minutos)

```javascript
let cache = { data: null, timestamp: 0 };
const CACHE_TIME = 10 * 60 * 1000; // 10 min

async function getTop10() {
    if (cache.data && (Date.now() - cache.timestamp) < CACHE_TIME) {
        return cache.data;
    }
    
    const data = await fetch(url, { headers }).then(r => r.json());
    cache = { data, timestamp: Date.now() };
    return data;
}
```

### 2. Tratamento de Erros

```javascript
try {
    const res = await fetch(url, { headers });
    
    if (res.status === 429) {
        alert('Limite de requisições excedido. Aguarde 1 hora.');
        return;
    }
    
    if (!res.ok) throw new Error('Erro na API');
    
    const data = await res.json();
    // ... usar dados
} catch (error) {
    console.error('Erro:', error);
}
```

### 3. Nunca Expor API Key no Frontend

❌ **ERRADO:**
```html
<script>
    const KEY = 'abc123...'; // Visível no código!
</script>
```

✅ **CORRETO:**
```javascript
// Use variável de ambiente
const KEY = process.env.REACT_APP_API_KEY;

// OU proxy pelo seu backend
fetch('/api/top10') // Seu servidor
```

---

## 📚 Documentação Completa

- 📘 **[API_USAGE.md](./API_USAGE.md)** - Todos os endpoints e exemplos
- 🎯 **[Casos de Uso](./API_USAGE.md#exemplos-de-código)** - React, Vue, PHP
- ⚠️ **[Erros Comuns](./API_USAGE.md#tratamento-de-erros)** - Troubleshooting

---

## 🆘 Suporte

**Problemas?**  
📧 alecust123@gmail.com

**Tempo de resposta:** 24 horas

---

**Quer hospedar sua própria API?**  
👉 [Veja o Guia de Implementação](./IMPLEMENTATION_GUIDE.md)
