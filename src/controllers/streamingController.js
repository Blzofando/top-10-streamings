import { scraper } from '../scrapers/flixpatrolScraper.js';
import { tmdbService } from '../services/tmdbService.js';
import { firebaseService } from '../services/firebaseService.js';
import { STREAMING_SERVICES, getTodayDate } from '../config/streamingServices.js';

/**
 * Controller para operações de streaming (scraping e dados)
 */
export class StreamingController {
    /**
     * Busca top 10 de um serviço específico
     * @param {string} service - Nome do serviço (netflix, hbo, disney, prime)
     * @param {boolean} enrichWithTMDB - Se deve enriquecer com dados do TMDB
     * @param {boolean} saveToFirebase - Se deve salvar automaticamente no Firebase
     * @returns {Promise<Object>} Dados do top 10
     */
    async getTop10(service, enrichWithTMDB = false, saveToFirebase = true) {
        const today = getTodayDate();

        // 1. Verifica Firebase primeiro (se não for forçar scraping)
        if (saveToFirebase) {
            console.log(`📊 Verificando Firebase para ${service} - ${today}...`);
            try {
                const firebaseData = await firebaseService.getLatestTop10(service);
                if (firebaseData && firebaseData.date === today) {
                    console.log(`✅ Dados encontrados no Firebase (${today})`);
                    return {
                        service: STREAMING_SERVICES[service].name,
                        date: firebaseData.date,
                        overall: firebaseData.overall || [],
                        movies: firebaseData.movies || [],
                        tvShows: firebaseData.series || []
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
                    // Delay para evitar bloqueio
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                return enriched;
            };

            // Enriquece TODOS os filmes (10)
            console.log('\n🎥 === ENRIQUECENDO FILMES ===');
            movies = await enrichList(movies, 'Filme');

            // Enriquece TODAS as séries (10)
            console.log('\n📺 === ENRIQUECENDO SÉRIES ===');
            tvShows = await enrichList(tvShows, 'Série');

            console.log('\n✅ Enriquecimento completo! Total: 20 itens com TMDB');
        }

        // AGORA cria o overall a partir dos itens JÁ enriquecidos
        console.log('📊 Criando ranking overall a partir dos 20 itens enriquecidos...');
        const overall = scraper.createOverallRanking(movies, tvShows);

        let result = {
            service: streamingConfig.name,
            date: getTodayDate(),
            overall,      // Top 10 baseado em popularidade (com TMDB se enriched)
            movies,       // 10 filmes completos (com TMDB se enriched)
            tvShows       // 10 séries completas (com TMDB se enriched)
        };

        // Salva no cache
        cacheService.set(cacheKey, result);

        // Salva no Firebase automaticamente se solicitado
        if (saveToFirebase && enrichWithTMDB) {
            try {
                const date = getTodayDate();

                console.log('💾 Salvando no Firebase...');

                // Salva movies (10 com TMDB completo)
                await firebaseService.saveTop10(service, 'movie', date, result.movies);

                // Salva series (10 com TMDB completo)
                await firebaseService.saveTop10(service, 'series', date, result.tvShows);

                // Salva overall (10 com TMDB completo)
                await firebaseService.saveTop10(service, 'overall', date, result.overall);

                console.log('💾 ✅ Dados salvos no Firebase: 10 filmes + 10 séries + 10 overall!');
            } catch (error) {
                console.error('⚠️ Erro ao salvar no Firebase:', error.message);
                // Não interrompe o fluxo se falhar o salvamento
            }
        }

        return result;
    }

    /**
     * Busca top 10 de todos os serviços
     * @param {boolean} enrichWithTMDB - Se deve enriquecer com dados do TMDB
     * @param {boolean} saveToFirebase - Se deve salvar automaticamente no Firebase
     * @returns {Promise<Object>} Dados de todos os streamings
     */
    async getAllStreamings(enrichWithTMDB = false, saveToFirebase = true) {
        const [disney, netflix, hbo, prime] = await Promise.all([
            this.getTop10('disney', enrichWithTMDB, saveToFirebase),
            this.getTop10('netflix', enrichWithTMDB, saveToFirebase),
            this.getTop10('hbo', enrichWithTMDB, saveToFirebase),
            this.getTop10('prime', enrichWithTMDB, saveToFirebase)
        ]);

        return {
            date: getTodayDate(),
            disney,
            netflix,
            hbo,
            prime
        };
    }

    /**
     * Endpoint para rota GET
     */
    async handleGet(req, res) {
        try {
            const { service } = req.params;
            const enrichWithTMDB = req.query.tmdb === 'true';
            const saveToFirebase = req.query.save !== 'false'; // Salva por padrão

            if (service === 'all') {
                const data = await this.getAllStreamings(enrichWithTMDB, saveToFirebase);
                return res.json(data);
            }

            const data = await this.getTop10(service, enrichWithTMDB, saveToFirebase);
            res.json(data);
        } catch (error) {
            res.status(500).json({
                error: error.message,
                service: req.params.service
            });
        }
    }
}

// Instância singleton
export const streamingController = new StreamingController();
