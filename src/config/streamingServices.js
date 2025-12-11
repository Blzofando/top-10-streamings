/**
 * Configuração dos serviços de streaming suportados
 */
export const STREAMING_SERVICES = {
    disney: {
        name: 'Disney+',
        url: 'https://flixpatrol.com/top10/disney/world/',
        urlPattern: (date) => `https://flixpatrol.com/top10/disney/world/${date}/`
    },
    netflix: {
        name: 'Netflix',
        url: 'https://flixpatrol.com/top10/netflix/world/',
        urlPattern: (date) => `https://flixpatrol.com/top10/netflix/world/${date}/`
    },
    hbo: {
        name: 'HBO Max',
        url: 'https://flixpatrol.com/top10/hbo-max/world/',
        urlPattern: (date) => `https://flixpatrol.com/top10/hbo-max/world/${date}/`
    },
    prime: {
        name: 'Amazon Prime',
        url: 'https://flixpatrol.com/top10/amazon-prime/world/',
        urlPattern: (date) => `https://flixpatrol.com/top10/amazon-prime/world/${date}/`
    }
};

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
