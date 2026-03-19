import dotenv from 'dotenv';
import stringSimilarity from 'string-similarity';
import NodeCache from 'node-cache';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Cache para persistência de matches (Entity Resolution)
const entityCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // 24h

/**
 * Serviço para interagir com a API do TMDB com Arquitetura de Resolução de Entidades
 */
export class TMDBService {
    /**
     * Busca um título no TMDB com lógica de pipeline robusta
     */
    async searchTitle(title, type = 'multi') {
        if (!TMDB_API_KEY) {
            console.warn('⚠️ TMDB_API_KEY não configurada');
            return null;
        }

        const cacheKey = `match:${title}:${type}`;
        const cached = entityCache.get(cacheKey);
        if (cached) return cached;

        try {
            const { cleanTitle, year } = this.extractTitleAndYear(title);
            
            // Etapa 1: Multi-query (Busca Inteligente)
            const queries = [
                cleanTitle, // Título sanitizado
                title,      // Título original (com sufixos)
            ];

            // Se for One Piece, adiciona variações conhecidas
            if (cleanTitle.toLowerCase().includes('one piece')) {
                queries.push('One Piece Live Action');
            }

            const candidatePool = [];
            const processedIds = new Set();

            // Executa as queries em paralelo
            const searchPromises = queries.map(q => this._fetchFromTMDB(q, type));
            const searchResults = await Promise.all(searchPromises);

            for (const results of searchResults) {
                for (const res of results) {
                    if (!processedIds.has(res.id)) {
                        candidatePool.push(res);
                        processedIds.add(res.id);
                    }
                }
            }

            if (candidatePool.length === 0) return null;

            // Etapa 2: Ranking com Sinais Ponderados
            const bestMatch = this.rankCandidates(candidatePool, cleanTitle, year, type);
            
            if (bestMatch) {
                const formatted = this.formatTMDBData(bestMatch);
                entityCache.set(cacheKey, formatted);
                return formatted;
            }

            return null;
        } catch (error) {
            console.error(`❌ Erro ao buscar "${title}" no TMDB:`, error.message);
            return null;
        }
    }

    async _fetchFromTMDB(query, type) {
        const endpoint = type === 'multi' ? 'search/multi' : `search/${type}`;
        const url = `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results || [];
        } catch {
            return [];
        }
    }

    /**
     * Extrai título e ano de forma controlada
     */
    extractTitleAndYear(rawTitle) {
        const yearMatch = rawTitle.match(/\((\d{4})\)$/);
        let year = yearMatch ? parseInt(yearMatch[1]) : null;

        let cleanTitle = rawTitle
            .replace(/\(\d{4}\)$/, '') // Remove ano no final
            .replace(/(: A Série|: O Filme|\| Netflix|\| Disney\+| - Conteúdo Extra| Bonus Content)/gi, '')
            .trim();

        return { cleanTitle, year };
    }

    /**
     * Sistema de Pontuação Ponderada (Production Grade)
     */
    rankCandidates(candidates, searchTitle, searchYear, searchType) {
        const maxPop = Math.max(...candidates.map(c => c.popularity || 1));
        
        const scored = candidates.map(res => {
            const resultTitle = res.title || res.name || '';
            const originalTitle = res.original_title || res.original_name || '';
            const releaseDate = res.release_date || res.first_air_date || '';
            const resYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
            const resPop = res.popularity || 0;

            let scores = {
                similarity: 0,
                popularity: 0,
                year: 0,
                type: 0,
                supplementary: 0
            };

            // A. Similaridade de Título (40%) - Compara com título atual e original
            const sim1 = stringSimilarity.compareTwoStrings(resultTitle.toLowerCase(), searchTitle.toLowerCase());
            const sim2 = stringSimilarity.compareTwoStrings(originalTitle.toLowerCase(), searchTitle.toLowerCase());
            scores.similarity = Math.max(sim1, sim2);

            // B. Popularidade Normalizada (25%) - Logarithmic scale
            scores.popularity = Math.log(resPop + 1) / Math.log(maxPop + 1);

            // C. Ano com Tolerância (15%)
            if (searchYear) {
                const yearDiff = Math.abs(resYear - searchYear);
                if (yearDiff === 0) scores.year = 1.0;
                else if (yearDiff <= 1) scores.year = 0.7;
                else if (yearDiff <= 3) scores.year = 0.3;
            } else {
                // Se não informado, favorece recência levemente
                const currentYear = new Date().getFullYear();
                if (resYear === currentYear) scores.year = 0.5;
                else if (resYear >= currentYear - 2) scores.year = 0.3;
            }

            // D. Tipo Match (10%)
            if (searchType !== 'multi') {
                const resType = (res.media_type === 'movie' || res.title) ? 'movie' : 'tv';
                scores.type = (resType === searchType) ? 1.0 : 0.0;
            } else {
                scores.type = 1.0;
            }

            // E. Penalização Contextual de Conteúdo Suplementar
            if (this.isSupplementary(resultTitle) || this.isSupplementary(res.overview || '')) {
                scores.supplementary = -0.5; // Penalização leve conforme sugestão
            }

            // Cálculo do Score Final
            const finalScore = 
                (scores.similarity * 0.45) + 
                (scores.popularity * 0.25) + 
                (scores.year * 0.15) + 
                (scores.type * 0.15) + 
                scores.supplementary;

            return { ...res, finalScore };
        });

        // Ordenar e retornar o melhor
        scored.sort((a, b) => b.finalScore - a.finalScore);
        
        console.log(`🎯 [TMDB] Top candidate for "${searchTitle}": ${scored[0].title || scored[0].name} (Score: ${scored[0].finalScore.toFixed(2)})`);
        
        return scored[0];
    }

    /**
     * Detecta se um título é conteúdo suplementar/extra
     */
    isSupplementary(text) {
        if (!text) return false;
        const lower = text.toLowerCase();
        const extras = ['conteúdo extra', 'bonus content', 'making of', 'behind the scenes', 'bastidores', 'especial', 'special evidence'];
        
        // Verifica se o texto contém algum dos termos ou tem similaridade alta com eles
        return extras.some(word => lower.includes(word));
    }

    formatTMDBData(tmdbData) {
        const isMovie = tmdbData.media_type === 'movie' || tmdbData.title;

        return {
            tmdb_id: tmdbData.id,
            type: isMovie ? 'movie' : 'tv',
            title: tmdbData.title || tmdbData.name || '',
            original_title: tmdbData.original_title || tmdbData.original_name || '',
            overview: tmdbData.overview || '',
            release_date: tmdbData.release_date || tmdbData.first_air_date || null,
            poster_path: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
            backdrop_path: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : null,
            vote_average: tmdbData.vote_average || 0,
            vote_count: tmdbData.vote_count || 0,
            popularity: tmdbData.popularity || 0,
            language: tmdbData.original_language || '',
            adult: tmdbData.adult || false
        };
    }

    async enrichData(items) {
        const enrichedItems = [];
        for (const item of items) {
            const tmdbData = await this.searchTitle(item.title, item.type);
            enrichedItems.push({
                ...item,
                tmdb: tmdbData
            });
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        return enrichedItems;
    }
}

export const tmdbService = new TMDBService();
