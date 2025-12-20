import axios from 'axios';

/**
 * Serviço para buscar calendário de séries diretamente do TMDB
 * Substitui o scraping do FlixPatrol por requisições diretas à API
 */
export class TmdbCalendarService {
    constructor() {
        this.apiKey = process.env.TMDB_API_KEY;
        this.baseUrl = 'https://api.themoviedb.org/3';

        // IDs de gêneros para excluir (Reality, Talk, News, Soap Opera)
        this.EXCLUDED_GENRES = '10763,10764,10767,10766';
    }

    /**
     * Busca novas séries (temporada 1) que ainda vão estrear
     * Baseado em novas_series.md
     * @param {number} limit - Quantidade máxima de séries a retornar
     * @returns {Promise<Array>}
     */
    async fetchNewSeries(limit = 20) {
        console.log(`\n📺 Buscando novas séries (top ${limit})...`);

        const today = new Date().toISOString().split('T')[0];
        let resultsAccumulated = [];

        try {
            // Buscar várias páginas para garantir resultados suficientes após filtros
            const pagesToFetch = [1, 2, 3, 4, 5, 6, 7, 8];

            const promises = pagesToFetch.map(page => {
                const url = `${this.baseUrl}/discover/tv`;
                const params = {
                    api_key: this.apiKey,
                    language: 'pt-BR',
                    timezone: 'America/Sao_Paulo',
                    page: page,
                    sort_by: 'popularity.desc', // Ordenar por popularidade (hype)
                    without_genres: this.EXCLUDED_GENRES, // Excluir lixo
                    include_null_first_air_dates: false,
                    'first_air_date.gte': today // Apenas estreias futuras
                };

                return axios.get(url, { params }).then(res => res.data);
            });

            const responses = await Promise.all(promises);

            responses.forEach(data => {
                if (data.results) {
                    resultsAccumulated.push(...data.results);
                }
            });

            console.log(`   📊 Total bruto coletado: ${resultsAccumulated.length}`);

            // Filtros client-side
            const filtered = this.processNewSeriesResults(resultsAccumulated, limit);

            console.log(`   ✅ Após filtros: ${filtered.length} séries`);

            return filtered;

        } catch (error) {
            console.error('❌ Erro ao buscar novas séries:', error.message);
            throw error;
        }
    }

    /**
     * Processa e filtra resultados de novas séries
     */
    processNewSeriesResults(list, limit) {
        // 1. Filtrar apenas com poster e sinopse
        let cleanList = list.filter(item =>
            item.poster_path &&
            item.overview &&
            item.overview.length > 10
        );

        // 2. Remover duplicatas
        const seen = new Set();
        cleanList = cleanList.filter(item => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });

        // 3. Filtro de anime sem título PT-BR
        cleanList = cleanList.filter(item => {
            if (item.original_language === 'ja') {
                const title = item.name.toLowerCase();

                // Regex para detectar palavras/caracteres portugueses
                const hasPortugueseChars = /[áàâãéèêíïóôõöúçñ]/.test(title);
                const hasPortugueseConnectors = /\b(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|na|no|nas|nos|com|por|para|e)\b/i.test(title);

                if (hasPortugueseChars || hasPortugueseConnectors) {
                    return true; // É anime, mas tem título PT-BR
                }
                return false; // É anime com título gringo/romaji -> remove
            }
            return true; // Não é japonês -> mantém
        });

