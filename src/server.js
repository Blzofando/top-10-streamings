import express from 'express';
import dotenv from 'dotenv';
import top10Routes from './routes/top10Routes.js';
import firebaseRoutes from './routes/firebaseRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import quickRoutes from './routes/quickRoutes.js';
import { validateApiKey, validateMasterKey } from './middleware/apiKeyMiddleware.js';
import { adminAuth } from './middleware/adminAuth.js';
import { scraper } from './scrapers/flixpatrolScraper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Rota inicial - serve landing page
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

// API Info em /api (JSON)
app.get('/api', (req, res) => {
    res.json({
        message: '🎬 FlixPatrol API com Firebase + Auth',
        version: '2.2.0',
        authentication: {
            required: true,
            header: 'X-API-Key',
            example: 'X-API-Key: sua_chave_aqui',
            getKey: 'POST /api/admin/keys/generate (admin only)',
            types: {
                user: 'Somente leitura (Firebase)',
                master: 'Acesso total (scraping + cron + Firebase)'
            }
        },
        endpoints: {
            top10: {
                note: 'REQUER MASTER KEY',
                netflix: '/api/top-10/netflix',
                disney: '/api/top-10/disney',
                hbo: '/api/top-10/hbo',
                prime: '/api/top-10/prime',
                all: '/api/top-10/all'
            },
            firebase: {
                note: 'User key ou Master key',
                history: '/api/firebase/history/:service/:type/:date',
                latest: '/api/firebase/latest/:service/:type',
                dates: '/api/firebase/dates/:service/:type'
            },
            cron: {
                note: 'REQUER MASTER KEY',
                updateExpired: '/api/cron/update-expired',
                health: '/api/cron/health'
            },
            admin: {
                note: 'Endpoints administrativos - acesso restrito',
                generateKey: 'POST /api/admin/keys/generate',
                listKeys: 'GET /api/admin/keys/list',
                stats: 'GET /api/admin/keys/stats',
                revokeKey: 'DELETE /api/admin/keys/:keyId'
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

// Admin routes - PROTEGIDO com senha administrativa
app.use('/api/admin', adminAuth, adminRoutes);

// Rotas protegidas por MASTER key (scraping e cron)
app.use('/api/top-10', validateMasterKey, top10Routes);
app.use('/api/cron', validateMasterKey, cronRoutes);

// Rotas protegidas por API key (user ou master - somente leitura)
app.use('/api/firebase', validateApiKey, firebaseRoutes);
app.use('/api/quick', validateApiKey, quickRoutes);  // Endpoints rápidos (só Firebase)

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
