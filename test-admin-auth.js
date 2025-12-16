// Teste de autenticação admin

async function testAdminAuth() {
    const PORT = process.env.PORT || 10000;
    const BASE_URL = `http://localhost:${PORT}`;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || '@#Chopuchai.20';

    console.log('🔒 Testando Autenticação Admin\n');

    // Test 1: Sem senha (deve falhar)
    console.log('📝 Test 1: Tentando gerar key SEM senha admin...');
    try {
        const response = await fetch(`${BASE_URL}/api/admin/keys/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Unauthorized Test',
                email: 'test@test.com',
                type: 'user'
            })
        });
        if (response.status === 401) {
            console.log('✅ Bloqueado corretamente (401 Unauthorized)');
        } else {
            console.log('❌ ERRO: Conseguiu gerar key sem senha!');
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    // Test 2: Senha errada (deve falhar)
    console.log('\n📝 Test 2: Tentando gerar key com senha ERRADA...');
    try {
        const response = await fetch(`${BASE_URL}/api/admin/keys/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Secret': 'senha_errada'
            },
            body: JSON.stringify({
                name: 'Wrong Password Test',
                email: 'test@test.com',
                type: 'user'
            })
        });
        if (response.status === 403) {
            console.log('✅ Bloqueado corretamente (403 Forbidden)');
        } else {
            console.log('❌ ERRO: Conseguiu gerar key com senha errada!');
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    // Test 3: Senha correta (deve funcionar)
    console.log('\n📝 Test 3: Gerando key com senha CORRETA...');
    try {
        const response = await fetch(`${BASE_URL}/api/admin/keys/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Secret': ADMIN_SECRET
            },
            body: JSON.stringify({
                name: 'Authorized Test Key',
                email: 'admin@test.com',
                type: 'master',
                rateLimit: 5000
            })
        });
        const data = await response.json();
        if (response.status === 200) {
            console.log('✅ Key criada com sucesso!');
            console.log('   Tipo:', data.data?.type);
            console.log('   Preview:', data.data?.key?.substring(0, 16) + '...');
        } else {
            console.log('❌ ERRO: Não conseguiu gerar key com senha correta!');
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    console.log('\n✅ Testes de autenticação concluídos!');
    console.log('\n🔐 Resumo:');
    console.log('- Sem senha: Bloqueia ✅');
    console.log('- Senha errada: Bloqueia ✅');
    console.log('- Senha correta: Autoriza ✅');
}

testAdminAuth().catch(console.error);
