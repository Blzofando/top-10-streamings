import { firebaseService } from './firebaseService.js';

/**
 * Serviço de logging estruturado para Firebase
 * Collection: scraping_logs
 */
class FirebaseLoggingService {
    constructor() {
        this.collection = 'scraping_logs';
    }

    /**
     * Loga uma operação bem-sucedida
     * @param {string} service - Nome do serviço (netflix, calendar-tv-shows, etc)
     * @param {string} operation - Tipo de operação (scraping, enrichment, save, cron_update)
     * @param {object} details - Detalhes adicionais
     * @param {number} durationMs - Duração em milissegundos
     */
    async logSuccess(service, operation, details = {}, durationMs = null) {
        try {
            // DESABILITADO: Não salva log de sucesso no Firebase (só erros)
            // Apenas log no console para debug local
            if (durationMs !== null) {
                console.log(`✅ [LOG] ${service} - ${operation} success (${durationMs}ms)`);
            } else {
                console.log(`✅ [LOG] ${service} - ${operation} success`);
            }
        } catch (error) {
            // Silenciosamente ignora
        }
    }

    /**
     * Loga um erro
     * @param {string} service - Nome do serviço
     * @param {string} operation - Tipo de operação
     * @param {Error} error - Objeto de erro
     * @param {object} details - Detalhes adicionais (url, etc)
     */
    async logError(service, operation, error, details = {}) {
        try {
            const logData = {
                timestamp: new Date().toISOString(),
                service,
                type: 'error',
                operation,
                message: error.message || 'Unknown error',
                error_name: error.name || 'Error',
                stack: error.stack || null,
                details,
                timestamp_firestore: firebaseService.admin.firestore().FieldValue.serverTimestamp()
            };

            await firebaseService.db.collection(this.collection).add(logData);

            // Log também no console
            console.error(`❌ [LOG] ${service} - ${operation} error: ${error.message}`);
        } catch (logError) {
            // Não deve quebrar a aplicação se logging falhar
            console.error('⚠️ Erro ao salvar log de erro:', logError.message);
        }
    }

    /**
     * Loga um warning
     * @param {string} service - Nome do serviço
     * @param {string} operation - Tipo de operação
     * @param {string} message - Mensagem de warning
     * @param {object} details - Detalhes adicionais
     */
    async logWarning(service, operation, message, details = {}) {
        try {
            const logData = {
                timestamp: new Date().toISOString(),
                service,
                type: 'warning',
                operation,
                message,
                details,
                timestamp_firestore: firebaseService.admin.firestore().FieldValue.serverTimestamp()
            };

            await firebaseService.db.collection(this.collection).add(logData);

            // Log também no console
            console.warn(`⚠️ [LOG] ${service} - ${operation} warning: ${message}`);
        } catch (error) {
            // Não deve quebrar a aplicação se logging falhar
            console.error('⚠️ Erro ao salvar log de warning:', error.message);
        }
    }

    /**
     * Busca logs recentes de um serviço
     * @param {string} service - Nome do serviço (opcional, null = todos)
     * @param {number} hours - Quantas horas para trás buscar
     * @returns {Promise<Array>} Array de logs
     */
    async getRecentLogs(service = null, hours = 24) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);
            const cutoffISO = cutoffTime.toISOString();

            let query = firebaseService.db.collection(this.collection)
                .where('timestamp', '>=', cutoffISO)
                .orderBy('timestamp', 'desc')
                .limit(100);

            if (service) {
                query = query.where('service', '==', service);
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                return [];
            }

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Erro ao buscar logs:', error.message);
            return [];
        }
    }

    /**
     * Limpa logs antigos (manutenção)
     * @param {number} days - Manter logs dos últimos X dias
     * @returns {Promise<number>} Quantidade de logs removidos
     */
    async cleanupOldLogs(days = 30) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setDate(cutoffTime.getDate() - days);
            const cutoffISO = cutoffTime.toISOString();

            const snapshot = await firebaseService.db.collection(this.collection)
                .where('timestamp', '<', cutoffISO)
                .get();

            if (snapshot.empty) {
                console.log('📦 Nenhum log antigo para limpar');
                return 0;
            }

            // Delete em batch (máximo 500 por vez)
            const batch = firebaseService.db.batch();
            let count = 0;

            snapshot.docs.forEach(doc => {
                if (count < 500) {
                    batch.delete(doc.ref);
                    count++;
                }
            });

            await batch.commit();

            console.log(`🗑️ Removidos ${count} logs antigos (> ${days} dias)`);
            return count;
        } catch (error) {
            console.error('❌ Erro ao limpar logs:', error.message);
            return 0;
        }
    }

    /**
     * Busca estatísticas de logs de um serviço
     * @param {string} service - Nome do serviço
     * @param {number} hours - Período em horas
     * @returns {Promise<object>} Estatísticas (success, error, warning counts)
     */
    async getServiceStats(service, hours = 24) {
        try {
            const logs = await this.getRecentLogs(service, hours);

            const stats = {
                service,
                period_hours: hours,
                total: logs.length,
                success: logs.filter(l => l.type === 'success').length,
                errors: logs.filter(l => l.type === 'error').length,
                warnings: logs.filter(l => l.type === 'warning').length,
                last_error: logs.find(l => l.type === 'error') || null,
                last_success: logs.find(l => l.type === 'success') || null
            };

            return stats;
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error.message);
            return null;
        }
    }
}

// Instância singleton
export const firebaseLoggingService = new FirebaseLoggingService();
