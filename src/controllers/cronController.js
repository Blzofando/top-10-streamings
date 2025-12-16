import { firebaseService } from '../services/firebaseService.js';
import { streamingController } from '../controllers/streamingController.js';
import { calendarController } from '../controllers/calendarController.js';
import { calendarFirebaseService } from '../services/calendarService.js';
import { getTodayDate } from '../config/streamingServices.js';

/**
 * Controller para operações de cron jobs
 */
export class CronController {
    /**
     * Verifica se os dados de um serviço estão expirados (> 3h para streamings, > 12h para calendário)
     * @param {string} service - Nome do serviço
     * @returns {Promise<boolean>} true se expirou, false se ainda válido
     */
    async isDataExpired(service) {
        try {
            // Calendário tem lógica diferente
            if (service === 'calendar-movies') {
                return await calendarFirebaseService.isExpired();
            }

            // Streamings (lógica antiga - 3h)
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
     * Inclui calendários + streamings
     * 
     * FIRE AND FORGET: Retorna resposta imediata e processa em background
     * Evita timeout de 30s em serviços de cron externos
     * 
     * GET /api/cron/update-expired
     */
    async updateExpiredData(req, res) {
        // 5 streamings + 1 calendário
        const services = ['netflix', 'disney', 'hbo', 'prime', 'apple', 'calendar-movies'];

        // ✅ FIRE AND FORGET: Responde IMEDIATAMENTE
        res.json({
            success: true,
            message: 'Cron job iniciado em background',
            timestamp: new Date().toISOString(),
            status: 'processing'
        });

        // 🔥 Continua processamento em BACKGROUND (não aguarda)
        setImmediate(async () => {
            const results = {
                timestamp: new Date().toISOString(),
                checked: services,
                updated: null,
                skipped: [],
                errors: []
            };

            console.log('\n🔄 ===== CRON JOB: Verificando serviço mais desatualizado =====');

            try {
                // 1. Verificar idade de TODOS os serviços (streamings + calendário)
                const servicesAge = [];

                for (const service of services) {
                    try {
                        // Calendário tem lógica diferente
                        if (service === 'calendar-movies') {
                            const calendar = await calendarFirebaseService.getMovieCalendar();

                            if (!calendar || calendar.length === 0) {
                                servicesAge.push({ service, hours: 99, expireThreshold: 6 });
                                console.log(`⏰ [${service}] Sem dados no Firebase`);
                            } else {
                                // Calcular idade baseado no timestamp do documento
                                const docRef = firebaseService.db.collection('calendars').doc('movies');
                                const doc = await docRef.get();

                                if (doc.exists) {
                                    const data = doc.data();
                                    const lastUpdate = new Date(data.timestamp);
                                    const now = new Date();
                                    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
                                    servicesAge.push({ service, hours: diffHours, expireThreshold: 6 });
                                    console.log(`⏰ [${service}] Última atualização: ${diffHours.toFixed(2)}h atrás (expira em 6h)`);
                                } else {
                                    servicesAge.push({ service, hours: 99, expireThreshold: 6 });
                                }
                            }
                        } else {
                            // Streamings (lógica antiga - 3h)
                            const date = getTodayDate();
                            const data = await firebaseService.getTop10(service, 'overall', date);

                            if (!data || data.length === 0) {
                                // Sem dados = prioridade máxima (99 horas)
                                servicesAge.push({ service, hours: 99, expireThreshold: 3 });
                                console.log(`⏰ [${service}] Sem dados no Firebase`);
                            } else {
                                const firstItem = data[0];
                                if (!firstItem.timestamp) {
                                    servicesAge.push({ service, hours: 99, expireThreshold: 3 });
                                } else {
                                    const lastUpdate = new Date(firstItem.timestamp);
                                    const now = new Date();
                                    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
                                    servicesAge.push({ service, hours: diffHours, expireThreshold: 3 });
                                    console.log(`⏰ [${service}] Última atualização: ${diffHours.toFixed(2)}h atrás`);
                                }
                            }
                        }
                    } catch (error) {
                        // Erro ao verificar = prioridade máxima
                        const expireThreshold = service === 'calendar-movies' ? 6 : 3;
                        servicesAge.push({ service, hours: 99, expireThreshold });
                        console.error(`❌ Erro ao verificar ${service}:`, error.message);
                    }
                }

                // 2. Ordenar por mais desatualizado (maior hora)
                servicesAge.sort((a, b) => b.hours - a.hours);

                const mostOutdated = servicesAge[0];

                console.log(`\n🎯 Serviço mais desatualizado: ${mostOutdated.service} (${mostOutdated.hours.toFixed(2)}h, expira em ${mostOutdated.expireThreshold}h)`);

                // 3. Atualizar SOMENTE o mais desatualizado (se expirou)
                if (mostOutdated.hours >= mostOutdated.expireThreshold) {
                    console.log(`\n🔄 [${mostOutdated.service}] INICIANDO atualização...`);

                    // Calendário ou Streaming?
                    if (mostOutdated.service === 'calendar-movies') {
                        // Atualizar calendário
                        await calendarController.getMovieCalendar(true, true);
                    } else {
                        // Streaming - FORÇA scraping mesmo tendo dados (forceUpdate=true)
                        await streamingController.getTop10(mostOutdated.service, true, true, true);
                    }

                    results.updated = mostOutdated.service;
                    results.skipped = services.filter(s => s !== mostOutdated.service);

                    console.log(`✅ [${mostOutdated.service}] Atualizado com sucesso!`);

                    // Verifica se agora todos os STREAMINGS estão atualizados (< 3h) para criar global
                    const streamingServices = servicesAge.filter(s => s.service !== 'calendar-movies');
                    const allFreshAfterUpdate = streamingServices
                        .filter(s => s.service !== mostOutdated.service)
                        .every(s => s.hours < 3);

                    if (allFreshAfterUpdate) {
                        console.log('\n🌍 Todos os streamings atualizados! Criando rankings globais...');
                        try {
                            await streamingController.getGlobalTop10();
                            console.log('✅ Rankings globais criados!');
                        } catch (globalError) {
                            console.error('❌ Erro ao criar rankings globais:', globalError.message);
                        }
                    }
                } else {
                    results.skipped = services;
                    console.log(`⏭️ Todos os serviços ainda válidos`);
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
