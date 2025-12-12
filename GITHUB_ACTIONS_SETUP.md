# 🚀 Setup GitHub Actions - Cron Inteligente (Repositório Público)

Configuração do sistema de atualização automática **GRATUITO e ILIMITADO**.

## 🎉 Boa Notícia: Repositório Público = Grátis!

Como este repositório é **público**:
- ✅ **Execuções ilimitadas** no GitHub Actions
- ✅ **ZERO custo** (não conta na cota de 2.000 minutos)
- ✅ Pode rodar a cada 10 minutos, 24/7, para sempre!

## 🔧 Setup em 3 Passos

### Passo 1: Configurar Secret

1. Vá para seu repositório no GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret:**
   - **Name:** `API_URL`
   - **Secret:** `https://seu-app.onrender.com`
4. **Add secret**

> ⚠️ **Importante:** Use apenas a URL base, sem `/api/...` no final!

### Passo 2: Push do Código

```bash
git add .
git commit -m "feat: cron inteligente com verificação de expiração"
git push origin main
```

**Pronto!** O workflow já está ativo e rodará a cada 10 minutos.

### Passo 3: Verificar

1. GitHub → **Actions**
2. Veja o workflow "Smart Update Cron"
3. Aguarde 10 minutos para primeira execução automática
4. Ou clique em "Run workflow" para testar imediatamente

## 📊 O que o Cron Faz

A cada 10 minutos:

1. 🔍 Chama `https://seu-app.onrender.com/api/cron/update-expired`
2. 📊 Backend verifica timestamps no Firebase de cada serviço
3. ⏭️ Pula serviços atualizados há menos de 3 horas
4. 🔄 Atualiza apenas os expirados (> 3 horas)
5. ✅ Retorna resumo (updated/skipped/errors)

**Resultado:** Dados sempre atualizados, sem desperdício de recursos!

## 🧪 Testar

### Teste Local
```bash
# Com servidor rodando localmente
curl http://localhost:3000/api/cron/update-expired
```

Você verá:
```json
{
  "success": true,
  "checked": ["netflix", "disney", "hbo", "prime"],
  "updated": ["netflix"],
  "skipped": ["disney", "hbo", "prime"],
  "errors": []
}
```

### Teste no GitHub
1. Actions → "Smart Update Cron"
2. **Run workflow** → **Run workflow**
3. Aguarde 10-30 segundos a 12 minutos
4. Veja os logs

## ⏱️ Ajustar Frequência (Opcional)

Edite `.github/workflows/cron-smart-update.yml`:

```yaml
# A cada 10 minutos (padrão - recomendado)
- cron: '*/10 * * * *'

# A cada 5 minutos (mínimo do GitHub, muito responsivo)
- cron: '*/5 * * * *'

# A cada 15 minutos (menos verificações)
- cron: '*/15 * * * *'

# A cada 30 minutos (bem espaçado)
- cron: '*/30 * * * *'

# A cada hora (muito espaçado)
- cron: '0 * * * *'
```

**Recomendação:** Deixe em **10 minutos**. Como é gratuito, não há problema!

## 📈 Monitoramento

### Ver Execuções

1. GitHub → **Actions**
2. "Smart Update Cron"
3. Histórico de todas as execuções

### Entender os Logs

```bash
🔄 Iniciando verificação inteligente...
📅 Thu Dec 12 21:30:00 UTC 2025

📊 Status HTTP: 200
✅ Cron job executado com sucesso!

📋 Resumo:
"updated":["netflix"]     # Atualizou Netflix (expirado)
"skipped":["disney","hbo","prime"]  # Outros ainda válidos
```

### Ver no Firebase

1. [Firebase Console](https://console.firebase.google.com/project/flixpatrol-api/firestore)
2. `top10-streaming/netflix/overall-2025-12-12/1`
3. Verifique o campo `timestamp`

## 💰 Custos

### GitHub Actions
- **Custo:** R$ 0,00 (repositório público)
- **Limite:** Ilimitado
- **Restrições:** Nenhuma

### Render (Backend)
- **Plano Free:** Servidor pode entrar em sleep após 15 min de inatividade
- **Solução:** O cron acorda o serviço a cada 10 min automaticamente!
- **Custo adicional:** Nenhum (tudo no plano free)

### Firebase
- **Plano Spark (Free):**
  - 50.000 leituras/dia
  - 20.000 escritas/dia
- **Nosso uso:** ~32 escritas/dia (muito abaixo do limite)
- **Custo:** R$ 0,00

## 🔄 Pausar/Reativar

### Pausar
1. Actions → "Smart Update Cron"
2. **...** → **Disable workflow**

### Reativar
1. Actions → "Smart Update Cron"
2. **Enable workflow**

## ❓ FAQ

**Por que a cada 10 minutos se só atualiza a cada 3 horas?**
- Para ser resiliente! Se uma execução falhar, tenta novamente em 10 min
- Acorda o Render do sleep mode
- Garante dados sempre atualizados

**Não vai gastar muitos minutos do GitHub?**
- Não! Repositório público = ilimitado e gratuito!

**E se o Render estiver dormindo?**
- Primeira requisição acorda (~30s)
- Próximas são rápidas
- O cron mantém acordado (req a cada 10 min)

**Posso forçar atualização manual?**
- Sim! Actions → Run workflow
- Ou chame direto: `curl https://seu-app.onrender.com/api/top-10/netflix?tmdb=true`

## 🎯 Checklist Final

- [ ] Secret `API_URL` configurado no GitHub
- [ ] Código com push na branch `main`
- [ ] Workflow aparece em Actions
- [ ] Teste manual executado com sucesso
- [ ] Firebase recebendo dados
- [ ] Monitoramento ativo nos primeiros dias

**Pronto! 🎉 Tudo configurado e rodando gratuitamente!**
