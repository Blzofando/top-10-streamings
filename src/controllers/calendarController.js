import { imdbCalendarScraper } from '../scrapers/imdbCalendarScraper.js';
import { calendarFirebaseService } from '../services/calendarService.js';

/**
 * Controller para calendário de lançamentos
 */
export class CalendarController {
    /**
     * Obter calendário de filmes com scraping incremental
     * GET /api/calendar/movies
     * 
     * @param {boolean} forceUpdate - Força scraping mesmo se tiver cache válido
     * @param {boolean} save - Salvar resultado no Firebase
     */
    async getMovieCalendar(forceUpdate = false, save = true) {
        console.log('\n🎬 ===== CALENDAR CONTROLLER: Movie Calendar =====');
        console.log(`🔄 Force Update: ${forceUpdate}`);
        console.log(`💾 Save to Firebase: ${save}`);

        try {
            let releases = [];

            if (!forceUpdate) {
                // Tentar buscar do Firebase primeiro
                console.log('📦 Tentando buscar do Firebase...');
                releases = await calendarFirebaseService.getMovieCalendar();

                if (releases && releases.length > 0) {
                    console.log(`✅ Dados encontrados no Firebase (${releases.length} filmes)`);
                    return {
                        source: 'firebase',
                        timestamp: new Date().toISOString(),
                        totalReleases: releases.length,
                        releases
                    };
                }
            }

            // Scraping incremental
            console.log('\n🌐 Iniciando scraping do IMDB...');

            // Buscar dados existentes para comparação
            const existingReleases = await calendarFirebaseService.getMovieCalendar() || [];

            // Fazer scraping com lógica incremental
            releases = await imdbCalendarScraper.scrapeMovieCalendar(existingReleases);

            // Salvar no Firebase se solicitado
            if (save) {
                await calendarFirebaseService.saveMovieCalendar(releases);
            }

            console.log('✅ ===== CALENDAR CONTROLLER: Concluído =====\n');

            return {
                source: 'scraping',
                timestamp: new Date().toISOString(),
                totalReleases: releases.length,
                releases
            };

        } catch (error) {
            console.error('❌ Erro no Calendar Controller:', error.message);
            throw error;
        }
    }

    /**
     * Endpoint rápido - busca apenas do Firebase
     * GET /api/quick/calendar/movies
     */
    async getCalendarQuick(req, res) {
        try {
            console.log('\n⚡ QUICK CALENDAR: Buscando do Firebase...');

            const releases = await calendarFirebaseService.getMovieCalendar();

            if (!releases || releases.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Nenhum calendário encontrado. Execute /api/calendar/movies primeiro.',
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                source: 'firebase',
                timestamp: new Date().toISOString(),
                totalReleases: releases.length,
                releases
            });

        } catch (error) {
            console.error('❌ Erro no Quick Calendar:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Endpoint para forçar scraping
     * GET /api/calendar/movies?force=true
     */
    async getMovies(req, res) {
        try {
            const forceUpdate = req.query.force === 'true';
            const save = req.query.save !== 'false'; // Salva por padrão

            const result = await this.getMovieCalendar(forceUpdate, save);

            res.json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error('❌ Erro ao obter calendário:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Limpar dados antigos
     * GET /api/calendar/cleanup
     */
    async cleanupOldData(req, res) {
        try {
            await calendarFirebaseService.cleanupOldData();

            res.json({
                success: true,
                message: 'Limpeza concluída',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Erro na limpeza:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Verificar status do calendário
     * GET /api/calendar/status
     */
    async getStatus(req, res) {
        console.log('\n📊 ===== GET STATUS: Iniciando =====');
        try {
            console.log('1. Verificando expiração...');
            const isExpired = await calendarFirebaseService.isExpired();
            console.log(`2. Expirado: ${isExpired}`);

            console.log('3. Buscando calendário...');
            const calendar = await calendarFirebaseService.getMovieCalendar();
            console.log(`4. Calendário encontrado: ${calendar ? 'sim' : 'não'}`);

            console.log('5. Montando resposta...');
            const response = {
                success: true,
                status: isExpired ? 'expired' : 'valid',
                expired: isExpired,
                hasData: calendar && calendar.length > 0,
                totalReleases: calendar?.length || 0,
                lastUpdate: calendar?.[0]?.timestamp || null,
                timestamp: new Date().toISOString()
            };

            console.log('6. Enviando resposta...');
            res.json(response);
            console.log('✅ Status enviado com sucesso!\n');

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            console.error('Stack:', error.stack);
            res.status(500).json({
                success: false,
                error: error.message,
                stack: error.stack
            });
        }
    }
}

export const calendarController = new CalendarController();
