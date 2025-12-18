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
     * Salvar calendário de séries no Firebase
     * @param {Array} releases - Array de lançamentos
     * @returns {Promise<boolean>}
     */
    async saveTvCalendar(releases) {
        try {
            const today = this.getTodayDate();

            console.log(`💾 Salvando calendário de séries no Firebase...`);
            console.log(`📅 Data: ${today}`);
            console.log(`📊 Total de lançamentos: ${releases.length}`);

            // Preparar documento
            const document = {
                timestamp: new Date().toISOString(),
                date: today,
                type: 'tv-shows',
                totalReleases: releases.length,
                releases: releases
            };

            // Salvar no Firebase
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('tv-shows');

            await docRef.set(document, { merge: false });

            console.log(`✅ Calendário de séries salvo com sucesso!`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar calendário de séries:', error.message);
            throw error;
        }
    }

    /**
     * Buscar calendário de séries do Firebase
     * @returns {Promise<Array|null>}
     */
    async getTvCalendar() {
        try {
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('tv-shows');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('⚠️ Nenhum calendário de séries encontrado no Firebase');
                return null;
            }

            const data = doc.data();

            // Verifica se expirou (6 horas)
            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diffHours = (now - timestamp) / (1000 * 60 * 60);

            if (diffHours >= 6) {
                console.log(`⏰ Calendário de séries expirado (${diffHours.toFixed(2)}h). Precisa atualizar.`);
                return null;
            }

            console.log(`✅ Calendário de séries encontrado (${diffHours.toFixed(2)}h atrás)`);
            console.log(`📊 Total de lançamentos: ${data.releases?.length || 0}`);

            return data.releases || [];

        } catch (error) {
            console.error('❌ Erro ao buscar calendário de séries:', error.message);
            return null;
        }
    }

    /**
     * Buscar calendário de séries SEM checar expiração
     * Usado para lógica de merge/comparação em force updates
     * @returns {Promise<Array|null>}
     */
    async getRawTvCalendar() {
        try {
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('tv-shows');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('⚠️ Nenhum calendário de séries encontrado no Firebase (raw)');
                return null;
            }

            const data = doc.data();
            console.log(`📄 Dados raw encontrados: ${data.releases?.length || 0} lançamentos`);

            return data.releases || [];

        } catch (error) {
            console.error('❌ Erro ao buscar calendário raw:', error.message);
            return null;
        }
    }

    /**
     * Salva calendário overall (filmes + séries) ordenado por data
     * @param {Array} movieReleases - Lançamentos de filmes
     * @param {Array} tvReleases - Lançamentos de séries
     * @returns {Promise<boolean>}
     */
    async saveOverallCalendar(movieReleases, tvReleases) {
        try {
            const today = this.getTodayDate();

            // Mapeamento de meses para parser de data PT-BR
            const monthMap = {
                'jan': '01', 'janeiro': '01', 'jan.': '01',
                'fev': '02', 'fevereiro': '02', 'fev.': '02',
                'mar': '03', 'março': '03', 'mar.': '03',
                'abr': '04', 'abril': '04', 'abr.': '04',
                'mai': '05', 'maio': '05', 'mai.': '05',
                'jun': '06', 'junho': '06', 'jun.': '06',
                'jul': '07', 'julho': '07', 'jul.': '07',
                'ago': '08', 'agosto': '08', 'ago.': '08',
                'set': '09', 'setembro': '09', 'set.': '09',
                'out': '10', 'outubro': '10', 'out.': '10',
                'nov': '11', 'novembro': '11', 'nov.': '11',
                'dez': '12', 'dezembro': '12', 'dez.': '12'
            };

            // Normalizador de objetos
            const normalize = (item, type) => {
                // 1. Tenta padronizar a DATA (YYYY-MM-DD)
                let releaseDate = item.releaseDate || item.release_date;

                // Parser para data PT-BR ("06 de nov. de 2026")
                if (releaseDate && releaseDate.includes(' de ')) {
                    try {
                        const match = releaseDate.match(/(\d{1,2})\s+de\s+(\w+\.?)(?:\s+de\s+(\d{4}))?/i);
                        if (match) {
                            const day = match[1].padStart(2, '0');
                            const monthStr = match[2].toLowerCase();
                            const year = match[3] || (item.year ? item.year.toString() : new Date().getFullYear().toString());
                            const month = monthMap[monthStr];

                            if (month) {
                                releaseDate = `${year}-${month}-${day}`;
                            }
                        }
                    } catch (e) {
                        // Mantém original se falhar
                    }
                }
                // Parser para data ISO ou data padrão
                else if (releaseDate) {
                    const dateObj = new Date(releaseDate);
                    if (!isNaN(dateObj.getTime())) {
                        releaseDate = dateObj.toISOString().split('T')[0];
                    }
                }

                // 2. Tenta extrair dados TMDB (suporta estrutura nested ou flat)
                // Nested: item.tmdb.id
                // Flat: item.tmdb_id ou item.tmdb_name

                const tmdbData = item.tmdb || {};

                const tmdbId = tmdbData.id || item.tmdb_id || item.id || null;
                const overview = tmdbData.overview || item.tmdb_overview || item.overview || '';
                const posterPath = tmdbData.posterPath || tmdbData.poster_path || item.tmdb_poster_path || item.poster_path || null;
                const backdropPath = tmdbData.backdropPath || tmdbData.backdrop_path || item.tmdb_backdrop_path || item.backdrop_path || null;
                const originalTitle = tmdbData.originalTitle || tmdbData.original_title || item.tmdb_original_name || item.original_title || item.title;

                // Season Info default
                let seasonInfo = type === 'tv' ? (item.seasonInfo || item.season_info || null) : null;
                if (!seasonInfo) {
                    seasonInfo = "estréia";
                }

                return {
                    title: item.title,
                    original_title: originalTitle,
                    releaseDate: releaseDate,
                    type: type, // 'movie' ou 'tv'
                    tmdb_id: tmdbId,
                    overview: overview,
                    poster_path: posterPath,
                    backdrop_path: backdropPath,
                    season_info: seasonInfo,
                    genres: item.genres || []
                };
            };

            // Combinar filmes e séries normalizados
            const moviesNormalized = movieReleases.map(r => normalize(r, 'movie'));
            const tvNormalized = tvReleases.map(r => normalize(r, 'tv'));
            const combined = [...moviesNormalized, ...tvNormalized];

            // Ordenar por data (mais recente primeiro)
            combined.sort((a, b) => {
                if (!a.releaseDate) return 1;
                if (!b.releaseDate) return -1;
                // String comparison works for ISO dates (YYYY-MM-DD)
                return a.releaseDate.localeCompare(b.releaseDate);
            });

            console.log(`💾 Salvando calendário overall no Firebase...`);
            console.log(`📅 Data: ${today}`);
            console.log(`📊 Total: ${combined.length} (${movieReleases.length} filmes + ${tvReleases.length} séries)`);

            const document = {
                timestamp: new Date().toISOString(),
                date: today,
                type: 'overall',
                totalReleases: combined.length,
                totalMovies: movieReleases.length,
                totalTvShows: tvReleases.length,
                releases: combined
            };

            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('overall');

            await docRef.set(document, { merge: false });

            console.log(`✅ Calendário overall salvo com sucesso!`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar calendário overall:', error.message);
            throw error;
        }
    }

    /**
     * Buscar calendário overall do Firebase
      * @returns {Promise<Array|null>}
     */
    async getOverallCalendar() {
        try {
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('overall');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('⚠️ Nenhum calendário overall encontrado no Firebase');
                return null;
            }

            const data = doc.data();

            // Verifica se expirou (6 horas)
            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diffHours = (now - timestamp) / (1000 * 60 * 60);

            if (diffHours >= 6) {
                console.log(`⏰ Calendário overall expirado (${diffHours.toFixed(2)}h). Precisa atualizar.`);
                return null;
            }

            console.log(`✅ Calendário overall encontrado (${diffHours.toFixed(2)}h atrás)`);
            console.log(`📊 Total: ${data.releases?.length || 0} (${data.totalMovies} filmes + ${data.totalTvShows} séries)`);

            return data.releases || [];

        } catch (error) {
            console.error('❌ Erro ao buscar calendário overall:', error.message);
            return null;
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
     * Buscar calendário de filmes SEM checar expiração
     * Usado para lógica de merge/comparação em force updates
     * @returns {Promise<Array|null>}
     */
    async getRawMovieCalendar() {
        try {
            const docRef = firebaseService.db
                .collection(this.collectionName)
                .doc('movies');

            const doc = await docRef.get();

            if (!doc.exists) {
                console.log('⚠️ Nenhum calendário de filmes encontrado no Firebase (raw)');
                return null;
            }

            const data = doc.data();
            console.log(`📄 Dados raw encontrados: ${data.releases?.length || 0} filmes`);

            return data.releases || [];

        } catch (error) {
            console.error('❌ Erro ao buscar calendário raw:', error.message);
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
