import express from 'express';
import { cronController } from '../controllers/cronController.js';

const router = express.Router();

/**
 * GET /api/cron/update-expired
 * Verifica e atualiza apenas serviços com dados expirados (> 3 horas)
 * Processa sequencialmente para evitar sobrecarga
 */
router.get('/update-expired', async (req, res) => {
    await cronController.updateExpiredData(req, res);
});

/**
 * GET /api/cron/health
 * Health check do sistema de cron
 */
router.get('/health', async (req, res) => {
    await cronController.healthCheck(req, res);
});

export default router;
