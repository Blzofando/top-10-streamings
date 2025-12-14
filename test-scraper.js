import { scraper } from './src/scrapers/flixpatrolScraper.js';

const testUrl = 'https://flixpatrol.com/top10/netflix/world/2025-12-14/';

console.log('🧪 Testando scraper do FlixPatrol...');
console.log(`📅 URL: ${testUrl}\n`);

try {
    const data = await scraper.scrapeTop10(testUrl);

    console.log('\n📊 Resultados:');
    console.log(`- ${data.movies.length} filmes encontrados`);
    console.log(`- ${data.tvShows.length} séries encontradas`);

    if (data.movies.length > 0) {
        console.log('\n🎬 Primeiros 3 filmes:');
        data.movies.slice(0, 3).forEach(movie => {
            console.log(`  ${movie.position}. ${movie.title} (popularidade: ${movie.popularity})`);
        });
    }

    if (data.tvShows.length > 0) {
        console.log('\n📺 Primeiras 3 séries:');
        data.tvShows.slice(0, 3).forEach(show => {
            console.log(`  ${show.position}. ${show.title} (popularidade: ${show.popularity})`);
        });
    }

    await scraper.close();
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);

} catch (error) {
    console.error('\n❌ Teste falhou:', error.message);
    await scraper.close();
    process.exit(1);
}
