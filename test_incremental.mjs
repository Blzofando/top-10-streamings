import dotenv from 'dotenv';
dotenv.config();

async function testIncremental() {
    const { initializeFirebase, firebaseService } = await import('./src/services/firebaseService.js');
    firebaseService.initialize();

    const { imdbCalendarScraper } = await import('./src/scrapers/imdbCalendarScraper.js');
    const { calendarFirebaseService } = await import('./src/services/calendarService.js');

    console.log("== Lógica Incremental Test ==");
    
    // 1. Simular uma base existente
    const existingReleases = await calendarFirebaseService.getRawMovieCalendar();
    console.log(`[TEST] Base atual tem ${existingReleases?.length || 0} filmes.`);
    
    // 2. Rodar scraper passando a base
    const releases = await imdbCalendarScraper.scrapeMovieCalendar(existingReleases);
    
    console.log(`[TEST] Resultado final gerado tem ${releases.length} filmes.`);
    console.log("Validação: O número de novos filmes enriquecidos pelo TMDB deve ser muito menor que o total extraído caso a base já existisse, poupando a API e o Firebase de re-gravar tudo sem necessidade.");
}

testIncremental().catch(console.error);
