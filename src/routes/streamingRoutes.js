import express from 'express';
import { scraper } from '../scrapers/flixpatrolScraper.js';
import { tmdbService } from '../services/tmdbService.js';
import { cacheService } from '../services/cacheService.js';
import { STREAMING_SERVICES, getTodayDate } from '../config/streamingServices.js';

const router = express.Router();

/**
 * Rota genérica para buscar top 10 de qualquer streaming
 */
async function getStreamingTop10(service, enrichWithTMDB = false) {
    const cacheKey = `${service}_${getTodayDate()}_${enrichWithTMDB ? 'enriched' : 'raw'}`;

    // Verifica cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Busca dados
    const streamingConfig = STREAMING_SERVICES[service];
    if (!streamingConfig) {
        throw new Error(`Streaming service "${service}" not found`);
    }

    const url = streamingConfig.urlPattern(getTodayDate());
    const data = await scraper.scrapeTop10(url);

    // Cria ranking overall
    const overall = scraper.createOverallRanking(data.movies, data.tvShows);

    let result = {
        service: streamingConfig.name,
        date: getTodayDate(),
        overall,
        movies: data.movies.slice(0, 10),
        tvShows: data.tvShows.slice(0, 10)
    };

    // Enriquece com TMDB se solicitado
    if (enrichWithTMDB) {
        console.log('🎬 Iniciando scraping detalhado e enriquecimento TMDB...');

        // Função auxiliar para enriquecer lista com detalhes E TMDB
        const enrichList = async (list) => {
            const enriched = [];
            for (const item of list) {
                // 1. Scraping Detalhado (FlixPatrol)
                if (item.link) {
                    console.log(`🔍 Extraindo detalhes de: ${item.title}`);
                    const details = await scraper.scrapeItemDetails(item.link);
                    // Combina dados (prioriza detalhes extraídos)
                    if (details.year) item.year = details.year;
                    if (details.type) item.type = details.type; // Corrige tipo se necessário
                    if (details.original_title) item.title = details.original_title; // Usa título da pág de detalhe
                }

                // 2. Busca TMDB (agora com ano e tipo correto)
                const tmdbData = await tmdbService.searchTitle(`${item.title}${item.year ? ' (' + item.year + ')' : ''}`, item.type);

                enriched.push({
                    ...item,
                    tmdb: tmdbData
                });

                // Delay para evitar bloqueio
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return enriched;
        };

        // Enriquece apenas o Overall para ganhar tempo (é o que o user vê primeiro)
        // Ou enriquecemos tudo? O user disse "pega so as info do top 10 final"
        // Então vamos focar no overall. Mas as listas individuais (movies/tv) ficariam sem capa?
        // Vamos enriquecer o overall e popular as outras listas se os itens forem os mesmos.

        // Simplicidade: enriquece overall. As outras listas (movies/tvShows) ficarão sem dados TMDB se não estiverem no overall.
        // Se o user clicar em "Ver todos filmes", não veria capas?
        // O endpoint original retornava tudo enriquecido. Vamos manter, mas alertar lentidão.

        // Para obedecer "só as info do top 10 final", vou enriquecer APENAS o overall
        result.overall = await enrichList(result.overall);

        // Se quisermos ser rápidos, não enriquecemos movies/tvShows separadamente se eles não estão no overall
        // Mas para manter compatibilidade, vamos deixar movies/tvShows sem enrich OU
        // fazemos um map dos itens já enriquecidos.

        // Mapeia itens enriquecidos por título para reutilizar
        const enrichedMap = new Map(result.overall.map(i => [i.title, i]));

        // Atualiza listas movies/tvShows com o que já temos
        result.movies = result.movies.map(m => enrichedMap.get(m.title) || m);
        result.tvShows = result.tvShows.map(t => enrichedMap.get(t.title) || t);
    }

    // Salva no cache
    cacheService.set(cacheKey, result);

    return result;
}

/**
 * GET /api/disney
 * Retorna top 10 do Disney+
 */
router.get('/disney', async (req, res) => {
    try {
        const enrichWithTMDB = req.query.tmdb === 'true';
        const data = await getStreamingTop10('disney', enrichWithTMDB);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/netflix
 * Retorna top 10 da Netflix
 */
router.get('/netflix', async (req, res) => {
    try {
        const enrichWithTMDB = req.query.tmdb === 'true';
        const data = await getStreamingTop10('netflix', enrichWithTMDB);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/hbo
 * Retorna top 10 da HBO Max
 */
router.get('/hbo', async (req, res) => {
    try {
        const enrichWithTMDB = req.query.tmdb === 'true';
        const data = await getStreamingTop10('hbo', enrichWithTMDB);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/prime
 * Retorna top 10 do Amazon Prime
 */
router.get('/prime', async (req, res) => {
    try {
        const enrichWithTMDB = req.query.tmdb === 'true';
        const data = await getStreamingTop10('prime', enrichWithTMDB);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/all
 * Retorna dados de todos os streamings
 */
router.get('/all', async (req, res) => {
    try {
        const enrichWithTMDB = req.query.tmdb === 'true';

        const [disney, netflix, hbo, prime] = await Promise.all([
            getStreamingTop10('disney', enrichWithTMDB),
            getStreamingTop10('netflix', enrichWithTMDB),
            getStreamingTop10('hbo', enrichWithTMDB),
            getStreamingTop10('prime', enrichWithTMDB)
        ]);

        res.json({
            date: getTodayDate(),
            disney,
            netflix,
            hbo,
            prime
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/cache
 * Limpa o cache
 */
router.delete('/cache', (req, res) => {
    cacheService.flush();
    res.json({ message: 'Cache limpo com sucesso' });
});

/**
 * GET /api/cache/stats
 * Retorna estatísticas do cache
 */
router.get('/cache/stats', (req, res) => {
    const stats = cacheService.getStats();
    res.json(stats);
});

export default router;
