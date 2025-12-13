# 🎬 FlixPatrol Top 10 API

> **A API mais completa e atualizada para rankings de streaming com dados enriquecidos do TMDB em português.**

Acesse informações precisas e atuais dos **Top 10 mundiais** de Netflix, Disney+, HBO Max e Prime Video, com dados completos de filmes e séries em **português brasileiro**.

---

## 🌟 Por que usar esta API?

### ✅ Dados Sempre Atualizados
- Atualização automática **a cada 3 horas**
- Scraping direto do FlixPatrol (rankings oficiais)
- Histórico completo armazenado no Firebase

### 🎯 Enriquecimento Automático
- **TMDB Integration** - Posters, sinopses, avaliações
- **Tudo em Português (PT-BR)** - Títulos e descrições traduzidos
- **Metadados Completos** - Ano, gênero, duração, elenco

### 🚀 Performance e Confiabilidade
- **Cache inteligente** para respostas rápidas
- **Rate limiting** personalizado por usuário
- **99% uptime** com deploy no Render

### 💰 Grátis para Começar
- Planos flexíveis de uso
- Sem custo de setup
- Suporte via email

---

## 📊 O que você pode fazer?

- ✅ Exibir **Top 10 em tempo real** no seu site/app
- ✅ Criar **dashboards comparativos** entre streamings
- ✅ Analisar **tendências** e histórico
- ✅ Recomendar conteúdo baseado em popularidade
- ✅ Integrar com **sistemas de busca**
- ✅ Criar **newsletters** automáticas

---

## 🎯 Exemplo Rápido

```javascript
// Buscar Top 10 da Netflix com dados do TMDB
fetch('https://api.flixpatrol.com/api/top-10/netflix?tmdb=true', {
    headers: {
        'X-API-Key': 'sua_chave_aqui'
    }
})
.then(res => res.json())
.then(data => {
    console.log(data.overall); // Top 10 geral
    console.log(data.movies);  // Top 10 filmes
    console.log(data.tvShows); // Top 10 séries
});
```

**Resultado:** 30 itens com dados completos em PT-BR! 🇧🇷

---

## 📡 Streamings Suportados

| Streaming | Endpoint | Cobertura |
|-----------|----------|-----------|
| 🔴 **Netflix** | `/api/top-10/netflix` | Mundial |
| ⭐ **Disney+** | `/api/top-10/disney` | Mundial |
| 🎭 **HBO Max** | `/api/top-10/hbo` | Mundial |
| 📺 **Prime Video** | `/api/top-10/prime` | Mundial |
| 🌐 **Todos** | `/api/top-10/all` | Comparativo |

---

## 🚀 Como Começar

### 1️⃣ Solicitar Acesso

Entre em contato para receber sua API key:

📧 **Email:** alecust123@gmail.com  
💬 **Assunto:** Solicitação de API Key - FlixPatrol  
📝 **Inclua:** Nome do projeto, site/app, uso estimado

**Resposta em até 24h!**

### 2️⃣ Usar a API

Após receber sua chave, comece imediatamente:

👉 **[Guia do Cliente - Como Usar a API →](./CLIENT_GUIDE.md)**

Inclui:
- Exemplos rápidos em JavaScript, Python, cURL
- Como fazer requisições
- Cache e boas práticas
- Tratamento de erros

**Para referência completa de endpoints:**  
👉 **[Documentação Completa da API →](./API_USAGE.md)**

### 3️⃣ Hospedar Sua Própria API

Quer rodar o projeto completo? Firebase próprio, TMDB, deploy?

👉 **[Guia de Implementação Completa →](./IMPLEMENTATION_GUIDE.md)**

---

## 📊 Casos de Uso Reais

### 🎬 Sites de Notícias/Entretenimento
```
"Os 10 filmes mais assistidos da Netflix hoje"
"Descubra o que está bombando nos streamings"
```

### 📱 Apps de Recomendação
```
Mostrar tendências atuais
Sugerir conteúdo baseado em popularidade
```

### 📈 Dashboards Analytics
```
Comparar popularidade entre plataformas
Tracking de posições ao longo tempo
```

### 📧 Newsletters Automáticas
```
"Seu resumo semanal dos streamings"
Envio automático de novidades
```

---

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **Scraping:** Puppeteer (FlixPatrol)
- **Enriquecimento:** TMDB API
- **Database:** Firebase Firestore
- **Deploy:** Render + GitHub Actions
- **Cache:** Node-cache

---

## 📝 Recursos Adicionais

- 📘 **[Documentação da API](./API_USAGE.md)** - Referência completa
- 🎯 **[Guia de Implementação](./IMPLEMENTATION_GUIDE.md)** - Integre no seu site
- 🔐 **[ADMIN_GUIDE.md](./ADMIN_GUIDE.md)** - Para administradores
- 💻 **[POWERSHELL_GUIDE.md](./POWERSHELL_GUIDE.md)** - Comandos Windows

---

## 🤝 Suporte

Precisa de ajuda?

- 📧 **Email:** alecust123@gmail.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/Blzofando/top-10-streamings/issues)
- 📖 **Docs:** Documentação completa nos links acima

**Tempo de resposta:** Até 24 horas

---

## 🌟 Sobre o Projeto

Este projeto foi desenvolvido para fornecer dados **confiáveis e atualizados** sobre o que está em alta nos principais streamings do mundo. 

Combinamos **scraping inteligente**, **enriquecimento automático** com dados oficiais do TMDB e **historização** completa para oferecer a melhor API de rankings de streaming do mercado.

**100% desenvolvido no Brasil** 🇧🇷

---

## 📜 Licença

Este projeto e sua API são **proprietários**. 

O uso da API requer uma chave de acesso válida. Para mais informações sobre termos de uso e licenciamento, entre em contato.

---

## ⭐ Começe Agora!

1. 📧 **[Solicite sua API Key](#como-começar)**
2. 📖 **[Leia a Documentação](./API_USAGE.md)**
3. 🚀 **[Implemente no seu projeto](./IMPLEMENTATION_GUIDE.md)**

---

**Desenvolvido com ❤️ e muito café ☕**

*Última atualização: Dezembro 2025*
