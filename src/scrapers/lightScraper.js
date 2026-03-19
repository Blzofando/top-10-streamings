import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scraper leve usando Axios + Cheerio (sem browser headless)
 * FlixPatrol renderiza server-side, então não precisa de JavaScript
 * 
 * PRIORIDADE: Este é o scraper PRIMÁRIO.
 * O Puppeteer (flixpatrolScraper.js) é apenas FALLBACK.
 */

// ============================================================
// CIRCUIT BREAKER
// ============================================================
const circuitBreaker = {
    failures: 0,
    maxFailures: 3,
    state: 'CLOSED',        // CLOSED (normal) | OPEN (bloqueado) | HALF_OPEN (testando)
    lastFailureTime: null,
    cooldownMs: 5 * 60 * 1000, // 5 minutos de cooldown

    recordSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
        console.log('🟢 [Circuit Breaker] Estado: CLOSED (normal)');
    },

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.maxFailures) {
            this.state = 'OPEN';
            console.error(`🔴 [Circuit Breaker] Estado: OPEN — ${this.failures} falhas consecutivas. Bloqueado por ${this.cooldownMs / 1000}s`);
        }
    },

    canRequest() {
        if (this.state === 'CLOSED') return true;

        if (this.state === 'OPEN') {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed >= this.cooldownMs) {
                this.state = 'HALF_OPEN';
                console.log('🟡 [Circuit Breaker] Estado: HALF_OPEN — permitindo 1 tentativa de teste');
                return true;
            }
            return false;
        }

        // HALF_OPEN: permite 1 tentativa
        return this.state === 'HALF_OPEN';
    },

    getRemainingCooldown() {
        if (this.state !== 'OPEN') return 0;
        const elapsed = Date.now() - this.lastFailureTime;
        return Math.max(0, Math.ceil((this.cooldownMs - elapsed) / 1000));
    }
};

// ============================================================
// MUTEX / LOCK POR SERVIÇO
// ============================================================
const locks = {};

/**
 * Adquire lock para um serviço (evita scraping concorrente)
 * @param {string} service
 * @returns {boolean} true se adquiriu, false se já está travado
 */
function acquireLock(service) {
    if (locks[service]) {
        console.log(`🔒 [Mutex] Scraping de "${service}" já em andamento — bloqueando chamada concorrente`);
        return false;
    }
    locks[service] = true;
    return true;
}

function releaseLock(service) {
    delete locks[service];
}

// ============================================================
// USER-AGENTS ROTATIVOS
// ============================================================
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// ============================================================
// LIGHT SCRAPER (Axios + Cheerio)
// ============================================================
class LightScraper {
    constructor() {
        this.circuitBreaker = circuitBreaker;
    }

