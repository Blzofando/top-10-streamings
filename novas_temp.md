<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Radar de Retornos - Top 40</title>
    <!-- Importando Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Importando Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0f1014; /* Tom quase preto */
            color: #e2e8f0;
        }
        /* Cabeçalho com gradiente sutil */
        .glass-header {
            background: rgba(15, 16, 20, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        /* Cards */
        .movie-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .movie-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
            z-index: 10;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <!-- Cabeçalho -->
    <header class="glass-header fixed w-full top-0 z-50 p-4 shadow-2xl">
        <div class="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-tr from-rose-600 to-orange-500 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-rose-500/20">RT</div>
                <div>
                    <h1 class="text-xl font-bold text-white tracking-tight">Radar de Retornos</h1>
                    <p class="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Top 40 • Novas Temporadas</p>
                </div>
            </div>

            <div class="flex w-full md:w-auto gap-2">
                <input type="text" id="apiKeyInput" placeholder="Cole sua API Key aqui" 
                    class="w-full md:w-72 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-rose-500 transition-colors text-white placeholder-slate-600">
                <button onclick="startSearch()" 
                    class="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-rose-600/20 whitespace-nowrap text-white">
                    Carregar Top 40
                </button>
            </div>
        </div>
    </header>

    <!-- Conteúdo -->
    <main class="container mx-auto mt-36 px-4 pb-12 flex-grow">
        
        <!-- Feedback Visual -->
        <div id="statusMessage" class="hidden mb-10 text-center animate-fade-in">
            <div class="inline-block px-6 py-3 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-sm shadow-xl">
                <p></p>
            </div>
        </div>

        <!-- Grade -->
        <div id="resultsGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            <!-- Estado Vazio -->
            <div class="col-span-full flex flex-col items-center justify-center text-slate-600 py-32">
                <div class="relative w-24 h-24 mb-6">
                    <div class="absolute inset-0 bg-slate-800 rounded-full animate-pulse opacity-20"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                </div>
                <h2 class="text-xl font-semibold text-slate-400 mb-2">Próximas Temporadas</h2>
                <p class="text-sm text-slate-500 max-w-sm text-center leading-relaxed">
                    Localiza automaticamente as 40 <strong>Estreias de Temporada</strong> (Ep 1) mais aguardadas e as ordena por data.
                </p>
            </div>
        </div>
    </main>

    <!-- Modal Detalhes -->
    <div id="detailModal" class="fixed inset-0 z-[60] hidden bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="bg-[#1a1c23] rounded-2xl w-full max-w-2xl border border-slate-800 shadow-2xl overflow-hidden relative flex flex-col md:flex-row h-auto max-h-[85vh]">
            
            <button onclick="closeModal()" class="absolute top-3 right-3 p-2 bg-black/40 rounded-full text-white/70 hover:text-white hover:bg-black/60 transition z-20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>

            <!-- Poster (Esquerda no Desktop) -->
            <div class="hidden md:block w-1/3 relative">
                <img id="modalPoster" src="" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1c23]/90"></div>
            </div>

            <!-- Conteúdo -->
            <div class="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <span id="modalSeasonBadge" class="inline-block px-2 py-1 mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded">
                    Nova Temporada
                </span>
                
                <h3 id="modalTitle" class="text-3xl font-bold text-white mb-2 leading-tight"></h3>
                
                <div class="flex items-center gap-4 text-sm text-slate-400 mb-6">
                    <span id="modalDate" class="text-white font-medium"></span>
                    <span>•</span>
                    <span id="modalRating" class="flex items-center gap-1 text-yellow-500">★ 0.0</span>
                </div>

                <div class="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <h4 class="text-xs text-slate-500 uppercase font-bold mb-2">Sobre o Retorno</h4>
                    <p id="modalEpisodeInfo" class="text-white text-sm font-medium"></p>
                </div>
                
                <h4 class="text-xs text-slate-500 uppercase font-bold mb-2">Sinopse</h4>
                <p id="modalOverview" class="text-slate-300 text-sm leading-relaxed text-justify"></p>
            </div>
        </div>
    </div>

    <script>
        // --- Configuração da Busca ---
        const SEARCH_CONFIG = {
            region: "US|GB|CA",
            minVotes: 100, // Hype moderado
            minRating: 5,  // Qualidade mínima
            maxItemsLimit: 40 // Meta: Top 40 de uma vez
        };

        // --- Estado Global ---
        let currentApiKey = "";
        let isLoading = false;
        
        let apiPage = 1; // Página atual da API sendo lida
        let collectedSeries = []; // Lista de séries válidas encontradas
        let targetCount = SEARCH_CONFIG.maxItemsLimit; // Começa buscando o TOTAL

        // Elementos DOM
        const apiKeyInput = document.getElementById('apiKeyInput');
        const resultsGrid = document.getElementById('resultsGrid');
        const statusMessage = document.getElementById('statusMessage');
        
        // Modal Elementos
        const detailModal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDate = document.getElementById('modalDate');
        const modalOverview = document.getElementById('modalOverview');
        const modalPoster = document.getElementById('modalPoster');
        const modalSeasonBadge = document.getElementById('modalSeasonBadge');
        const modalEpisodeInfo = document.getElementById('modalEpisodeInfo');
        const modalRating = document.getElementById('modalRating');

        function updateStatus(msg, type = 'normal') {
            statusMessage.classList.remove('hidden');
            const p = statusMessage.querySelector('p');
            p.innerHTML = msg;
            p.className = type === 'error' ? 'text-red-400 font-bold' : 'text-slate-300';
        }

        // --- Início ---
        function startSearch() {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) { updateStatus('Insira uma API Key válida.', 'error'); return; }

            currentApiKey = apiKey;
            
            // Reseta Estado
            apiPage = 1;
            collectedSeries = [];
            targetCount = SEARCH_CONFIG.maxItemsLimit; // Define a meta para 40 imediatamente

            resultsGrid.innerHTML = '';
            
            fillList();
        }

        // --- Lógica Principal (Loop de Busca) ---
        async function fillList() {
            if (isLoading) return;
            isLoading = true;

            try {
                const today = new Date().toISOString().split('T')[0];
                let keepSearching = true;

                // Loop: Enquanto não tivermos itens suficientes na lista...
                while (collectedSeries.length < targetCount && keepSearching) {
                    
                    updateStatus(`Varrendo página <strong>${apiPage}</strong> da API em busca de estreias... <br><span class="text-xs text-slate-500">(Encontrados: ${collectedSeries.length} / Meta: ${targetCount})</span>`);

                    // 1. URL da Busca (Popularity Descending + Filtros)
                    let url = `https://api.themoviedb.org/3/discover/tv?api_key=${currentApiKey}`;
                    url += `&language=pt-BR&timezone=America/Sao_Paulo`;
                    url += `&page=${apiPage}`;
                    url += `&sort_by=popularity.desc`; 
                    url += `&air_date.gte=${today}`; // Garante que tem episódios futuros
                    url += `&with_origin_country=${SEARCH_CONFIG.region}`;
                    url += `&vote_count.gte=${SEARCH_CONFIG.minVotes}`;
                    url += `&vote_average.gte=${SEARCH_CONFIG.minRating}`;

                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Erro de conexão.");
                    const data = await response.json();

                    // Se a API não retornou nada ou chegamos numa página muito funda (ex: 150), paramos.
                    if (data.results.length === 0 || apiPage > 150) {
                        keepSearching = false;
                        if(collectedSeries.length === 0) updateStatus("Nenhuma nova temporada encontrada nas páginas principais.");
                        break;
                    }

                    // 2. Processamento Paralelo da página atual
                    const promises = data.results.map(async (show) => {
                        if (collectedSeries.find(s => s.id === show.id)) return null;
                        if (!show.poster_path || !show.overview) return null;

                        try {
                            const detailUrl = `https://api.themoviedb.org/3/tv/${show.id}?api_key=${currentApiKey}&language=pt-BR`;
                            const detailRes = await fetch(detailUrl);
                            const details = await detailRes.json();

                            if (!details.next_episode_to_air) return null;
                            const nextEp = details.next_episode_to_air;

                            // O FILTRO DE OURO: É o episódio 1?
                            if (nextEp.episode_number === 1) {
                                return {
                                    ...show,
                                    next_episode_data: nextEp,
                                    season_number: nextEp.season_number
                                };
                            }
                            return null;
                        } catch (e) { return null; }
                    });

                    // Espera todas as verificações dessa página terminarem
                    const pageValidShows = (await Promise.all(promises)).filter(s => s !== null);
                    
                    // Adiciona os válidos à nossa coleção global
                    collectedSeries = [...collectedSeries, ...pageValidShows];
                    
                    apiPage++;
                }

                // 3. Ordenação Final (Por Data: Mais Próximo -> Mais Distante)
                collectedSeries.sort((a, b) => {
                    return new Date(a.next_episode_data.air_date) - new Date(b.next_episode_data.air_date);
                });

                // Se passarmos do limite (por pegar muitos na ultima pagina), cortamos para 40
                if (collectedSeries.length > targetCount) {
                    collectedSeries = collectedSeries.slice(0, targetCount);
                }

                // 4. Renderiza
                renderGrid(collectedSeries);

                // 5. Feedback Final
                updateStatus(`Exibindo as <strong>${collectedSeries.length}</strong> temporadas mais aguardadas.`);

            } catch (error) {
                updateStatus(error.message, 'error');
            } finally {
                isLoading = false;
            }
        }

        function renderGrid(list) {
            resultsGrid.innerHTML = '';

            list.forEach(serie => {
                const epData = serie.next_episode_data;
                const posterUrl = `https://image.tmdb.org/t/p/w500${serie.poster_path}`;
                
                const [ano, mes, dia] = epData.air_date.split('-');
                const dateObj = new Date(ano, mes - 1, dia);
                const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                const dayOnly = dateObj.getDate();
                const monthOnly = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.','').toUpperCase();

                const card = document.createElement('div');
                card.className = 'movie-card bg-[#15161b] rounded-xl overflow-hidden relative group cursor-pointer border border-slate-800/50 flex flex-col';
                card.onclick = () => openModal(serie, epData, dateStr);

                card.innerHTML = `
                    <div class="aspect-[2/3] overflow-hidden relative">
                        <img src="${posterUrl}" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500">
                        
                        <!-- Badge de Data -->
                        <div class="absolute top-3 right-3 flex flex-col items-center bg-black/60 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden shadow-lg">
                            <span class="bg-rose-600 w-full text-center text-[10px] font-bold text-white px-2 py-0.5">ESTREIA</span>
                            <div class="px-3 py-1 text-center">
                                <span class="block text-xl font-bold text-white leading-none">${dayOnly}</span>
                                <span class="block text-[10px] font-bold text-slate-400 uppercase">${monthOnly}</span>
                            </div>
                        </div>

                        <!-- Badge Temporada -->
                        <div class="absolute bottom-3 left-3">
                            <span class="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg">
                                Temp ${epData.season_number}
                            </span>
                        </div>
                    </div>
                    
                    <div class="p-4 flex-grow flex flex-col justify-end bg-gradient-to-t from-[#0f1014] to-[#15161b]">
                        <h3 class="font-bold text-slate-200 text-sm leading-tight mb-1 group-hover:text-rose-400 transition-colors line-clamp-2">
                            ${serie.name}
                        </h3>
                        <p class="text-[10px] text-slate-500 font-medium">
                            Retorna em ${dateStr}
                        </p>
                    </div>
                `;
                resultsGrid.appendChild(card);
            });
        }

        // --- Modal ---
        function openModal(serie, epData, dateStr) {
            modalTitle.textContent = serie.name;
            modalDate.textContent = dateStr;
            modalOverview.textContent = serie.overview;
            modalPoster.src = `https://image.tmdb.org/t/p/w780${serie.poster_path}`;
            modalSeasonBadge.textContent = `Temporada ${epData.season_number}`;
            modalEpisodeInfo.textContent = `Episódio 1: "${epData.name || 'Estreia'}"`;
            modalRating.innerHTML = `★ ${serie.vote_average.toFixed(1)}`;
            
            detailModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            detailModal.classList.add('hidden');
            document.body.style.overflow = '';
        }

        detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    </script>
</body>
</html>