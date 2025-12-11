import express from 'express';
import dotenv from 'dotenv';
import streamingRoutes from './routes/streamingRoutes.js';
import { scraper } from './scrapers/flixpatrolScraper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS simples
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Rota inicial
app.get('/', (req, res) => {
    res.json({
        message: '🎬 FlixPatrol API',
        version: '1.0.0',
        endpoints: {
            disney: '/api/disney',
            netflix: '/api/netflix',
            hbo: '/api/hbo',
            prime: '/api/prime',
            all: '/api/all'
        },
        params: {
            tmdb: 'Adicione ?tmdb=true para enriquecer com dados do TMDB'
        },
        cache: {
            stats: '/api/cache/stats',
            clear: 'DELETE /api/cache'
        }
    });
});

// Rotas da API
app.use('/api', streamingRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// Inicia o servidor
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ========================================');
    console.log(`🎬 FlixPatrol API rodando na porta ${PORT}`);
    console.log('🌐 http://localhost:' + PORT);
    console.log('========================================');
    console.log('');
    console.log('📡 Endpoints disponíveis:');
    console.log(`   GET  http://localhost:${PORT}/api/disney`);
    console.log(`   GET  http://localhost:${PORT}/api/netflix`);
    console.log(`   GET  http://localhost:${PORT}/api/hbo`);
    console.log(`   GET  http://localhost:${PORT}/api/prime`);
    console.log(`   GET  http://localhost:${PORT}/api/all`);
    console.log('');
    console.log('💡 Adicione ?tmdb=true para enriquecer com TMDB');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM recebido, encerrando...');
    await scraper.close();
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT recebido, encerrando...');
    await scraper.close();
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});
