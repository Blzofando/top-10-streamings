import { scraper } from '../scrapers/flixpatrolScraper.js';
import { tmdbService } from '../services/tmdbService.js';
import { firebaseService } from '../services/firebaseService.js';
import { STREAMING_SERVICES, getTodayDate } from '../config/streamingServices.js';
import { firebaseLoggingService } from '../services/firebaseLoggingService.js';

/**
 * Controller para operações de streaming (scraping e dados)
 */
export class StreamingController {
    /**
     * Busca top 10 de um serviço específico
     * @param {string} service - Nome do serviço (netflix, hbo, disney, prime, apple)
     * @param {boolean} enrichWithTMDB - Se deve enriquecer com dados do TMDB
     * @param {boolean} saveToFirebase - Se deve salvar automaticamente no Firebase
     * @param {boolean} forceUpdate - Se deve forçar scraping ignorando Firebase
     * @returns {Promise<Object>} Dados do top 10
     */
    async getTop10(service, enrichWithTMDB = false, saveToFirebase = true, forceUpdate = false) {
        const today = getTodayDate();

        try {
            // 1. Verifica Firebase primeiro (se não for forçar scraping)
            if (saveToFirebase && !forceUpdate) {
                console.log(`📊 Verificando Firebase para ${service} - ${today}...`);
                try {
                    // Busca os 3 tipos separadamente
                    const [overallData, moviesData, seriesData] = await Promise.all([
                        firebaseService.getTop10(service, 'overall', today),
                        firebaseService.getTop10(service, 'movie', today),
                        firebaseService.getTop10(service, 'series', today)
                    ]);

                    // Se tem dados completos, retorna
                    if (overallData && overallData.length > 0 && moviesData && seriesData) {
                        console.log(`✅ Dados encontrados no Firebase (${today})`);
                        console.log(`📊 Overall: ${overallData.length}, Movies: ${moviesData.length}, Series: ${seriesData.length}`);

                        return {
                            service: STREAMING_SERVICES[service].name,
                            date: today,
                            overall: overallData,
                            movies: moviesData,
                            tvShows: seriesData
                        };
                    }
                } catch (error) {
                    console.log(`⚠️ Firebase não tem dados atuais: ${error.message}`);
                }
            }

            // 2. Se não tem no Firebase ou é scraping forçado, faz scraping
            console.log(`🌐 Iniciando scraping do FlixPatrol...`);
            const streamingConfig = STREAMING_SERVICES[service];
            if (!streamingConfig) {
                throw new Error(`Serviço de streaming "${service}" não encontrado`);
            }

            const url = streamingConfig.urlPattern(today);
            const data = await scraper.scrapeTop10(url);

            console.log(`📊 Scraping retornou: ${data.movies.length} filmes, ${data.tvShows.length} séries`);

            // Pega os primeiros 10 de cada tipo
            let movies = data.movies.slice(0, 10);
            let tvShows = data.tvShows.slice(0, 10);

            // Enriquece com TMDB se solicitado
            if (enrichWithTMDB) {
                console.log('🎬 Iniciando enriquecimento TMDB de TODOS os itens (20 no total)...');

                // Função auxiliar para enriquecer lista com detalhes E TMDB
                const enrichList = async (list, typeName) => {
                    const enriched = [];
                    let count = 1;
                    for (const item of list) {
                        console.log(`🔍 [${count}/${list.length}] Enriquecendo ${typeName}: ${item.title}`);

                        // 1. Scraping Detalhado (FlixPatrol)
                        if (item.link) {
                            const details = await scraper.scrapeItemDetails(item.link);
                            // Combina dados (prioriza detalhes extraídos)
                            if (details.year) item.year = details.year;
                            if (details.type) item.type = details.type;
                            if (details.original_title) item.title = details.original_title;
                        }

                        // 2. Busca TMDB (em PT-BR)
                        const tmdbData = await tmdbService.searchTitle(
                            `${item.title}${item.year ? ' (' + item.year + ')' : ''}`,
                            item.type
                        );

                        enriched.push({
                            ...item,
                            tmdb: tmdbData
                        });

                        count++;
                        // Delay aleatório entre requests para evitar bloqueio (1-3 segundos)
                        const delay = 1000 + Math.floor(Math.random() * 2000);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    return enriched;
                };

                // Enriquece filmes E séries paralelamente
                const [enrichedMovies, enrichedTvShows] = await Promise.all([
                    enrichList(movies, 'filmes'),
                    enrichList(tvShows, 'séries')
                ]);

                movies = enrichedMovies;
                tvShows = enrichedTvShows;

                console.log('✅ Enriquecimento completo! Total: 20 itens com TMDB');
            }

            // Cria ranking "overall" baseado em popularidade (combina movies + tvShows)
            console.log('📊 Criando ranking overall a partir dos 20 itens enriquecidos...');

            // CRITICAL: Garantir que movies tenham type='movie' e tvShows tenham type='tv'
            const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
            const tvShowsWithType = tvShows.map(t => ({ ...t, type: 'tv' }));

            const combined = [...moviesWithType, ...tvShowsWithType];

            // Ordena por popularidade (se disponível) ou mantém ordem original
            const overall = combined
                .sort((a, b) => {
                    // Se ambos têm popularity, usa
                    if (a.popularity && b.popularity) {
                        return b.popularity - a.popularity;
                    }
                    // Se só um tem, prioriza o que tem
                    if (a.popularity) return -1;
                    if (b.popularity) return 1;
                    // Se nenhum tem, mantém ordem (filmes primeiro)
                    return 0;
                })
                .slice(0, 10)
                .map((item, index) => ({
                    ...item,
                    position: index + 1  // Renumera 1-10 (evita positions duplicadas!)
                }));

            console.log(`✅ Overall criado: ${overall.length} itens`);

            const result = {
                service: streamingConfig.name,
                date: getTodayDate(),
                overall,             // Top 10 baseado em popularidade (com type correto)
                movies: moviesWithType,        // 10 filmes com type='movie'
                tvShows: tvShowsWithType       // 10 séries com type='tv'
            };

            // Salva no Firebase automaticamente se solicitado
            if (saveToFirebase && enrichWithTMDB) {
                try {
                    const date = getTodayDate();

                    console.log('💾 Salvando no Firebase...');

                    // Salva movies (10 com TMDB completo)
                    await firebaseService.saveTop10(service, 'movie', date, result.movies);

                    // Salva series (10 com TMDB completo)
                    await firebaseService.saveTop10(service, 'series', date, result.tvShows);

                    // Salva overall (10 com TMDB completo, baseado em popularidade)
                    await firebaseService.saveTop10(service, 'overall', date, result.overall);

                    console.log('✅ Salvo no Firebase com sucesso!');
                } catch (error) {
                    console.error('❌ Erro ao salvar no Firebase:', error.message);
                    await firebaseLoggingService.logError(
                        service,
                        'save_to_firebase',
                        error,
                        { date: today }
                    );
                }
            }

            return result;

        } catch (error) {
            console.error(`❌ Erro no top10 de ${service}:`, error.message);
            await firebaseLoggingService.logError(
                service,
                'scraping',
                error,
                { url: STREAMING_SERVICES[service]?.urlPattern(today) }
            );
            throw error;
        }
    }

    /**
     * Busca rankings globais agregando TODOS os streamings
     * @param {boolean} enrichWithTMDB - Se retorna dados enriquecidos
     * @returns {Promise<Object>} Top 10 filmes + Top 10 séries globais
     */
    async getGlobalTop10(enrichWithTMDB = true) {
        const today = getTodayDate();

        console.log('🌍 Buscando rankings globais de todos os streamings...');

        const services = ['netflix', 'disney', 'hbo', 'prime', 'apple'];
        const allMovies = [];
        const allSeries = [];

        // Busca dados de cada serviço no Firebase
        for (const service of services) {
            try {
                console.log(`📊 Carregando ${service}...`);

                // Busca filmes
                const moviesData = await firebaseService.getTop10(service, 'movie', today);
                if (moviesData && moviesData.length > 0) {
                    allMovies.push(...moviesData.map(item => ({
                        ...item,
                        source: STREAMING_SERVICES[service].name
                    })));
                }

                // Busca séries
                const seriesData = await firebaseService.getTop10(service, 'series', today);
                if (seriesData && seriesData.length > 0) {
                    allSeries.push(...seriesData.map(item => ({
                        ...item,
                        source: STREAMING_SERVICES[service].name
                    })));
                }
            } catch (error) {
                console.log(`⚠️ ${service} sem dados: ${error.message}`);
            }
        }

        console.log(`📊 Total coletado: ${allMovies.length} filmes, ${allSeries.length} séries`);

        // Ordena por popularidade e pega top 10 - RENUMERA POSITIONS!
        const topMovies = allMovies
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 10)
            .map((item, index) => ({
                ...item,
                position: index + 1  // Renumera 1-10!
            }));

        const topSeries = allSeries
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 10)
            .map((item, index) => ({
                ...item,
                position: index + 1  // Renumera 1-10!
            }));

        console.log(`🏆 Rankings globais: ${topMovies.length} filmes, ${topSeries.length} séries`);

        const result = {
            date: today,
            movies: topMovies,
            series: topSeries
        };

        // Salva no Firebase
        try {
            await firebaseService.saveTop10('global', 'movie', today, topMovies);
            await firebaseService.saveTop10('global', 'series', today, topSeries);
            console.log('✅ Rankings globais salvos no Firebase!');
        } catch (error) {
            console.error('❌ Erro ao salvar rankings globais:', error.message);
        }

        return result;
    }

    /**
     * Testa scraping de um serviço (sem salvar)
     */
    async testScraping(service) {
        return await this.getTop10(service, false, false);
    }
}

export const streamingController = new StreamingController();
