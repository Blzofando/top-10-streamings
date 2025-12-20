


<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ultimate Hype Radar - Novas Séries</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
    <style>
        body { font-family: 'Outfit', sans-serif; background-color: #050505; color: #e2e8f0; }
        .glass-nav { background: rgba(5, 5, 5, 0.8); backdrop-filter: blur(15px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        
        /* Card Styles */
        .poster-card { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .poster-card:hover { transform: scale(1.05) translateY(-5px); z-index: 20; }
        .poster-shadow { box-shadow: 0 10px 40px -10px rgba(0,0,0,0.8); }
        
        /* Loader */
        .loader-bar { width: 100%; height: 3px; background: linear-gradient(90deg, #D4145A, #FF3D71, #D4145A); background-size: 200% 100%; animation: gradientMove 1.5s linear infinite; }
        @keyframes gradientMove { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <!-- Navbar -->
    <nav class="fixed w-full z-50 glass-nav h-16">
        <div class="container mx-auto px-4 h-full flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i class="fa-solid fa-fire text-[#FF3D71] text-2xl animate-pulse"></i>
                <h1 class="text-xl font-bold tracking-tight text-white">Hype<span class="text-[#FF3D71]">Radar</span></h1>
            </div>

            <!-- Indicador Fixo -->
            <div class="hidden md:block">
                <span class="bg-[#D4145A]/10 text-[#FF3D71] border border-[#D4145A]/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                    Apenas Novas Séries
                </span>
            </div>

            <div class="flex items-center gap-4">
                <div class="flex items-center bg-[#1a1a1a] rounded-full px-4 py-1.5 border border-white/5">
                    <i class="fa-solid fa-key text-slate-500 text-xs mr-2"></i>
                    <input type="password" id="apiKeyInput" placeholder="API Key" class="bg-transparent border-none text-xs text-white focus:outline-none w-24">
                    <button onclick="saveKey()" class="ml-2 text-[#FF3D71] hover:text-white transition-colors"><i class="fa-solid fa-check"></i></button>
                </div>
            </div>
        </div>
    </nav>
    <div id="loader" class="fixed top-16 z-50 loader-bar hidden"></div>

    <!-- Main Content -->
    <main class="container mx-auto mt-24 px-4 pb-20 flex-grow">
        
        <!-- Welcome / Empty State -->
        <div id="welcomeState" class="hidden flex flex-col items-center justify-center py-20 min-h-[60vh]">
            <h2 class="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500 mb-6 text-center">
                Top 20 Estreias
            </h2>
            <p class="text-slate-400 text-center max-w-lg mb-8 text-lg">
                As 20 novas séries (Temp 1) mais aguardadas do mundo.
                <br><span class="text-xs text-[#FF3D71] font-bold uppercase mt-2 block">Filtro: Sem Animes (Exceto Títulos PT-BR)</span>
            </p>
            <button onclick="initDiscovery()" class="bg-[#D4145A] hover:bg-[#b00f47] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-[#D4145A]/30 flex items-center gap-2">
                <i class="fa-solid fa-radar"></i> Buscar Novas Séries
            </button>
            <p id="keyMissingMsg" class="text-red-500 mt-4 text-sm hidden">Insira sua API Key no topo primeiro!</p>
        </div>

        <!-- Grid -->
        <div id="contentGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 md:gap-8">
            <!-- Items injected here -->
        </div>

    </main>

    <!-- Modal Detalhes -->
    <div id="detailModal" class="fixed inset-0 z-[60] hidden bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="bg-[#0a0a0a] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            <div class="w-full md:w-2/5 h-64 md:h-auto relative">
                <img id="modalPoster" src="" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/50 to-transparent"></div>
                <button onclick="closeModal()" class="absolute top-4 left-4 md:hidden bg-black/50 p-2 rounded-full text-white"><i class="fa-solid fa-arrow-left"></i></button>
            </div>

            <div class="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar relative">
                <button onclick="closeModal()" class="hidden md:block absolute top-6 right-6 text-slate-500 hover:text-white"><i class="fa-solid fa-xmark text-2xl"></i></button>
                
                <span class="text-[#FF3D71] font-bold tracking-widest uppercase text-xs mb-2 block">Nova Série Original</span>
                <h2 id="modalTitle" class="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">Title</h2>
                
                <div class="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-8">
                    <span id="modalDate" class="bg-white/10 px-3 py-1 rounded text-white font-medium">Data</span>
                    <span id="modalOrigin" class="flex items-center gap-1"><i class="fa-solid fa-globe"></i> US</span>
                    <span id="modalPop" class="text-[#FF3D71] font-bold"><i class="fa-solid fa-fire"></i> 95% Hype</span>
                </div>

                <p id="modalOverview" class="text-slate-300 text-lg leading-relaxed mb-8 font-light">
                    Sinopse...
                </p>

                <div class="border-t border-white/10 pt-6">
                    <p class="text-xs text-slate-500 uppercase font-bold mb-3">Informações Adicionais</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="block text-slate-600 text-xs">Gênero Principal</span>
                            <span id="modalGenre" class="text-slate-300 text-sm">Drama</span>
                        </div>
                        <div>
                            <span class="block text-slate-600 text-xs">Título Original</span>
                            <span id="modalOriginalTitle" class="text-slate-300 text-sm">Title</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // --- Configuração ---
        let currentKey = localStorage.getItem('tmdb_key_v3') || '';
        let isLoading = false;
        
        // IDs de Gêneros para excluir (Reality, Talk, News, Soap Opera)
        const EXCLUDED_GENRES = "10763,10764,10767,10766"; 

        // DOM Elements
        const grid = document.getElementById('contentGrid');
        const loader = document.getElementById('loader');
        const welcome = document.getElementById('welcomeState');

        // --- Init ---
        if(currentKey) {
            document.getElementById('apiKeyInput').value = currentKey;
            initDiscovery();
        } else {
            welcome.classList.remove('hidden');
        }

        function saveKey() {
            const val = document.getElementById('apiKeyInput').value.trim();
            if(val) {
                currentKey = val;
                localStorage.setItem('tmdb_key_v3', val);
                document.getElementById('keyMissingMsg').classList.add('hidden');
                if(grid.children.length === 0) initDiscovery();
            }
        }

        async function initDiscovery() {
            if(!currentKey) {
                document.getElementById('keyMissingMsg').classList.remove('hidden');
                return;
            }
            welcome.classList.add('hidden');
            grid.innerHTML = '';
            fetchData();
        }

        async function fetchData() {
            if(isLoading) return;
            isLoading = true;
            loader.classList.remove('hidden');
            grid.innerHTML = ''; 

            try {
                const today = new Date().toISOString().split('T')[0];
                let resultsAccumulated = [];
                
                // Busca 8 páginas (160 itens) para garantir sobra após filtragem
                const pagesToFetch = [1, 2, 3, 4, 5, 6, 7, 8];
                
                const promises = pagesToFetch.map(p => {
                    let url = `https://api.themoviedb.org/3/discover/tv?api_key=${currentKey}&language=pt-BR&timezone=America/Sao_Paulo&page=${p}`;
                    
                    // Filtros Globais
                    url += `&sort_by=popularity.desc`; // HYPE REAL
                    url += `&without_genres=${EXCLUDED_GENRES}`; // SEM LIXO
                    url += `&include_null_first_air_dates=false`;
                    
                    // Apenas NOVAS SÉRIES (Data futura)
                    url += `&first_air_date.gte=${today}`;
                    
                    return fetch(url).then(res => res.json());
                });

                const responses = await Promise.all(promises);
                
                responses.forEach(data => {
                    if(data.results) resultsAccumulated.push(...data.results);
                });

                // --- FILTRAGEM AVANÇADA (Client Side) ---
                const finalTop20 = processResults(resultsAccumulated);

                if (finalTop20.length === 0) {
                    grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-20">Nenhuma estreia encontrada com esses filtros nas próximas datas.</div>';
                } else {
                    renderCards(finalTop20);
                }

            } catch (error) {
                console.error(error);
                alert("Erro ao buscar dados. Verifique a API Key.");
            } finally {
                isLoading = false;
                loader.classList.add('hidden');
            }
        }

        function processResults(list) {
            // 1. Filtragem Básica (Sinopse e Poster)
            let cleanList = list.filter(item => 
                item.poster_path && 
                item.overview && 
                item.overview.length > 10
            );

            // 2. Deduplicação
            const seen = new Set();
            cleanList = cleanList.filter(item => {
                const duplicate = seen.has(item.id);
                seen.add(item.id);
                return !duplicate;
            });

            // 3. Filtro de Anime PT-BR
            cleanList = cleanList.filter(item => {
                // Se for Japonês, aplica a regra estrita de título
                if (item.original_language === 'ja') {
                    const title = item.name.toLowerCase();
                    
                    // Regex para detectar palavras/caracteres portugueses
                    const hasPortugueseChars = /[áàâãéèêíïóôõöúçñ]/.test(title);
                    const hasPortugueseConnectors = /\b(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|na|no|nas|nos|com|por|para|e)\b/i.test(title);
                    
                    if (hasPortugueseChars || hasPortugueseConnectors) {
                        return true; // É anime, mas tem título PT-BR
                    }
                    return false; // É anime com título gringo/romaji -> Lixo
                }
                return true; // Não é japonês -> Passa
            });

            // 4. Corte Final: Apenas Top 20
            return cleanList.slice(0, 20);
        }

        function renderCards(list) {
            list.forEach((show, index) => {
                const poster = `https://image.tmdb.org/t/p/w500${show.poster_path}`;
                
                const dateObj = new Date(show.first_air_date);
                const dateFmt = isNaN(dateObj) ? 'Em Breve' : dateObj.toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year: 'numeric'});
                
                const card = document.createElement('div');
                card.className = 'poster-card relative group cursor-pointer';
                card.dataset.id = show.id;
                card.onclick = () => openModal(show);

                card.innerHTML = `
                    <div class="aspect-[2/3] rounded-xl overflow-hidden relative poster-shadow bg-[#1a1a1a]">
                        <img src="${poster}" class="w-full h-full object-cover">
                        
                        <!-- Rank Number (1-20) -->
                        <div class="absolute top-0 left-0 p-2 z-10">
                             <div class="text-4xl font-extrabold text-white/20 drop-shadow-md">#${index + 1}</div>
                        </div>

                        <!-- Overlay Darken -->
                        <div class="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all"></div>

                        <!-- Top Right Badge (Hype Score) -->
                        <div class="absolute top-0 right-0 p-2">
                            <div class="bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                                <i class="fa-solid fa-fire text-[#FF3D71]"></i> ${Math.round(show.popularity)}
                            </div>
                        </div>

                        <!-- Bottom Info -->
                        <div class="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <p class="text-white font-bold leading-tight line-clamp-2 mb-1">${show.name}</p>
                            <p class="text-xs text-[#FF3D71] font-bold uppercase tracking-wider">${dateFmt}</p>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // --- Modal ---
        function openModal(show) {
            const modal = document.getElementById('detailModal');
            
            document.getElementById('modalPoster').src = `https://image.tmdb.org/t/p/original${show.backdrop_path || show.poster_path}`;
            document.getElementById('modalTitle').textContent = show.name;
            document.getElementById('modalOriginalTitle').textContent = show.original_name;
            document.getElementById('modalOverview').textContent = show.overview;
            
            const dateObj = new Date(show.first_air_date || Date.now());
            const dateFmt = isNaN(dateObj) ? 'TBA' : dateObj.toLocaleDateString('pt-BR');
            document.getElementById('modalDate').textContent = `Estreia: ${dateFmt}`;
            
            document.getElementById('modalOrigin').innerHTML = `<i class="fa-solid fa-globe"></i> ${(show.origin_country && show.origin_country[0]) || 'N/A'}`;
            document.getElementById('modalPop').innerHTML = `<i class="fa-solid fa-fire"></i> ${Math.round(show.popularity)} Pop`;
            
            document.getElementById('modalGenre').textContent = "Série de TV"; 

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            document.getElementById('detailModal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        // Close on click outside
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if(e.target === document.getElementById('detailModal')) closeModal();
        });
        
    </script>
</body>
</html>