        // 4. Corte final: apenas top N
        return cleanList.slice(0, limit);
    }

    /**
     * Busca novas temporadas (episódio 1 de temporadas já existentes)
     * Baseado em novas_temp.md
     * @param {number} limit - Quantidade máxima de temporadas a retornar
     * @returns {Promise<Array>}
     */
    async fetchNewSeasons(limit = 40) {
        console.log(`\n📺 Buscando novas temporadas (top ${limit})...`);

        const today = new Date().toISOString().split('T')[0];
        let collectedSeries = [];
        let apiPage = 1;
        const maxPages = 150; // Limite de segurança

        try {
            // Loop: buscar até ter itens suficientes
            while (collectedSeries.length < limit && apiPage <= maxPages) {
                console.log(`   📄 Página ${apiPage}: buscando...`);

                const url = `${this.baseUrl}/discover/tv`;
                const params = {
                    api_key: this.apiKey,
                    language: 'pt-BR',
                    timezone: 'America/Sao_Paulo',
                    page: apiPage,
                    sort_by: 'popularity.desc',
                    'air_date.gte': today, // Garante episódios futuros
                    with_origin_country: 'US|GB|CA',
                    'vote_count.gte': 100,
                    'vote_average.gte': 5
                };

                const response = await axios.get(url, { params });
                const data = response.data;

                if (!data.results || data.results.length === 0) {
                    console.log(`   ⏹️ Página vazia, encerrando busca`);
                    break;
                }

                // Processar cada série para verificar se tem episódio 1 futuro
                const promises = data.results.map(async (show) => {
                    // Pular duplicatas
                    if (collectedSeries.find(s => s.id === show.id)) return null;

                    // Pular sem poster ou sinopse
                    if (!show.poster_path || !show.overview) return null;

                    // FILTRO RIGOROSO PARA ANIMES - Apenas animes de muito sucesso
                    if (show.original_language === 'ja') {
                        // Animes precisam ter muito mais popularidade para entrar
                        if (show.vote_count < 500 || show.vote_average < 7.5) {
                            console.log(`   ⏭️ Anime filtrado (baixa popularidade): ${show.name} (${show.vote_count} votos, ${show.vote_average} nota)`);
                            return null;
                        }
                    }

                    try {
                        // Buscar detalhes da série para verificar next_episode_to_air
                        const detailUrl = `${this.baseUrl}/tv/${show.id}`;
                        const detailParams = {
                            api_key: this.apiKey,
                            language: 'pt-BR'
                        };

                        const detailRes = await axios.get(detailUrl, { params: detailParams });
                        const details = detailRes.data;

                        // Verificar se tem próximo episódio
                        if (!details.next_episode_to_air) return null;

                        const nextEp = details.next_episode_to_air;

                        // FILTRO PRINCIPAL: É o episódio 1 de uma temporada?
                        if (nextEp.episode_number === 1) {
                            return {
                                ...show,
                                next_episode_data: nextEp,
                                season_number: nextEp.season_number,
                                next_air_date: nextEp.air_date
                            };
                        }

                        return null;
                    } catch (e) {
                        // Erro ao buscar detalhes, pular
                        return null;
                    }
                });

                // Aguarda todas as verificações
                const pageValidShows = (await Promise.all(promises)).filter(s => s !== null);

                console.log(`   ✓ Encontrados: ${pageValidShows.length} episódios 1`);

                // Adiciona à coleção
                collectedSeries = [...collectedSeries, ...pageValidShows];

                apiPage++;
            }

            // Ordenar por data (mais próximo -> mais distante)
            collectedSeries.sort((a, b) => {
                const dateA = new Date(a.next_air_date || a.first_air_date);
                const dateB = new Date(b.next_air_date || b.first_air_date);
                return dateA - dateB;
            });

            // Cortar no limite
            const final = collectedSeries.slice(0, limit);

            console.log(`   ✅ Total encontrado: ${final.length} novas temporadas`);

            return final;

        } catch (error) {
            console.error('❌ Erro ao buscar novas temporadas:', error.message);
            throw error;
        }
    }

    /**
     * Busca calendário completo de TV (novas séries + novas temporadas)
     * Combina, remove duplicatas e ordena cronologicamente
     * @returns {Promise<Array>}
     */
    async fetchTvCalendar() {
        console.log('\n📺 ===== TMDB TV CALENDAR SERVICE =====');

        try {
            // Buscar ambos em paralelo
            const [newSeriesResults, newSeasonsResults] = await Promise.all([
                this.fetchNewSeries(20),
                this.fetchNewSeasons(40)
            ]);

            console.log(`\n🔀 Combinando resultados...`);
            console.log(`   • Novas séries: ${newSeriesResults.length}`);
            console.log(`   • Novas temporadas: ${newSeasonsResults.length}`);

            // Combinar
            let combined = [...newSeriesResults, ...newSeasonsResults];

            // Remover duplicatas (mesma série pode aparecer nas duas buscas)
            const seenIds = new Set();
            combined = combined.filter(item => {
                if (seenIds.has(item.id)) {
                    console.log(`   🗑️ Removendo duplicata: ${item.name || item.title}`);
                    return false;
                }
                seenIds.add(item.id);
                return true;
            });

            // Ordenar cronologicamente (mais recente -> mais futuro)
            combined.sort((a, b) => {
                const dateA = new Date(a.next_air_date || a.first_air_date);
                const dateB = new Date(b.next_air_date || b.first_air_date);
                return dateA - dateB;
            });

            console.log(`   ✅ Total final (sem duplicatas): ${combined.length}`);

            // Normalizar para formato do Firebase
            const normalized = combined.map(item => this.normalizeToFirebaseFormat(item));

            console.log('✅ ===== TMDB CALENDAR: Concluído =====\n');

            return normalized;

        } catch (error) {
            console.error('❌ Erro ao buscar calendário TV:', error.message);
            throw error;
        }
    }

    /**
     * Normaliza resultado do TMDB para formato esperado pelo Firebase
     */
    normalizeToFirebaseFormat(item) {
        // Determinar data de lançamento
        const releaseDate = item.next_air_date || item.first_air_date;

        // Determinar season_info
        let seasonInfo = 'estréia';
        if (item.season_number) {
            seasonInfo = `Temporada ${item.season_number}`;
        }

        return {
            title: item.name,
            original_title: item.original_name,
            releaseDate: releaseDate,
            type: 'tv',
            tmdb_id: item.id,
            overview: item.overview,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            season_info: seasonInfo,
            genres: item.genre_ids || [],
            popularity: item.popularity,
            vote_average: item.vote_average,
            vote_count: item.vote_count,
            origin_country: item.origin_country || []
        };
    }
}

export const tmdbCalendarService = new TmdbCalendarService();
