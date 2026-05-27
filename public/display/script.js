const API_URL = '/api/promocoes';
const DISPLAY_CONFIG_URL = '/api/display-config';
const DISPLAY_CONFIG_REFRESH_INTERVAL = 5000;
let fetchInterval = 30000;
let carouselInterval = 10000;
let vitrineItemInterval = 6000;
let displayConfig = null;
let displayConfigSnapshot = '';

// Configuracao de layout dinamico via URL
const urlParams = new URLSearchParams(window.location.search);
const requestedLayout = urlParams.get('layout');
let layoutMode = requestedLayout || 'padrao';

let itemsPerPage = 4;
if (layoutMode === 'destaque') {
    itemsPerPage = 1;
    document.body.classList.add('layout-destaque');
} else if (layoutMode === 'compacto') {
    itemsPerPage = 6;
    document.body.classList.add('layout-compacto');
} else if (layoutMode === 'vitrine') {
    itemsPerPage = 5;
    document.body.classList.add('layout-vitrine');
} else if (layoutMode === 'sem-foto') {
    itemsPerPage = 4;
    document.body.classList.add('layout-sem-foto');
} else if (layoutMode === 'sem-foto-destaque') {
    itemsPerPage = 1;
    document.body.classList.add('layout-sem-foto-destaque');
} else {
    document.body.classList.add('layout-padrao');
}

let allPromotions = [];
let currentPage = 0;
let carouselTimer = null;
let fetchTimer = null;
let configTimer = null;
let vitrineActiveIndex = 0; // Para o layout vitrine
let lastFetchFailed = false;

const carouselContainer = document.getElementById('carousel-container');
const template = document.getElementById('product-template');

async function fetchDisplayConfig(isInitialLoad = false) {
    try {
        const response = await fetch(DISPLAY_CONFIG_URL);
        if (!response.ok) throw new Error('Erro ao carregar configuracao visual');
        const nextConfig = await response.json();
        const nextSnapshot = JSON.stringify(nextConfig);

        if (!isInitialLoad && nextSnapshot === displayConfigSnapshot) {
            return false;
        }

        const previousState = {
            layoutMode,
            itemsPerPage,
            fetchInterval,
            carouselInterval,
            vitrineItemInterval
        };

        displayConfig = nextConfig;
        displayConfigSnapshot = nextSnapshot;
        applyDisplayConfig(displayConfig);

        if (!isInitialLoad) {
            applyLiveConfigChange(previousState);
        }

        return true;
    } catch (error) {
        console.error('Falha ao carregar configuracao visual:', error);
        if (isInitialLoad) {
            displayConfig = {};
            applyDisplayConfig(displayConfig);
        }
        return false;
    }
}

function applyDisplayConfig(config) {
    const title = document.querySelector('.header h1');
    const footer = document.querySelector('.footer p');

    if (title) title.textContent = config.title || 'OFERTAS IMPERDIVEIS';
    if (footer) footer.textContent = config.footerText || 'Aproveite! Promocoes validas enquanto durarem os estoques.';

    fetchInterval = Number(config.fetchInterval) || fetchInterval;
    carouselInterval = Number(config.carouselInterval) || carouselInterval;
    vitrineItemInterval = Number(config.vitrineItemInterval) || vitrineItemInterval;

    document.documentElement.style.setProperty('--promo-primary', config.primaryColor || '#d32f2f');
    document.documentElement.style.setProperty('--promo-accent', config.accentColor || '#fbc02d');
    document.documentElement.style.setProperty('--promo-background', config.backgroundColor || '#111111');

    applyLayout(requestedLayout || config.defaultLayout || 'padrao');
}

function applyLayout(mode) {
    layoutMode = ['padrao', 'destaque', 'compacto', 'vitrine', 'sem-foto', 'sem-foto-destaque'].includes(mode) ? mode : 'padrao';
    document.body.classList.remove('layout-padrao', 'layout-destaque', 'layout-compacto', 'layout-vitrine', 'layout-sem-foto', 'layout-sem-foto-destaque');
    document.body.classList.add(`layout-${layoutMode}`);

    if (layoutMode === 'destaque' || layoutMode === 'sem-foto-destaque') {
        itemsPerPage = 1;
    } else if (layoutMode === 'compacto') {
        itemsPerPage = 6;
    } else if (layoutMode === 'vitrine') {
        itemsPerPage = 5;
    } else if (layoutMode === 'sem-foto') {
        itemsPerPage = 4;
    } else {
        itemsPerPage = 4;
    }
}

async function init() {
    await fetchDisplayConfig(true);
    await fetchPromotions();
    schedulePromotionFetch();
    scheduleDisplayConfigFetch();
}

