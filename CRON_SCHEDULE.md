# ⏰ Cron Jobs - Atualização Automática Inteligente

Este projeto usa **GitHub Actions** com **lógica de expiração inteligente** para atualizar dados de streaming.

## 🎉 Repositório Público = Execuções ILIMITADAS e GRATUITAS!

Como este é um repositório **público**, você tem:
- ✅ **Execuções ilimitadas** do GitHub Actions
- ✅ **ZERO custo** (não consome os 2.000 minutos do plano free)
- ✅ **Sem limites** de minutos mensais
- ✅ Pode rodar o quanto quiser!

## 🧠 Como Funciona

**1 único workflow** que roda **a cada 10 minutos**:

1. 🔍 Chama `/api/cron/update-expired`
2. 📊 O backend verifica timestamps no Firebase
3. ⏭️ Pula serviços com dados recentes (< 3 horas)
4. 🔄 Atualiza apenas os expirados (> 3 horas)
5. 📝 Processa sequencialmente (nunca 2 ao mesmo tempo)

### Vantagens

✅ **Totalmente gratuito** (repositório público)  
✅ **Resiliente:** Tenta a cada 10 min  
✅ **Inteligente:** Backend controla a expiração  
✅ **Seguro:** Processa um serviço por vez  
✅ **Simples:** 1 endpoint, 1 workflow  

## 📊 Exemplo de Execução

### Primeira execução (00:00)
```
🔄 Verificando dados expirados...
⏰ [netflix] Sem dados no Firebase - precisa atualizar
🔄 [netflix] INICIANDO atualização...
✅ [netflix] Atualizado!

⏰ [disney] Sem dados no Firebase - precisa atualizar
🔄 [disney] INICIANDO atualização...
✅ [disney] Atualizado!

... (todos atualizam na primeira vez)
```

### Próximas execuções (00:10, 00:20, etc)
```
🔄 Verificando dados expirados...
⏰ [netflix] Última atualização: 0.2h atrás
⏭️  [netflix] PULADO - ainda válido

⏰ [disney] Última atualização: 0.2h atrás
⏭️  [disney] PULADO - ainda válido

... (todos pulados - sem scraping)
```

### Após 3 horas (03:10)
```
🔄 Verificando dados expirados...
⏰ [netflix] Última atualização: 3.2h atrás
🔄 [netflix] INICIANDO atualização...
✅ [netflix] Atualizado!

⏰ [disney] Última atualização: 3.2h atrás
🔄 [disney] INICIANDO atualização... 
✅ [disney] Atualizado!

... (todos atualizam de novo)
```

## ⏱️ Tempo de Execução

- **Verificação rápida (todos pulados):** ~10-15 segundos  
- **1 serviço atualizando:** ~3 minutos  
- **Todos (4) atualizando:** ~12 minutos  

**Como é repositório público:** Não importa! Use o quanto precisar! 🎉

## 🔧 Configuração

### 1. Secret do GitHub

1. GitHub → **Settings** → **Secrets** → **Actions**
2. **New repository secret:**
   - Nome: `API_URL`
   - Valor: `https://seu-app.onrender.com`

### 2. Fazer Push

```bash
git add .github/workflows/cron-smart-update.yml
git commit -m "feat: cron inteligente a cada 10 min"
git push origin main
```

### 3. Ativar GitHub Pages (Opcional)

Para garantir que o repositório é público:
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main

## 🧪 Testar

### Localmente
```bash
curl http://localhost:3000/api/cron/update-expired
```

### Manualmente no GitHub
1. Actions → "Smart Update Cron"
2. Run workflow

### Ver Execuções Automáticas
1. Actions → "Smart Update Cron"
2. Ver histórico a cada 10 minutos

## 📋 Endpoints

### `GET /api/cron/update-expired`

Verifica e atualiza dados expirados.

**Resposta:**
```json
{
  "success": true,
  "timestamp": "2025-12-12T21:30:00.000Z",
  "checked": ["netflix", "disney", "hbo", "prime"],
  "updated": ["netflix", "hbo"],
  "skipped": ["disney", "prime"],
  "errors": []
}
```

### `GET /api/cron/health`

Health check do sistema.

## 🎯 Resultado Final

Com esta configuração:

- ✅ Dados **nunca** ficam mais de 3h10min desatualizados
- ✅ Sistema **resiliente** (tenta a cada 10 min)
- ✅ **Zero custo** (repositório público)
- ✅ **Zero configuração** complexa
- ✅ Backend controla tudo via timestamps

## 📈 Monitoramento

### Logs do Workflow

```
🔄 Iniciando verificação inteligente de dados expirados...
📅 Thu Dec 12 21:30:00 UTC 2025
📊 Status HTTP: 200
✅ Cron job executado com sucesso!

📋 Resumo:
"updated":["netflix","hbo"]
"skipped":["disney","prime"]
```

### Ver Histórico

GitHub Actions mostra:
- ✅ Execuções bem-sucedidas (verde)
- ❌ Falhas (vermelho)
- Duração de cada execução
- Logs completos

## 🚨 Troubleshooting

**Workflow não executa:**
- Secret `API_URL` configurado?
- Repositório está público?
- Workflow está na branch `main`?

**Sempre atualiza tudo:**
- Verifique timestamps no Firebase
- Campo `timestamp` está sendo salvo?

**Erro 500:**
- Render em sleep mode? (normal na primeira req)
- Verifique logs do Render

## 💡 Dicas

**Quer atualizar mais rápido?**
```yaml
cron: '*/5 * * * *'  # A cada 5 min (mínimo permitido)
```

**Quer atualizar menos?**
```yaml
cron: '*/30 * * * *'  # A cada 30 min
```

**Quer pausar temporariamente?**
1. Actions → Smart Update Cron
2. Menu ... → Disable workflow

---

**🎉 Pronto!** Seu sistema está configurado para manter os dados sempre atualizados, gratuitamente, para sempre!
