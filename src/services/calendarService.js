import { firebaseService } from './firebaseService.js';

/**
 * Serviço para gerenciar calendários de lançamentos no Firebase
 */
export class CalendarFirebaseService {
    constructor() {
        this.collectionName = 'calendars';
    }

    /**
     * Salvar calendário de filmes no Firebase
     * @param {Array} releases - Array de lançamentos
     * @returns {Promise<boolean>}
     */
    async saveMovieCalendar(releases) {
        try {
            const today = this.getTodayDate();

            console.log(`💾 Salvando calendário de filmes no Firebase...`);
            console.log(`📅 Data: ${today}`);
            console.log(`📊 Total de lançamentos: ${releases.length}`);

            // Limpar dados antigos ANTES de salvar novos
            await this.cleanupOldData();

            // Preparar documento
            const document = {
                timestamp: new Date().toISOString(),
                date: today,
                type: 'movies',
                totalReleases: releases.length,
                releases: releases
            };

            // Salvar no Firebase
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('movies');

            await docRef.set(document, { merge: false }); // Sobrescreve completamente

            console.log(`✅ Calendário salvo com sucesso!`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar calendário:', error.message);
            throw error;
        }
    }

    /**
     * Buscar calendário de filmes do Firebase
     * @returns {Promise<Array|null>}
     */
    async getMovieCalendar() {
        try {
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('movies');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('⚠️ Nenhum calendário encontrado no Firebase');
                return null;
            }

            const data = doc.data();

            // Verifica se expirou (12 horas)
            // Verifica se expirou (6 horas)
            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diffHours = (now - timestamp) / (1000 * 60 * 60);

            if (diffHours >= 6) {
                console.log(`⏰ Calendário expirado (${diffHours.toFixed(2)}h). Precisa atualizar.`);
                return null;
            }

            console.log(`✅ Calendário encontrado (${diffHours.toFixed(2)}h atrás)`);
            console.log(`📊 Total de lançamentos: ${data.releases?.length || 0}`);

            return data.releases || [];

        } catch (error) {
            console.error('❌ Erro ao buscar calendário:', error.message);
            return null;
        }
    }

    /**
     * Limpar dados do dia anterior
     * Mantém apenas dados do dia atual
     */
    async cleanupOldData() {
        try {
            const today = this.getTodayDate();

            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('movies');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('✨ Primeira vez salvando calendário - nada para limpar');
                return;
            }

            const data = doc.data();
            const savedDate = data.date;

            if (savedDate !== today) {
                console.log(`🗑️ Removendo dados antigos (${savedDate} → ${today})`);
                await docRef.delete();
                console.log('✅ Dados antigos removidos');
            } else {
                console.log('✅ Dados já são do dia atual');
            }

        } catch (error) {
            console.error('❌ Erro ao limpar dados antigos:', error.message);
            // Não lançar erro - continuar mesmo se limpeza falhar
        }
    }

    /**
     * Verificar se calendário está expirado
     * @returns {Promise<boolean>} true se expirado, false se ainda válido
     */
    async isExpired() {
        try {
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('movies');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('⏰ Calendário não existe - precisa criar');
                return true;
            }

            const data = doc.data();
            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diffHours = (now - timestamp) / (1000 * 60 * 60);

            const expired = diffHours >= 12;

            console.log(`⏰ Calendário: ${diffHours.toFixed(2)}h atrás ${expired ? '(EXPIRADO)' : '(VÁLIDO)'}`);

            return expired;

        } catch (error) {
            console.error('❌ Erro ao verificar expiração:', error.message);
            return true; // Em caso de erro, assume que precisa atualizar
        }
    }

    /**
     * Obter data de hoje no formato YYYY-MM-DD
     * @returns {string}
     */
    getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const calendarFirebaseService = new CalendarFirebaseService();
