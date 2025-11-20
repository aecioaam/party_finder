// Lista completa dos mundos do Tibia
const worlds = [
    "Aethera", "Antica", "Astera", "Belobra", "Blumera", "Bona", "Bravoria", 
    "Calmera", "Cantabra", "Celebra", "Celesta", "Citra", "Collabra", "Descubra", 
    "Dia", "Dracobra", "Eclipta", "Epoca", "Escura", "Etebra", "Ferobra", 
    "Firmera", "Gentebra", "Gladera", "Gladibra", "Harmonia", "Havera", "Honbra", 
    "Hostera", "Idyllia", "Ignitera", "Inabra", "Issobra", "Jadebra", "Kalanta", 
    "Kalibra", "Kalimera", "Karmeya", "Lobera", "Luminera", "Lutabra", "Luzibra", 
    "Menera", "Monstera", "Monza", "Mystera", "Nefera", "Nevia", "Noctalia", 
    "Oceanis", "Ombra", "Ourobra", "Pacera", "Peloria", "Penumbra", "Premia", 
    "Quelibra", "Quidera", "Quintera", "Rasteibra", "Refugia", "Retalia", "Secura", 
    "Serdebra", "Solidera", "Sombra", "Sonira", "Stralis", "Talera", "Tempestera", 
    "Terribra", "Thyria", "Tornabra", "Unebra", "Ustebra", "Venebra", "Victoris", 
    "Vunira", "Wintera", "Xybra", "Xyla", "Xymera", "Yonabra", "Yovera", "Yubra", 
    "Zuna", "Zunera"
];

// Mapeamento de classes para agrupar variações
const classMapping = {
    "knight": ["knight", "elite knight"],
    "druid": ["druid", "elder druid"],
    "sorcerer": ["sorcerer", "master sorcerer"],
    "paladin": ["paladin", "royal paladin"],
    "monk": ["monk", "exalted monk"]
};

// Elementos DOM
const worldSelect = document.getElementById('world-select');
const levelInput = document.getElementById('level-input');
const levelRangeSpan = document.getElementById('level-range');
const clearFiltersBtn = document.getElementById('clear-filters');
const updateResultsBtn = document.getElementById('update-results');
const refreshPlayersBtn = document.getElementById('refresh-players');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('results-section');
const classesGrid = document.getElementById('classes-grid');
const errorMessage = document.getElementById('error-message');
const totalPlayersSpan = document.getElementById('total-players');
const inRangePlayersSpan = document.getElementById('in-range-players');
const characterModal = document.getElementById('character-modal');
const modalCharacterName = document.getElementById('modal-character-name');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const copyToast = document.getElementById('copy-toast');

// Variáveis de estado
let currentLevel = 0;
let currentWorldData = null;
let allPlayersByClass = null;
let currentWorldName = null;
let isRefreshing = false;

// Chave para localStorage
const STORAGE_KEY = 'tibia_party_finder_world';

// Inicialização
function init() {
    populateWorldSelect();
    setupEventListeners();
    updateLevelRange();
    loadSavedWorld();
}

// Carregar mundo salvo
function loadSavedWorld() {
    const savedWorld = localStorage.getItem(STORAGE_KEY);
    if (savedWorld) {
        worldSelect.value = savedWorld;
        console.log('Mundo carregado do localStorage:', savedWorld);
    }
}

// Salvar mundo selecionado
function saveWorld(worldName) {
    localStorage.setItem(STORAGE_KEY, worldName);
    console.log('Mundo salvo no localStorage:', worldName);
}

// Popular seletor de mundos
function populateWorldSelect() {
    worlds.forEach(world => {
        const option = document.createElement('option');
        option.value = world.toLowerCase();
        option.textContent = world;
        worldSelect.appendChild(option);
    });
}

// Calcular range de level
function calculateLevelRange(level) {
    const minLevel = Math.floor((level / 3) * 2);
    const maxLevel = Math.floor((level * 3) / 2);
    return { minLevel, maxLevel };
}

