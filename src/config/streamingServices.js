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
    },
    apple: {
        name: 'Apple TV+',
        url: 'https://flixpatrol.com/top10/apple-tv/world/',
        urlPattern: (date) => `https://flixpatrol.com/top10/apple-tv/world/${date}/`
    }
};

/**
 * Retorna a data atual no formato YYYY-MM-DD
 * Lógica especial: Antes das 5h AM (horário Brasil) usa o dia ANTERIOR
 * Isso garante que sempre haverá dados completos no FlixPatrol
 */
export function getTodayDate() {
    // Pega hora atual no horário de São Paulo (Brazil - UTC-3)
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    // Se for antes das 5h da manhã, usa o dia anterior
    const hour = brazilTime.getHours();
    if (hour < 5) {
        brazilTime.setDate(brazilTime.getDate() - 1);
        console.log(`⏰ Antes das 5h AM (Brasil) - usando dia anterior: ${brazilTime.toISOString().split('T')[0]}`);
    }

    const year = brazilTime.getFullYear();
    const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
    const day = String(brazilTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
