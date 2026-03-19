import axios from 'axios';

/**
 * Scraper para calendário de lançamentos de filmes no Brasil
 * FONTE: TMDB API (/movie/upcoming + /discover/movie)
 * 
 * NOTA HISTÓRICA: Anteriormente usava scraping do IMDB com Cheerio,
 * mas o IMDB implementou AWS WAF (captcha/challenge) que bloqueia
 * requisições HTTP puras. Migrado para TMDB API em Março/2026.
 */
export class ImdbCalendarScraper {
    constructor() {
        this.tmdbApiKey = process.env.TMDB_API_KEY_2 || process.env.TMDB_API_KEY;
        this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
    }

    /**
     * Busca calendário de filmes com lançamento no Brasil
     * Combina /movie/upcoming (curado) + /discover/movie (abrangente)
     * 
     * @param {Array} existingReleases - Títulos já existentes no Firebase (para lógica incremental)
     * @returns {Promise<Array>} Array de filmes com dados TMDB
     */
    async scrapeMovieCalendar(existingReleases = []) {
        console.log('\n🎬 ===== MOVIE CALENDAR (TMDB API): Iniciando =====');

        if (!this.tmdbApiKey) {
            throw new Error('TMDB_API_KEY não configurada no .env');
        }

        try {
            // 1. Buscar filmes upcoming (endpoint curado — filmes populares próximos)
            console.log('📡 Buscando /movie/upcoming (BR)...');
            const upcomingMovies = await this._fetchUpcoming();
            console.log(`  ✅ Upcoming: ${upcomingMovies.length} filmes`);

            // 2. Buscar filmes via discover (mais abrangente, pega filmes menores)
            console.log('📡 Buscando /discover/movie (BR, próximos 60 dias)...');
            const discoverMovies = await this._fetchDiscover();
            console.log(`  ✅ Discover: ${discoverMovies.length} filmes`);

            // 3. Combinar e deduplicar os novos resultados
            const currentFetchedMovies = this._mergeAndDeduplicate(upcomingMovies, discoverMovies);
            console.log(`📊 Total extraído da API (sem duplicatas): ${currentFetchedMovies.length} filmes`);

            // 4. Filtrar apenas lançamentos futuros dos recém-extraídos
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const futureFetchedMovies = currentFetchedMovies.filter(movie => {
                if (!movie.releaseDate) return false;
                const releaseDate = new Date(movie.releaseDate);
                return releaseDate >= today;
            });

            // 5. Lógica incremental: mesclar com banco existente e identificar novidades
            const { merged, newReleases } = this._mergeWithExisting(futureFetchedMovies, existingReleases, today);
            console.log(`📅 Total de filmes em base (futuros): ${merged.length}`);
            console.log(`🆕 Novos lançamentos identificados: ${newReleases.length}`);

            // 6. Buscar detalhes extras SOMENTE para novos filmes (gêneros em PT-BR, etc.)
            console.log(`\n🎯 Enriquecendo ${newReleases.length} filmes novos com detalhes...`);
            const enrichedMovies = await this._enrichNewMovies(merged, newReleases);

            console.log(`✅ Total final: ${enrichedMovies.length} filmes`);
            console.log('✅ ===== MOVIE CALENDAR (TMDB API): Concluído =====\n');

            return enrichedMovies;

        } catch (error) {
            console.error('❌ Erro no Movie Calendar (TMDB):', error.message);
            throw error;
        }
    }

    /**
     * Busca filmes do /movie/upcoming (curado pelo TMDB, só filmes relevantes)
     * @returns {Promise<Array>}
     */
    async _fetchUpcoming() {
        const movies = [];
        const maxPages = 3;

        for (let page = 1; page <= maxPages; page++) {
            try {
                const response = await axios.get(`${this.tmdbBaseUrl}/movie/upcoming`, {
                    params: {
                        api_key: this.tmdbApiKey,
                        language: 'pt-BR',
                        region: 'BR',
                        page
                    },
                    timeout: 10000
                });

                if (!response.data.results || response.data.results.length === 0) break;

                for (const m of response.data.results) {
                    movies.push(this._formatMovie(m, 'upcoming'));
                }

                if (page >= response.data.total_pages) break;

            } catch (error) {
                console.warn(`  ⚠️ Erro na página ${page} do upcoming: ${error.message}`);
                break;
            }
        }

        return movies;
    }

    /**
     * Busca filmes via /discover/movie (mais abrangente, filmes BR próximos 60 dias)
     * @returns {Promise<Array>}
     */
    async _fetchDiscover() {
        const movies = [];

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 60);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const maxPages = 3;

        for (let page = 1; page <= maxPages; page++) {
            try {
                const response = await axios.get(`${this.tmdbBaseUrl}/discover/movie`, {
                    params: {
                        api_key: this.tmdbApiKey,
                        language: 'pt-BR',
                        region: 'BR',
                        'primary_release_date.gte': todayStr,
                        'primary_release_date.lte': futureDateStr,
                        sort_by: 'popularity.desc',
                        'vote_count.gte': 0,
                        page
                    },
                    timeout: 10000
                });

                if (!response.data.results || response.data.results.length === 0) break;

                for (const m of response.data.results) {
                    // Filtrar filmes com popularidade mínima (excluir obscuros)
                    if (m.popularity >= 1.0) {
                        movies.push(this._formatMovie(m, 'discover'));
                    }
                }

                if (page >= response.data.total_pages) break;

            } catch (error) {
                console.warn(`  ⚠️ Erro na página ${page} do discover: ${error.message}`);
                break;
            }
        }

