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
     * Atualiza apenas os serviços cujos dados expiraram
     * Processa sequencialmente com delay manual entre cada serviço
     * 
     * GET /api/cron/update-expired
     */
    async updateExpiredData(req, res) {
        const services = [
            { name: 'netflix', delayMinutes: 0 },   // Executa imediatamente
            { name: 'disney', delayMinutes: 20 },   // +20 min
            { name: 'hbo', delayMinutes: 40 },      // +40 min
            { name: 'prime', delayMinutes: 60 }     // +60 min
        ];

        const results = {
            timestamp: new Date().toISOString(),
            checked: [],
            updated: [],
            skipped: [],
            errors: []
        };

        console.log('\n🔄 ===== CRON JOB: Verificando dados expirados =====');

        // Processa cada serviço SEQUENCIALMENTE com delay
        for (const serviceConfig of services) {
            const service = serviceConfig.name;

            try {
                results.checked.push(service);

                // Verifica se expirou
                const expired = await this.isDataExpired(service);

                if (expired) {
                    // Calcula se já passou o tempo de delay desse serviço
                    const now = new Date();
                    const currentMinutes = now.getMinutes();
                    const targetMinute = serviceConfig.delayMinutes % 60;

                    // Se estamos no minuto certo (com margem de ±5 min), atualiza
                    const minuteDiff = Math.abs(currentMinutes - targetMinute);
                    const shouldUpdateNow = minuteDiff <= 5 || minuteDiff >= 55;

                    if (shouldUpdateNow) {
                        console.log(`\n🔄 [${service}] INICIANDO atualização... (delay: ${serviceConfig.delayMinutes} min)`);

                        // Atualiza com TMDB e salva no Firebase
                        await streamingController.getTop10(service, true, true);

                        results.updated.push(service);
                        console.log(`✅ [${service}] Atualizado com sucesso!`);
                    } else {
                        results.skipped.push(service);
                        const nextUpdateMin = targetMinute - currentMinutes;
                        console.log(`⏰ [${service}] Expirado mas aguardando delay (próx atualização em ~${nextUpdateMin} min)`);
                    }
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
