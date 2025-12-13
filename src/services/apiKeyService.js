import crypto from 'crypto';
import { firebaseService } from './firebaseService.js';

/**
 * Serviço para gerenciar API Keys
 */
class ApiKeyService {
    constructor() {
        this.collection = 'api-keys';
    }

    /**
     * Gera uma nova API key única e segura
     * @returns {string} API key gerada
     */
    generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Cria e salva uma nova API key
     * @param {Object} keyData - Dados do usuário da key
     * @param {string} keyData.name - Nome do projeto/site
     * @param {string} keyData.email - Email de contato
     * @param {number} keyData.rateLimit - Limite de requests/hora (padrão: 1000)
     * @returns {Promise<Object>} Key criada com dados completos
     */
    async createKey(keyData) {
        if (!firebaseService.initialized) firebaseService.initialize();

        const key = this.generateKey();
        const now = new Date();

        const keyDoc = {
            key,
            name: keyData.name || 'Unnamed',
            email: keyData.email || '',
            active: true,
            rateLimit: keyData.rateLimit || 1000, // requests/hora
            requestCount: 0,
            createdAt: now.toISOString(),
            lastUsedAt: null,
            usageByHour: {} // { "2025-12-12T21": 45, ... }
        };

        await firebaseService.db.collection(this.collection).doc(key).set(keyDoc);

        console.log(`✅ Nova API key criada: ${key.substring(0, 8)}... (${keyData.name})`);

        return keyDoc;
    }

    /**
     * Valida uma API key e verifica rate limit
     * @param {string} key - API key para validar
     * @returns {Promise<Object>} { valid: boolean, data?: Object, error?: string }
     */
    async validateKey(key) {
        if (!key) {
            return { valid: false, error: 'API key não fornecida' };
        }

        if (!firebaseService.initialized) firebaseService.initialize();

        try {
            const doc = await firebaseService.db.collection(this.collection).doc(key).get();

            if (!doc.exists) {
                return { valid: false, error: 'API key inválida' };
            }

            const keyData = doc.data();

            if (!keyData.active) {
                return { valid: false, error: 'API key desativada' };
            }

            // Verifica rate limit
            const currentHour = new Date().toISOString().substring(0, 13); // "2025-12-12T21"
            const usageThisHour = keyData.usageByHour?.[currentHour] || 0;

            if (usageThisHour >= keyData.rateLimit) {
                return {
                    valid: false,
                    error: `Rate limit excedido. Limite: ${keyData.rateLimit} requests/hora`,
                    remaining: 0
                };
            }

            // Incrementa contador
            await this.incrementUsage(key, currentHour);

            return {
                valid: true,
                data: keyData,
                remaining: keyData.rateLimit - usageThisHour - 1
            };
        } catch (error) {
            console.error('❌ Erro ao validar API key:', error.message);
            return { valid: false, error: 'Erro ao validar API key' };
        }
    }

    /**
     * Incrementa contador de uso de uma key
     * @param {string} key - API key
     * @param {string} currentHour - Hora atual em formato ISO (YYYY-MM-DDTHH)
     */
    async incrementUsage(key, currentHour) {
        if (!firebaseService.initialized) firebaseService.initialize();

        const docRef = firebaseService.db.collection(this.collection).doc(key);

        await docRef.update({
            requestCount: firebaseService.db.FieldValue.increment(1),
            lastUsedAt: new Date().toISOString(),
            [`usageByHour.${currentHour}`]: firebaseService.db.FieldValue.increment(1)
        });
    }

    /**
     * Lista todas as API keys
     * @returns {Promise<Array>} Array de keys
     */
    async listKeys() {
        if (!firebaseService.initialized) firebaseService.initialize();

        const snapshot = await firebaseService.db.collection(this.collection).get();

        const keys = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Não expõe a key completa na listagem
            keys.push({
                id: doc.id,
                keyPreview: `${doc.id.substring(0, 8)}...${doc.id.substring(doc.id.length - 4)}`,
                name: data.name,
                email: data.email,
                active: data.active,
                rateLimit: data.rateLimit,
                requestCount: data.requestCount,
                createdAt: data.createdAt,
                lastUsedAt: data.lastUsedAt
            });
        });

        return keys;
    }

    /**
     * Desativa uma API key
     * @param {string} key - API key para desativar
     * @returns {Promise<boolean>} Sucesso
     */
    async revokeKey(key) {
        if (!firebaseService.initialized) firebaseService.initialize();

        await firebaseService.db.collection(this.collection).doc(key).update({
            active: false,
            revokedAt: new Date().toISOString()
        });

        console.log(`🔒 API key revogada: ${key.substring(0, 8)}...`);
        return true;
    }

    /**
     * Obtém estatísticas de uso
     * @returns {Promise<Object>} Estatísticas agregadas
     */
    async getStats() {
        const keys = await this.listKeys();

        const stats = {
            totalKeys: keys.length,
            activeKeys: keys.filter(k => k.active).length,
            inactiveKeys: keys.filter(k => !k.active).length,
            totalRequests: keys.reduce((sum, k) => sum + (k.requestCount || 0), 0),
            topUsers: keys
                .sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0))
                .slice(0, 10)
                .map(k => ({
                    name: k.name,
                    requests: k.requestCount,
                    lastUsed: k.lastUsedAt
                }))
        };

        return stats;
    }
}

// Instância singleton
export const apiKeyService = new ApiKeyService();
