import express from 'express';
import { streamingController } from '../controllers/streamingController.js';

const router = express.Router();

/**
 * GET /api/top-10/:service
 * Retorna top 10 de um streaming específico ou todos
 * 
 * Parâmetros:
 * - service: netflix | hbo | disney | prime | all
 * 
 * Query params:
 * - tmdb: true/false - Enriquecer com dados TMDB em PT-BR (padrão: false)
 * - save: true/false - Salvar automaticamente no Firebase (padrão: true)
 */
router.get('/:service', async (req, res) => {
    await streamingController.handleGet(req, res);
});

export default router;
