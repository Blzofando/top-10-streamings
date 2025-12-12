import { firebaseService } from '../services/firebaseService.js';
import { streamingController } from '../controllers/streamingController.js';
import { getTodayDate } from '../config/streamingServices.js';

/**
 * Controller para operações de cron jobs
 */
export class CronController {
    /**
     * Verifica se os dados de um serviço estão expirados (> 3 horas)
     * @param {string} service - Nome do serviço
     * @returns {Promise<boolean>} true se expirou, false se ainda válido
     */
    async isDataExpired(service) {
        try {
            const date = getTodayDate();

            // Busca o overall mais recente no Firebase
            const data = await firebaseService.getTop10(service, 'overall', date);

            if (!data || data.length === 0) {
                console.log(`⏰ [${service}] Sem dados no Firebase - precisa atualizar`);
                return true;
            }

            // Pega o timestamp do primeiro item
            const firstItem = data[0];
            if (!firstItem.timestamp) {
                console.log(`⏰ [${service}] Sem timestamp - precisa atualizar`);
                return true;
            }

            // Calcula diferença de tempo
            const lastUpdate = new Date(firstItem.timestamp);
            const now = new Date();
            const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

            console.log(`⏰ [${service}] Última atualização: ${diffHours.toFixed(2)}h atrás`);

            // Expirou se passou mais de 3 horas
            return diffHours >= 3;
        } catch (error) {
            console.error(`❌ Erro ao verificar expiração de ${service}:`, error.message);
            // Em caso de erro, assume que precisa atualizar
            return true;
        }
    }

    /**
     * Atualiza apenas os serviços cujos dados expiraram (> 3 horas)
     * Processa sequencialmente
     * Para controlar espaçamento: edite manualmente os timestamps no Firebase
     * 
     * GET /api/cron/update-expired
     */
    async updateExpiredData(req, res) {
        const services = ['netflix', 'disney', 'hbo', 'prime'];

        const results = {
            timestamp: new Date().toISOString(),
            checked: [],
            updated: [],
            skipped: [],
            errors: []
        };

        console.log('\n🔄 ===== CRON JOB: Verificando dados expirados =====');

        // Processa cada serviço SEQUENCIALMENTE
        for (const service of services) {
            try {
                results.checked.push(service);

                // Verifica se expirou (> 3 horas)
                const expired = await this.isDataExpired(service);

                if (expired) {
                    console.log(`\n🔄 [${service}] INICIANDO atualização...`);

                    // Atualiza com TMDB e salva no Firebase
                    // O timestamp será salvo automaticamente
                    await streamingController.getTop10(service, true, true);

                    results.updated.push(service);
                    console.log(`✅ [${service}] Atualizado com sucesso!`);
                } else {
                    results.skipped.push(service);
                    console.log(`⏭️  [${service}] PULADO - ainda válido`);
                }

                // Pequeno delay entre verificações
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ [${service}] ERRO:`, error.message);
                results.errors.push({
                    service,
                    error: error.message
                });
            }
        }

        console.log('\n✅ ===== CRON JOB: Finalizado =====');
        console.log(`📊 Resumo: ${results.updated.length} atualizados, ${results.skipped.length} pulados, ${results.errors.length} erros`);

        // Retorna resumo
        res.json({
            success: true,
            ...results
        });
    }

    /**
     * Endpoint de health check
     * GET /api/cron/health
     */
    async healthCheck(req, res) {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Cron controller funcionando'
        });
    }
}

// Instância singleton
export const cronController = new CronController();