function schedulePromotionFetch() {
    if (fetchTimer) clearInterval(fetchTimer);
    fetchTimer = setInterval(fetchPromotions, fetchInterval);
}

function scheduleDisplayConfigFetch() {
    if (configTimer) clearInterval(configTimer);
    configTimer = setInterval(() => fetchDisplayConfig(false), DISPLAY_CONFIG_REFRESH_INTERVAL);
}

function applyLiveConfigChange(previousState) {
    const fetchTimingChanged = previousState.fetchInterval !== fetchInterval;
    const presentationChanged =
        previousState.layoutMode !== layoutMode ||
        previousState.itemsPerPage !== itemsPerPage ||
        previousState.carouselInterval !== carouselInterval ||
        previousState.vitrineItemInterval !== vitrineItemInterval;

    if (fetchTimingChanged) {
        schedulePromotionFetch();
    }

    if (presentationChanged) {
        currentPage = 0;
        vitrineActiveIndex = 0;
        updateCarousel();
    }
}

async function fetchPromotions() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro na resposta da API');
        
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Formato inesperado da API');
        const normalizedData = data.map(normalizePromotion).filter(Boolean);
        lastFetchFailed = false;
        
        if (JSON.stringify(normalizedData) !== JSON.stringify(allPromotions)) {
            allPromotions = normalizedData;
            currentPage = 0;
            vitrineActiveIndex = 0;
            updateCarousel();
        } else {
            // Dados iguais: re-renderiza o carrossel apenas se havia mensagem de erro,
            // mas sempre atualiza os timestamps de imagens locais para refletir arquivos substituídos
            if (carouselContainer.querySelector('.status-message')) {
                renderCurrentPage();
            } else {
                refreshLocalImageTimestamps();
            }
        }
    } catch (error) {
        console.error('Falha ao buscar promocoes:', error);
        lastFetchFailed = true;
        if (allPromotions.length === 0) {
            renderCurrentPage();
        }
    }
}

function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeText(value) {
    const text = String(value || '').trim();
    if (!/[ÃÂâ]/.test(text)) return text;

    try {
        return decodeURIComponent(escape(text));
    } catch (err) {
        return text;
    }
}

function normalizePromotion(item) {
    if (!item || typeof item !== 'object') return null;

    const currentPrice = parseFloat(item.preco_atual);

    return {
        ...item,
        id: item.id ?? cryptoRandomId(),
        nome_produto: normalizeText(item.nome_produto || item.nome || 'Produto em oferta'),
        preco_anterior: item.preco_anterior ?? null,
        preco_atual: isNaN(currentPrice) ? 0 : currentPrice,
        link_imagem: String(item.link_imagem || '').trim(),
        data_validade: String(item.data_validade || '').trim(),
        data_inicio: String(item.data_inicio || '').trim(),
        data_fim: String(item.data_fim || item.data_validade || '').trim(),
        dias_semana: item.dias_semana || '',
        hora_inicio: String(item.hora_inicio || '').trim(),
        hora_fim: String(item.hora_fim || '').trim(),
        texto_validade: normalizeText(item.texto_validade || '')
    };
}

