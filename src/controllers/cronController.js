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
     * Atualiza APENAS o serviço mais desatualizado
     * Lógica sequencial: 1 ação por cron job
     * 
     * GET /api/cron/update-expired
     */
    async updateExpiredData(req, res) {
        const services = ['netflix', 'disney', 'hbo', 'prime', 'apple'];

        const results = {
            timestamp: new Date().toISOString(),
            checked: services,
            updated: null,
            skipped: [],
            errors: []
        };

        console.log('\n🔄 ===== CRON JOB: Verificando serviço mais desatualizado =====');

        try {
            // 1. Verificar idade de TODOS os serviços
            const servicesAge = [];

            for (const service of services) {
                try {
                    const date = getTodayDate();
                    const data = await firebaseService.getTop10(service, 'overall', date);

                    if (!data || data.length === 0) {
                        // Sem dados = prioridade máxima (99 horas)
                        servicesAge.push({ service, hours: 99 });
                        console.log(`⏰ [${service}] Sem dados no Firebase`);
                    } else {
                        const firstItem = data[0];
                        if (!firstItem.timestamp) {
                            servicesAge.push({ service, hours: 99 });
                        } else {
                            const lastUpdate = new Date(firstItem.timestamp);
                            const now = new Date();
                            const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
                            servicesAge.push({ service, hours: diffHours });
                            console.log(`⏰ [${service}] Última atualização: ${diffHours.toFixed(2)}h atrás`);
                        }
                    }
                } catch (error) {
                    // Erro ao verificar = prioridade máxima
                    servicesAge.push({ service, hours: 99 });
                    console.error(`❌ Erro ao verificar ${service}:`, error.message);
                }
            }

            // 2. Ordenar por mais desatualizado (maior hora)
            servicesAge.sort((a, b) => b.hours - a.hours);

            const mostOutdated = servicesAge[0];

            console.log(`\n🎯 Serviço mais desatualizado: ${mostOutdated.service} (${mostOutdated.hours.toFixed(2)}h)`);

            // 3. Atualizar SOMENTE o mais desatualizado (se > 3h)
            if (mostOutdated.hours >= 3) {
                console.log(`\n🔄 [${mostOutdated.service}] INICIANDO atualização...`);

                // FORÇA scraping mesmo tendo dados (forceUpdate=true)
                await streamingController.getTop10(mostOutdated.service, true, true, true);

                results.updated = mostOutdated.service;
                results.skipped = services.filter(s => s !== mostOutdated.service);

                console.log(`✅ [${mostOutdated.service}] Atualizado com sucesso!`);

                // Verifica se agora todos estão atualizados (< 3h) para criar global
                const allFreshAfterUpdate = servicesAge.filter(s => s.service !== mostOutdated.service).every(s => s.hours < 3);
                if (allFreshAfterUpdate) {
                    console.log('\n🌍 Todos os serviços atualizados! Criando rankings globais...');
                    try {
                        await streamingController.getGlobalTop10();
                        console.log('✅ Rankings globais criados!');
                    } catch (globalError) {
                        console.error('❌ Erro ao criar rankings globais:', globalError.message);
                    }
                }
            } else {
                results.skipped = services;
                console.log(`⏭️ Todos os serviços ainda válidos (< 3h)`);
            }

        } catch (error) {
            console.error(`❌ ERRO CRÍTICO:`, error.message);
            results.errors.push({
                service: 'cron',
                error: error.message
            });
        }

        console.log('\n✅ ===== CRON JOB: Finalizado =====');
        console.log(`📊 Resumo: ${results.updated ? '1 atualizado' : '0 atualizados'}, ${results.skipped.length} pulados`);

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
