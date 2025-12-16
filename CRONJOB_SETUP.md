# Configuração de Cron Job - cron-job.org

## ✨ Solução Fire and Forget Implementada!

**Ótimas notícias!** Este projeto agora usa o padrão **"Fire and Forget"** no endpoint de cron:

- ✅ **Resposta imediata em <1 segundo** (200 OK)
- ✅ **Processamento continua em background** (até 5 minutos)
- ✅ **Funciona com plano FREE** do cron-job.org (limite de 30s)
- ✅ **Sem timeouts!** O serviço de cron recebe resposta rápida

Você pode usar qualquer serviço de cron gratuito sem se preocupar com limites de timeout! 🎉

---

## Por que usar cron-job.org?

O **cron-job.org** é um serviço gratuito de agendamento de tarefas HTTP que oferece:
- ✅ Execuções gratuitas ilimitadas
- ✅ Interface web simples
- ✅ Histórico de execuções
- ✅ Notificações de erro por email
- ✅ **Funciona perfeitamente com Fire and Forget** (plano free)

---

## Passo a Passo de Configuração

### 1. Criar Conta no cron-job.org

1. Acesse: **https://cron-job.org**
2. Clique em **"Sign Up"** (Cadastrar)
3. Preencha email e senha
4. Confirme o email

### 2. Gerar Master API Key

> **⚠️ IMPORTANTE**: O endpoint de cron agora **requer Master API Key** para executar.

**Gere uma Master Key via admin endpoint:**

```bash
curl -X POST https://top-10-streamings.onrender.com/api/admin/keys/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cron Job Master Key",
    "email": "admin@example.com",
    "type": "master",
    "rateLimit": 5000
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "key": "a1b2c3d4e5f6g7h8i9j0...",
    "name": "Cron Job Master Key",
    "type": "master",
    "rateLimit": 5000
  }
}
```

**⚠️ Salve essa key!** Você vai precisar dela no próximo passo.