function cryptoRandomId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `promo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function applyTextSizing(card, item) {
    const nameLength = (item.nome_produto || '').length;
    const priceLength = formatCurrency(item.preco_atual).length;

    if (nameLength > 42) card.classList.add('has-long-name');
    if (nameLength > 70) card.classList.add('has-very-long-name');
    if (priceLength > 10) card.classList.add('has-long-price');
}

function createPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'no-image-placeholder';
    return placeholder;
}

function showImageFallback(imgElement, imgWrapper) {
    if (imgElement) imgElement.remove();
    if (imgWrapper && !imgWrapper.querySelector('.no-image-placeholder')) {
        imgWrapper.appendChild(createPlaceholder());
    }
}

function setProductImage(imgElement, imgWrapper, imageUrl) {
    if (!imgElement || !imgWrapper) return;

    if (imageUrl) {
        imgElement.alt = 'Imagem do produto';
        imgElement.loading = 'eager';
        imgElement.onerror = () => showImageFallback(imgElement, imgWrapper);

        // Adiciona timestamp às imagens locais para evitar cache do browser
        // quando o arquivo é substituído por outro com o mesmo nome
        if (imageUrl.includes('/api/local-image')) {
            const separator = imageUrl.includes('?') ? '&' : '?';
            imgElement.src = `${imageUrl}${separator}_t=${Date.now()}`;
        } else {
            imgElement.src = imageUrl;
        }
    } else {
        showImageFallback(imgElement, imgWrapper);
    }
}

// Atualiza o timestamp de todas as imagens locais visíveis sem re-renderizar o DOM.
// Chamada a cada ciclo de fetch quando os dados do banco não mudaram,
// garantindo que arquivos de imagem substituídos na pasta apareçam automaticamente.
function refreshLocalImageTimestamps() {
    const now = Date.now();
    carouselContainer.querySelectorAll('img[src*="/api/local-image"]').forEach(img => {
        const baseUrl = img.src.replace(/[?&]_t=\d+/, '');
        const separator = baseUrl.includes('?') ? '&' : '?';
        img.src = `${baseUrl}${separator}_t=${now}`;
    });
}

function renderStatusMessage(title, detail) {
    carouselContainer.innerHTML = '';

    const status = document.createElement('div');
    status.className = 'status-message';

    const statusTitle = document.createElement('h2');
    statusTitle.textContent = title;

    const statusDetail = document.createElement('p');
    statusDetail.textContent = detail;

    status.appendChild(statusTitle);
    status.appendChild(statusDetail);
    carouselContainer.appendChild(status);
}

function getValidityBadgeText(item) {
    return getValidityBadgeParts(item).map(part => part.value).join(' - ');
}

function getValidityBadgeParts(item) {
    const customText = item.texto_validade && item.texto_validade.trim() !== ''
        ? item.texto_validade.trim().toUpperCase()
        : '';

    if (customText) return [{ type: 'text', label: 'OFERTA', value: customText }];

    const scheduleParts = getScheduleBadgeParts(item);
    if (scheduleParts.length > 0) return scheduleParts;

    if (item.data_validade) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [year, month, day] = item.data_validade.split('-');
            const valDate = new Date(year, month - 1, day);
            if (isNaN(valDate.getTime())) return "";
            valDate.setHours(0, 0, 0, 0);

            const diffTime = valDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return [{ type: 'date', label: 'VALIDADE', value: 'SO HOJE' }];
            } else if (diffDays === 1) {
                return [{ type: 'date', label: 'VALIDADE', value: 'ATE AMANHA' }];
            } else if (diffDays > 1 && diffDays <= 7) {
                const diasSemana = ["DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"];
                return [{ type: 'date', label: 'VALIDADE', value: `ATE ${diasSemana[valDate.getDay()]}` }];
            } else if (diffDays > 7) {
                return [{ type: 'date', label: 'VALIDADE', value: `ATE ${day}/${month}` }];
            }
        } catch (e) {
            // Ignora erro
        }
    }
    return [];
}

function getScheduleBadgeParts(item) {
    const parts = [];
    const dateRange = formatDateRange(item.data_inicio, item.data_fim);
    const days = formatWeekdays(item.dias_semana);
    const timeRange = formatTimeRange(item.hora_inicio, item.hora_fim);
    const hasOperationalRule = Boolean(days || timeRange);

    if (dateRange && (!hasOperationalRule || dateRange === 'HOJE')) {
        parts.push({ type: 'date', label: 'VALIDO', value: dateRange });
    }
    if (days) parts.push({ type: 'days', label: 'DIAS', value: days });
    if (timeRange) parts.push({ type: 'time', label: 'HORARIO', value: timeRange });

    return parts;
}

function formatDateRange(startDate, endDate) {
    const start = formatDateLabel(startDate);
    const end = formatDateLabel(endDate);
    const startsToday = isToday(startDate);

    if (start && end && start === end && startsToday) return 'HOJE';
    if (start && end && start !== end) return `${start} A ${end}`;
    if (start && end) return start;
    if (end) return end;
    if (start) return `A PARTIR DE ${start}`;
    return '';
}

function formatDateLabel(dateValue) {
    if (!dateValue) return '';
    const [year, month, day] = String(dateValue).split('-');
    if (!year || !month || !day) return '';
    const parsed = new Date(year, month - 1, day);
    if (isNaN(parsed.getTime())) return '';
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}`;
}

function formatWeekdays(value) {
    const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
    const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const selectedDays = rawValues
        .map(day => String(day).trim().toLowerCase())
        .filter(Boolean)
        .map(day => {
            const numericDay = Number(day);
            if (!Number.isNaN(numericDay) && numericDay >= 0 && numericDay <= 6) {
                return dayNames[numericDay];
            }
            return normalizeWeekdayName(day);
        })
        .filter(Boolean);

    if (selectedDays.length === 0 || selectedDays.length === 7) return '';
    return selectedDays.join('/');
}

