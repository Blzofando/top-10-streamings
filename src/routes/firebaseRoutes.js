import express from 'express';
import { firebaseController } from '../controllers/firebaseController.js';

const router = express.Router();

/**
 * GET /api/firebase/history/:service/:type/:date
 * Recupera dados históricos de uma data específica
 * 
 * Parâmetros:
 * - service: netflix | hbo | disney | prime
 * - type: movie | series | overall
 * - date: YYYY-MM-DD
 */
router.get('/history/:service/:type/:date', async (req, res) => {
    await firebaseController.getHistory(req, res);
});

/**
 * GET /api/firebase/latest/:service/:type
 * Recupera o top 10 mais recente de um serviço e tipo
 * 
 * Parâmetros:
 * - service: netflix | hbo | disney | prime
 * - type: movie | series | overall
 */
router.get('/latest/:service/:type', async (req, res) => {
    await firebaseController.getLatest(req, res);
});

/**
 * GET /api/firebase/dates/:service/:type
 * Lista todas as datas disponíveis para um serviço e tipo
 * 
 * Parâmetros:
 * - service: netflix | hbo | disney | prime
 * - type: movie | series | overall
 */
router.get('/dates/:service/:type', async (req, res) => {
    await firebaseController.listDates(req, res);
});

export default router;
