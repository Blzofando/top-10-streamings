# 🔐 Admin Guide - Gerenciamento de API Keys

## Visão Geral

Este sistema usa **três níveis de autenticação**:

| Nível | Autenticação | Acesso | Uso |
|-------|-------------|--------|-----|
| **Admin** | `X-Admin-Secret` | Gerenciar API keys | Você (administrador) |
| **Master Key** | `X-API-Key` (master) | Scraping + Cron + Firebase | Automação (cron-job.org) |
| **User Key** | `X-API-Key` (user) | Firebase (read-only) | Apps clientes |

---

## 1. Autenticação Admin

### Senha Administrativa

Todos os endpoints `/api/admin/*` requerem senha:

**Header Obrigatório**:
```
X-Admin-Secret: sua_senha_admin
```

**Senha configurada em**: `.env.local`
```bash
ADMIN_SECRET=sua_senha_super_secreta
```

> ⚠️ **Em produção**: Configure no Render Dashboard → Environment Variables

---

## 2. Tipos de API Keys

### Master Key vs User Key

| Feature | Master Key | User Key |
|---------|-----------|----------|
| **Scraping** (`/api/top-10/*`) | ✅ Sim | ❌ Não (403) |
| **Cron Jobs** (`/api/cron/*`) | ✅ Sim | ❌ Não (403) |
| **Firebase Read** (`/api/firebase/*`) | ✅ Sim | ✅ Sim |
| **Quick Endpoints** (`/api/quick/*`) | ✅ Sim | ✅ Sim |
| **Uso típico** | Automação, cron | Apps clientes |
| **Rate limit padrão** | 5000/hora | 1000/hora |

---

## 3. Gerando API Keys

### PowerShell - Master Key

```powershell
$headers = @{
    "X_API_KEY" = "sua_senha_super_secreta"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Cron Master Key"
    email = "alecust123@gmail.com"
    type = "master"
    rateLimit = 5000
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/admin/keys/generate" `
  -Headers $headers `
  -Body $body
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "key": "abc123def456...",
    "name": "Cron Master Key",
    "type": "master",
    "rateLimit": 5000,
    "createdAt": "2025-12-15T18:00:00.000Z"
  }
}
```

### PowerShell - User Key

```powershell
$headers = @{
    "X-Admin-Secret" = "sua_senha_super_secreta"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Client App"
    email = "client@example.com"
    type = "user"
    rateLimit = 1000
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/admin/keys/generate" `
  -Headers $headers `
  -Body $body
```

> **Nota**: Se omitir `type`, será criada como `"user"` por padrão (mais seguro).

### cURL - Master Key

```bash
curl -X POST http://localhost:3000/api/admin/keys/generate \
  -H "X-Admin-Secret: sua_senha_super_secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cron Master Key",
    "email": "admin@example.com",
    "type": "master",
    "rateLimit": 5000
  }'
```

### cURL - User Key

```bash
curl -X POST http://localhost:3000/api/admin/keys/generate \
  -H "X-Admin-Secret: sua_senha_super_secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Client App",
    "email": "client@example.com",
    "type": "user",
    "rateLimit": 1000
  }'
```

---

## 4. Listando API Keys

### PowerShell

```powershell
$headers = @{ "X-Admin-Secret" = "sua_senha_super_secreta" }

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/list" -Headers $headers
```

### cURL

```bash
curl -H "X-Admin-Secret: sua_senha_super_secreta" \
  http://localhost:3000/api/admin/keys/list
```

**Resposta**:
```json
{
  "success": true,
  "count": 2,
  "keys": [
    {
      "keyPreview": "abc123de...56789",
      "name": "Cron Master Key",
      "email": "admin@example.com",
      "type": "master",
      "active": true,
      "rateLimit": 5000,
      "requestCount": 1234,
      "createdAt": "2025-12-15T18:00:00.000Z"
    },
    {
      "keyPreview": "xyz789ab...12345",
      "name": "Client App",
      "email": "client@example.com",
      "type": "user",
      "active": true,
      "rateLimit": 1000,
      "requestCount": 456
    }
  ]
}
```

---

## 5. Estatísticas de Uso

### PowerShell

```powershell
$headers = @{ "X-Admin-Secret" = "sua_senha_super_secreta" }

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/stats" -Headers $headers
```

### cURL

```bash
curl -H "X-Admin-Secret: sua_senha_super_secreta" \
  http://localhost:3000/api/admin/keys/stats
```

---

## 6. Revogando API Keys

### PowerShell

```powershell
$headers = @{ "X-Admin-Secret" = "sua_senha_super_secreta" }

Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:3000/api/admin/keys/abc123def456..." `
  -Headers $headers
```

### cURL

```bash
curl -X DELETE \
  -H "X-Admin-Secret: sua_senha_super_secreta" \
  http://localhost:3000/api/admin/keys/abc123def456...