function normalizeWeekdayName(day) {
    const names = {
        domingo: 'DOM',
        dom: 'DOM',
        segunda: 'SEG',
        seg: 'SEG',
        terca: 'TER',
        'terça': 'TER',
        ter: 'TER',
        quarta: 'QUA',
        qua: 'QUA',
        quinta: 'QUI',
        qui: 'QUI',
        sexta: 'SEX',
        sex: 'SEX',
        sabado: 'SAB',
        'sábado': 'SAB',
        sab: 'SAB'
    };

    return names[day] || '';
}

function formatTimeRange(startTime, endTime) {
    const start = formatTimeLabel(startTime);
    const end = formatTimeLabel(endTime);

    if (start && end) return `${start} - ${end}`;
    if (start) return `A PARTIR DAS ${start}`;
    if (end) return `ATE ${end}`;
    return '';
}

function formatTimeLabel(timeValue) {
    const match = String(timeValue || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function isToday(dateValue) {
    if (!dateValue) return false;
    const [year, month, day] = String(dateValue).split('-');
    const parsed = new Date(year, month - 1, day);
    if (isNaN(parsed.getTime())) return false;

    const today = new Date();
    return parsed.getFullYear() === today.getFullYear() &&
        parsed.getMonth() === today.getMonth() &&
        parsed.getDate() === today.getDate();
}

function renderValidityBadges(container, item) {
    if (!container) return;

    const parts = getValidityBadgeParts(item);
    if (parts.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    container.className = 'schedule-badges';
    container.style.display = 'flex';

    parts.forEach(part => {
        const badge = document.createElement('span');
        badge.className = `validity-badge validity-badge-${part.type}`;

        const label = document.createElement('span');
        label.className = 'badge-label';
        label.textContent = part.label;

        const value = document.createElement('span');
        value.className = 'badge-value';
        value.textContent = part.value;

        badge.appendChild(label);
        badge.appendChild(value);
        container.appendChild(badge);
    });
}

function updateCarousel() {
    if (carouselTimer) clearInterval(carouselTimer);
    
    renderCurrentPage();

    if (layoutMode === 'vitrine') {
        if (allPromotions.length > 1) {
            carouselTimer = setInterval(nextVitrineItem, vitrineItemInterval);
        }
    } else {
        if (allPromotions.length > itemsPerPage) {
            carouselTimer = setInterval(nextPage, carouselInterval);
        }
    }
}

function renderCurrentPage() {
    carouselContainer.classList.add('fade-out');

    setTimeout(() => {
        carouselContainer.innerHTML = '';

        if (allPromotions.length === 0) {
            if (lastFetchFailed) {
                renderStatusMessage('Nao foi possivel carregar as ofertas', 'A tela tentara atualizar automaticamente em alguns segundos.');
            } else {
                renderStatusMessage('Nenhuma promocao ativa no momento', 'Assim que houver ofertas validas, elas aparecerao aqui.');
            }
            carouselContainer.classList.remove('fade-out');
            return;
        }

        const startIndex = (currentPage * itemsPerPage) % allPromotions.length;
        const itemsToShow = [];
        
        // Garantimos que a tela sempre fique CHEIA repetindo os itens de forma circular
        for (let i = 0; i < itemsPerPage; i++) {
            const itemIndex = (startIndex + i) % allPromotions.length;
            itemsToShow.push(allPromotions[itemIndex]);
        }

        if (layoutMode === 'vitrine') {
            renderVitrine(itemsToShow);
        } else {
            renderGrid(itemsToShow);
        }

        carouselContainer.classList.remove('fade-out');
    }, 800);
}

// Renderiza layouts padrao, destaque e compacto
function renderGrid(itemsToShow) {
    itemsToShow.forEach(item => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.product-card');
        const imgWrapper = clone.querySelector('.product-image-wrapper');
        const imgElement = clone.querySelector('.product-image');
        
        const validityText = getValidityBadgeText(item);
        const validityParts = getValidityBadgeParts(item);
        applyTextSizing(card, item);
        if (validityParts.length > 0) card.classList.add('has-schedule');

        if (layoutMode === 'sem-foto' || layoutMode === 'sem-foto-destaque') {
            if (imgWrapper) imgWrapper.remove();
            
            // Cria um badge decorativo vermelho e amarelo
            const badge = document.createElement('div');
            badge.className = 'promo-badge';
            badge.textContent = validityText || 'OFERTA IMPERDÍVEL';
            clone.querySelector('.product-card').prepend(badge);
        } else {
            setProductImage(imgElement, imgWrapper, item.link_imagem);

            const validityBadgeEl = clone.querySelector('.validity-badge');
            renderValidityBadges(validityBadgeEl, item);
        }
        
        clone.querySelector('.product-name').textContent = item.nome_produto;
        
        const oldPriceEl = clone.querySelector('.old-price');
        if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
            oldPriceEl.textContent = formatCurrency(item.preco_anterior);
        } else {
            oldPriceEl.style.display = 'none';
        }
        
        clone.querySelector('.new-price').textContent = formatCurrency(item.preco_atual);
        
        carouselContainer.appendChild(clone);
    });
}

// Renderiza o layout dividido (Vitrine)
function renderVitrine(itemsToShow) {
    const sidebar = document.createElement('div');
    sidebar.className = 'vitrine-sidebar';
    
    const highlightArea = document.createElement('div');
    highlightArea.className = 'vitrine-highlight fade-in-element';
    
    carouselContainer.appendChild(sidebar);
    carouselContainer.appendChild(highlightArea);

    itemsToShow.forEach((item, index) => {
        // Cria item da lista
        const listItem = document.createElement('div');
        listItem.className = 'vitrine-list-item';
        if (index === vitrineActiveIndex) listItem.classList.add('active');

        const listInfo = document.createElement('div');
        listInfo.className = 'list-info';

        const listName = document.createElement('div');
        listName.className = 'list-name';
        listName.textContent = item.nome_produto;

        const listPrice = document.createElement('div');
        listPrice.className = 'list-price';
        listPrice.textContent = formatCurrency(item.preco_atual);

        listInfo.appendChild(listName);
        listInfo.appendChild(listPrice);
        listItem.appendChild(listInfo);
        sidebar.appendChild(listItem);
    });

    // Atualiza a area de destaque com o item ativo
    updateVitrineHighlight(itemsToShow[vitrineActiveIndex], highlightArea);
}

function updateVitrineHighlight(item, container) {
    if (!item) return;

    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'product-card large-vitrine-card';
    applyTextSizing(card, item);

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'product-image-wrapper';
    const imgElement = document.createElement('img');
    imgElement.className = 'product-image';
    imgWrapper.appendChild(imgElement);
    setProductImage(imgElement, imgWrapper, item.link_imagem);

    const info = document.createElement('div');
    info.className = 'product-info';

    const name = document.createElement('h2');
    name.className = 'product-name';
    name.textContent = item.nome_produto;
    info.appendChild(name);

    const validity = document.createElement('div');
    renderValidityBadges(validity, item);
    if (getValidityBadgeParts(item).length > 0) card.classList.add('has-schedule');
    info.appendChild(validity);

    const prices = document.createElement('div');
    prices.className = 'prices';

    if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
        const oldPrice = document.createElement('span');
        oldPrice.className = 'old-price';
        oldPrice.textContent = formatCurrency(item.preco_anterior);
        prices.appendChild(oldPrice);
    }

    const newPrice = document.createElement('span');
    newPrice.className = 'new-price';
    newPrice.textContent = formatCurrency(item.preco_atual);
    prices.appendChild(newPrice);

    info.appendChild(prices);
    card.appendChild(imgWrapper);
    card.appendChild(info);
    container.appendChild(card);

    container.classList.remove('fade-in-element');
    void container.offsetWidth;
    container.classList.add('fade-in-element');
}