        return movies;
    }

    /**
     * Formata um filme da API TMDB para nosso formato padrão
     * @param {Object} m - Objeto do TMDB
     * @param {string} source - 'upcoming' ou 'discover'
     * @returns {Object}
     */
    _formatMovie(m, source) {
        return {
            title: m.title,
            originalTitle: m.original_title,
            releaseDate: m.release_date,
            year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
            tmdb: {
                id: m.id,
                title: m.title,
                originalTitle: m.original_title,
                posterPath: m.poster_path,
                backdropPath: m.backdrop_path,
                overview: m.overview,
                voteAverage: m.vote_average,
                popularity: m.popularity,
                releaseDate: m.release_date,
                genreIds: m.genre_ids || []
            },
            matched: true,
            releaseDateSource: `tmdb-${source}`,
            type: 'movie'
        };
    }

    /**
     * Combina e deduplica listas de filmes (upcoming tem prioridade)
     * @param {Array} upcoming - Filmes do /movie/upcoming
     * @param {Array} discover - Filmes do /discover/movie
     * @returns {Array}
     */
    _mergeAndDeduplicate(upcoming, discover) {
        const seen = new Set();
        const merged = [];

        // Upcoming primeiro (prioridade)
        for (const movie of upcoming) {
            const key = movie.tmdb.id;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(movie);
            }
        }

        // Discover depois (complementar)
        for (const movie of discover) {
            const key = movie.tmdb.id;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(movie);
            }
        }

        // Ordenar por data de lançamento
        return merged.sort((a, b) => {
            const dateA = new Date(a.releaseDate || '9999-12-31');
            const dateB = new Date(b.releaseDate || '9999-12-31');
            return dateA - dateB;
        });
    }

    /**
     * Mescla as novas extrações com os filmes já existentes no Firebase.
     * Mantém os filmes antigos (preservando o `runtime`, `genres` enriquecidos, etc),
     * desde que ainda sejam lançamentos futuros, e adiciona as novidades.
     */
    _mergeWithExisting(currentFetchedMovies, existingReleases, today) {
        if (!existingReleases || existingReleases.length === 0) {
            return { merged: currentFetchedMovies, newReleases: currentFetchedMovies };
        }

        const mergedMap = new Map();
        
        // 1. Adiciona todos os lançamentos existentes no Map (preservando o cache)
        for (const existing of existingReleases) {
            // Filtra o banco antigo para não acumular filmes passados infinitamente
            if (existing.releaseDate) {
                const releaseDate = new Date(existing.releaseDate);
                if (releaseDate < today) continue;
            }

            // A chave prioritária é o TMDB ID. Fallback para Titulo+Data.
            const key = existing.tmdb_id || existing.tmdb?.id || (existing.originalTitle || existing.title);
            if (key) {
                mergedMap.set(key, existing);
            }
        }

        const newReleases = [];
        
        // 2. Processa os novos fetches da API
        for (const current of currentFetchedMovies) {
            const key = current.tmdb?.id || (current.originalTitle || current.title);
            
            if (!mergedMap.has(key)) {
                // É um filme novo que não tínhamos no cache!
                mergedMap.set(key, current);
                newReleases.push(current);
            } else {
                // Já existe. Mantemos o `existing` no map, pois ele já tem `genres` e `runtime` ricos,
                // mas podemos atualizar a data de lançamento caso o TMDB tenha alterado recentemente.
                const existing = mergedMap.get(key);
                if (existing.releaseDate !== current.releaseDate) {
                    existing.releaseDate = current.releaseDate;
                    if (existing.tmdb) existing.tmdb.releaseDate = current.releaseDate;
                }
            }
        }

        // Ordenar por data de lançamento
        const mergedArray = Array.from(mergedMap.values()).sort((a, b) => {
            const dateA = new Date(a.releaseDate || '9999-12-31');
            const dateB = new Date(b.releaseDate || '9999-12-31');
            return dateA - dateB;
        });

        return {
            merged: mergedArray,
            newReleases
        };
    }

    async _enrichNewMovies(allMovies, newMovies) {
        // Mapeia IDs ou Títulos dos filmes novos para busca rápida
        const newIds = new Set(newMovies.map(m => m.tmdb?.id || m.originalTitle || m.title));
        const results = [];

        for (const movie of allMovies) {
            const key = movie.tmdb?.id || movie.tmdb_id || movie.originalTitle || movie.title;
            
            if (!newIds.has(key)) {
                // Filme já existente (e já devidamente enriquecido anteriormente) — manter como está
                results.push(movie);
                continue;
            }

            // Filme novo — buscar detalhes extras
            try {
                const details = await axios.get(`${this.tmdbBaseUrl}/movie/${movie.tmdb.id}`, {
                    params: {
                        api_key: this.tmdbApiKey,
                        language: 'pt-BR'
                    },
                    timeout: 10000
                });

                const d = details.data;
                movie.genres = (d.genres || []).map(g => g.name);
                movie.tmdb.runtime = d.runtime;
                movie.tmdb.tagline = d.tagline;
                movie.tmdb.genres = movie.genres;

                console.log(`  ✅ ${movie.title} (${movie.releaseDate}) — ${movie.genres.join(', ')}`);

            } catch (error) {
                console.warn(`  ⚠️ Detalhes não encontrados para "${movie.title}": ${error.message}`);
            }

            results.push(movie);

            // Rate limit TMDB: 40 req/10s
            await this._delay(260);
        }

        return results;
    }

    /**
     * Delay helper
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const imdbCalendarScraper = new ImdbCalendarScraper();