// Atualizar display do range de level
function updateLevelRange() {
    const level = parseInt(levelInput.value) || 0;
    currentLevel = level;
    
    if (level > 0) {
        const { minLevel, maxLevel } = calculateLevelRange(level);
        levelRangeSpan.textContent = `${minLevel} - ${maxLevel}`;
        updateResultsBtn.disabled = false;
    } else {
        levelRangeSpan.textContent = '-';
        updateResultsBtn.disabled = false;
    }
    
    // Se já temos dados, atualizar a exibição
    if (allPlayersByClass) {
        filterPlayersByLevel();
    }
}

// Verificar se jogador está no range de level
function isPlayerInLevelRange(playerLevel) {
    if (currentLevel === 0) return true;
    
    const { minLevel, maxLevel } = calculateLevelRange(currentLevel);
    return playerLevel >= minLevel && playerLevel <= maxLevel;
}

// Buscar dados do mundo na API
async function fetchWorldData(worldName) {
    try {
        showLoading();
        hideResults();
        hideError();
        hideRefreshButton();
        
        // Salvar o mundo selecionado
        saveWorld(worldName);
        currentWorldName = worldName;
        
        const response = await fetch(`https://api.tibiadata.com/v4/world/${worldName.toLowerCase()}`);
        
        if (!response.ok) {
            throw new Error('Mundo não encontrado ou erro na API');
        }
        
        const data = await response.json();
        currentWorldData = data;
        processWorldData(data);
        
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        showError('Erro ao carregar dados do mundo. Verifique se o mundo existe e tente novamente.');
    } finally {
        hideLoading();
    }
}

