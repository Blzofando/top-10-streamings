# 🛠️ Guia de Implementação do Projeto

Guia completo para **clonar e rodar seu próprio** FlixPatrol API com Firebase, TMDB e deploy.

---

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Git instalado
- Conta GitHub (gratuita)
- Conta Google (para Firebase)
- Conta TMDB (para API key)
- Conta Render (para deploy - gratuito)

---

## 🚀 Passo 1: Clonar o Repositório

```bash
git clone https://github.com/Blzofando/top-10-streamings.git
cd top-10-streamings
npm install
```

---

## 🔑 Passo 2: Obter TMDB API Key

### 2.1 Criar Conta TMDB

1. Acesse: https://www.themoviedb.org/signup
2. Preencha seus dados
3. Confirme email

### 2.2 Solicitar API Key

1. Login → **Settings** (canto superior direito)
2. Menu lateral → **API**
3. Clique em **"Create"** ou **"Request an API Key"**
4. Escolha: **Developer**
5. Preencha formulário:
   - **Type of Use:** Website
   - **Application Name:** Meu Site Top 10
   - **Application URL:** Seu site (ou `http://localhost:3000`)
   - **Application Summary:** Sistema de ranking de streamings
6. Aceite termos
7. **Copie a API Key (v3 auth)**

Exemplo: `f75b3a1c8198ef984e4daa01a79a9eed`

---

## 🔥 Passo 3: Configurar Firebase

### 3.1 Criar Projeto Firebase

1. Acesse: https://console.firebase.google.com/
2. **Adicionar projeto**
3. Nome: `flixpatrol-api` (ou seu nome)
4. **Desabilitar** Google Analytics (opcional)
5. **Criar projeto**

### 3.2 Ativar Firestore

1. No menu lateral → **Firestore Database**
2. **Criar banco de dados**
3. Escolha: **Modo de produção**
4. Location: `southamerica-east1` (São Paulo) ou mais próximo
5. **Ativar**

### 3.3 Gerar Credenciais de Serviço

1. ⚙️ **Configurações do projeto** (roda dentada ao lado do nome)
2. Aba **Contas de serviço**
3. **Gerar nova chave privada**
4. Salva o arquivo JSON (NÃO COMMITE!)
5. Abra o arquivo e copie os valores:

```json
{
  "project_id": "flixpatrol-api",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@flixpatrol-api.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "client_x509_cert_url": "https://www.googleapis.com/robot/..."
}
```

---

## ⚙️ Passo 4: Configurar Variáveis de Ambiente

### 4.1 Criar `.env.local`

Crie o arquivo na raiz do projeto:

```env
# TMDB API
TMDB_API_KEY=f75b3a1c8198ef984e4daa01a79a9eed

# Firebase (copie do JSON baixado)
FIREBASE_PROJECT_ID=flixpatrol-api
FIREBASE_PRIVATE_KEY_ID=abc123def456...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@flixpatrol-api.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789012345
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# Puppeteer (Chrome local - Windows)
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# Puppeteer (Chrome local - Mac)
# PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Puppeteer (Chrome local - Linux)
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Servidor
PORT=3000
CACHE_TTL=3600

# Admin (defina SUA senha para gerar API keys)
ADMIN_SECRET=SuaSenhaSuperSecreta123
```

**⚠️ IMPORTANTE:** 
- No `FIREBASE_PRIVATE_KEY`, mantenha as `\n` (quebras de linha)
- Adicione `.env.local` ao `.gitignore` (já está!)

### 4.2 Validar `.gitignore`

Confirme que `.env.local` está no `.gitignore`:

```bash
cat .gitignore
```

Deve conter:
```
node_modules/
.env
.env.local
*.log
.DS_Store
```

---

## 🧪 Passo 5: Testar Localmente

```bash
# Instalar dependências (se ainda não fez)
npm install

# Rodar servidor
npm start
```

Abra: http://localhost:3000

Deve ver:
```json
{
  "message": "🎬 FlixPatrol API com Firebase + Auth",
  "version": "2.1.0",
  ...
}
```

### 5.1 Gerar Primeira API Key

PowerShell:
```powershell
$headers = @{
    "X-Admin-Secret" = "SuaSenhaSuperSecreta123"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Meu Projeto"
    email = "seu@email.com"
    rateLimit = 100000
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/admin/keys/generate" `
  -Headers $headers `
  -Body $body
```

Copie a `key` retornada!

### 5.2 Testar Endpoint

```powershell
$headers = @{ "X-API-Key" = "cole_a_key_aqui" }

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/top-10/netflix?tmdb=true" `
  -Headers $headers
