import { apiKeyService } from '../services/apiKeyService.js';

/**
 * Middleware para validar API key em requests
 * Adiciona header X-API-Key
 */
export const validateApiKey = async (req, res, next) => {
    // Pega a key do header
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key obrigatória. Adicione header: X-API-Key: sua_chave'
        });
    }

    // Valida a key
    const validation = await apiKeyService.validateKey(apiKey);

    if (!validation.valid) {
        return res.status(validation.error.includes('Rate limit') ? 429 : 401).json({
            error: validation.error.includes('Rate limit') ? 'Too Many Requests' : 'Unauthorized',
            message: validation.error,
            ...(validation.remaining !== undefined && { remaining: validation.remaining })
        });
    }

    // Adiciona dados da key ao request para uso posterior
    req.apiKeyData = validation.data;
    req.rateLimitRemaining = validation.remaining;

    // Adiciona headers de rate limit na resposta
    res.setHeader('X-RateLimit-Limit', validation.data.rateLimit);
    res.setHeader('X-RateLimit-Remaining', validation.remaining);

    next();
};

/**
 * Middleware para validar MASTER API key (scraping e cron jobs)
 * Requer key do tipo 'master'
 */
export const validateMasterKey = async (req, res, next) => {
    // Primeiro valida a key normalmente
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Master API key obrigatória. Adicione header: X-API-Key: sua_chave_master'
        });
    }

    const validation = await apiKeyService.validateKey(apiKey);

    if (!validation.valid) {
        return res.status(validation.error.includes('Rate limit') ? 429 : 401).json({
            error: validation.error.includes('Rate limit') ? 'Too Many Requests' : 'Unauthorized',
            message: validation.error,
            ...(validation.remaining !== undefined && { remaining: validation.remaining })
        });
    }

    // Verifica se é master key
    if (validation.data.type !== 'master') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Esta operação requer uma Master API Key. Sua chave atual é do tipo "user" (somente leitura).',
            hint: 'Master keys podem executar scraping e cron jobs. User keys só podem ler dados do Firebase.'
        });
    }

    // Adiciona dados da key ao request
    req.apiKeyData = validation.data;
    req.rateLimitRemaining = validation.remaining;

    // Adiciona headers de rate limit
    res.setHeader('X-RateLimit-Limit', validation.data.rateLimit);
    res.setHeader('X-RateLimit-Remaining', validation.remaining);

    next();
};

/**
 * Middleware opcional - permite acesso sem key mas adiciona rate limit se tiver
 */
export const optionalApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
        const validation = await apiKeyService.validateKey(apiKey);

        if (validation.valid) {
            req.apiKeyData = validation.data;
            req.rateLimitRemaining = validation.remaining;
            res.setHeader('X-RateLimit-Limit', validation.data.rateLimit);
            res.setHeader('X-RateLimit-Remaining', validation.remaining);
        }
    }

    next();
};