> 📚 Para mais detalhes sobre tipos de keys, veja [API_KEY_TYPES.md](file:///b:/Application/flixpatrol2/API_KEY_TYPES.md)

### 3. Criar Novo Cron Job

1. Após login, clique em **"Create cronjob"**
2. Preencha os campos:

#### Configurações Básicas

**Title (Título)**:
```
FlixPatrol - Smart Update
```

**Address (URL)**:
```
https://top-10-streamings.onrender.com/api/cron/update-expired
```

**Request Method**:
```
GET
```

**Headers** ⭐ **NOVO - OBRIGATÓRIO**:
```
X-API-Key: sua_master_key_aqui
```

> 🔑 Cole a Master API Key que você gerou no passo 2

#### Configurações de Agendamento

**Schedule Type (Tipo de Agendamento)**:
- Selecione: **"Every X minutes"** (A cada X minutos)

**Interval (Intervalo)**:
```
5 minutes
```
> ⏱️ A cada 5 minutos, o sistema verifica qual serviço (Netflix, Disney, HBO, Prime, Apple) está mais desatualizado (>3h) e atualiza apenas esse. Com 5 serviços, todos são atualizados em ~25 minutos.

**Time zone (Fuso horário)**:
```
America/Sao_Paulo (UTC-3)
```

#### Configurações Avançadas (Opcional)

**Execution schedule**:
- Mantenha **"Enabled 24/7"** (Habilitado 24/7)

**Save responses**:
- ✅ **Habilitado** (útil para debug)
- Últimas 10 respostas

**Notifications (Notificações)**:
- ✅ **Notify on failure** (Notificar em caso de falha)
- Email: seu-email@example.com

**Request timeout** (Opcional):
```
30 seconds (padrão do plano free)
```
> ✅ **Fire and Forget**: O endpoint agora responde em <1s. Você pode manter o timeout padrão de 30s do plano free! O processamento continua em background mesmo após a resposta.

---

## Configurações Recomendadas Completas

```yaml
Title: FlixPatrol - Smart Update
URL: https://top-10-streamings.onrender.com/api/cron/update-expired
Method: GET
Headers:
  X-API-Key: sua_master_key_aqui  # ⭐ OBRIGATÓRIO
Schedule: Every 5 minutes
Timezone: America/Sao_Paulo (UTC-3)
Enabled: 24/7
Request timeout: 30 seconds  # ✅ Plano FREE funciona!
Save responses: Yes (last 10)
Notify on failure: Yes
```

> 🔑 **Lembre-se**: Substitua `sua_master_key_aqui` pela Master Key gerada no passo 2
> ✅ **Fire and Forget**: O processamento continua mesmo após resposta de 1s!

---

## 3. Verificar Funcionamento

### Primeira Execução Manual

1. Na lista de cron jobs, clique em **"Run now"** (Executar agora)
2. **Aguarde apenas ~1 segundo** para receber resposta
3. Verifique o **histórico de execuções**
4. Busque por **Status 200** e resposta JSON

### Exemplo de Resposta de Sucesso (Fire and Forget)

```json
{
  "success": true,
  "message": "Cron job iniciado em background",
  "timestamp": "2025-12-15T21:00:00.000Z",
  "status": "processing"
}
```

> ✅ Esta resposta vem em **<1 segundo**. O scraping continua rodando em background por até 5 minutos!

### Monitorar nas Próximas Horas

- ✅ Verificar que execuções acontecem a cada 5 minutos
- ✅ Checar que diferentes serviços são atualizados ao longo do tempo
- ✅ Confirmar que não há timeouts (com as novas melhorias)

---

## 4. Monitoramento e Logs

### No cron-job.org

**Acessar histórico**:
1. Dashboard → Seu cron job
2. Aba **"History"**
3. Visualize últimas execuções

**Indicadores de sucesso**:
- ✅ HTTP Status: **200**
- ✅ Response time: **< 300s**
- ✅ No error messages

### No Render (Logs da Aplicação)

1. Acesse: https://dashboard.render.com
2. Abra seu serviço **top-10-streamings**
3. Aba **"Logs"**
4. Busque por:
   ```
   🔄 ===== CRON JOB: Verificando serviço mais desatualizado =====
   ✅ [netflix] Atualizado com sucesso!
   ```

---

## Pausar/Retomar Cron Job

### Pausar Temporariamente

1. Dashboard → Seu cron job
2. Toggle **"Enabled"** para OFF
3. Cron job para de executar

### Retomar

1. Toggle **"Enabled"** para ON
2. Execuções retornam automaticamente

---

## Alternativa: GitHub Actions (Manual)

O workflow do GitHub Actions ainda está configurado para execução **manual**. Para executar:

1. Acesse: https://github.com/seu-usuario/flixpatrol2/actions
2. Selecione workflow **"Smart Update Cron"**
3. Clique em **"Run workflow"**
4. O endpoint será chamado uma vez

> ⚠️ **Nota**: O agendamento automático (`schedule: cron`) foi comentado. Para reativar, descomente as linhas em `.github/workflows/cron-smart-update.yml`.

---

## Troubleshooting

### Erro: "HTTP 401 Unauthorized"

**Causa**: Master API Key inválida ou ausente

**Solução**:
- Verificar se o header `X-API-Key` está configurado corretamente
- Gerar uma nova Master Key se necessário
- Conferir se não há espaços extras na key

### Erro: "HTTP 500"

**Causa**: Erro interno no servidor

**Solução**:
- Verificar logs do Render
- Procurar por erros de scraping ou Firebase
- Com as melhorias (retry + Fire and Forget), isso deve ser raro

### Erro: "Connection refused"

**Causa**: Render pode estar em cold start

**Solução**:
- Aguardar 30-60 segundos e tentar novamente
- Render pode demorar para "acordar" em planos gratuitos
- ✅ Fire and Forget garante que mesmo em cold start a resposta é rápida

---

## Custo e Limites

### cron-job.org (Plano Free)

- ✅ **Cron jobs**: Até 3 simultâneos
- ✅ **Execuções**: Ilimitadas
- ✅ **Frequência mínima**: 1 minuto
- ✅ **Request timeout**: 30 segundos (suficiente com Fire and Forget!)

> 🎉 **Plano FREE funciona perfeitamente!** Com Fire and Forget, não é necessário plano pago.

### Render (Plano Free)

- ✅ **Cold starts**: Serviço "dorme" após 15 minutos de inatividade
- ✅ **Execuções**: 750h/mês grátis
- ⚠️ **Nota**: Com cron a cada 5 minutos, o serviço ficará sempre ativo (24h × 30 dias = 720h/mês)

---

## Resumo

✨ **Fire and Forget Implementado!**

1. ✅ Criar conta no **cron-job.org** (plano FREE funciona!)
2. ✅ Gerar **Master API Key** via endpoint admin
3. ✅ Configurar cron job para executar **a cada 5 minutos**
4. ✅ URL: `https://top-10-streamings.onrender.com/api/cron/update-expired`
5. ✅ Header: `X-API-Key: sua_master_key`
6. ✅ Timeout: **30 segundos** (plano free é suficiente!)
7. ✅ Monitorar logs no Render e histórico no cron-job.org

**Pronto!** Seu sistema estará atualizando automaticamente os top 10 a cada 5 minutos, com resposta em <1 segundo! 🎉
