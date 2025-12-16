import express from 'express';

const router = express.Router();

// Lazy loading do controller para evitar problemas de inicialização
let calendarController;
const getCalendarController = async () => {
    if (!calendarController) {
        const module = await import('../controllers/calendarController.js');
        calendarController = module.calendarController;
    }
    return calendarController;
};

/**
 * GET /api/calendar/movies
 * Força scraping do calendário de filmes do IMDB
 * Query params:
 * - force=true: força scraping mesmo se tiver cache válido
 * - save=false: não salva no Firebase (apenas retorna)
 * 
 * Requer: Master API Key
 */
router.get('/movies', async (req, res) => {
    const controller = await getCalendarController();
    await controller.getMovies(req, res);
});

/**
 * GET /api/calendar/status
 * Verifica status do calendário (expirado ou não)
 * 
 * Requer: User ou Master API Key
 */
router.get('/status', async (req, res) => {
    const controller = await getCalendarController();
    await controller.getStatus(req, res);
});

/**
 * GET /api/calendar/cleanup
 * Remove dados antigos (dia anterior)
 * 
 * Requer: Master API Key
 */
router.get('/cleanup', async (req, res) => {
    const controller = await getCalendarController();
    await controller.cleanupOldData(req, res);
});

/**
 * GET /api/calendar/test
 * Endpoint de teste SEM autenticação
 */
router.get('/test', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Calendar routes funcionando!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