```

Deve retornar Top 10 da Netflix! 🎉

---

## 🌐 Passo 6: Deploy no Render

### 6.1 Criar Conta Render

1. Acesse: https://render.com/
2. **Sign Up** (pode usar GitHub)

### 6.2 Criar Web Service

1. Dashboard → **New** → **Web Service**
2. **Connect repository** (autorize GitHub)
3. Selecione: `top-10-streamings`
4. Configure:
   - **Name:** `flixpatrol-api` (ou seu nome)
   - **Region:** Ohio (US East) ou mais próximo
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### 6.3 Configurar Environment Variables

Na seção **Environment**:

```
TMDB_API_KEY=sua_chave_tmdb
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_CLIENT_X509_CERT_URL=...
ADMIN_SECRET=SuaSenhaAdmin
PORT=3000
```

**⚠️ CRÍTICO:** No Render, `FIREBASE_PRIVATE_KEY` precisa ter `\n` literais!

### 6.4 Deploy

1. **Create Web Service**
2. Aguarde build (~5 min)
3. Copie a URL: `https://seu-app.onrender.com`

### 6.5 Testar Deploy

```bash
curl https://seu-app.onrender.com
```

Deve retornar a documentação da API!

---

## ⏰ Passo 7: Configurar Cron Jobs (GitHub Actions)

### 7.1 Criar Secret no GitHub

1. Seu repositório → **Settings**
2. **Secrets and variables** → **Actions**
3. **New repository secret:**
   - Name: `API_URL`
   - Value: `https://seu-app.onrender.com`
4. **Add secret**

### 7.2 Ativar Workflow

O arquivo `.github/workflows/cron-smart-update.yml` já está configurado!

Ele vai:
- ✅ Rodar a cada 10 minutos
- ✅ Verificar dados expirados (> 3h)
- ✅ Atualizar automaticamente
- ✅ **GRATUITO** (repositório público)

### 7.3 Testar Manualmente

1. GitHub → **Actions**
2. "Smart Update Cron"
3. **Run workflow**
4. Aguarde e veja os logs

---

## 🔐 Passo 8: Segurança em Produção

### 8.1 Proteger Endpoints Admin

Os endpoints já estão protegidos com `ADMIN_SECRET`!

### 8.2 Configurar CORS (opcional)

Edite `src/server.js` para permitir apenas SEU domínio:

```javascript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://seu-site.com');
    // ... resto
});
```

### 8.3 Revogar Credenciais Antigas

Se você commitou credenciais por acidente:

1. Firebase Console → Service Accounts
2. **Generate new private key**
3. Atualize `.env.local` e Render
4. Delete a antiga

---

## 📊 Passo 9: Monitoramento

### 9.1 Firebase Console

- Ver dados salvos
- Monitorar leituras/escritas
- Verificar timestamps

### 9.2 Render Dashboard

- Logs em tempo real
- Uso de CPU/RAM
- Deploy history

### 9.3 GitHub Actions

- Histórico de cron jobs
- Success/failure rates
- Logs de execução

---

## 🎯 Estrutura Final

```
seu-projeto/
├── .github/
│   └── workflows/
│       └── cron-smart-update.yml  # Cron automático
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scrapers/
│   ├── services/
│   └── server.js
├── .env.local                      # NUNCA commitar!
├── .gitignore
├── package.json
└── README.md
```

---

## 🆘 Troubleshooting

**Erro Firebase:** "credentials not found"
- Verifique as 6 variáveis `FIREBASE_*`
- Confirme `FIREBASE_PRIVATE_KEY` com `\n`

**Erro TMDB:** "Invalid API key"
- Confirme chave copiada corretamente
- Verifique se ativou a API key no TMDB

**Puppeteer erro:** "Chrome not found"
- No Render, usa `@sparticuz/chromium` automaticamente
- Local: configure `PUPPETEER_EXECUTABLE_PATH`

**Cron não roda:**
- Secret `API_URL` configurado?
- Workflow está na branch `main`?
- Repositório é público?

**Rate limit no GitHub Actions:**
- Impossível! Repositório público = ilimitado

---

## 🎓 Próximos Passos

✅ Tudo funcionando? Parabéns! 🎉

Agora você pode:

1. **Customizar:** Adicionar mais streamings
2. **Melhorar:** Adicionar notificações, webhooks
3. **Escalar:** Upgrade planos Render/Firebase
4. **Monetizar:** Venda acesso à sua API!

---

## 💡 Dicas Profissionais

### Múltiplos Ambientes

```
.env.local       # Desenvolvimento
.env.production  # Produção (no Render)
.env.test        # Testes
```

### Validação de Env Vars

Adicione em `src/server.js`:

```javascript
const requiredEnvVars = [
    'TMDB_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'ADMIN_SECRET'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`❌ Variável ${varName} não configurada!`);
        process.exit(1);
    }
});
```

### Backup Firebase

```bash
# Exportar dados
firebase firestore:export backup/
```

---

## 🤝 Suporte

Problemas durante a implementação?

📧 **Email:** alecust123@gmail.com  
🐛 **Issues:** [GitHub](https://github.com/Blzofando/top-10-streamings/issues)

---

**Documentação atualizada:** Dezembro 2025  
**Versão do projeto:** 2.1.0
