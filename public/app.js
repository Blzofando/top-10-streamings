const API_URL = '/api';

// Estado global
const state = {
    disney: null,
    netflix: null,
    hbo: null,
    prime: null
};

/**
 * Função de LOG
 */
function log(message, type = 'info') {
    const logsContent = document.getElementById('logs-content');
    const time = new Date().toLocaleTimeString();

    // Formata mensagem se for objeto
    if (typeof message === 'object') {
        message = JSON.stringify(message);
    }

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;

    logsContent.appendChild(entry);
    logsContent.scrollTop = logsContent.scrollHeight;
}

/**
 * Carrega TODOS os streamings
 */
async function loadAll(enrich = false) {
    const services = ['disney', 'netflix', 'hbo', 'prime'];
    log(`🚀 Iniciando busca global ${enrich ? '(com Match)' : '(Simples)'}...`, 'success');

    // Mostra loading em todos
    services.forEach(s => {
        document.getElementById(`${s}-content`).innerHTML =
            '<div class="loading">⏳ Aguardando...</div>';
    });

    // Se for enrich, faz um por um para não sobrecarregar
    if (enrich) {
        for (const service of services) {
            await loadWithTMDB(service);
        }
    } else {
        // Paralelo se for simples
        await Promise.all(services.map(s => loadStreaming(s)));
    }

    log(`✅ Busca global concluída!`, 'success');
}

/**
 * Carrega dados de um streaming (ETAPA 1 - sem TMDB)
 */
async function loadStreaming(service) {
    const contentDiv = document.getElementById(`${service}-content`);

    try {
        contentDiv.innerHTML = '<div class="loading">⏳ Carregando dados...</div>';
        log(`📡 [${service}] Buscando dados do FlixPatrol...`, 'extract');

        const response = await fetch(`${API_URL}/${service}`);

        if (!response.ok) {
            throw new Error(`Erro ao carregar: ${response.status}`);
        }

        const data = await response.json();
        state[service] = data;

        // Log dos itens extraídos
        data.overall.forEach(item => {
            log(`📥 [${service}] Extraído #${item.position}: ${item.title} (Pop: ${item.popularity}) | Link: ${item.link}`, 'extract');
        });

        renderList(service, data);
        log(`✅ [${service}] Dados carregados com sucesso!`, 'success');

    } catch (error) {
        contentDiv.innerHTML = `<div class="error">❌ ${error.message}</div>`;
        log(`❌ [${service}] Erro: ${error.message}`, 'error');
    }
}

/**
 * Renderiza lista simples (ETAPA 1)
 */
function renderList(service, data) {
    const contentDiv = document.getElementById(`${service}-content`);

    let html = '<ul class="top10-list">';

    data.overall.forEach(item => {
        const typeBadge = item.type === 'movie' ?
            '<span class="type-badge movie">Filme</span>' :
            '<span class="type-badge tv">Série</span>';

        html += `
            <li class="top10-item">
                <div class="rank">#${item.position}</div>
                <div class="title-info">
                    <div class="title">
                        ${item.title}
                        ${typeBadge}
                    </div>
                </div>
                <div class="popularity">${item.popularity}</div>
            </li>
        `;
    });

    html += '</ul>';
    html += `<button class="tmdb-btn" onclick="loadWithTMDB('${service}')">
                🎬 Buscar Capas (TMDB)
             </button>`;

    contentDiv.innerHTML = html;
}

/**
 * Carrega dados com TMDB e abre carrossel (ETAPA 2)
 */