// Logica de avanco para Vitrine
function nextVitrineItem() {
    const startIndex = (currentPage * itemsPerPage) % allPromotions.length;
    const itemsToShow = [];
    
    // Garantimos que a lista da vitrine sempre fique CHEIA repetindo os itens de forma circular
    for (let i = 0; i < itemsPerPage; i++) {
        const itemIndex = (startIndex + i) % allPromotions.length;
        itemsToShow.push(allPromotions[itemIndex]);
    }
    
    vitrineActiveIndex++;
    
    if (vitrineActiveIndex >= itemsToShow.length) {
        // Acabou a pagina atual, avanca para a proxima pagina de 5 itens
        vitrineActiveIndex = 0;
        nextPage();
    } else {
        // Apenas atualiza a selecao na tela (sem dar fade na tela toda)
        const sidebarItems = document.querySelectorAll('.vitrine-list-item');
        sidebarItems.forEach((el, idx) => {
            if (idx === vitrineActiveIndex) el.classList.add('active');
            else el.classList.remove('active');
        });
        
        const highlightArea = document.querySelector('.vitrine-highlight');
        if (highlightArea) {
            updateVitrineHighlight(itemsToShow[vitrineActiveIndex], highlightArea);
        }
    }
}

function nextPage() {
    const totalPages = Math.ceil(allPromotions.length / itemsPerPage);
    currentPage++;
    
    if (currentPage >= totalPages) {
        currentPage = 0;
    }
    
    renderCurrentPage();
}

init();

