import express from 'express';
import { streamingController } from '../controllers/streamingController.js';

const router = express.Router();

/**
 * GET /api/top-10/:service
 * Retorna top 10 de um streaming específico, global ou todos
 * 
 * Services: netflix | hbo | disney | prime | apple | global | all
 * 
 * Query params:
 * - tmdb: true/false - Enriquecer com dados TMDB em PT-BR (padrão: false)
 * - save: true/false - Salvar automaticamente no Firebase (padrão: true)
 */
router.get('/:service', async (req, res) => {
    try {
        const service = req.params.service.toLowerCase();

        // Rankings globais agregando todos os streamings
        if (service === 'global') {
            const data = await streamingController.getGlobalTop10();
            return res.json(data);
        }

        // Todos os streamings
        if (service === 'all') {
            const services = ['netflix', 'disney', 'hbo', 'prime', 'apple'];
            const enrichWithTMDB = req.query.tmdb === 'true';

            const results = {};
            for (const s of services) {
                results[s] = await streamingController.getTop10(s, enrichWithTMDB, false);
            }

            return res.json(results);
        }

        // Serviço específico
        const enrichWithTMDB = req.query.tmdb === 'true';
        const saveToFirebase = req.query.save !== 'false';

        const data = await streamingController.getTop10(service, enrichWithTMDB, saveToFirebase);
        res.json(data);
    } catch (error) {
        res.status(500).json({
            error: 'Erro ao buscar top 10',
            message: error.message
        });
    }
});

export default router;
