import axios from 'axios';
import * as cheerio from 'cheerio';
import { compareTwoStrings } from 'string-similarity';

/**
 * Scraper para calendário de lançamentos do IMDB (usando Cheerio - LEVE!)
 * URL: https://www.imdb.com/pt/calendar/?region=BR&type=MOVIE
 */
export class ImdbCalendarScraper {
    constructor() {
        this.url = 'https://www.imdb.com/pt/calendar/?region=BR&type=MOVIE';
        this.tmdbApiKey = process.env.TMDB_API_KEY_2;
        this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
    }

    /**
     * Scraping principal com lógica incremental (CHEERIO - sem Puppeteer!)
     * @param {Array} existingReleases - Títulos já existentes no Firebase
     * @returns {Promise<Array>} Array de filmes com dados TMDB
     */
    async scrapeMovieCalendar(existingReleases = []) {
        console.log('\n🎬 ===== IMDB CALENDAR SCRAPER (Cheerio): Iniciando =====');
        console.log(`📅 URL: ${this.url}`);

        try {
            // HTTP Request simples - Memória ~10-20MB (vs ~400MB do Puppeteer)
            console.log('🌐 Fazendo request HTTP...');
            const response = await axios.get(this.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                timeout: 30000
            });

            console.log('📖 Parseando HTML com Cheerio...');
            const $ = cheerio.load(response.data);

            const rawReleases = [];

            // Procurar por seções de data (calendar-section)
            const dateSections = $('article[data-testid="calendar-section"]');

            console.log(`✅ Encontradas ${dateSections.length} seções de data`);

            dateSections.each((index, section) => {
                const $section = $(section);

                // Pegar a data do h3 dentro da seção
                const dateText = $section.find('h3.ipc-title__text').text().trim();

                if (!dateText) {
                    console.log('⚠️ Seção sem data encontrada');
                    return;
                }

                console.log(`📅 Processando data: ${dateText}`);

                // Pegar todos os filmes dessa seção
                const movieItems = $section.find('li[data-testid="coming-soon-entry"]');
                console.log(`  📽️ ${movieItems.length} filmes encontrados`);

                movieItems.each((idx, item) => {
                    const $item = $(item);

                    // Título está no link com classe ipc-metadata-list-summary-item__t
                    const $titleLink = $item.find('a.ipc-metadata-list-summary-item__t');
                    if ($titleLink.length === 0) return;

                    let title = $titleLink.text().trim();

                    // Extrair ano se estiver entre parênteses no título
                    const yearMatch = title.match(/\((\d{4})\)/);
                    const year = yearMatch ? parseInt(yearMatch[1]) : null;

                    // Remover ano do título
                    if (yearMatch) {
                        title = title.replace(/\s*\(\d{4}\)/, '').trim();
                    }

                    // Pegar o href para extrair IMDB ID
                    const href = $titleLink.attr('href');
                    const imdbIdMatch = href && href.match(/\/title\/(tt\d+)/);
                    const imdbId = imdbIdMatch ? imdbIdMatch[1] : null;

                    // Extrair gêneros
                    const genres = [];
                    $item.find('.ipc-metadata-list-summary-item__tl .ipc-metadata-list-summary-item__li').each((i, el) => {
                        genres.push($(el).text().trim());
                    });

                    // Extrair atores (top 4)
                    const actors = [];
                    $item.find('.ipc-metadata-list-summary-item__stl .ipc-metadata-list-summary-item__li').each((i, el) => {
                        if (i < 4) actors.push($(el).text().trim());
                    });

                    rawReleases.push({
                        title,
                        releaseDate: dateText,
                        year,
                        imdbId,
                        genres,
                        actors
                    });
                });
            });

            console.log(`📦 Total extraído do IMDB: ${rawReleases.length} filmes`);

            // Filtrar apenas futuros (remover lançamentos que já passaram)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const futureReleases = rawReleases.filter(movie => {
                const releaseDate = this.parseBrazilianDate(movie.releaseDate);
                return releaseDate && releaseDate >= today;
            });

            console.log(`📅 Lançamentos futuros: ${futureReleases.length} filmes`);

            // Identificar novidades (lógica incremental)
            const newReleases = this.findNewReleases(futureReleases, existingReleases);
            console.log(`🆕 Novos lançamentos para processar: ${newReleases.length}`);

            // Enriquecer com TMDB
            const enrichedReleases = await this.enrichWithTmdb(futureReleases, newReleases);

            console.log(`✅ Total final: ${enrichedReleases.length} filmes`);
            console.log('✅ ===== IMDB CALENDAR SCRAPER: Concluído =====\n');

            return enrichedReleases;

        } catch (error) {
            console.error('❌ Erro no IMDB Calendar Scraper:', error.message);
            throw error;
        }
    }

    /**
     * Parser de datas brasileiras do IMDB
     * Suporta formatos como: "18 de dez. de 2025", "25 de dezembro de 2025"
     */
    parseBrazilianDate(dateStr) {
        if (!dateStr) return null;

        try {
            // Mapeamento de meses brasileiros (completos e abreviados)
            const monthMap = {
                'jan': 0, 'janeiro': 0, 'jan.': 0,
                'fev': 1, 'fevereiro': 1, 'fev.': 1,
                'mar': 2, 'março': 2, 'mar.': 2,
                'abr': 3, 'abril': 3, 'abr.': 3,
                'mai': 4, 'maio': 4, 'mai.': 4,
                'jun': 5, 'junho': 5, 'jun.': 5,
                'jul': 6, 'julho': 6, 'jul.': 6,
                'ago': 7, 'agosto': 7, 'ago.': 7,
                'set': 8, 'setembro': 8, 'set.': 8,
                'out': 9, 'outubro': 9, 'out.': 9,
                'nov': 10, 'novembro': 10, 'nov.': 10,
                'dez': 11, 'dezembro': 11, 'dez.': 11
            };

            // Regex para capturar: "18 de dez. de 2025" ou "18 de dezembro"
            const match = dateStr.match(/(\d{1,2})\s+de\s+(\w+\.?)(?:\s+de\s+(\d{4}))?/i);

            if (!match) {
                console.warn(`⚠️ Formato de data não reconhecido: ${dateStr}`);
                return null;
            }

            const day = parseInt(match[1]);
            const monthStr = match[2].toLowerCase();
            const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();

            const month = monthMap[monthStr];

            if (month === undefined) {
                console.warn(`⚠️ Mês não reconhecido: ${monthStr}`);
                return null;
            }

            return new Date(year, month, day);

        } catch (error) {
            console.error(`❌ Erro ao parsear data "${dateStr}":`, error.message);
            return null;
        }
    }

    /**
     * Identificar novidades comparando com existentes
     */
    findNewReleases(currentReleases, existingReleases) {
        if (!existingReleases || existingReleases.length === 0) {
            return currentReleases; // Tudo é novo
        }

        const newReleases = [];

        for (const current of currentReleases) {
            const exists = existingReleases.find(existing =>
                existing.title === current.title &&
                existing.releaseDate === current.releaseDate
            );

            if (!exists) {
                newReleases.push(current);
            }
        }

        return newReleases;
    }

    /**
     * Enriquecer com dados do TMDB
     */
    async enrichWithTmdb(allReleases, newReleases) {
        console.log(`\n🎯 Enriquecendo ${newReleases.length} filmes com TMDB...`);

        const enrichedResults = [];

        for (const release of allReleases) {
            // Se não é novo, só adiciona com matched=true (já está enriquecido)
            const isNew = newReleases.some(nr => nr.title === release.title && nr.releaseDate === release.releaseDate);

            if (!isNew) {
                enrichedResults.push({
                    ...release,
                    matched: true,
                    releaseDateSource: 'imdb-br'
                });
                continue;
            }

            // É novo: buscar no TMDB
            const tmdbData = await this.searchTmdb(release.title, release.year, release.genres, release.actors);

            enrichedResults.push({
                ...release,
                tmdb: tmdbData,
                matched: !!tmdbData,
                releaseDateSource: 'imdb-br' // SEMPRE preserva a data do IMDB BR
            });

            // Delay para não bater rate limit do TMDB
            await this.delay(250);
        }

        return enrichedResults;
    }

    /**
     * Buscar filme no TMDB
     */
    async searchTmdb(title, year, genres = [], actors = []) {
        try {
            console.log(`  🔍 Buscando: ${title} (${year})`);

            // Limpar título (remover ano e caracteres extras entre parênteses)
            const cleanTitle = title.replace(/\s*\([^)]*\)/g, '').trim();

            // Primeira tentativa: com ano
            let searchUrl = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&language=pt-BR&query=${encodeURIComponent(cleanTitle)}${year ? `&year=${year}` : ''}`;
            let response = await axios.get(searchUrl, { timeout: 10000 });

            // Se não encontrou, tentar sem ano
            if (!response.data.results || response.data.results.length === 0) {
                searchUrl = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&language=pt-BR&query=${encodeURIComponent(cleanTitle)}`;
                response = await axios.get(searchUrl, { timeout: 10000 });
            }

            if (!response.data.results || response.data.results.length === 0) {
                console.log(`  ⚠️ Não encontrado no TMDB: ${title}`);
                return null;
            }

            // Se múltiplos resultados, tentar encontrar o mais próximo ao ano
            let bestMatch = response.data.results[0];

            if (year && response.data.results.length > 1) {
                for (const result of response.data.results) {
                    const resultYear = result.release_date ? parseInt(result.release_date.split('-')[0]) : null;
                    if (resultYear && Math.abs(resultYear - year) <= 1) {
                        bestMatch = result;
                        break;
                    }
                }
            }

            console.log(`  ✅ ${title} → TMDB ID: ${bestMatch.id}`);

            return {
                id: bestMatch.id,
                title: bestMatch.title,
                originalTitle: bestMatch.original_title,
                posterPath: bestMatch.poster_path,
                backdropPath: bestMatch.backdrop_path,
                overview: bestMatch.overview,
                voteAverage: bestMatch.vote_average,
                releaseDate: bestMatch.release_date
            };

        } catch (error) {
            console.error(`  ❌ Erro ao buscar "${title}" no TMDB:`, error.message);
            return null;
        }
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const imdbCalendarScraper = new ImdbCalendarScraper();
