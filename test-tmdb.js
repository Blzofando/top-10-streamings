import { tmdbService } from './src/services/tmdbService.js';

async function testar() {
    console.log("=== TESTE 1: That Night (2025) ===");
    const thatNight = await tmdbService.searchTitle('That Night (2025)', 'tv');
    console.log(thatNight);
    
    console.log("\n=== TESTE 2: ONE PIECE: A Série - Conteúdo Extra ===");
    const onePiece = await tmdbService.searchTitle('ONE PIECE: A Série - Conteúdo Extra', 'tv');
    console.log(onePiece);
    
    console.log("\n=== TESTE 3: ONE PIECE: A Série ===");
    const onePieceNormal = await tmdbService.searchTitle('ONE PIECE: A Série', 'tv');
    console.log(onePieceNormal);
}

testar();
