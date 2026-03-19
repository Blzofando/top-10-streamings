import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { firebaseLoggingService } from '../services/firebaseLoggingService.js';

/**
 * Extrai dados do FlixPatrol usando Puppeteer
 */
export class FlixPatrolScraper {
    constructor() {
        this.browser = null;
        // Array de User-Agents realistas para rotação
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        ];
    }

    /**
     * Retorna um User-Agent aleatório
     */
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    /**
     * Delay aleatório para simular comportamento humano
     */
    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Inicializa o navegador Puppeteer
     */
    async initialize() {
        if (!this.browser) {
            // Detecta se está em produção (Render/cloud) ou local
            const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

            const args = isProduction ? chromium.args : [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',  // CRUCIAL: Usa /tmp em vez de /dev/shm
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',              // Economiza RAM
                '--single-process',         // Força processo único (economiza MUITA RAM)
                '--window-size=1920,1080'
            ];

            // Determina o executablePath
            let executablePath;
            if (isProduction) {
                executablePath = await chromium.executablePath();
            } else {
                // Em desenvolvimento, usa a variável de ambiente ou o caminho padrão
                executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
            }

            console.log(`🔧 Usando Chrome em: ${executablePath}`);

            this.browser = await puppeteer.launch({
                args,
                defaultViewport: chromium.defaultViewport,
                executablePath,
                headless: 'new', // Modo headless melhorado do Chrome
                ignoreHTTPSErrors: true,
                protocolTimeout: 180000 // 3 minutos - evita "Runtime.callFunctionOn timed out"
            });
        }
    }

    /**
     * Fecha o navegador (com proteção contra timeout)
     */
    async close() {
        if (this.browser) {
            try {
                // Timeout agressivo: se não fechar em 10s, força
                const closePromise = this.browser.close();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Browser close timeout')), 10000)
                );

                await Promise.race([closePromise, timeoutPromise]);
                console.log('✅ Browser fechado com sucesso');
            } catch (error) {
                console.error('⚠️ Erro ao fechar browser:', error.message);
                // CRÍTICO: Mesmo com erro, marca como null para forçar nova instância
                console.log('🔄 Forçando reset do browser...');
            } finally {
                // SEMPRE define como null, mesmo se close() falhar
                this.browser = null;
            }
        }
    }

    /**
     * Extrai o top 10 de uma URL específica com retry automático
     * @param {string} url - URL da página do FlixPatrol
     * @returns {Object} Dados extraídos (movies e tvShows)
     */
    async scrapeTop10(url) {
        const maxRetries = 3;
        const backoffDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
        const timeLimit = 240000; // 4 minutos de timeout (margem para processos lentos)

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📡 Tentativa ${attempt}/${maxRetries}: Acessando ${url}`);

                // Promise.race: Se demorar mais que timeLimit, aborta
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('SCRAPING_TIMEOUT')), timeLimit)
                );

                const scrapePromise = this._scrapeTop10Internal(url);

                const result = await Promise.race([scrapePromise, timeoutPromise]);
                return result;

            } catch (error) {
                if (error.message === 'SCRAPING_TIMEOUT') {
                    console.error(`⏱️ Tentativa ${attempt} expirou após ${timeLimit / 1000}s`);
                } else {
                    console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
                }

                // CRÍTICO: Recicla o browser corrompido antes de tentar novamente
                // Sem isso, tentativas 2 e 3 falham 100% das vezes (browser zumbi)
                console.log('🔄 [Puppeteer] Reciclando browser corrompido...');
                await this.close();

                if (attempt < maxRetries) {
                    const delay = backoffDelays[attempt - 1];
                    console.log(`⏳ Aguardando ${delay / 1000}s antes de tentar novamente...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ Todas as tentativas falharam');
                    throw error;
                }
            }
        }
    }

    /**
     * Método interno de scraping (usado pelo retry)
     */
    async _scrapeTop10Internal(url) {
        await this.initialize();

        const page = await this.browser.newPage();

        try {
            // Configura viewport com variação aleatória para parecer mais humano
            const width = 1920 + Math.floor(Math.random() * 100);
            const height = 1080 + Math.floor(Math.random() * 100);
            await page.setViewport({
                width,
                height,
                deviceScaleFactor: 1
            });

            // User-Agent rotativo
            const userAgent = this.getRandomUserAgent();
            console.log(`🔄 Usando User-Agent: ${userAgent.substring(0, 50)}...`);
            await page.setUserAgent(userAgent);

            // Configura headers extras para parecer mais humano
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            // Acessa a página com timeout aumentado
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 180000  // 3 minutos (aumentado de 2min)
            });

            console.log('📄 Página carregada, aguardando conteúdo...');

            // Delay aleatório para simular comportamento humano (3-5 segundos)
            const initialDelay = 3000 + Math.floor(Math.random() * 2000);
            await page.waitForTimeout(initialDelay);

            // Tenta esperar pelas tabelas, mas com timeout menor
            try {
                await page.waitForSelector('table.card-table', { timeout: 15000 });
                console.log('✅ Tabelas encontradas!');
            } catch (error) {
                console.warn('⚠️  Tabelas não encontradas no tempo esperado, tentando extrair dados mesmo assim...');
                // Continua para tentar extrair dados mesmo sem a tabela ser encontrada
            }

            // Extrai dados das tabelas
            const data = await page.evaluate(() => {
                const getTableByType = (typeText) => {
                    const headers = Array.from(document.querySelectorAll('h2'));
                    const header = headers.find(h => h.textContent.includes(typeText));

                    if (!header) return [];

                    // Encontra o container pai e busca a tabela dentro dele ou no próximo elemento
                    // A estrutura do FlixPatrol agrupa h2 e tabela no mesmo container ou próximos
                    let container = header.closest('div.content') || header.parentElement.parentElement;
                    let table = container ? container.querySelector('table.card-table') : null;

                    // Fallback: procura a próxima tabela no DOM após o header
                    if (!table) {
                        let next = header.parentElement;
                        while (next) {
                            table = next.querySelector('table.card-table');
                            if (table) break;
                            next = next.nextElementSibling;
                            // Limite de busca
                            if (!next || next.tagName === 'H2') break;
                        }
                    }

                    if (!table) return [];

                    const rows = table.querySelectorAll('tbody tr.table-group');
                    const items = [];

                    rows.forEach((row, index) => {
                        try {
                            const titleElement = row.querySelector('td:nth-child(2) a');
                            const title = titleElement ? titleElement.textContent.trim() : null;
                            let link = titleElement ? titleElement.getAttribute('href') : null;

                            // Fix: Remove trailing colons and validate URL
                            if (link) {
                                // Remove trailing colons
                                link = link.replace(/:+$/, '');

                                // Validate URL structure before using
                                if (!link || link.length < 5 || link.includes('::')) {
                                    console.warn(`⚠️ URL malformada detectada: "${link}" - pulando item`);
                                    return; // Skip this item
                                }

                                // Ensure it starts with /
                                if (!link.startsWith('/')) {
                                    console.warn(`⚠️ URL sem barra inicial: "${link}" - corrigindo`);
                                    link = '/' + link;
                                }
                            }

                            const popularityElement = row.querySelector('td:nth-child(3)');
                            const popularity = popularityElement ? parseInt(popularityElement.textContent.trim()) : 0;
                            const positionElement = row.querySelector('td:nth-child(1)');
                            const position = positionElement ? parseInt(positionElement.textContent.replace('.', '').trim()) : index + 1;

                            if (title && link) {
                                items.push({
                                    position,
                                    title,
                                    popularity: popularity || 0, // Fallback se popularidade falhar
                                    link: `https://flixpatrol.com${link}`
                                });
                            }
                        } catch (error) {
                            console.error('Erro ao extrair linha:', error);
                        }
                    });

                    return items;
                };

                return {
                    movies: getTableByType('Movies') || [],
                    tvShows: getTableByType('TV Shows') || []
                };
            });

            console.log(`✅ Extraído: ${data.movies.length} filmes, ${data.tvShows.length} séries`);

            return data;

        } catch (error) {
            console.error('❌ Erro ao fazer scraping:', error.message);

            // Salva screenshot para debug (apenas em desenvolvimento)
            if (process.env.NODE_ENV !== 'production') {
                try {
                    const screenshotPath = `debug-${Date.now()}.png`;
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`📸 Screenshot salvo em: ${screenshotPath}`);
                } catch (screenshotError) {
                    console.error('Não foi possível salvar screenshot:', screenshotError.message);
                }
            }

            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * Cria um ranking combinado (overall) de filmes e séries
     * @param {Array} movies - Lista de filmes
     * @param {Array} tvShows - Lista de séries
     * @returns {Array} Top 10 combinado baseado em popularidade
     */
    createOverallRanking(movies, tvShows) {
        // Marca o tipo de cada item
        const moviesWithType = movies.map(item => ({ ...item, type: 'movie' }));
        const tvShowsWithType = tvShows.map(item => ({ ...item, type: 'tv' }));

        // Combina e ordena por popularidade
        const combined = [...moviesWithType, ...tvShowsWithType]
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 10)
            .map((item, index) => ({
                ...item,
                position: index + 1
            }));

        return combined;
    }

    /**
     * Extrai detalhes adicionais visitando a página do item (com retry)
     * @param {string} url - URL do detalhe no FlixPatrol
     * @returns {Object} Dados detalhados (ano, titulo original, etc)
     */
    async scrapeItemDetails(url) {
        if (!url) return {};

        const maxRetries = 2; // Menos tentativas para detalhes (mais rápido)
        const backoffDelays = [2000, 5000]; // 2s, 5s

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this._scrapeItemDetailsInternal(url);
            } catch (error) {
                if (attempt < maxRetries) {
                    const delay = backoffDelays[attempt - 1];
                    console.warn(`⚠️  Tentativa ${attempt} falhou para ${url}, tentando novamente em ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`❌ Erro ao extrair detalhes de ${url}:`, error.message);
                    return {};
                }
            }
        }
    }

    /**
     * Método interno para extrair detalhes (usado pelo retry)
     */
    async _scrapeItemDetailsInternal(url) {
        // Garante que o Chromium está inicializado antes de criar a página
        await this.initialize();

        // Abre nova aba para não interferir
        const page = await this.browser.newPage();

        try {
            // User-Agent rotativo
            await page.setUserAgent(this.getRandomUserAgent());

            // Otimização: desabilita imagens e css
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000  // 1 minuto (aumentado de 30s)
            });

            // Delay pequeno antes de extrair
            await this.randomDelay(500, 1500);

            const details = await page.evaluate(() => {
                const result = {};

                // Extrai ano de estreia (Premiere)
                // Procura div com title='Premiere'
                const premiereDiv = document.querySelector('div[title="Premiere"] span');
                if (premiereDiv && premiereDiv.parentElement) {
                    // Texto pode ser "05/09/2024" ou "2024"
                    const fullText = premiereDiv.parentElement.textContent.trim();
                    const yearMatch = fullText.match(/(\d{4})$/);
                    if (yearMatch) result.year = parseInt(yearMatch[1]);
                }

                // Extrai Tipo (TV Show / Movie) - div com title="ID numérico" geralmente é o primeiro badge
                // Mas o user mostrou <div class="flex gap-x-1" title="152887"> <div> TV Show </div>
                const typeDivs = Array.from(document.querySelectorAll('div[title]'));
                const typeDiv = typeDivs.find(d => {
                    const text = d.innerText.toLowerCase();
                    return text.includes('tv show') || text.includes('movie');
                });

                if (typeDiv) {
                    const text = typeDiv.innerText.toLowerCase();
                    if (text.includes('tv show')) result.type = 'tv';
                    else if (text.includes('movie')) result.type = 'movie';
                }

                // Título Original? Geralmente é o H1, mas se tiver original title aparece em outro lugar?
                // Vamos assumir H1 como title principal
                const h1 = document.querySelector('h1');
                if (h1) result.original_title = h1.textContent.trim();

                return result;
            });

            return details;
        } catch (error) {
            console.error(`❌ Erro ao extrair detalhes de ${url}:`, error.message);
            return {};
        } finally {
            await page.close();
        }
    }
}

// Instância singleton
export const scraper = new FlixPatrolScraper();