    /**
     * Extrai o top 10 de uma URL do FlixPatrol via HTTP puro
     * @param {string} url - URL da página do FlixPatrol
     * @returns {Promise<Object>} { movies: [], tvShows: [] }
     */
    async scrapeTop10(url) {
        // 1. Verificar Circuit Breaker
        if (!this.circuitBreaker.canRequest()) {
            const remaining = this.circuitBreaker.getRemainingCooldown();
            const error = new Error(`Circuit Breaker OPEN — scraping bloqueado. Tente novamente em ${remaining}s`);
            error.statusCode = 503;
            error.retryAfter = remaining;
            throw error;
        }

        const maxRetries = 3;
        const backoffDelays = [1000, 3000, 5000]; // 1s, 3s, 5s (muito mais rápido que Puppeteer)

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📡 [LightScraper] Tentativa ${attempt}/${maxRetries}: GET ${url}`);

                const response = await axios.get(url, {
                    timeout: 15000, // 15s é mais que suficiente para HTTP puro
                    headers: {
                        'User-Agent': getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache'
                    },
                    // Validação de status — rejeita 4xx/5xx
                    validateStatus: (status) => status >= 200 && status < 400
                });

                const $ = cheerio.load(response.data);
                const data = this._parseHTML($);

                // Validação mínima: precisa ter pelo menos alguns itens
                if (data.movies.length === 0 && data.tvShows.length === 0) {
                    throw new Error('Nenhum dado extraído do HTML — possível mudança na estrutura do site');
                }

                console.log(`✅ [LightScraper] Extraído: ${data.movies.length} filmes, ${data.tvShows.length} séries`);
                this.circuitBreaker.recordSuccess();
                return data;

            } catch (error) {
                console.error(`❌ [LightScraper] Tentativa ${attempt} falhou: ${error.message}`);

                if (attempt < maxRetries) {
                    const delay = backoffDelays[attempt - 1];
                    console.log(`⏳ Aguardando ${delay / 1000}s antes de tentar novamente...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    this.circuitBreaker.recordFailure();
                    throw error;
                }
            }
        }
    }

    /**
     * Parseia o HTML do FlixPatrol e extrai Movies e TV Shows
     * Estrutura real do FlixPatrol:
     *   - table.card-table[0] = Movies (10 rows com class table-group)
     *   - table.card-table[1] = TV Shows (10 rows com class table-group)
     * Cada row: td[0]=posição, td[1]=título (com link), td[2]=popularidade, td[3]=vazio
     * @param {CheerioAPI} $ - Instância do Cheerio carregada com HTML
     * @returns {Object} { movies: [], tvShows: [] }
     */
    _parseHTML($) {
        const tables = $('table.card-table');

        if (tables.length < 2) {
            console.warn(`⚠️ [LightScraper] Esperava 2 tabelas card-table, encontrou ${tables.length}`);
        }

        const extractFromTable = (table) => {
            const items = [];

            $(table).find('tbody tr.table-group').each((index, row) => {
                try {
                    const $row = $(row);
                    const cells = $row.find('td');

                    // td[0] = posição (ex: "1.")
                    const positionText = $(cells[0]).text().trim();
                    const position = parseInt(positionText.replace('.', '')) || (index + 1);

                    // td[1] = título com link
                    const titleCell = $(cells[1]);
                    const titleLink = titleCell.find('a').first();
                    const title = titleLink.text().trim();
                    let link = titleLink.attr('href');

                    // td[2] = popularidade
                    const popularity = parseInt($(cells[2]).text().trim()) || 0;

                    // Sanitização de URL
                    if (link) {
                        link = link.replace(/:+$/, '');
                        if (!link || link.length < 5 || link.includes('::')) return;
                        if (!link.startsWith('http')) {
                            link = `https://flixpatrol.com${link.startsWith('/') ? '' : '/'}${link}`;
                        }
                    }

                    if (title) {
                        items.push({ position, title, popularity, link: link || '' });
                    }
                } catch (err) {
                    console.error('⚠️ [LightScraper] Erro ao extrair linha:', err.message);
                }
            });

            return items;
        };

        return {
            movies: tables.length >= 1 ? extractFromTable(tables[0]) : [],
            tvShows: tables.length >= 2 ? extractFromTable(tables[1]) : []
        };
    }

    /**
     * Cria um ranking combinado (overall) de filmes e séries
     * Reutiliza a mesma lógica do FlixPatrolScraper
     */
    createOverallRanking(movies, tvShows) {
        const moviesWithType = movies.map(item => ({ ...item, type: 'movie' }));
        const tvShowsWithType = tvShows.map(item => ({ ...item, type: 'tv' }));

        return [...moviesWithType, ...tvShowsWithType]
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 10)
            .map((item, index) => ({
                ...item,
                position: index + 1
            }));
    }

    /**
     * Verifica se o serviço está travado por mutex
     */
    isLocked(service) {
        return !!locks[service];
    }

    /**
     * Retorna estado do circuit breaker (para health checks)
     */
    getCircuitState() {
        return {
            state: this.circuitBreaker.state,
            failures: this.circuitBreaker.failures,
            remainingCooldown: this.circuitBreaker.getRemainingCooldown()
        };
    }

    /**
     * Extrai detalhes de um item usando Axios e Cheerio (sem Puppeteer)
     * @param {string} url - URL do detalhe no FlixPatrol
     * @returns {Promise<Object>} Dados detalhados (ano, tipo, titulo)
     */
    async scrapeItemDetails(url) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Connection': 'keep-alive'
                }
            });
            const $ = cheerio.load(response.data);
            const result = {};
            
            // Extrai ano de estreia (Premiere)
            const premiereSpan = $('div[title="Premiere"] span');
            if (premiereSpan.length) {
                const fullText = premiereSpan.parent().text().trim();
                const yearMatch = fullText.match(/(\d{4})$/);
                if (yearMatch) result.year = parseInt(yearMatch[1], 10);
            }
            
            // Extrai Tipo (TV Show / Movie)
            $('div[title]').each((_, el) => {
                const text = $(el).text().toLowerCase();
                if (text.includes('tv show')) result.type = 'tv';
                else if (text.includes('movie')) result.type = 'movie';
            });
            
            // Original Title (H1)
            const h1 = $('h1').first().text().trim();
            if (h1) result.original_title = h1;
            
            return result;
        } catch (error) {
            console.error(`❌ [LightScraper] Erro ao extrair detalhes de ${url}:`, error.message);
            throw error;
        }
    }
}

// Exporta instância singleton + funções de lock
export const lightScraper = new LightScraper();
export { acquireLock, releaseLock };
