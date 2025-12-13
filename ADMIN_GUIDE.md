# 🔐 Admin Endpoints - Protegidos com Senha

## Como Usar Endpoints Admin

Todos os endpoints `/api/admin/*` agora requerem **senha de administrador**.

### Header Obrigatório

```
X-Admin-Secret: @#Chopuchai.20
```

## PowerShell - Gerar API Key

```powershell
$headers = @{
    "X-Admin-Secret" = "@#Chopuchai.20"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Nome do Usuário"
    email = "email@usuario.com"
    rateLimit = 100000
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/admin/keys/generate" `
  -Headers $headers `
  -Body $body
```

## PowerShell - Listar Keys

```powershell
$headers = @{ "X-Admin-Secret" = "@#Chopuchai.20" }

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/list" -Headers $headers
```

## PowerShell - Ver Estatísticas

```powershell
$headers = @{ "X-Admin-Secret" = "@#Chopuchai.20" }

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/stats" -Headers $headers
```

## PowerShell - Revogar Key

```powershell
$headers = @{ "X-Admin-Secret" = "@#Chopuchai.20" }

Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:3000/api/admin/keys/abc123..." `
  -Headers $headers
```

## cURL (Bash)

```bash
# Gerar key
curl -X POST http://localhost:3000/api/admin/keys/generate \
  -H "X-Admin-Secret: @#Chopuchai.20" \
  -H "Content-Type: application/json" \
  -d '{"name":"Usuario","email":"email@example.com","rateLimit":100000}'

# Listar keys
curl -H "X-Admin-Secret: @#Chopuchai.20" \
  http://localhost:3000/api/admin/keys/list

# Stats
curl -H "X-Admin-Secret: @#Chopuchai.20" \
  http://localhost:3000/api/admin/keys/stats

# Revogar
curl -X DELETE \
  -H "X-Admin-Secret: @#Chopuchai.20" \
  http://localhost:3000/api/admin/keys/abc123...
```

## ❌ Sem Senha

```powershell
# Vai retornar erro 401
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/list"
```

**Resposta:**
```json
{
  "error": "Unauthorized",
  "message": "Admin authentication required. Add header: X-Admin-Secret: your_password"
}
```

## ❌ Senha Errada

```powershell
$headers = @{ "X-Admin-Secret" = "senha_errada" }
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/keys/list" -Headers $headers
```

**Resposta:**
```json
{
  "error": "Forbidden",
  "message": "Invalid admin password"
}
```

## 🔒 Segurança

- ✅ Senha armazenada apenas no `.env.local` (não commitado)
- ✅ Todos os endpoints admin protegidos
- ✅ Usuários da API **não** precisam da senha admin
- ✅ Usuários usam apenas suas API keys

## 📝 Fluxo Completo

1. **Usuário solicita acesso** (email, contato, etc)
2. **Você (admin) aprova**
3. **Você gera key** usando senha admin
4. **Você envia key** para o usuário
5. **Usuário usa a key** em todas as requisições

---

**⚠️ IMPORTANTE:** NUNCA compartilhe a senha admin! Só você deve ter acesso aos endpoints `/api/admin/*`.
