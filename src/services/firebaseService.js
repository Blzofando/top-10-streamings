import admin from 'firebase-admin';

/**
 * Serviço para gerenciar operações com Firebase Firestore
 */
class FirebaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    /**
     * Inicializa a conexão com o Firebase usando variáveis de ambiente
     */
    initialize() {
        if (this.initialized) return;

        try {
            // Carrega credenciais das variáveis de ambiente
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Corrige quebras de linha
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
                universe_domain: "googleapis.com"
            };

            // Valida se todas as variáveis necessárias estão presentes
            if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                throw new Error('Variáveis de ambiente do Firebase não configuradas! Configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY e FIREBASE_CLIENT_EMAIL');
            }

            // Inicializa o Firebase Admin
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });

            this.db = admin.firestore();
            this.initialized = true;

            console.log('✅ Firebase inicializado com sucesso (usando env vars)');
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error.message);
            throw error;
        }
    }

    /**
     * Salva dados do top 10 no Firestore
     * Estrutura: top10-streaming/{service}/{type-date}/{position}
     * Exemplo: top10-streaming/netflix/overall-2025-12-12/1
     * 
     * @param {string} service - Nome do serviço (netflix, hbo, disney, prime)
     * @param {string} type - Tipo (movie, series, overall)
     * @param {string} date - Data no formato YYYY-MM-DD
     * @param {Array} items - Array de itens do ranking
     * @returns {Promise<void>}
     */
    async saveTop10(service, type, date, items) {
        if (!this.initialized) this.initialize();

        try {
            const timestamp = new Date().toISOString();
            const batch = this.db.batch();

            // Combina type e date para ter número par de componentes
            const typeDate = `${type}-${date}`;

            // Salva cada posição como um documento separado
            for (const item of items) {
                const docPath = `top10-streaming/${service}/${typeDate}/${item.position}`;
                const docRef = this.db.doc(docPath);

                const data = {
                    ...item,
                    service,
                    type,
                    date,
                    timestamp,
                    savedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                batch.set(docRef, data);
            }

            await batch.commit();
            console.log(`✅ Salvos ${items.length} itens no Firebase: ${service}/${typeDate}`);
        } catch (error) {
            console.error('❌ Erro ao salvar no Firebase:', error.message);
            throw error;
        }
    }

    /**
     * Recupera dados do top 10 de uma data específica
     * 
     * @param {string} service - Nome do serviço
     * @param {string} type - Tipo (movie, series, overall)
     * @param {string} date - Data no formato YYYY-MM-DD
     * @returns {Promise<Array>} Array com os dados
     */
    async getTop10(service, type, date) {
        if (!this.initialized) this.initialize();

        try {
            const typeDate = `${type}-${date}`;
            const collectionPath = `top10-streaming/${service}/${typeDate}`;
            const snapshot = await this.db.collection(collectionPath).orderBy('position').get();

            if (snapshot.empty) {
                return null;
            }

            const items = [];
            snapshot.forEach(doc => {
                items.push(doc.data());
            });

            return items;
        } catch (error) {
            console.error('❌ Erro ao buscar do Firebase:', error.message);
            throw error;
        }
    }

    /**
     * Recupera o top 10 mais recente de um serviço e tipo
     * 
     * @param {string} service - Nome do serviço
     * @param {string} type - Tipo (movie, series, overall)
     * @returns {Promise<Object>} Objeto com data e dados
     */
    async getLatestTop10(service, type) {
        if (!this.initialized) this.initialize();

        try {
            // Lista todas as subcoleções disponíveis (type-date)
            const serviceRef = this.db.doc(`top10-streaming/${service}`);
            const collections = await serviceRef.listCollections();

            // Filtra por tipo e extrai datas
            const typeDates = collections
                .map(col => col.id)
                .filter(id => id.startsWith(`${type}-`))
                .sort()
                .reverse();

            if (typeDates.length === 0) {
                return null;
            }

            // Pega a mais recente
            const latestTypeDate = typeDates[0];
            const latestDate = latestTypeDate.replace(`${type}-`, '');

            // Busca os dados dessa data
            const items = await this.getTop10(service, type, latestDate);

            return {
                date: latestDate,
                items
            };
        } catch (error) {
            console.error('❌ Erro ao buscar top 10 mais recente:', error.message);
            throw error;
        }
    }

    /**
     * Lista todas as datas disponíveis para um serviço e tipo
     * 
     * @param {string} service - Nome do serviço
     * @param {string} type - Tipo (movie, series, overall)
     * @returns {Promise<Array>} Array de datas
     */
    async listAvailableDates(service, type) {
        if (!this.initialized) this.initialize();

        try {
            const serviceRef = this.db.doc(`top10-streaming/${service}`);
            const collections = await serviceRef.listCollections();

            // Filtra por tipo e extrai datas
            const dates = collections
                .map(col => col.id)
                .filter(id => id.startsWith(`${type}-`))
                .map(id => id.replace(`${type}-`, ''))
                .sort()
                .reverse();

            return dates;
        } catch (error) {
            console.error('❌ Erro ao listar datas:', error.message);
            throw error;
        }
    }
}

// Instância singleton
export const firebaseService = new FirebaseService();
