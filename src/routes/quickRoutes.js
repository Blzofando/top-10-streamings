import express from 'express';
import { quickController } from '../controllers/quickController.js';

const router = express.Router();

/**
 * Rotas rápidas - Só Firebase, sem scraping
 * Sempre requerem API key (protegidas pelo middleware validateApiKey)
 * 
 * Query params:
 * - format: 'id' | 'full' (default: 'full')
 *   - id: Retorna só position, title, tmdb_id
 *   - full: Retorna todos os dados TMDB
 */

// Rankings globais (top 10 filmes + séries de TODOS os streamings)
router.get('/global', async (req, res) => {
    await quickController.getGlobal(req, res);
});

// Overall de todos os streamings + global completo
router.get('/overall', async (req, res) => {
    await quickController.getAllOverall(req, res);
});

// Todos os streamings + global
router.get('/all', async (req, res) => {
    await quickController.getAll(req, res);
});

// Serviço específico - overall + movies + series
router.get('/:service', async (req, res) => {
    // Evita conflito com /global e /all
    if (req.params.service === 'global' || req.params.service === 'all') {
        return res.status(400).json({
            error: 'Use /api/quick/global ou /api/quick/all diretamente'
        });
    }
    await quickController.getService(req, res);
});

// Só filmes
router.get('/:service/movies', async (req, res) => {
    await quickController.getMovies(req, res);
});

// Só séries
router.get('/:service/series', async (req, res) => {
    await quickController.getSeries(req, res);
});

// Só overall
router.get('/:service/overall', async (req, res) => {
    await quickController.getOverall(req, res);
});

// ===== CALENDÁRIO DE LANÇAMENTOS =====
// Importação lazy do controller
let calendarController;
const getCalendarController = async () => {
    if (!calendarController) {
        const module = await import('../controllers/calendarController.js');
        calendarController = module.calendarController;
    }
    return calendarController;
};

// Calendário de filmes (Firebase rápido)
router.get('/calendar/movies', async (req, res) => {
    const controller = await getCalendarController();
    await controller.getCalendarQuick(req, res);
});

// Calendário de séries (Firebase rápido)
router.get('/calendar/tv-shows', async (req, res) => {
    const controller = await getCalendarController();
    await controller.getTvCalendarQuick(req, res);
});

// Calendário overall (Firebase rápido)
router.get('/calendar/overall', async (req, res) => {
    const controller = await getCalendarController();
    await controller.getOverallCalendarQuick(req, res);
});

export default router;
