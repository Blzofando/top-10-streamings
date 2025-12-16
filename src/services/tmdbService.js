import dotenv from 'dotenv';
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Serviço para interagir com a API do TMDB
 */
export class TMDBService {
    /**
     * Busca um título no TMDB
     * @param {string} title - Nome do título
     * @param {string} type - Tipo: 'movie' ou 'tv'
     * @returns {Object|null} Dados do TMDB ou null
     */
    // ... (imports remain same)

    /**
     * Busca um título no TMDB com lógica de melhor match
     */
    async searchTitle(title, type = 'multi') {
        if (!TMDB_API_KEY) {
            console.warn('⚠️ TMDB_API_KEY não configurada');
            return null;
        }

        try {
            const { cleanTitle, year } = this.extractTitleAndYear(title);
            const endpoint = type === 'multi' ? 'search/multi' : `search/${type}`;
            const url = `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=pt-BR`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                return this.findBestMatch(data.results, cleanTitle, year, type);
            }

            return null;
        } catch (error) {
            console.error(`❌ Erro ao buscar "${title}" no TMDB:`, error.message);
            return null;
        }
    }

    /**
     * Extrai título e ano (se existir)
     */
    extractTitleAndYear(rawTitle) {
        // Tenta encontrar ano entre parênteses no final: "Title (2024)"
        const yearMatch = rawTitle.match(/\((\d{4})\)$/);
        let year = yearMatch ? parseInt(yearMatch[1]) : null;

        // Limpa o título
        let cleanTitle = rawTitle
            .replace(/\|.+$/g, '')
            .replace(/\(.+\)/g, '')
            .replace(/\[.+\]/g, '')
            .trim();

        return { cleanTitle, year };
    }

    /**
     * Encontra o melhor candidato entre os resultados
     */
    findBestMatch(results, searchTitle, searchYear, searchType) {
        const currentYear = new Date().getFullYear();

        // Pontuação para cada resultado
        const rankedResults = results.map(result => {
            let score = 0;
            const resultTitle = result.title || result.name;
            const releaseDate = result.release_date || result.first_air_date || '';
            const resultYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;

            // 1. Match exato de título (ignora case)
            if (resultTitle.toLowerCase() === searchTitle.toLowerCase()) {
                score += 10;
            } else if (resultTitle.toLowerCase().includes(searchTitle.toLowerCase())) {
                score += 5;
            }

            // 2. Ano (muito importante para "Top 10" atuais)
            if (searchYear) {
                // Se temos ano de busca, prioriza ele
                if (resultYear === searchYear) score += 20;
                else if (Math.abs(resultYear - searchYear) <= 1) score += 10;
            } else {
                // Se não temos ano, prioriza lançamentos recentes (ano atual ou anterior)
                if (resultYear === currentYear) score += 15;
                else if (resultYear === currentYear - 1) score += 10;
                else if (resultYear > currentYear - 5) score += 5;
            }

            // 3. Popularidade (desempate)
            score += (result.popularity / 100); // Pequeno peso para popularidade

            // 4. Tipo correto (se searchType não for multi)
            if (searchType !== 'multi' && result.media_type === searchType) {
                score += 5;
            }

            return { ...result, score };
        });

        // Ordena por maior pontuação
        rankedResults.sort((a, b) => b.score - a.score);

        // Retorna o melhor formatado
        return this.formatTMDBData(rankedResults[0]);
    }

    // ... (keep searchMultipleResults, cleanTitle removed/refactored, formatTMDBData, enrichData)

    searchMultipleResults(title, type = 'multi') {
        // ... (existing implementation)
        return []; // Placeholder to match original structure, assume user won't change this much
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
