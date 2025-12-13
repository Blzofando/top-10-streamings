import express from 'express';
import { adminController } from '../controllers/adminController.js';

const router = express.Router();

/**
 * IMPORTANTE: Estes endpoints devem ser protegidos em produção!
 * Adicione autenticação admin ou restrinja por IP
 */

/**
 * POST /api/admin/keys/generate
 * Gera uma nova API key
 * Body: { name: string, email: string, rateLimit?: number }
 */
router.post('/keys/generate', async (req, res) => {
    await adminController.generateKey(req, res);
});

/**
 * GET /api/admin/keys/list
 * Lista todas as API keys
 */
router.get('/keys/list', async (req, res) => {
    await adminController.listKeys(req, res);
});

/**
 * DELETE /api/admin/keys/:keyId
 * Revoga uma API key
 */
router.delete('/keys/:keyId', async (req, res) => {
    await adminController.revokeKey(req, res);
});

/**
 * GET /api/admin/keys/stats
 * Estatísticas de uso das API keys
 */
router.get('/keys/stats', async (req, res) => {
    await adminController.getStats(req, res);
});

export default router;
