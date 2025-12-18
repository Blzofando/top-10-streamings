import { firebaseService } from '../services/firebaseService.js';
import { STREAMING_SERVICES, getTodayDate } from '../config/streamingServices.js';

/**
 * Controller para endpoints rápidos (só Firebase, sem scraping)
 */
export class QuickController {
    /**
     * Formata item baseado no formato solicitado
     */
    formatItem(item, format) {
        if (format === 'id') {
            // Tenta obter o tipo correto de todas as fontes possíveis
            // 1. tmdb.type (se existir objeto tmdb)
            // 2. tmdbMediaType (campo raiz que às vezes existe)
            // 3. type (campo raiz, mas pode estar setado como "overall")
            let type = item.tmdb?.type || item.tmdbMediaType || item.type;

            // Tenta obter o ID correto, verifica no objeto tmdb ou na raiz
            const tmdbId = item.tmdb?.tmdb_id || item.tmdb_id || null;

            // Dados extras solicitados
            const releaseDate = item.releaseDate || item.release_date || null;
            const seasonInfo = item.season_info || item.seasonInfo || null;

            return {
                position: item.position,
                title: item.title,
                releaseDate: releaseDate,
                type: type, // movie ou tv
                tmdb_id: tmdbId,
                season_info: seasonInfo
            };
        }
        // Full format - retorna tudo
        return item;
    }

    /**
     * Formata array de itens
     */
    formatItems(items, format) {
        if (!items || items.length === 0) return [];
        return items.map(item => this.formatItem(item, format));
    }

    /**
     * GET /api/quick/:service
     * Retorna overall + movies + series de um serviço
     */
    async getService(req, res) {
        try {
            const service = req.params.service.toLowerCase();
            const format = req.query.format || 'full';
            const today = getTodayDate();

            if (!STREAMING_SERVICES[service]) {
                return res.status(404).json({
                    error: 'Serviço não encontrado',
                    available: Object.keys(STREAMING_SERVICES)
                });
            }

            const [overall, movies, series] = await Promise.all([
                firebaseService.getTop10(service, 'overall', today),
                firebaseService.getTop10(service, 'movie', today),
                firebaseService.getTop10(service, 'series', today)
            ]);

            if (!overall || overall.length === 0) {
                return res.status(404).json({
                    error: 'Dados não disponíveis',
                    message: `Nenhum dado encontrado para ${service} em ${today}`
                });
            }

            res.json({
                service: STREAMING_SERVICES[service].name,
                date: today,
                overall: this.formatItems(overall, format),
                movies: this.formatItems(movies, format),
                series: this.formatItems(series, format)
            });
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados',
                message: error.message
            });
        }
    }

    /**
     * GET /api/quick/:service/movies
     */
    async getMovies(req, res) {
        try {
            const service = req.params.service.toLowerCase();
            const format = req.query.format || 'full';
            const today = getTodayDate();

            const movies = await firebaseService.getTop10(service, 'movie', today);

            if (!movies || movies.length === 0) {
                return res.status(404).json({
                    error: 'Dados não disponíveis'
                });
            }

            res.json({
                service: STREAMING_SERVICES[service].name,
                date: today,
                type: 'movies',
                data: this.formatItems(movies, format)
            });
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados',
                message: error.message
            });
        }
    }

    /**
     * GET /api/quick/:service/series
     */
    async getSeries(req, res) {
        try {
            const service = req.params.service.toLowerCase();
            const format = req.query.format || 'full';
            const today = getTodayDate();

            const series = await firebaseService.getTop10(service, 'series', today);

            if (!series || series.length === 0) {
                return res.status(404).json({
                    error: 'Dados não disponíveis'
                });
            }

            res.json({
                service: STREAMING_SERVICES[service].name,
                date: today,
                type: 'series',
                data: this.formatItems(series, format)
            });
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados',
                message: error.message
            });
        }
    }

    /**
     * GET /api/quick/:service/overall
     */
    async getOverall(req, res) {
        try {
            const service = req.params.service.toLowerCase();
            const format = req.query.format || 'full';
            const today = getTodayDate();

            const overall = await firebaseService.getTop10(service, 'overall', today);

            if (!overall || overall.length === 0) {
                return res.status(404).json({
                    error: 'Dados não disponíveis'
                });
            }

            res.json({
                service: STREAMING_SERVICES[service].name,
                date: today,
                type: 'overall',
                data: this.formatItems(overall, format)
            });
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados',
                message: error.message
            });
        }
    }

    /**
     * GET /api/quick/all
     * Retorna TODOS os streamings + GLOBAL
     */
    async getAll(req, res) {
        try {
            const format = req.query.format || 'full';
            const today = getTodayDate();
            const services = ['netflix', 'disney', 'hbo', 'prime', 'apple'];

            const result = {
                date: today
            };

            // Busca dados de cada serviço
            for (const service of services) {
                const [overall, movies, series] = await Promise.all([
                    firebaseService.getTop10(service, 'overall', today),
                    firebaseService.getTop10(service, 'movie', today),
                    firebaseService.getTop10(service, 'series', today)
                ]);

                result[service] = {
                    overall: this.formatItems(overall, format),
                    movies: this.formatItems(movies, format),
                    series: this.formatItems(series, format)
                };
            }

            // Busca dados GLOBAIS
            const [globalMovies, globalSeries] = await Promise.all([
                firebaseService.getTop10('global', 'movie', today),
                firebaseService.getTop10('global', 'series', today)
            ]);

            result.global = {
                movies: this.formatItems(globalMovies, format),
                series: this.formatItems(globalSeries, format)
            };

            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados',
                message: error.message
            });
        }
    }

    /**
     * GET /api/quick/overall
     * Retorna overall de cada streaming + global completo (movies + series)
     */
    async getAllOverall(req, res) {
        try {
            const format = req.query.format || 'full';
            const today = getTodayDate();
            const services = ['netflix', 'disney', 'hbo', 'prime', 'apple'];

            const result = {};

            // Busca overall de cada serviço
            for (const service of services) {
                const overall = await firebaseService.getTop10(service, 'overall', today);
                result[service] = this.formatItems(overall, format);
            }

            // Busca dados GLOBAIS (movies + series)
            const [globalMovies, globalSeries] = await Promise.all([
                firebaseService.getTop10('global', 'movie', today),
                firebaseService.getTop10('global', 'series', today)
            ]);

            result.global = {
                movies: this.formatItems(globalMovies, format),
                series: this.formatItems(globalSeries, format)
            };

            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados',
                message: error.message
            });
        }
    }

    /**
     * GET /api/quick/global
     * Retorna rankings globais (top 10 filmes + top 10 séries de TODOS)
     */
    async getGlobal(req, res) {
        try {
            const format = req.query.format || 'full';
            const today = getTodayDate();

            const [movies, series] = await Promise.all([
                firebaseService.getTop10('global', 'movie', today),
                firebaseService.getTop10('global', 'series', today)
            ]);

            if ((!movies || movies.length === 0) && (!series || series.length === 0)) {
                return res.status(404).json({
                    error: 'Dados globais não disponíveis',
                    message: 'Rankings globais ainda não foram criados para hoje'
                });
            }

            res.json({
                date: today,
                movies: this.formatItems(movies, format),
                series: this.formatItems(series, format)
            });
        } catch (error) {
            res.status(500).json({
                error: 'Erro ao buscar dados globais',
                message: error.message
            });
        }
    }
}

export const quickController = new QuickController();
