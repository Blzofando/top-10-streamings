import { apiKeyService } from '../services/apiKeyService.js';

/**
 * Controller para gerenciar API Keys (endpoints administrativos)
 */
export class AdminController {
    /**
     * Gera uma nova API key
     * POST /api/admin/keys/generate
     * Body: { name, email, rateLimit? }
     */
    async generateKey(req, res) {
        try {
            const { name, email, rateLimit } = req.body;

            if (!name || !email) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: name, email'
                });
            }

            const keyData = await apiKeyService.createKey({ name, email, rateLimit });

            res.json({
                success: true,
                message: 'API key criada com sucesso!',
                data: {
                    key: keyData.key,
                    name: keyData.name,
                    rateLimit: keyData.rateLimit,
                    createdAt: keyData.createdAt
                },
                usage: {
                    example: `curl -H "X-API-Key: ${keyData.key}" https://your-api.com/api/top-10/netflix?tmdb=true`
                }
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }

    /**
     * Lista todas as API keys
     * GET /api/admin/keys/list
     */
    async listKeys(req, res) {
        try {
            const keys = await apiKeyService.listKeys();

            res.json({
                success: true,
                count: keys.length,
                keys
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }

    /**
     * Revoga uma API key
     * DELETE /api/admin/keys/:keyId
     */
    async revokeKey(req, res) {
        try {
            const { keyId } = req.params;

            await apiKeyService.revokeKey(keyId);

            res.json({
                success: true,
                message: 'API key revogada com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }

    /**
     * Estatísticas de uso
     * GET /api/admin/keys/stats
     */
    async getStats(req, res) {
        try {
            const stats = await apiKeyService.getStats();

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }
}

// Instância singleton
export const adminController = new AdminController();