// Atualizar dados do mundo (refresh)
async function refreshWorldData() {
    if (!currentWorldName || isRefreshing) return;
    
    try {
        isRefreshing = true;
        refreshPlayersBtn.disabled = true;
        refreshPlayersBtn.classList.add('refreshing');
        
        const response = await fetch(`https://api.tibiadata.com/v4/world/${currentWorldName.toLowerCase()}`);
        
        if (!response.ok) {
            throw new Error('Erro ao atualizar dados');
        }
        
        const data = await response.json();
        currentWorldData = data;
        processWorldData(data);
        
        // Mostrar toast de sucesso
        showToast('Lista de jogadores atualizada!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        showToast('Erro ao atualizar lista de jogadores', 'error');
    } finally {
        isRefreshing = false;
        refreshPlayersBtn.disabled = false;
        refreshPlayersBtn.classList.remove('refreshing');
    }
}

// Processar dados do mundo
function processWorldData(data) {
    const players = data.world.online_players;
    
    // Organizar jogadores por classe
    allPlayersByClass = organizePlayersByClass(players);
    
    // Exibir jogadores (filtrados ou todos)
    filterPlayersByLevel();
    
    // Atualizar estatísticas
    updateStatistics(players);
    
    showResults();
    showRefreshButton();
}

// Organizar jogadores por classe
function organizePlayersByClass(players) {
    const playersByClass = {
        knight: [],
        druid: [],
        sorcerer: [],
        paladin: [],
        monk: []
    };
    
    players.forEach(player => {
        const playerClass = player.vocation.toLowerCase();
        
        // Mapear a classe do jogador para o grupo correto
        let classFound = false;
        for (const [mainClass, variations] of Object.entries(classMapping)) {
            if (variations.some(variation => playerClass.includes(variation))) {
                playersByClass[mainClass].push({
                    name: player.name,
                    level: player.level,
                    vocation: player.vocation
                });
                classFound = true;
                break;
            }
        }
        
        // Ignorar jogadores sem classe mapeada (None)
    });
    
    // Ordenar jogadores por nível (maior primeiro)
    Object.values(playersByClass).forEach(classPlayers => {
        classPlayers.sort((a, b) => b.level - a.level);
    });
    
    return playersByClass;
}

// Filtrar jogadores por level
function filterPlayersByLevel() {
    if (!allPlayersByClass) return;
    
    const filteredPlayersByClass = {};
    let totalInRange = 0;
    let totalPlayers = 0;
    
    // Filtrar cada classe
    Object.keys(allPlayersByClass).forEach(classKey => {
        if (currentLevel > 0) {
            // Se tem level preenchido, mostrar apenas os que estão no range
            filteredPlayersByClass[classKey] = allPlayersByClass[classKey].filter(player => {
                return isPlayerInLevelRange(player.level);
            });
        } else {
            // Se não tem level preenchido, mostrar todos
            filteredPlayersByClass[classKey] = allPlayersByClass[classKey];
        }
        totalInRange += filteredPlayersByClass[classKey].length;
        totalPlayers += allPlayersByClass[classKey].length;
    });
    
    // Exibir jogadores filtrados
    displayPlayersByClass(filteredPlayersByClass, currentLevel > 0);
    
    // Atualizar estatísticas
    inRangePlayersSpan.textContent = totalInRange;
    totalPlayersSpan.textContent = totalPlayers;
}

// Exibir jogadores organizados por classe
function displayPlayersByClass(playersByClass, isFiltered) {
    classesGrid.innerHTML = '';
    
    const classNames = {
        knight: "Knight / Elite Knight",
        druid: "Druid / Elder Druid", 
        sorcerer: "Sorcerer / Master Sorcerer",
        paladin: "Paladin / Royal Paladin",
        monk: "Monk / Exalted Monk"
    };
    
    let totalInRange = 0;
    let totalPlayers = 0;
    
    // Mostrar apenas as 5 classes definidas
    for (const classKey of ['knight', 'paladin', 'druid', 'sorcerer', 'monk']) {
        const classPlayers = playersByClass[classKey] || [];
        
        totalPlayers += classPlayers.length;
        
        const classColumn = document.createElement('div');
        classColumn.className = 'class-column';
        
        const classHeader = document.createElement('div');
        classHeader.className = 'class-header';
        classHeader.textContent = `${classNames[classKey]} (${classPlayers.length})`;
        
        const playerList = document.createElement('div');
        playerList.className = 'player-list';
        
        classPlayers.forEach(player => {
            const isInRange = isPlayerInLevelRange(player.level);
            if (isInRange) totalInRange++;
            
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${isFiltered ? 'in-range' : (isInRange ? 'in-range' : 'out-range')}`;
            
            const playerInfo = document.createElement('div');
            playerInfo.className = 'player-info';
            
            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = player.name;
            playerName.addEventListener('click', () => showCharacterInfo(player.name));
            
            const playerVocation = document.createElement('div');
            playerVocation.className = 'player-vocation';
            playerVocation.textContent = player.vocation;
            
            const playerActions = document.createElement('div');
            playerActions.className = 'player-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = 'Copiar';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(player.name);
            });
            
            const playerLevel = document.createElement('div');
            playerLevel.className = 'player-level';
            playerLevel.textContent = `Level ${player.level}`;
            
            playerInfo.appendChild(playerName);
            playerInfo.appendChild(playerVocation);
            playerActions.appendChild(copyBtn);
            playerActions.appendChild(playerLevel);
            playerItem.appendChild(playerInfo);
            playerItem.appendChild(playerActions);
            playerList.appendChild(playerItem);
        });
        
        // Se não há jogadores após filtro, mostrar mensagem
        if (classPlayers.length === 0 && isFiltered) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'player-item';
            emptyMessage.textContent = 'Nenhum jogador no range';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = '#8a9ba8';
            playerList.appendChild(emptyMessage);
        }
        
        classColumn.appendChild(classHeader);
        classColumn.appendChild(playerList);
        classesGrid.appendChild(classColumn);
    }
    
    // Atualizar contadores
    if (isFiltered) {
        inRangePlayersSpan.textContent = totalInRange;
        totalPlayersSpan.textContent = Object.values(allPlayersByClass).reduce((total, players) => total + players.length, 0);
    } else {
        inRangePlayersSpan.textContent = currentLevel > 0 ? totalInRange : totalPlayers;
        totalPlayersSpan.textContent = totalPlayers;
    }
}

// Mostrar informações do personagem
async function showCharacterInfo(characterName) {
    try {
        console.log('Buscando informações para:', characterName);
        
        // Mostrar modal com loading
        modalCharacterName.textContent = characterName;
        modalBody.innerHTML = `
            <div class="modal-loading">
                <div class="spinner"></div>
                <p>Carregando informações de ${characterName}...</p>
            </div>
        `;
        characterModal.style.display = 'block';
        
        // Buscar dados do personagem da API v4
        const response = await fetch(`https://api.tibiadata.com/v4/character/${encodeURIComponent(characterName)}`);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        
        displayCharacterInfo(data);
        
    } catch (error) {
        console.error('Erro ao buscar dados do personagem:', error);
        modalBody.innerHTML = `
            <div class="error-message">
                <p>Erro ao carregar informações do personagem "${characterName}"</p>
                <p><strong>Detalhes:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.9rem; color: #8a9ba8;">
                    Verifique se o nome está correto e se o personagem existe.
                </p>
            </div>
        `;
    }
}

// Exibir informações do personagem no modal
function displayCharacterInfo(data) {
    // CORREÇÃO: A estrutura correta é data.character.character
    const character = data.character.character;
    
    console.log('Dados do personagem para exibição:', character);
    
    if (!character) {
        modalBody.innerHTML = `
            <div class="error-message">
                <p>Dados do personagem não encontrados na resposta da API.</p>
                <p>Estrutura recebida: ${JSON.stringify(data).substring(0, 300)}...</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="character-info">
            <div class="info-group">
                <h4>Informações Básicas</h4>
                <div class="info-item">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">${character.name || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Sexo:</span>
                    <span class="info-value">${character.sex === 'female' ? 'Feminino' : 'Masculino'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Level:</span>
                    <span class="info-value">${character.level || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Vocação:</span>
                    <span class="info-value">${character.vocation || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Mundo:</span>
                    <span class="info-value">${character.world || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Título:</span>
                    <span class="info-value">${character.title || 'Nenhum'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status da Conta:</span>
                    <span class="info-value">${character.account_status || 'N/A'}</span>
                </div>
            </div>
    `;

    // Informações da Guilda
    if (character.guild && character.guild.name) {
        html += `
            <div class="info-group">
                <h4>Guilda</h4>
                <div class="info-item">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">${character.guild.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Rank:</span>
                    <span class="info-value">${character.guild.rank || 'N/A'}</span>
                </div>
            </div>
        `;
    }

    // Casas
    if (character.houses && character.houses.length > 0) {
        html += `
            <div class="info-group">
                <h4>Casas (${character.houses.length})</h4>
                ${character.houses.slice(0, 3).map(house => {
                    const paidDate = new Date(house.paid);
                    return `
                        <div class="info-item">
                            <span class="info-label">${house.name}:</span>
                            <span class="info-value" style="font-size: 0.8rem;">
                                ${house.town} - Pago até ${paidDate.toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    `;
                }).join('')}
                ${character.houses.length > 3 ? 
                    `<div class="info-item">
                        <span class="info-label">...</span>
                        <span class="info-value">+${character.houses.length - 3} casas</span>
                    </div>` : ''}
            </div>
        `;
    }

    // Mortes Recentes
    if (data.character.deaths && data.character.deaths.length > 0) {
        html += `
            <div class="info-group">
                <h4>Últimas Mortes (${data.character.deaths.length})</h4>
                ${data.character.deaths.slice(0, 3).map(death => {
                    const date = new Date(death.time);
                    const killers = death.killers.map(k => k.name).join(', ');
                    return `
                        <div class="info-item">
                            <span class="info-label">Level ${death.level}:</span>
                            <span class="info-value" style="font-size: 0.8rem;">
                                ${date.toLocaleDateString('pt-BR')} - ${killers}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Informações da Conta
    if (data.character.account_information) {
        html += `
            <div class="info-group">
                <h4>Informações da Conta</h4>
        `;
        
        if (data.character.account_information.created) {
            const created = new Date(data.character.account_information.created);
            html += `
                <div class="info-item">
                    <span class="info-label">Criada em:</span>
                    <span class="info-value">${created.toLocaleDateString('pt-BR')}</span>
                </div>
            `;
        }
        
        if (data.character.account_information.loyalty_title) {
            html += `
                <div class="info-item">
                    <span class="info-label">Título de Loyalty:</span>
                    <span class="info-value">${data.character.account_information.loyalty_title}</span>
                </div>
            `;
        }
        
        html += `</div>`;
    }

    // Informações Adicionais
    html += `
        <div class="info-group">
            <h4>Informações Adicionais</h4>
    `;

    if (character.residence) {
        html += `
            <div class="info-item">
                <span class="info-label">Residência:</span>
                <span class="info-value">${character.residence}</span>
            </div>
        `;
    }

    if (character.last_login) {
        const lastLogin = new Date(character.last_login);
        html += `
            <div class="info-item">
                <span class="info-label">Último Login:</span>
                <span class="info-value">${lastLogin.toLocaleString('pt-BR')}</span>
            </div>
        `;
    }

    if (character.achievement_points !== undefined) {
        html += `
            <div class="info-item">
                <span class="info-label">Pontos de Conquista:</span>
                <span class="info-value">${character.achievement_points}</span>
            </div>
        `;
    }

    if (character.unlocked_titles !== undefined) {
        html += `
            <div class="info-item">
                <span class="info-label">Títulos Desbloqueados:</span>
                <span class="info-value">${character.unlocked_titles}</span>
            </div>
        `;
    }

    // Outros Personagens
    if (data.character.other_characters && data.character.other_characters.length > 0) {
        html += `
            <div class="info-item">
                <span class="info-label">Outros Personagens:</span>
                <span class="info-value">${data.character.other_characters.length}</span>
            </div>
        `;
    }

    html += `</div></div>`;
    modalBody.innerHTML = html;
}

// Copiar nome para área de transferência
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Nome copiado para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar texto: ', err);
        // Fallback para método antigo
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Nome copiado para a área de transferência!', 'success');
    });
}

// Mostrar toast de confirmação
function showToast(message, type = 'success') {
    // Remove toast existente
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Cria novo toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    // Adiciona ao body
    document.body.appendChild(toast);
    
    // Mostra e depois remove
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Atualizar estatísticas
function updateStatistics(players) {
    let inRangeCount = 0;
    let totalCount = players.length;
    
    if (currentLevel > 0) {
        players.forEach(player => {
            if (isPlayerInLevelRange(player.level)) {
                inRangeCount++;
            }
        });
    } else {
        inRangeCount = totalCount;
    }
    
    inRangePlayersSpan.textContent = inRangeCount;
    totalPlayersSpan.textContent = totalCount;
}

// Mostrar/ocultar botão de refresh
function showRefreshButton() {
    refreshPlayersBtn.style.display = 'block';
    refreshPlayersBtn.classList.add('btn-refresh');
}

function hideRefreshButton() {
    refreshPlayersBtn.style.display = 'none';
}

// Configurar event listeners
function setupEventListeners() {
    levelInput.addEventListener('input', updateLevelRange);
    
    clearFiltersBtn.addEventListener('click', () => {
        levelInput.value = '';
        worldSelect.value = '';
        currentLevel = 0;
        updateLevelRange();
        hideResults();
        hideRefreshButton();
        allPlayersByClass = null;
        currentWorldName = null;
        
        // Limpar mundo salvo
        localStorage.removeItem(STORAGE_KEY);
    });
    
    updateResultsBtn.addEventListener('click', () => {
        const selectedWorld = worldSelect.value;
        if (selectedWorld) {
            fetchWorldData(selectedWorld);
        } else {
            showError('Por favor, selecione um mundo primeiro.');
        }
    });
    
    // Botão de refresh
    refreshPlayersBtn.addEventListener('click', () => {
        refreshWorldData();
    });
    
    // Buscar automaticamente quando o mundo for alterado
    worldSelect.addEventListener('change', () => {
        if (worldSelect.value) {
            fetchWorldData(worldSelect.value);
        }
    });
    
    // Fechar modal
    modalClose.addEventListener('click', () => {
        characterModal.style.display = 'none';
    });
    
    // Fechar modal clicando fora
    window.addEventListener('click', (event) => {
        if (event.target === characterModal) {
            characterModal.style.display = 'none';
        }
    });
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && characterModal.style.display === 'block') {
            characterModal.style.display = 'none';
        }
    });
}

// Funções auxiliares para mostrar/ocultar elementos
function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showResults() {
    resultsSection.style.display = 'block';
}

function hideResults() {
    resultsSection.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);
