# 🔧 Correção do Timeout no Scraper FlixPatrol

## 🐛 Problema Original
Erro: `Navigation timeout of 180000 ms exceeded` ao tentar carregar páginas do FlixPatrol.

## ✅ Soluções Implementadas

### 1. **Mudança na Estratégia de Carregamento**
- **Antes**: `waitUntil: 'networkidle2'`
  - Espera até não haver mais de 2 conexões de rede ativas por 500ms
  - Pode travar indefinidamente se algum recurso externo não carregar (anúncios, analytics)
  
- **Depois**: `waitUntil: 'domcontentloaded'`
  - Espera apenas até o DOM estar pronto
  - Muito mais rápido e confiável
  - Adicionado `waitForTimeout(3000)` para permitir JavaScript executar

### 2. **Headers Anti-Detecção de Bot**
Adicionado headers realistas para evitar bloqueio:
```javascript
await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);

await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
});
```

### 3. **Viewport Realista**
Configurado para desktop padrão:
```javascript
await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
});
```

### 4. **Argumentos do Chrome Melhorados**
Adicionado argumentos para melhor performance:
- `--disable-dev-shm-usage` - Evita problemas de memória compartilhada
- `--disable-gpu` - Desabilita GPU (não necessário em headless)
- `--disable-accelerated-2d-canvas` - Melhora performance
- `--window-size=1920,1080` - Tamanho da janela

### 5. **Timeout Otimizado**
- Reduzido de 180s (3 min) para 120s (2 min) no `page.goto()`
- Timeout de 15s para `waitForSelector()` com tratamento de erro
- Continua tentando extrair dados mesmo se as tabelas demorarem mais

### 6. **Debug em Desenvolvimento**
Adicionado screenshot automático em caso de erro:
```javascript
if (process.env.NODE_ENV !== 'production') {
    const screenshotPath = `debug-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot salvo em: ${screenshotPath}`);
}
```

### 7. **Executablepath Corrigido**
Adicionado fallback para encontrar o Chrome automaticamente em desenvolvimento:
```javascript
executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
```

## 📊 Resultados do Teste

```
✅ Teste concluído com sucesso!
- 10 filmes encontrados
- 10 séries encontradas
- Tempo: ~10 segundos (antes: timeout após 180s)
```

## 🎯 Arquivos Modificados
- `src/scrapers/flixpatrolScraper.js` - Todas as melhorias implementadas

## 🚀 Como Testar
```bash
# Teste individual
node test-scraper.js

# Servidor completo
npm start

# Endpoint do cron (atualiza serviço mais desatualizado)
curl http://localhost:3000/api/cron/update-expired
```

## 💡 Considerações para Produção
- Em produção (Render), o código continua usando `@sparticuz/chromium` automaticamente
- O modo headless está ativado (`headless: 'new'`)
- Todos os headers anti-bot estão configurados
- Performance melhorada significativamente
