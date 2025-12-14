import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Extrai dados do FlixPatrol usando Puppeteer
 */
export class FlixPatrolScraper {
    constructor() {
        this.browser = null;
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
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
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
                ignoreHTTPSErrors: true
            });
        }
    }

    /**
     * Fecha o navegador
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Extrai o top 10 de uma URL específica
     * @param {string} url - URL da página do FlixPatrol
     * @returns {Object} Dados extraídos (movies e tvShows)
     */
    async scrapeTop10(url) {
        await this.initialize();

        const page = await this.browser.newPage();

        try {
            console.log(`📡 Acessando: ${url} `);

            // Configura viewport realista (desktop)
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1
            });

            // Configura User-Agent realista (Chrome 120 no Windows)
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Configura headers extras para parecer mais humano
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            // Acessa a página - mudado para domcontentloaded (mais rápido e confiável)
            // networkidle2 pode travar se algum recurso externo não carregar
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 120000  // 2 minutos
            });

            console.log('📄 Página carregada, aguardando conteúdo...');

            // Aguarda um pouco extra para JavaScript executar
            await page.waitForTimeout(3000);

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
                            const link = titleElement ? titleElement.getAttribute('href') : null;
                            const popularityElement = row.querySelector('td:nth-child(3)');
                            const popularity = popularityElement ? parseInt(popularityElement.textContent.trim()) : 0;
                            const positionElement = row.querySelector('td:nth-child(1)');
                            const position = positionElement ? parseInt(positionElement.textContent.replace('.', '').trim()) : index + 1;

                            if (title) {
                                items.push({
                                    position,
                                    title,
                                    popularity: popularity || 0, // Fallback se popularidade falhar
                                    link: link ? `https://flixpatrol.com${link}` : null
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
     * Extrai detalhes adicionais visitando a página do item
     * @param {string} url - URL do detalhe no FlixPatrol
     * @returns {Object} Dados detalhados (ano, titulo original, etc)
     */
    async scrapeItemDetails(url) {
        if (!url) return {};

        // Abre nova aba para não interferir
        const page = await this.browser.newPage();

        try {
            // Otimização: desabilita imagens e css
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
