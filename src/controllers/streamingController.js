import { scraper } from '../scrapers/flixpatrolScraper.js';
import { lightScraper, acquireLock, releaseLock } from '../scrapers/lightScraper.js';
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

            // 2. Valida o serviço de streaming
            const streamingConfig = STREAMING_SERVICES[service];
            if (!streamingConfig) {
                throw new Error(`Serviço de streaming "${service}" não encontrado`);
            }

            // 3. Verificar mutex — se já tem scraping rodando para este serviço, retorna Firebase
            if (!acquireLock(service)) {
                console.log(`🔒 [${service}] Scraping já em andamento — retornando dados do Firebase`);
                const staleData = await this._getFirebaseFallback(service, today);
                if (staleData) return staleData;
                throw new Error(`Scraping de ${service} já em andamento e sem dados no Firebase`);
            }

            try {
                // 3. Scraping — Camada 1: LightScraper (Axios + Cheerio)
                let data = null;
                console.log(`🌐 [${service}] Iniciando scraping LEVE (Axios + Cheerio)...`);

                try {
                    const url = streamingConfig.urlPattern(today);
                    data = await lightScraper.scrapeTop10(url);
                } catch (lightError) {
                    console.warn(`⚠️ [${service}] LightScraper falhou: ${lightError.message}`);

                    // Se circuit breaker está aberto, pula para Firebase direto
                    if (lightError.statusCode === 503) {
                        console.log(`🔴 [${service}] Circuit Breaker aberto — tentando Firebase como fallback`);
                        const staleData = await this._getFirebaseFallback(service, today);
                        if (staleData) return staleData;
                        throw lightError;
                    }

                    // Camada 2: Fallback para Puppeteer
                    console.log(`🔄 [${service}] Tentando fallback: Puppeteer (Chrome headless)...`);
                    try {
                        const url = streamingConfig.urlPattern(today);
                        data = await scraper.scrapeTop10(url);
                    } catch (puppeteerError) {
                        console.error(`❌ [${service}] Puppeteer também falhou: ${puppeteerError.message}`);

                        // Camada 3: Fallback para Firebase (dados stale)
                        const staleData = await this._getFirebaseFallback(service, today);
                        if (staleData) return staleData;

                        // Se não tem NADA, aí sim joga erro
                        throw puppeteerError;
                    }
                }

                console.log(`📊 Scraping retornou: ${data.movies.length} filmes, ${data.tvShows.length} séries`);

                // Pega os primeiros 10 de cada tipo
                let movies = data.movies.slice(0, 10);
                let tvShows = data.tvShows.slice(0, 10);

                // Enriquece com TMDB se solicitado
                if (enrichWithTMDB) {
                    console.log('🎬 Iniciando enriquecimento TMDB de TODOS os itens (20 no total)...');

                    const enrichList = async (list, typeName) => {
                        const enriched = [];
                        let count = 1;
                        for (const item of list) {
                            console.log(`🔍 [${count}/${list.length}] Enriquecendo ${typeName}: ${item.title}`);

                            if (item.link) {
                                const details = await scraper.scrapeItemDetails(item.link);
                                if (details.year) item.year = details.year;
                                if (details.type) item.type = details.type;
                                if (details.original_title) item.title = details.original_title;
                            }

                            const tmdbData = await tmdbService.searchTitle(
                                `${item.title}${item.year ? ' (' + item.year + ')' : ''}`,
                                item.type
                            );

                            enriched.push({
                                ...item,
                                tmdb: tmdbData
                            });

                            count++;
                            const delay = 1000 + Math.floor(Math.random() * 2000);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                        return enriched;
                    };

                    const [enrichedMovies, enrichedTvShows] = await Promise.all([
                        enrichList(movies, 'filmes'),
                        enrichList(tvShows, 'séries')
                    ]);

                    movies = enrichedMovies;
                    tvShows = enrichedTvShows;

                    console.log('✅ Enriquecimento completo! Total: 20 itens com TMDB');
                }

                // Cria ranking "overall"
                console.log('📊 Criando ranking overall a partir dos 20 itens enriquecidos...');

                const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
                const tvShowsWithType = tvShows.map(t => ({ ...t, type: 'tv' }));

                const combined = [...moviesWithType, ...tvShowsWithType];

                const overall = combined
                    .sort((a, b) => {
                        if (a.popularity && b.popularity) return b.popularity - a.popularity;
                        if (a.popularity) return -1;
                        if (b.popularity) return 1;
                        return 0;
                    })
                    .slice(0, 10)
                    .map((item, index) => ({
                        ...item,
                        position: index + 1
                    }));

                console.log(`✅ Overall criado: ${overall.length} itens`);

                const result = {
                    service: streamingConfig.name,
                    date: getTodayDate(),
                    overall,
                    movies: moviesWithType,
                    tvShows: tvShowsWithType
                };

                // Salva no Firebase automaticamente se solicitado
                if (saveToFirebase && enrichWithTMDB) {
                    try {
                        const date = getTodayDate();
                        console.log('💾 Salvando no Firebase...');
                        await firebaseService.saveTop10(service, 'movie', date, result.movies);
                        await firebaseService.saveTop10(service, 'series', date, result.tvShows);
                        await firebaseService.saveTop10(service, 'overall', date, result.overall);
                        console.log('✅ Salvo no Firebase com sucesso!');
                    } catch (error) {
                        console.error('❌ Erro ao salvar no Firebase:', error.message);
                        await firebaseLoggingService.logError(
                            service, 'save_to_firebase', error, { date: today }
                        );
                    }
                }

                return result;

            } finally {
                // SEMPRE libera o lock, mesmo em caso de erro
                releaseLock(service);
            }

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
     * Fallback: retorna último dado válido do Firebase (stale data)
     * Melhor retornar dado desatualizado do que erro 500
     * @param {string} service - Nome do serviço
     * @param {string} today - Data de hoje
     * @returns {Promise<Object|null>}
     */
    async _getFirebaseFallback(service, today) {
        try {
            console.log(`📦 [Fallback] Buscando último dado válido no Firebase para ${service}...`);

            // Tenta dados de hoje primeiro
            const [overallData, moviesData, seriesData] = await Promise.all([
                firebaseService.getTop10(service, 'overall', today).catch(() => null),
                firebaseService.getTop10(service, 'movie', today).catch(() => null),
                firebaseService.getTop10(service, 'series', today).catch(() => null)
            ]);

            if (overallData && overallData.length > 0) {
                console.log(`✅ [Fallback] Dados de hoje encontrados (${overallData.length} itens overall)`);
                return {
                    service: STREAMING_SERVICES[service]?.name || service,
                    date: today,
                    overall: overallData,
                    movies: moviesData || [],
                    tvShows: seriesData || [],
                    stale: true,
                    staleReason: 'Dados do cache Firebase (scraping falhou)'
                };
            }

            // Se não tem de hoje, tenta o latest (qualquer data)
            const latestData = await firebaseService.getLatestTop10(service, 'overall');
            if (latestData && latestData.items) {
                console.log(`✅ [Fallback] Dados antigos encontrados (data: ${latestData.date})`);
                return {
                    service: STREAMING_SERVICES[service]?.name || service,
                    date: latestData.date,
                    overall: latestData.items,
                    movies: [],
                    tvShows: [],
                    stale: true,
                    staleReason: `Dados do Firebase de ${latestData.date} (scraping falhou)`
                };
            }

            console.warn(`⚠️ [Fallback] Nenhum dado encontrado no Firebase para ${service}`);
            return null;
        } catch (error) {
            console.error(`❌ [Fallback] Erro ao buscar Firebase: ${error.message}`);
            return null;
        }
    }

    /**
     * Testa scraping de um serviço (sem salvar)
     */
    async testScraping(service) {
        return await this.getTop10(service, false, false);
    }
}

export const streamingController = new StreamingController();
