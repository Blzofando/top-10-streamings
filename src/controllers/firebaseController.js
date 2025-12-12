import { firebaseService } from '../services/firebaseService.js';

/**
 * Controller para operações diretas com Firebase
 */
export class FirebaseController {
    /**
     * GET /api/firebase/history/:service/:type/:date
     * Recupera dados históricos do Firebase
     */
    async getHistory(req, res) {
        try {
            const { service, type, date } = req.params;

            const data = await firebaseService.getTop10(service, type, date);

            if (!data) {
                return res.status(404).json({
                    error: 'Dados não encontrados',
                    service,
                    type,
                    date
                });
            }

            res.json({
                service,
                type,
                date,
                items: data
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                details: 'Erro ao buscar dados históricos do Firebase'
            });
        }
    }

    /**
     * GET /api/firebase/latest/:service/:type
     * Recupera o top 10 mais recente de um serviço e tipo
     */
    async getLatest(req, res) {
        try {
            const { service, type } = req.params;

            const data = await firebaseService.getLatestTop10(service, type);

            if (!data) {
                return res.status(404).json({
                    error: 'Nenhum dado encontrado',
                    service,
                    type
                });
            }

            res.json({
                service,
                type,
                ...data
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                details: 'Erro ao buscar dados mais recentes do Firebase'
            });
        }
    }

    /**
     * GET /api/firebase/dates/:service/:type
     * Lista todas as datas disponíveis para um serviço e tipo
     */
    async listDates(req, res) {
        try {
            const { service, type } = req.params;

            const dates = await firebaseService.listAvailableDates(service, type);

            res.json({
                service,
                type,
                dates,
                total: dates.length
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                details: 'Erro ao listar datas disponíveis'
            });
        }
    }
}

// Instância singleton
export const firebaseController = new FirebaseController();
