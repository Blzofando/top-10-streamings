import puppeteer from 'puppeteer';
import { compareTwoStrings } from 'string-similarity';

/**
 * Scraper para calendário de lançamentos do IMDB
 * URL: https://www.imdb.com/pt/calendar/?region=BR&type=MOVIE
 */
export class ImdbCalendarScraper {
    constructor() {
        this.url = 'https://www.imdb.com/pt/calendar/?region=BR&type=MOVIE';
        this.tmdbApiKey = process.env.TMDB_API_KEY_2;
        this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
    }

    /**
     * Scraping principal com lógica incremental
     * @param {Array} existingReleases - Títulos já existentes no Firebase
     * @returns {Promise<Array>} Array de filmes com dados TMDB
     */
    async scrapeMovieCalendar(existingReleases = []) {
        console.log('\n🎬 ===== IMDB CALENDAR SCRAPER: Iniciando =====');
        console.log(`📅 URL: ${this.url}`);

        let browser;
        try {
            // Configurar Puppeteer com otimização e STEALTH para evitar 403
            // Removemos args que denunciam automação e adicionamos headers reais
            browser = await puppeteer.launch({
                headless: 'new', // Modo headless moderno
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-blink-features=AutomationControlled', // CRUCIAL para evitar detecção
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-extensions',
                    '--js-flags="--max-old-space-size=256"'
                ]
            });

            const page = await browser.newPage();

            // DEFINIR HEADERS DE NAVEGADOR REAL (Crucial para bypass 403)
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1'
            });

            // Debug: Forward browser console to Node console
            page.on('console', msg => console.log('📺 [BROWSER LOG]:', msg.text()));

            // Otimização: Bloquear TUDO que não for HTML para economizar memória (OOM Fix)
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                // Permitir Apenas Document e XHR/Fetch essenciais
                if (['document', 'xhr', 'fetch', 'script'].includes(resourceType)) {
                    req.continue();
                } else {
                    // Bloquear imagens, fontes, media, css, etc.
                    req.abort();
                }
            });

            // Viewport mínimo (mobile) consome menos RAM
            await page.setViewport({ width: 800, height: 600 });

            console.log('🌐 Navegando para IMDB Calendar...');
            // networkidle0 é mais agressivo que networkidle2 (espera 0 conexões ativas)
            // Timeout menor para falhar rápido e liberar memória
            await page.goto(this.url, {
                waitUntil: 'domcontentloaded', // Não espera networkidle para economizar recursos
                timeout: 60000
            });

            // Esperar seletor específico aparecer (mais leve que esperar timeout)
            await page.waitForSelector('article[data-testid="calendar-section"]', { timeout: 30000 });

            console.log('📖 Extraindo dados do calendário...');

            // Extrair todos os lançamentos da página
            const rawReleases = await page.evaluate(() => {
                const releases = [];

                // Procurar por seções de data (calendar-section)
                const dateSections = document.querySelectorAll('article[data-testid="calendar-section"]');

                console.log(`Encontradas ${dateSections.length} seções de data`);

                dateSections.forEach(section => {
                    // Pegar a data do h3 dentro da seção
                    const dateH3 = section.querySelector('h3.ipc-title__text');
                    if (!dateH3) {
                        console.log('Seção sem data encontrada');
                        return;
                    }

                    const dateText = dateH3.textContent.trim();
                    console.log(`Processando data: ${dateText}`);

                    // Pegar todos os filmes dessa seção (li com coming-soon-entry)
                    const movieItems = section.querySelectorAll('li[data-testid="coming-soon-entry"]');
                    console.log(`  - ${movieItems.length} filmes encontrados`);

                    movieItems.forEach(item => {
                        // Título está no link com classe ipc-metadata-list-summary-item__t
                        const titleLink = item.querySelector('a.ipc-metadata-list-summary-item__t');
                        if (!titleLink) return;

                        let title = titleLink.textContent.trim();

                        // Extrair ano se estiver entre parênteses no título
                        const yearMatch = title.match(/\((\d{4})\)/);
                        const year = yearMatch ? parseInt(yearMatch[1]) : null;

                        // Remover ano do título
                        if (yearMatch) {
                            title = title.replace(/\s*\(\d{4}\)/, '').trim();
                        }

                        // Pegar o href para extrair IMDB ID
                        const href = titleLink.getAttribute('href');
                        const imdbIdMatch = href && href.match(/\/title\/(tt\d+)/);
                        const imdbId = imdbIdMatch ? imdbIdMatch[1] : null;

                        // Extrair gêneros
                        const genreElements = item.querySelectorAll('.ipc-metadata-list-summary-item__tl .ipc-metadata-list-summary-item__li');
                        const genres = Array.from(genreElements).map(el => el.textContent.trim());

                        // Extrair atores (top 4)
                        const actorElements = item.querySelectorAll('.ipc-metadata-list-summary-item__stl .ipc-metadata-list-summary-item__li');
                        const actors = Array.from(actorElements).map(el => el.textContent.trim()).slice(0, 4);

                        releases.push({
                            title,
                            releaseDate: dateText,
                            year,
                            imdbId,
                            genres,
                            actors
                        });
                    });
                });

                return releases;
            });

            // Debug se vazio
            if (rawReleases.length === 0) {
                console.log('⚠️ NENHUM FILME ENCONTRADO! Debugging...');
                const pageTitle = await page.title();
                console.log(`TITLE: ${pageTitle}`);

                const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
                console.log(`BODY PREVIEW: ${bodyText.replace(/\n/g, ' ')}...`);

                // Verificar se existe algum outro elemento que indica erro
                const content = await page.content();
                console.log(`HTML LENGTH: ${content.length}`);
            } else {
                console.log(`📦 Total extraído do IMDB: ${rawReleases.length} filmes`);
            }

            // Filtrar apenas futuros (remover lançamentos que já passaram)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const futureReleases = rawReleases.filter(release => {
                const releaseDate = this.parseBrazilianDate(release.releaseDate);
                return releaseDate >= today;
            });

            console.log(`📅 Lançamentos futuros: ${futureReleases.length} filmes`);

            // OTIMIZAÇÃO INCREMENTAL: Identificar apenas novos
            const newReleases = this.identifyNewReleases(futureReleases, existingReleases);
            console.log(`🆕 Novos lançamentos para processar: ${newReleases.length}`);

            // Fazer match TMDB apenas para novos
            const enrichedNew = await this.enrichWithTmdb(newReleases);

            // Mesclar com existentes (manter ordem: mais recente primeiro)
            const allEnriched = this.mergeReleases(enrichedNew, existingReleases, futureReleases);

            console.log(`✅ Total final: ${allEnriched.length} filmes`);
            console.log('✅ ===== IMDB CALENDAR SCRAPER: Concluído =====\n');

            await browser.close();
            return allEnriched;

        } catch (error) {
            console.error('❌ Erro no IMDB Calendar Scraper:', error.message);
            if (browser) await browser.close();
            throw error;
        }
    }

    /**
     * Converte data brasileira para Date object
     * @param {string} dateStr - Ex: "15 de dezembro"
     * @returns {Date}
     */
    parseBrazilianDate(dateStr) {
        const months = {
            // Nomes completos
            'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3,
            'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
            'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11,
            // Abreviações (com e sem ponto)
            'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
            'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
            'set': 8, 'out': 9, 'nov': 10, 'dez': 11
        };

        // Aceita: "18 de dez. de 2025" ou "18 de dezembro de 2025" ou "16 de jan. de 2026"
        const match = dateStr.match(/(\d+)\s+de\s+(\w+)\.?(?:\s+de\s+(\d{4}))?/i);
        if (!match) {
            console.warn(`Data inválida: ${dateStr}`);
            return new Date();
        }

        const day = parseInt(match[1]);
        let monthStr = match[2].toLowerCase().replace('.', ''); // Remove ponto se tiver
        const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();

        const month = months[monthStr];
        if (month === undefined) {
            console.warn(`Mês não reconhecido: ${monthStr} em ${dateStr}`);
            return new Date();
        }

        return new Date(year, month, day);
    }

    /**
     * Identifica apenas lançamentos novos comparando com existentes
     * @param {Array} scrapedReleases - Do scraping
     * @param {Array} existingReleases - Do Firebase
     * @returns {Array} Apenas novos
     */
    identifyNewReleases(scrapedReleases, existingReleases) {
        if (!existingReleases || existingReleases.length === 0) {
            return scrapedReleases; // Todos são novos
        }

        return scrapedReleases.filter(scraped => {
            // Procura por título similar nos existentes
            const exists = existingReleases.some(existing => {
                const similarity = compareTwoStrings(
                    scraped.title.toLowerCase(),
                    existing.title?.toLowerCase() || ''
                );
                return similarity > 0.8 && scraped.releaseDate === existing.releaseDate;
            });

            return !exists; // Retorna apenas se NÃO existe
        });
    }

    /**
     * Enriquecer com dados do TMDB
     * @param {Array} releases - Lançamentos a enriquecer
     * @returns {Promise<Array>}
     */
    async enrichWithTmdb(releases) {
        console.log(`\n🎯 Enriquecendo ${releases.length} filmes com TMDB...`);

        const enriched = [];

        for (const release of releases) {
            try {
                console.log(`  🔍 Buscando: ${release.title} (${release.year || 'sem ano'})`);

                // Buscar no TMDB (com título limpo, ano, gêneros e atores como critério)
                const tmdbData = await this.searchTmdb(release.title, release.year, release.genres, release.actors);

                if (tmdbData) {
                    // IMPORTANTE: Preservar releaseDate do IMDB (não usar do TMDB)
                    enriched.push({
                        ...release,
                        tmdb: tmdbData,
                        matched: true,
                        releaseDateSource: 'imdb-br' // Data é do IMDB Brasil, não do TMDB
                    });
                    console.log(`  ✅ ${release.title} → TMDB ID: ${tmdbData.tmdb_id}`);
                } else {
                    // Sem match, adiciona sem TMDB
                    enriched.push({
                        ...release,
                        tmdb: null,
                        matched: false
                    });
                    console.log(`  ⚠️ ${release.title} → Sem match TMDB`);
                }

                // Delay para evitar rate limit
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.error(`  ❌ Erro ao buscar ${release.title}:`, error.message);
                enriched.push({
                    ...release,
                    tmdb: null,
                    matched: false
                });
            }
        }

        return enriched;
    }

    /**
     * Buscar filme no TMDB com melhor match
     * @param {string} title - Título do filme (já sem ano/parênteses)
     * @param {number} year - Ano do filme
     * @param {Array} genres - Gêneros do IMDB (para validação)
     * @param {Array} actors - Atores do IMDB (para validação)
     * @returns {Promise<Object|null>}
     */
    async searchTmdb(title, year, genres = [], actors = []) {
        try {
            // Limpar título ainda mais (remover outros parênteses)
            let cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

            // Primeira tentativa: com ano
            let searchUrl = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&language=pt-BR&query=${encodeURIComponent(cleanTitle)}${year ? `&year=${year}` : ''}`;
            let response = await fetch(searchUrl);
            let data = await response.json();

            // Segunda tentativa: sem ano (caso a data BR seja diferente da data mundial)
            if (!data.results || data.results.length === 0) {
                searchUrl = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&language=pt-BR&query=${encodeURIComponent(cleanTitle)}`;
                response = await fetch(searchUrl);
                data = await response.json();
            }

            if (!data.results || data.results.length === 0) {
                return null;
            }

            // Pegar melhor resultado (validando com ano se disponível)
            let bestMatch = data.results[0];

            // Se temos ano, preferir resultado com ano próximo (±1 ano)
            if (year && data.results.length > 1) {
                const matchWithYear = data.results.find(movie => {
                    if (!movie.release_date) return false;
                    const movieYear = parseInt(movie.release_date.substring(0, 4));
                    return Math.abs(movieYear - year) <= 1; // Tolera 1 ano de diferença
                });
                if (matchWithYear) {
                    bestMatch = matchWithYear;
                }
            }

            return {
                tmdb_id: bestMatch.id,
                title: bestMatch.title,
                original_title: bestMatch.original_title,
                overview: bestMatch.overview,
                release_date: bestMatch.release_date, // Data mundial do TMDB (NÃO usar!)
                poster_path: bestMatch.poster_path ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` : null,
                backdrop_path: bestMatch.backdrop_path ? `https://image.tmdb.org/t/p/w1280${bestMatch.backdrop_path}` : null,
                vote_average: bestMatch.vote_average,
                vote_count: bestMatch.vote_count,
                popularity: bestMatch.popularity,
                adult: bestMatch.adult,
                genre_ids: bestMatch.genre_ids // IDs dos gêneros do TMDB
            };

        } catch (error) {
            console.error(`Erro ao buscar TMDB para "${title}":`, error.message);
            return null;
        }
    }

    /**
     * Mesclar novos com existentes, mantendo ordem cronológica
     * @param {Array} newEnriched - Novos com TMDB
     * @param {Array} existingReleases - Existentes do Firebase
     * @param {Array} allScraped - Todos do scraping (para ordem)
     * @returns {Array}
     */
    mergeReleases(newEnriched, existingReleases, allScraped) {
        // Combinar todos
        const combined = [...newEnriched];

        // Adicionar existentes que ainda são futuros
        existingReleases.forEach(existing => {
            const stillExists = allScraped.some(scraped => {
                const similarity = compareTwoStrings(
                    scraped.title.toLowerCase(),
                    existing.title?.toLowerCase() || ''
                );
                return similarity > 0.8;
            });

            if (stillExists) {
                combined.push(existing);
            }
        });

        // Ordenar por data (mais recente primeiro)
        combined.sort((a, b) => {
            const dateA = this.parseBrazilianDate(a.releaseDate);
            const dateB = this.parseBrazilianDate(b.releaseDate);
            return dateA - dateB; // Ordem crescente (próximos primeiro)
        });

        return combined;
    }
}

export const imdbCalendarScraper = new ImdbCalendarScraper();