```

---

## 7. Casos de Uso

### Caso 1: App Cliente (Leitura)

**Situação**: Website que exibe top 10 aos usuários

**Solução**: Gere **User Key**

**Por quê**: Só precisa ler dados do Firebase

**Exemplo de uso pelo cliente**:
```javascript
const response = await fetch('https://your-api.com/api/quick/netflix/overall', {
  headers: {
    'X-API-Key': 'xyz789ab...' // User key
  }
});
```

---

### Caso 2: Cron Job Automático

**Situação**: Atualizar dados a cada 5 minutos

**Solução**: Gere **Master Key**

**Por quê**: Precisa executar scraping via `/api/cron/update-expired`

**Configuração cron-job.org**:
```yaml
URL: https://your-api.com/api/cron/update-expired
Method: GET
Headers:
  X-API-Key: abc123de...  # Master key
Schedule: Every 5 minutes
```

---

### Caso 3: Ferramenta Admin

**Situação**: Forçar scraping manual de um serviço

**Solução**: Use **Master Key**

**Exemplo**:
```bash
curl -H "X-API-Key: abc123de..." \
  "https://your-api.com/api/top-10/netflix?tmdb=true&save=true"
```

---

## 8. Erros Comuns

### ❌ Sem Senha Admin

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/list"
```

**Resposta (401)**:
```json
{
  "error": "Unauthorized",
  "message": "Admin authentication required. Add header: X-Admin-Secret: your_password"
}
```

---

### ❌ Senha Admin Errada

```powershell
$headers = @{ "X-Admin-Secret" = "senha_errada" }
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/list" -Headers $headers
```

**Resposta (403)**:
```json
{
  "error": "Forbidden",
  "message": "Invalid admin password"
}
```

---

### ❌ User Key Tentando Scraping

```bash
curl -H "X-API-Key: xyz789ab..." \
  https://your-api.com/api/top-10/netflix
```

**Resposta (403)**:
```json
{
  "error": "Forbidden",
  "message": "Esta operação requer uma Master API Key. Sua chave atual é do tipo \"user\" (somente leitura).",
  "hint": "Master keys podem executar scraping e cron jobs. User keys só podem ler dados do Firebase."
}
```

---

## 9. Segurança

### ✅ Boas Práticas

1. **Senha Admin**: 
   - Nunca compartilhe
   - Use senha forte em produção
   - Armazene apenas no `.env.local` ou Render Dashboard

2. **Master Keys**:
   - Guardar em variáveis de ambiente seguras
   - Rotacionar periodicamente
   - Nunca expor publicamente

3. **User Keys**:
   - Podem ser usadas em apps frontend (limitadas a leitura)
   - Ajustar rate limits conforme necessidade
   - Revogar keys não utilizadas

4. **Monitoramento**:
   - Revisar estatísticas de uso regularmente
   - Verificar tentativas de acesso negadas nos logs

### ❌ Não Fazer

1. ❌ Compartilhar senha admin
2. ❌ Commitar `.env.local` no git
3. ❌ Usar mesma key para todos os clientes
4. ❌ Hardcoded de master keys no código
5. ❌ Ignorar rate limits excedidos

---

## 10. Fluxo Completo

### Processo de Onboarding

1. **Usuário solicita acesso** (email, formulário, etc)
2. **Você (admin) aprova** a solicitação
3. **Você gera key apropriada**:
   - User key para leitura
   - Master key para automação (raro)
4. **Você envia key** para o usuário
5. **Usuário usa a key** em todas as requisições

### Exemplo de Email ao Cliente

```
Olá [Nome],

Sua API key foi gerada com sucesso!

🔑 API Key: xyz789ab...12345
📊 Rate Limit: 1000 requests/hora
📖 Tipo: User (somente leitura)

Como usar:
curl -H "X-API-Key: xyz789ab...12345" \
  https://your-api.com/api/quick/netflix/overall

Documentação: https://your-api.com/api-docs

Att,
[Seu Nome]
```

---

## 11. Produção (Render)

### Configurar Senha Admin

1. Acesse: https://dashboard.render.com
2. Selecione seu serviço
3. Vá em **Environment**
4. Adicione variável:
   - **Key**: `ADMIN_SECRET`
   - **Value**: `sua_senha_forte_aqui`
5. Salve (servidor reinicia automaticamente)

### Gerar Senha Forte

**PowerShell**:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Bash**:
```bash
openssl rand -base64 32
```

---

## Resumo Rápido

```bash
# 🔑 CRIAR MASTER KEY (admin operation)
curl -X POST https://your-api.com/api/admin/keys/generate \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: sua_senha_super_secreta" \
  -d '{"name":"Master","email":"admin@example.com","type":"master","rateLimit":5000}'

# 🔑 CRIAR USER KEY (admin operation)
curl -X POST https://your-api.com/api/admin/keys/generate \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: sua_senha_super_secreta" \
  -d '{"name":"User","email":"user@example.com","type":"user","rateLimit":1000}'

# 🚀 USAR MASTER KEY (scraping - client operation)
curl -H "X-API-Key: MASTER_KEY" \
  https://your-api.com/api/top-10/netflix?tmdb=true

# 📖 USAR USER KEY (leitura - client operation)
curl -H "X-API-Key: USER_KEY" \
  https://your-api.com/api/firebase/latest/netflix/overall
```

---

**⚠️ IMPORTANTE**: Somente você deve ter acesso à senha admin (`X-Admin-Secret`). Os usuários da API usam apenas suas API keys (`X-API-Key`).