async function loadWithTMDB(service) {
    try {
        log(`🎬 [${service}] Iniciando Match com TMDB...`, 'match');

        // Se já foi chamado via clique no modal
        const modal = document.getElementById('carousel-modal');
        const modalTitle = document.getElementById('modal-title');
        const carousel = document.getElementById('carousel');

        // Só abre modal se não estiver rodando em batch (ou seja, se clicado pelo usuário)
        // Mas como reutilizamos a função, sempre atualizamos o modal se estiver visível
        if (modal.style.display !== 'block') {
            // Se for clique manual, abre o modal
            // Se for loop do loadAll(true), talvez queiramos abrir apenas no final ou atualizar a lista
            // Para simplificar, vamos atualizar a lista na tela principal e abrir modal só se clicado
        }

        // Atualiza UI para loading
        const contentDiv = document.getElementById(`${service}-content`);
        contentDiv.innerHTML = '<div class="loading">⏳ Buscando Match TMDB...</div>';

        // Busca dados com TMDB
        const response = await fetch(`${API_URL}/${service}?tmdb=true`);

        if (!response.ok) {
            throw new Error(`Erro ao carregar TMDB: ${response.status}`);
        }

        const data = await response.json();
        state[service] = data;

        // Log dos Matches
        data.overall.forEach(item => {
            if (item.tmdb) {
                log(`🎯 [TMDB] Match: "${item.title}" -> ID: ${item.tmdb.tmdb_id} (${item.tmdb.title})`, 'match');
            } else {
                log(`⚠️ [TMDB] Falha no Match: "${item.title}"`, 'error');
            }
        });

        // Agora exibimos o CARROSSEL diretamente no card (mini-versão) ou botão para ampliar
        // O usuário pediu "a lista final... botão ao lado... após etapa mostra carrossel"
        // Vamos mostrar o carrossel no card da tela principal para ficar mais visual

        renderMiniCarousel(service, data);

        log(`✅ [${service}] Enriquecimento concluído!`, 'success');

    } catch (error) {
        log(`❌ [${service}] Erro TMDB: ${error.message}`, 'error');
        const contentDiv = document.getElementById(`${service}-content`);
        contentDiv.innerHTML = `<div class="error">❌ ${error.message}</div>`;
    }
}

/**
 * Renderiza mini carrossel no card principal
 */
function renderMiniCarousel(service, data) {
    const contentDiv = document.getElementById(`${service}-content`);

    let html = '<div class="carousel" style="max-height: 500px;">';

    data.overall.forEach(item => {
        const poster = item.tmdb?.poster_path || null;
        const title = item.title;
        const tmdbId = item.tmdb?.tmdb_id || null;

        html += `
            <div class="carousel-item" ${tmdbId ? `onclick="openTMDB(${tmdbId}, '${item.type}')"` : ''}>
                <div class="carousel-position">#${item.position}</div>
                ${poster ?
                `<img src="${poster}" alt="${title}" class="poster" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="no-poster" style="display:none;">🎬</div>` :
                `<div class="no-poster">🎬</div>`
            }
                <div class="carousel-title">${title}</div>
            </div>
        `;
    });

    html += '</div>';
    // Botão para voltar
    html += `<button class="load-btn" style="margin-top:10px" onclick="loadStreaming('${service}')">🔄 Recarregar Lista</button>`;

    contentDiv.innerHTML = html;
}


/**
 * Fecha o modal
 */
function closeModal() {
    const modal = document.getElementById('carousel-modal');
    modal.style.display = 'none';
}

/**
 * Abre página do TMDB
 */
function openTMDB(tmdbId, type) {
    const url = `https://www.themoviedb.org/${type}/${tmdbId}`;
    window.open(url, '_blank');
}

// Fecha modal ao clicar fora
window.onclick = function (event) {
    const modal = document.getElementById('carousel-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Fecha modal com ESC
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

/**
 * Limpa o cache do servidor
 */
async function clearCache() {
    if (!confirm('Tem certeza que deseja limpar todo o cache? Isso fará as próximas buscas serem mais lentas.')) {
        return;
    }

    try {
        log('🗑️ Limpando cache...', 'info');
        const response = await fetch(`${API_URL}/cache`, { method: 'DELETE' });
        const data = await response.json();

        log(`✅ ${data.message}`, 'success');
        alert('Cache limpo com sucesso!');
        state.disney = null;
        state.netflix = null;
        state.hbo = null;
        state.prime = null;

        // Limpa UI
        const services = ['disney', 'netflix', 'hbo', 'prime'];
        services.forEach(s => {
            document.getElementById(`${s}-content`).innerHTML = '';
        });

    } catch (error) {
        log(`❌ Erro ao limpar cache: ${error.message}`, 'error');
        alert('Erro ao limpar cache.');
    }
}
