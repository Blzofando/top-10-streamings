import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { compareTwoStrings } from 'string-similarity';
import { firebaseLoggingService } from '../services/firebaseLoggingService.js';

/**
 * Scraper para calendário de séries do FlixPatrol
 * URL: https://flixpatrol.com/calendar/upcoming/tv-shows/streaming/YYYY-MM-DD/
 */
export class FlixPatrolCalendarScraper {
    constructor() {
        this.browser = null;
        this.baseUrl = 'https://flixpatrol.com/calendar/upcoming/tv-shows/streaming';
        this.tmdbApiKey = process.env.TMDB_API_KEY;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
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
            const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

            const args = isProduction ? chromium.args : [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--window-size=1920,1080'
            ];

            let executablePath;
            if (isProduction) {
                executablePath = await chromium.executablePath();
            } else {
                executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
            }

            console.log(`🔧 Usando Chrome em: ${executablePath}`);

            this.browser = await puppeteer.launch({
                args,
                defaultViewport: chromium.defaultViewport,
                executablePath,
                headless: 'new',
                ignoreHTTPSErrors: true,
                protocolTimeout: 180000
            });
        }
    }

    /**
     * Fecha o navegador
     */
    async close() {
        if (this.browser) {
            try {
                const closePromise = this.browser.close();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Browser close timeout')), 10000)
                );

                await Promise.race([closePromise, timeoutPromise]);
                console.log('✅ Browser fechado com sucesso');
            } catch (error) {
                console.error('⚠️ Erro ao fechar browser:', error.message);
            } finally {
                this.browser = null;
            }
        }
    }

    /**
     * Scraping principal do calendário de TV shows
     * @param {Array} existingReleases - Títulos já existentes no Firebase
     * @returns {Promise<Array>} Array de séries com dados TMDB
     */
    async scrapeTvCalendar(existingReleases = []) {
        const startTime = Date.now();
        console.log('\n📺 ===== FLIXPATROL TV CALENDAR SCRAPER =====');
        console.log(`📊 Lançamentos existentes: ${existingReleases.length}`);

        let allReleasesScraped = [];

        try {
            await this.initialize();

            // PASSO 1: Remover títulos que já passaram da data dos existentes
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Zera hora para comparar apenas data

            const existingReleasesCleaned = existingReleases.filter(release => {
                if (!release.releaseDate && !release.release_date) return true; // Sem data, mantém

                const releaseDate = new Date(release.releaseDate || release.release_date);
                releaseDate.setHours(0, 0, 0, 0);

                if (releaseDate < today) {
                    console.log(`   🗑️ Removendo (data passou): ${release.title || release.fullTitle} (${release.releaseDate || release.release_date})`);
                    return false;
                }

                return true; // Mantém
            });

            console.log(`🧹 Limpeza: ${existingReleases.length} → ${existingReleasesCleaned.length} (removidos ${existingReleases.length - existingReleasesCleaned.length} com data passada)`);

            // PASSO 2: Scraping do FlixPatrol
            const todayStr = this.getTodayDate();
            const startUrl = `${this.baseUrl}/${todayStr}/`;

            console.log(`🔗 URL inicial: ${startUrl}`);

            // Extrair todos os lançamentos de todas as páginas (já filtrados por data)
            try {
                allReleasesScraped = await this.scrapeAllPages(startUrl);
                console.log(`\n📊 Total extraído do scraping: ${allReleasesScraped.length} lançamentos`);
            } catch (scrapeError) {
                console.error('❌ Erro ao fazer scraping das páginas:', scrapeError.message);
                await firebaseLoggingService.logError(
                    'calendar-tv-shows',
                    'scraping',
                    scrapeError,
                    { url: startUrl, stage: 'scrapeAllPages' }
                );
                // Fecha browser e lança erro - NÃO continua para enrichment
                await this.close();
                throw scrapeError;
            }

            // PASSO 3: Identificar novos lançamentos (diferença entre scraped e existing cleaned)
            const newReleases = this.findNewReleases(allReleasesScraped, existingReleasesCleaned);

            console.log(`🆕 Novos lançamentos encontrados: ${newReleases.length}`);
            console.log(`🔍 ${newReleases.length} novos lançamentos serão enriquecidos com TMDB`);

            // PASSO 4: Enriquecer SOMENTE os novos com dados do TMDB
            if (newReleases.length > 0 && this.browser) {
                try {
                    await this.enrichWithTmdb(allReleasesScraped, newReleases);
                } catch (enrichError) {
                    console.error('⚠️ Erro no enrichment (continuando mesmo assim):', enrichError.message);
                    await firebaseLoggingService.logWarning(
                        'calendar-tv-shows',
                        'enrichment',
                        `Enrichment failed but scraping succeeded: ${enrichError.message}`,
                        { newReleasesCount: newReleases.length }
                    );
                    // NÃO lança erro - dados foram scrapeados com sucesso
                }
            }

            // PASSO 5: Mesclar existentes (com TMDB) + novos (recém enriquecidos)
            const mergedReleases = this.mergeReleases(existingReleasesCleaned, allReleasesScraped);

            console.log(`\n🔀 Merge completo:`);
            console.log(`   • Existentes (com TMDB): ${existingReleasesCleaned.length}`);
            console.log(`   • Novos (recém enriquecidos): ${newReleases.length}`);
            console.log(`   • Total final: ${mergedReleases.length}`);

            console.log('✅ ===== SCRAPING CONCLUÍDO =====\n');

            // Log de sucesso
            const duration = Date.now() - startTime;
            await firebaseLoggingService.logSuccess(
                'calendar-tv-shows',
                'scraping',
                {
                    totalReleases: mergedReleases.length,
                    newReleases: newReleases.length,
                    existingReleases: existingReleasesCleaned.length,
                    removedOld: existingReleases.length - existingReleasesCleaned.length
                },
                duration
            );

            return mergedReleases; // Retorna merged ao invés de allReleases

        } catch (error) {
            console.error('❌ Erro no scraping:', error.message);
            const duration = Date.now() - startTime;
            await firebaseLoggingService.logError(
                'calendar-tv-shows',
                'scraping',
                error,
                {
                    existingReleases: existingReleases.length,
                    duration_ms: duration
                }
            );
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Scraping de todas as páginas do calendário
     */
    async scrapeAllPages(startUrl) {
        const page = await this.browser.newPage();
        const allReleases = [];

        try {
            // Configura User-Agent rotativo
            await page.setUserAgent(this.getRandomUserAgent());

            // Configurar viewport (simular navegador real)
            await page.setViewport({ width: 1920, height: 1080 });

            // Configurar headers
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            });

            let currentUrl = startUrl;
            let pageNumber = 1;

            while (currentUrl && pageNumber <= 10) { // Limite de segurança
                console.log(`\n📄 Página ${pageNumber}: ${currentUrl}`);

                // Navegar para página
                await page.goto(currentUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 120000 // Aumentado de 60s para 120s
                });

                console.log('   ✓ Página carregada');

                // Delay para garantir que JavaScript da página executou
                await this.randomDelay(4000, 6000);

                // Extrair dados da página
                const pageReleases = await this.extractReleasesFromPage(page);

                console.log(`   ✓ Extraídos: ${pageReleases.length} lançamentos`);

                allReleases.push(...pageReleases);

                // Verificar se existe próxima página
                currentUrl = await this.getNextPageUrl(page);

                if (currentUrl) {
                    pageNumber++;
                    console.log(`   → Próxima página detectada`);
                    await this.randomDelay(3000, 5000); // Delay antes de próxima página
                } else {
                    console.log(`   ✓ Última página alcançada`);
                }
            }

        } catch (error) {
            console.error('❌ Erro ao fazer scraping das páginas:', error.message);
            throw error;
        } finally {
            try {
                await page.close();
            } catch (e) {
                console.warn('⚠️ Erro ao fechar página:', e.message);
            }
        }

        return allReleases;
    }

    /**
     * Extrai lançamentos de uma página específica
     * FlixPatrol usa estrutura de TABELA: <tr class="table-group">
     */
    async extractReleasesFromPage(page) {
        const releases = await page.evaluate(() => {
            const items = [];

            // Procurar todas as linhas da tabela de calendário
            const rows = document.querySelectorAll('tr.table-group');

            rows.forEach(row => {
                try {
                    // Primeira célula: data de lançamento (formato: "Dec 16" com ano na próxima div)
                    const dateCell = row.querySelector('td.table-td');
                    let releaseDate = null;
                    let releaseYear = null;

                    if (dateCell) {
                        // Pegar dia/mês
                        const dateDiv = dateCell.querySelector('div.text-sm, div.text-base');
                        if (dateDiv) {
                            releaseDate = dateDiv.textContent.trim();
                        }

                        // Pegar ano (pode estar em outra div)
                        const yearDiv = dateCell.querySelector('div.text-sm.leading-6');
                        if (yearDiv) {
                            const yearText = yearDiv.textContent.trim();
                            const yearMatch = yearText.match(/(\d{4})/);
                            if (yearMatch) {
                                releaseYear = yearMatch[1];
                            }
                        }

                        // Combinar data completa
                        // Se não tiver ano, assume ano corrente
                        if (!releaseYear) {
                            releaseYear = new Date().getFullYear().toString();
                        }

                        if (releaseDate) {
                            // Converte "Dec 18" + "2025" -> "2025-12-18"
                            try {
                                const months = {
                                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                                };
                                const parts = releaseDate.split(' '); // ["Dec", "18"]
                                if (parts.length === 2 && months[parts[0]]) {
                                    const month = months[parts[0]];
                                    const day = parts[1].padStart(2, '0');
                                    releaseDate = `${releaseYear}-${month}-${day}`;
                                } else {
                                    // Fallback se formato for diferente
                                    releaseDate = `${releaseDate} ${releaseYear}`;
                                }
                            } catch (e) {
                                releaseDate = `${releaseDate} ${releaseYear}`;
                            }
                        }
                    }

                    // Segunda célula: link do título + todos os metadados
                    const titleCell = row.querySelectorAll('td.table-td')[1];
                    if (!titleCell) return;

                    const titleLink = titleCell.querySelector('a[href*="/title/"]');
                    if (!titleLink) return;

                    // O texto completo da célula contém: Title | Type | Country | Date | Platform | Genre1 | Genre2
                    const fullCellText = titleCell.textContent.trim();

                    // IMPORTANTE: titleLink.textContent pode conter todo o texto da célula se não houver elementos separados
                    // Precisamos extrair apenas o título real, que vem ANTES de "TV Show" ou do primeiro "|"
                    let rawTitleText = titleLink.textContent.trim();

                    // Limpar: pegar apenas até "TV Show" (case insensitive)
                    const tvShowIndex = rawTitleText.search(/\s+TV\s+Show/i);
                    if (tvShowIndex > 0) {
                        rawTitleText = rawTitleText.substring(0, tvShowIndex).trim();
                    }

                    const fullTitle = rawTitleText;
                    let href = titleLink.getAttribute('href');

                    if (!fullTitle || fullTitle.length < 2) return;

                    // Extrair informação de temporada/parte dos parênteses
                    let title = fullTitle;
                    let seasonInfo = null;

                    const seasonMatch = fullTitle.match(/^(.+?)\s*\(([^)]+)\)/);
                    if (seasonMatch) {
                        title = seasonMatch[1].trim();
                        seasonInfo = seasonMatch[2].trim();
                    }

                    // Fix link
                    if (href && href.endsWith(':')) {
                        href = href.replace(/:+$/, '');
                    }

                    if (href && !href.startsWith('http')) {
                        href = `https://flixpatrol.com${href}`;
                    }

                    // Parse do texto completo da célula
                    // Formato: "Title (season) | Type | Country | Date | Platform | Genre1 | Genre2"
                    // Vamos fazer split por | e remover partes vazias e "TV Show"
                    let country = null;
                    let platform = null;
                    let genres = [];

                    // Split por | e limpar
                    const parts = fullCellText.split('|').map(p => p.trim()).filter(p => p && p !== 'TV Show');

                    // Primeira parte é sempre o título (ignorar)
                    // Depois vem: Country, Date, Platform, Genres...
                    // Mas precisamos identificar dinamicamente pois alguns podem estar vazios

                    if (parts.length > 1) {
                        // Tentar identificar country (geralmente tem nome de país conhecido ou está após o título)
                        // Tentar identificar platform (Netflix, Hulu, Amazon, etc)
                        // Resto são gêneros

                        const knownPlatforms = ['Netflix', 'Hulu', 'Amazon', 'HBO', 'Disney', 'Apple', 'Peacock', 'Paramount'];

                        for (let i = 1; i < parts.length; i++) {
                            const part = parts[i];

                            // Skip se parece com data (contém números e /)
                            if (/\d{2}\/\d{2}\/\d{4}/.test(part)) {
                                continue;
                            }

                            // Identificar plataforma
                            const isPlatform = knownPlatforms.some(p => part.includes(p));
                            if (isPlatform && !platform) {
                                platform = part;
                                continue;
                            }

                            // Se é a primeira parte não-data/não-plataforma, é country
                            if (!country && i === 1) {
                                country = part;
                                continue;
                            }

                            // Resto são gêneros (após country, date, platform)
                            // Gêneros típicos: Crime, Drama, Action, etc.
                            if (i > 2 && !isPlatform) {
                                genres.push(part);
                            }
                        }
                    }

                    items.push({
                        title,
                        fullTitle,
                        seasonInfo,
                        releaseDate,
                        releaseYear,
                        link: href,
                        country,
                        platform,
                        genres // Array de strings: ['Crime', 'Drama']
                    });

                } catch (error) {
                    // Silenciosamente ignora erros de elementos individuais
                }
            });

            return items;
        });

        console.log(`   📋 Extraídos ${releases.length} lançamentos da tabela`);

        // NÃO remover duplicatas - títulos podem ter múltiplas partes/temporadas

        // Filtrar datas fictícias (>= 2030)
        const currentYear = new Date().getFullYear();
        const cutoffYear = currentYear + 5; // User requested +5 years limit

        const filteredReleases = releases.filter(release => {
            if (!release.releaseYear) return true; // Mantém se não tiver ano

            const year = parseInt(release.releaseYear);
            if (year >= cutoffYear) {
                console.log(`   ⏭️ Ignorando: ${release.fullTitle || release.title} (data fictícia: ${release.releaseDate})`);
                return false;
            }

            return true;
        });

        console.log(`   ✅ ${filteredReleases.length} após filtrar datas >= ${cutoffYear}`);

        return filteredReleases;
    }

    /**
     * Obter URL da próxima página (se existir)
     */
    async getNextPageUrl(page) {
        return await page.evaluate(() => {
            // Procurar botão "Next", "Próxima", ou paginação
            const nextButton = document.querySelector('a[rel="next"], a.next, .pagination a[aria-label*="next"]');

            if (nextButton) {
                const href = nextButton.getAttribute('href');
                if (href && !href.startsWith('http')) {
                    return `https://flixpatrol.com${href}`;
                }
                return href;
            }

            return null;
        });
    }

    /**
     * Mesclar releases existentes (com TMDB) + novos scrapeados (recém enriquecidos)
     * Preserva dados TMDB de releases existentes e adiciona novos
     */
    mergeReleases(existingReleases, scrapedReleases) {
        // Criar map de existentes por título (para lookup rápido)
        const existingMap = new Map();
        existingReleases.forEach(release => {
            const key = this.getTitleKey(release);
            existingMap.set(key, release);
        });

        // Mesclar: Para cada scraped, se existe no map, usa o existente (com TMDB)
        // Senão, usa o scraped (novo, recém enriquecido)
        const merged = scrapedReleases.map(scraped => {
            const key = this.getTitleKey(scraped);
            const existing = existingMap.get(key);

            if (existing && existing.tmdb_id) {
                // Existe e tem TMDB ID - preserva os dados TMDB + atualiza metadados do scraping
                return {
                    ...existing, // Mantém TMDB data
                    releaseDate: scraped.releaseDate || existing.releaseDate, // Atualiza se mudou
                    platform: scraped.platform || existing.platform,
                    country: scraped.country || existing.country,
                    seasonInfo: scraped.seasonInfo || existing.seasonInfo,
                    genres: scraped.genres || existing.genres
                };
            } else {
                // Novo ou existente sem TMDB - usa scraped (pode ter sido enriquecido agora)
                return scraped;
            }
        });

        return merged;
    }

    /**
     * Gera chave única para um título (usado para comparação)
     */
    getTitleKey(release) {
        const title = (release.title || release.fullTitle || '').toLowerCase().trim();
        const season = (release.seasonInfo || '').toLowerCase().trim();
        return `${title}|${season}`; // Combina título + temporada
    }

    /**
     * Identificar novos lançamentos comparando com existentes
     */
    findNewReleases(currentReleases, existingReleases) {
        if (!existingReleases || existingReleases.length === 0) {
            return currentReleases; // Tudo é novo
        }

        const existingKeys = new Set(
            existingReleases.map(r => this.getTitleKey(r))
        );

        return currentReleases.filter(release => {
            const key = this.getTitleKey(release);
            return !existingKeys.has(key);
        });
    }

    /**
     * Enriquecer com dados do TMDB
     */
    async enrichWithTmdb(allReleases, newReleases) {
        if (newReleases.length === 0) {
            console.log('⏭️ Nenhum lançamento novo para enriquecer');
            return;
        }

        // CRÍTICO: Verificar se browser ainda existe antes de tentar usar
        if (!this.browser) {
            console.error('❌ Browser não disponível para enrichment');
            await firebaseLoggingService.logError(
                'calendar-tv-shows',
                'enrichment',
                new Error('Browser is null - cannot enrich'),
                { newReleasesCount: newReleases.length }
            );
            throw new Error('Browser is null - cannot perform enrichment');
        }

        console.log(`\n🔍 Enriquecendo ${newReleases.length} novos lançamentos com TMDB...`);

        const unmatchedTitles = []; // Rastrear títulos sem match

        for (let i = 0; i < newReleases.length; i++) {
            const release = newReleases[i];

            try {
                console.log(`   [${i + 1}/${newReleases.length}] ${release.fullTitle || release.title} [${release.genres?.join(', ') || 'Sem gênero'}]`);

                // Visitar página de detalhes do FlixPatrol para pegar mais info
                const details = await this.scrapeItemDetails(release.link);

                // Buscar no TMDB usando o título SEM parênteses
                const tmdbData = await this.searchTmdb(
                    release.title, // Título limpo (sem season info)
                    details.year,
                    details.original_title,
                    release.genres // Passa generos extraídos
                );

                // Atualizar release no array principal
                const index = allReleases.findIndex(r => r.link === release.link);
                if (index !== -1) {
                    allReleases[index] = {
                        ...allReleases[index],
                        ...details,
                        ...tmdbData
                    };

                    // Rastrear se não encontrou TMDB ID
                    if (!tmdbData.tmdb_id) {
                        unmatchedTitles.push({
                            title: release.fullTitle || release.title,
                            year: details.year,
                            link: release.link,
                            genres: release.genres
                        });
                    }
                }

                // Delay entre requisições
                await this.delay(800);

            } catch (error) {
                console.error(`   ❌ Erro ao enriquecer "${release.title}":`, error.message);
                await firebaseLoggingService.logWarning(
                    'calendar-tv-shows',
                    'enrichment',
                    `Failed to enrich title: ${release.title}`,
                    { title: release.title, error: error.message }
                );
                unmatchedTitles.push({
                    title: release.fullTitle || release.title,
                    error: error.message
                });
            }
        }

        console.log('✅ Enriquecimento concluído!');

        // RETRY: Tentar novamente com estratégias alternativas para títulos sem match
        if (unmatchedTitles.length > 0) {
            console.log(`\n🔄 Tentando novamente ${unmatchedTitles.length} títulos com estratégias alternativas...`);

            const stillUnmatched = [];

            for (let i = 0; i < unmatchedTitles.length; i++) {
                const item = unmatchedTitles[i];

                // Pular se foi erro de exceção (não de "não encontrado")
                if (item.error) {
                    stillUnmatched.push(item);
                    continue;
                }

                try {
                    console.log(`   [${i + 1}/${unmatchedTitles.length}] Retry: ${item.title}`);

                    // Encontrar o release original
                    const release = allReleases.find(r => r.link === item.link);
                    if (!release) {
                        stillUnmatched.push(item);
                        continue;
                    }

                    let tmdbData = null;

                    // Estratégia 1: Tentar extrair ano da releaseDate se year não funcionou
                    if (release.releaseDate && !tmdbData) {
                        const yearFromDate = release.releaseDate.match(/\b(20\d{2})\b/);
                        if (yearFromDate && yearFromDate[1] !== item.year) {
                            console.log(`   🔄 Tentando com ano extraído da data: ${yearFromDate[1]}`);
                            tmdbData = await this.searchTmdb(
                                release.title,
                                yearFromDate[1],
                                release.original_title,
                                release.genres
                            );
                        }
                    }

                    // Estratégia 2: Tentar com ano +1 ou -1 (pode haver diferença de timezone/formato)
                    if (!tmdbData && item.year) {
                        const yearInt = parseInt(item.year);
                        for (const yearVariance of [yearInt - 1, yearInt + 1]) {
                            console.log(`   🔄 Tentando com ano ${yearVariance}...`);
                            tmdbData = await this.searchTmdb(
                                release.title,
                                yearVariance.toString(),
                                release.original_title,
                                release.genres
                            );
                            if (tmdbData && tmdbData.tmdb_id) break;
                        }
                    }

                    // Estratégia 3: Tentar completamente sem ano
                    if (!tmdbData || !tmdbData.tmdb_id) {
                        console.log(`   🔄 Tentando sem filtro de ano...`);
                        tmdbData = await this.searchTmdb(
                            release.title,
                            null,
                            release.original_title,
                            release.genres
                        );
                    }

                    // Se encontrou, atualizar
                    if (tmdbData && tmdbData.tmdb_id) {
                        const index = allReleases.findIndex(r => r.link === item.link);
                        if (index !== -1) {
                            allReleases[index] = {
                                ...allReleases[index],
                                ...tmdbData
                            };
                            console.log(`   ✅ Match encontrado no retry!`);
                        }
                    } else {
                        stillUnmatched.push(item);
                    }

                    await this.delay(800);

                } catch (error) {
                    console.error(`   ❌ Erro no retry: ${error.message}`);
                    stillUnmatched.push(item);
                }
            }

            // Atualizar lista de não encontrados
            unmatchedTitles.length = 0;
            unmatchedTitles.push(...stillUnmatched);
        }

        // Exibir resumo de títulos sem TMDB ID
        if (unmatchedTitles.length > 0) {
            console.log(`\n⚠️ ===== TÍTULOS SEM TMDB ID (${unmatchedTitles.length}) =====`);
            unmatchedTitles.forEach((item, idx) => {
                console.log(`   ${idx + 1}. ${item.title}${item.year ? ` (${item.year})` : ''}`);
                if (item.link) console.log(`      Link: ${item.link}`);
                if (item.error) console.log(`      Erro: ${item.error}`);
            });
            console.log('========================================\n');
        } else {
            console.log('\n✅ Todos os títulos foram encontrados no TMDB!\n');
        }
    }

    /**
     * Extrair detalhes da página do item no FlixPatrol
     */
    async scrapeItemDetails(url) {
        if (!url) return {};

        // Verificar se browser ainda existe antes de criar página
        if (!this.browser) {
            console.warn(`⚠️ Browser não disponível, pulando detalhes de ${url}`);
            return {};
        }

        let page = null;

        try {
            page = await this.browser.newPage();
            await page.setUserAgent(this.getRandomUserAgent());

            // Otimização: desabilitar imagens
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (req.isInterceptResolutionHandled()) return;

                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort().catch(() => { });
                } else {
                    req.continue().catch(() => { });
                }
            });

            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 120000 // Aumentado de 60s para 120s
            });

            await this.randomDelay(500, 1500);

            const details = await page.evaluate(() => {
                const result = {};

                // Ano de estreia
                const premiereDiv = document.querySelector('div[title="Premiere"] span');
                if (premiereDiv && premiereDiv.parentElement) {
                    const fullText = premiereDiv.parentElement.textContent.trim();
                    const yearMatch = fullText.match(/(\d{4})$/);
                    if (yearMatch) result.year = parseInt(yearMatch[1]);
                }

                // Título original
                const h1 = document.querySelector('h1');
                if (h1) result.original_title = h1.textContent.trim();

                return result;
            });

            return details;

        } catch (error) {
            console.error(`❌ Erro ao extrair detalhes de ${url}:`, error.message);
            return {};
        } finally {
            // Melhor tratamento de erro ao fechar página
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    console.warn(`⚠️ Erro ao fechar página de detalhes:`, closeError.message);
                }
            }
        }
    }

    /**
     * Buscar série no TMDB com matching melhorado
     */
    async searchTmdb(title, year, originalTitle, genres = []) {
        if (!this.tmdbApiKey) {
            console.warn('⚠️ TMDB_API_KEY não configurada');
            return {};
        }

        try {
            const axios = (await import('axios')).default;

            // Busca séries
            const searchUrl = `https://api.themoviedb.org/3/search/tv`;
            const params = {
                api_key: this.tmdbApiKey,
                query: title,
                language: 'pt-BR',
                include_adult: false
            };

            // Adiciona filtro de ano se fornecido
            if (year) {
                params.first_air_date_year = year;
            }

            // Log para debug
            console.log(`   🔎 TMDB Request: Query="${title}" Year=${year || 'N/A'} Genres=[${genres.join(',')}]`);

            let response = await axios.get(searchUrl, { params });

            if (response.data.results && response.data.results.length > 0) {
                const results = response.data.results;

                // Se só tem 1 resultado, e se tiver ano ele já filtrou
                // Mas se não tiver ano, pode ser match ruim. Vamos sempre pontuar.
                // EXCEÇÃO: Se params.first_air_date_year foi usado e retornou 1, é muito provável.
                if (results.length === 1 && year) {
                    const match = results[0];
                    return this.formatTmdbResult(match);
                }

                // Múltiplos resultados: usar scoring inteligente
                console.log(`   📊 ${results.length} resultados encontrados, aplicando matching...`);

                // Map de IDs de Gênero TV do TMDB
                const tmdbGenreMap = {
                    'Action & Adventure': 10759,
                    'Animation': 16,
                    'Comedy': 35,
                    'Crime': 80,
                    'Documentary': 99,
                    'Drama': 18,
                    'Family': 10751,
                    'Kids': 10762,
                    'Mystery': 9648,
                    'News': 10763,
                    'Reality': 10764,
                    'Sci-Fi & Fantasy': 10765,
                    'Soap': 10766,
                    'Talk': 10767,
                    'War & Politics': 10768,
                    'Western': 37
                };

                // Mapeamento de generos do FlixPatrol (que podem vir como nomes variados) para ID TMDB
                // Helper simples
                const getTmdbGenreId = (genreName) => {
                    const normalized = genreName.toLowerCase();
                    if (normalized.includes('action') || normalized.includes('adventure')) return 10759;
                    if (normalized.includes('animation') || normalized.includes('anime')) return 16;
                    if (normalized.includes('comedy')) return 35;
                    if (normalized.includes('crime')) return 80;
                    if (normalized.includes('documentary')) return 99;
                    if (normalized.includes('drama')) return 18;
                    if (normalized.includes('family')) return 10751;
                    if (normalized.includes('kids') || normalized.includes('children')) return 10762;
                    if (normalized.includes('mystery')) return 9648;
                    if (normalized.includes('news')) return 10763;
                    if (normalized.includes('reality')) return 10764;
                    if (normalized.includes('sci-fi') || normalized.includes('fantasy')) return 10765;
                    if (normalized.includes('soap')) return 10766;
                    if (normalized.includes('talk')) return 10767;
                    if (normalized.includes('war') || normalized.includes('politics')) return 10768;
                    if (normalized.includes('western')) return 37;
                    return 0;
                };

                // Identificar IDs de generos buscados
                const targetGenreIds = genres.map(g => getTmdbGenreId(g)).filter(id => id > 0);

                let bestMatch = results[0];
                let bestScore = -1;

                for (const result of results) {
                    let score = 0;

                    // 1. Similaridade do título (peso: 40%)
                    const titleSimilarity = compareTwoStrings(
                        title.toLowerCase(),
                        result.name.toLowerCase()
                    );
                    score += titleSimilarity * 0.4;

                    // 2. Similaridade do título original (peso: 20%)
                    if (originalTitle) {
                        const originalSimilarity = compareTwoStrings(
                            originalTitle.toLowerCase(),
                            result.original_name.toLowerCase()
                        );
                        score += originalSimilarity * 0.2;
                    } else {
                        score += titleSimilarity * 0.2;
                    }

                    // 3. Match de Gênero (peso: 30%)
                    // Verificar overlap de gêneros
                    if (targetGenreIds.length > 0 && result.genre_ids) {
                        const hasMatchingGenre = result.genre_ids.some(id => targetGenreIds.includes(id));
                        if (hasMatchingGenre) {
                            score += 0.3; // Boost grande se tiver gênero
                        } else {
                            // Se NÃO tiver nenhum genero em comum, penaliza (mas pouco, generos podem variar)
                            score -= 0.1;
                        }
                    }

                    // 4. Popularidade como fator de desempate (peso: 10%)
                    const popularityScore = Math.min(result.popularity / 100, 1);
                    score += popularityScore * 0.1;

                    console.log(`      > Cam: "${result.name}" Genres: [${result.genre_ids?.join(',')}] Score: ${score.toFixed(2)}`);

                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = result;
                    }
                }

                console.log(`   ✓ Melhor match: "${bestMatch.name}" (${bestMatch.first_air_date?.split('-')[0] || 'N/A'}) - Score: ${bestScore.toFixed(2)}`);

                return this.formatTmdbResult(bestMatch);
            }

            console.warn(`   ⚠️ Nenhum resultado no TMDB`);
            return {};

        } catch (error) {
            console.error(`   ❌ Erro ao buscar no TMDB:`, error.message);
            return {};
        }
    }

    formatTmdbResult(match) {
        return {
            tmdb_id: match.id,
            tmdb_name: match.name,
            tmdb_original_name: match.original_name,
            tmdb_overview: match.overview,
            tmdb_poster_path: match.poster_path,
            tmdb_backdrop_path: match.backdrop_path,
            tmdb_vote_average: match.vote_average,
            tmdb_first_air_date: match.first_air_date
        };
    }

    /**
     * Delay helper
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obter data de hoje no formato YYYY-MM-DD
     */
    getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const flixpatrolCalendarScraper = new FlixPatrolCalendarScraper();
