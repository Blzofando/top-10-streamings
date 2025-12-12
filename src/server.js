import express from 'express';
import dotenv from 'dotenv';
import streamingRoutes from './routes/streamingRoutes.js';
import top10Routes from './routes/top10Routes.js';
import firebaseRoutes from './routes/firebaseRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
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
        message: '🎬 FlixPatrol API com Firebase',
        version: '2.0.0',
        endpoints: {
            top10: {
                netflix: '/api/top-10/netflix',
                disney: '/api/top-10/disney',
                hbo: '/api/top-10/hbo',
                prime: '/api/top-10/prime',
                all: '/api/top-10/all'
            },
            firebase: {
                history: '/api/firebase/history/:service/:type/:date',
                latest: '/api/firebase/latest/:service/:type',
                dates: '/api/firebase/dates/:service/:type'
            },
            cron: {
                updateExpired: '/api/cron/update-expired',
                health: '/api/cron/health'
            },
            legacy: {
                note: 'Rotas antigas ainda funcionam para compatibilidade',
                examples: ['/api/netflix', '/api/disney', '/api/hbo', '/api/prime']
            }
        },
        params: {
            tmdb: 'Adicione ?tmdb=true para enriquecer com dados do TMDB em PT-BR',
            save: 'Por padrão salva no Firebase. Use ?save=false para desabilitar'
        },
        cache: {
            stats: '/api/cache/stats',
            clear: 'DELETE /api/cache'
        }
    });
});

// Novas rotas (top-10 pattern)
app.use('/api/top-10', top10Routes);
app.use('/api/firebase', firebaseRoutes);
app.use('/api/cron', cronRoutes);

// Rotas antigas (backward compatibility)
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
    console.log(`🎬 FlixPatrol API + Firebase na porta ${PORT}`);
    console.log('🌐 http://localhost:' + PORT);
    console.log('========================================');
    console.log('');
    console.log('📡 Endpoints disponíveis:');
    console.log('');
    console.log('  🔥 Novos (com Firebase):');
    console.log(`   GET  http://localhost:${PORT}/api/top-10/netflix`);
    console.log(`   GET  http://localhost:${PORT}/api/top-10/disney`);
    console.log(`   GET  http://localhost:${PORT}/api/top-10/hbo`);
    console.log(`   GET  http://localhost:${PORT}/api/top-10/prime`);
    console.log(`   GET  http://localhost:${PORT}/api/top-10/all`);
    console.log('');
    console.log('  📚 Histórico Firebase:');
    console.log(`   GET  http://localhost:${PORT}/api/firebase/latest/:service/:type`);
    console.log(`   GET  http://localhost:${PORT}/api/firebase/history/:service/:type/:date`);
    console.log(`   GET  http://localhost:${PORT}/api/firebase/dates/:service/:type`);
    console.log('');
    console.log('💡 Adicione ?tmdb=true para enriquecer com TMDB (PT-BR)');
    console.log('💾 Por padrão salva no Firebase (use ?save=false para desabilitar)');
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
