// Teste de sistema de Master/User API Keys

async function testApiKeySystem() {
    const PORT = process.env.PORT || 10000;
    const BASE_URL = `http://localhost:${PORT}`;

    console.log('🧪 Testando Sistema de API Keys (Master/User)\n');

    // Test 1: Criar Master Key
    console.log('📝 Test 1: Criando Master Key...');
    try {
        const masterResponse = await fetch(`${BASE_URL}/api/admin/keys/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Master Key',
                email: 'admin@test.com',
                type: 'master',
                rateLimit: 5000
            })
        });
        const masterData = await masterResponse.json();
        console.log('✅ Master Key criada:', {
            key: masterData.data?.key?.substring(0, 16) + '...',
            type: masterData.data?.type,
            rateLimit: masterData.data?.rateLimit
        });
        global.masterKey = masterData.data?.key;
    } catch (error) {
        console.error('❌ Erro ao criar Master Key:', error.message);
    }

    // Test 2: Criar User Key
    console.log('\n📝 Test 2: Criando User Key...');
    try {
        const userResponse = await fetch(`${BASE_URL}/api/admin/keys/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User Key',
                email: 'user@test.com',
                type: 'user',
                rateLimit: 1000
            })
        });
        const userData = await userResponse.json();
        console.log('✅ User Key criada:', {
            key: userData.data?.key?.substring(0, 16) + '...',
            type: userData.data?.type,
            rateLimit: userData.data?.rateLimit
        });
        global.userKey = userData.data?.key;
    } catch (error) {
        console.error('❌ Erro ao criar User Key:', error.message);
    }

    // Test 3: User Key tentando scraping (deve falhar)
    console.log('\n📝 Test 3: User Key tentando scraping (deve falhar 403)...');
    try {
        const response = await fetch(`${BASE_URL}/api/cron/update-expired`, {
            headers: { 'X-API-Key': global.userKey }
        });
        if (response.status === 403) {
            console.log('✅ User Key bloqueada corretamente (403 Forbidden)');
        } else {
            console.log('❌ ERRO: User Key conseguiu acessar endpoint master!');
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    // Test 4: Master Key acessando cron (deve funcionar)
    console.log('\n📝 Test 4: Master Key acessando cron (deve funcionar)...');
    try {
        const response = await fetch(`${BASE_URL}/api/cron/health`, {
            headers: { 'X-API-Key': global.masterKey }
        });
        const data = await response.json();
        if (response.status === 200) {
            console.log('✅ Master Key autorizada corretamente:', data.message);
        } else {
            console.log('❌ ERRO: Master Key bloqueada!');
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    // Test 5: Ambas keys devem acessar Firebase
    console.log('\n📝 Test 5: Ambas keys acessando Firebase...');
    try {
        const userResponse = await fetch(`${BASE_URL}/api/quick/netflix/overall`, {
            headers: { 'X-API-Key': global.userKey }
        });
        const masterResponse = await fetch(`${BASE_URL}/api/quick/netflix/overall`, {
            headers: { 'X-API-Key': global.masterKey }
        });

        if (userResponse.status === 200 && masterResponse.status === 200) {
            console.log('✅ Ambas as keys podem acessar Firebase (read-only)');
        } else {
            console.log('❌ ERRO: Alguma key foi bloqueada do Firebase');
        }
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }

    console.log('\n✅ Testes concluídos!');
    console.log('\n📋 Resumo das keys geradas:');
    console.log(`Master Key: ${global.masterKey?.substring(0, 20)}...`);
    console.log(`User Key: ${global.userKey?.substring(0, 20)}...`);
}

testApiKeySystem().catch(console.error);
