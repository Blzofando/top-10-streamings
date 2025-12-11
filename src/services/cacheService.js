import NodeCache from 'node-cache';
import dotenv from 'dotenv';
dotenv.config();

const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hora por padrão

/**
 * Serviço de cache para armazenar dados temporariamente
 */
class CacheService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: CACHE_TTL,
            checkperiod: 600 // Verifica itens expirados a cada 10 minutos
        });
    }

    /**
     * Armazena dados no cache
     * @param {string} key - Chave do cache
     * @param {*} value - Valor a ser armazenado
     */
    set(key, value) {
        this.cache.set(key, value);
        console.log(`💾 Cache salvo: ${key}`);
    }

    /**
     * Recupera dados do cache
     * @param {string} key - Chave do cache
     * @returns {*} Valor armazenado ou undefined
     */
    get(key) {
        const value = this.cache.get(key);
        if (value) {
            console.log(`✨ Cache encontrado: ${key}`);
        } else {
            console.log(`❌ Cache não encontrado: ${key}`);
        }
        return value;
    }

    /**
     * Remove item do cache
     * @param {string} key - Chave do cache
     */
    delete(key) {
        this.cache.del(key);
        console.log(`🗑️ Cache removido: ${key}`);
    }

    /**
     * Limpa todo o cache
     */
    flush() {
        this.cache.flushAll();
        console.log('🧹 Cache limpo completamente');
    }

    /**
     * Retorna estatísticas do cache
     */
    getStats() {
        return this.cache.getStats();
    }
}

export const cacheService = new CacheService();
