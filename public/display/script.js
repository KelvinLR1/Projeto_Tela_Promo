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
let carouselInitialized = false; // Garante que o 1o render sempre ocorra

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
            vitrineItemInterval,
            filterActiveOnly: displayConfig ? displayConfig.filterActiveOnly : false
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
    document.documentElement.style.setProperty('--promo-header-mid', config.headerMidColor || '#f44336');
    document.documentElement.style.setProperty('--promo-accent', config.accentColor || '#fbc02d');
    document.documentElement.style.setProperty('--promo-background', config.backgroundColor || '#111111');
    document.documentElement.style.setProperty('--promo-bg-center', config.bgCenterColor || '#222222');
    document.documentElement.style.setProperty('--promo-footer-bg', config.footerBgColor || '#111111');

    document.documentElement.style.setProperty('--card-padrao-bg-start', config.cardPadraoBgStart || '#ffffff');
    document.documentElement.style.setProperty('--card-padrao-bg-end', config.cardPadraoBgEnd || '#f0f0f0');
    document.documentElement.style.setProperty('--card-padrao-border', config.cardPadraoBorder || '#fbc02d');
    document.documentElement.style.setProperty('--card-padrao-text-name', config.cardPadraoTextName || '#333333');
    document.documentElement.style.setProperty('--card-padrao-text-price', config.cardPadraoTextPrice || '#d32f2f');

    document.documentElement.style.setProperty('--card-leva-bg-start', config.cardLevaBgStart || '#0f2027');
    document.documentElement.style.setProperty('--card-leva-bg-end', config.cardLevaBgEnd || '#2c5364');
    document.documentElement.style.setProperty('--card-leva-border', config.cardLevaBorder || '#fbc02d');
    document.documentElement.style.setProperty('--card-leva-text-name', config.cardLevaTextName || '#ffffff');
    document.documentElement.style.setProperty('--card-leve-bg', config.cardLeveBg || '#7a5c00');
    document.documentElement.style.setProperty('--card-pague-bg', config.cardPagueBg || '#7a1020');
    document.documentElement.style.setProperty('--card-leva-unit-price', config.cardLevaUnitPrice || '#fbc02d');

    document.documentElement.style.setProperty('--card-desc-bg-start', config.cardDescBgStart || '#ffffff');
    document.documentElement.style.setProperty('--card-desc-bg-end', config.cardDescBgEnd || '#ffffff');
    document.documentElement.style.setProperty('--card-desc-border', config.cardDescBorder || '#d32f2f');
    document.documentElement.style.setProperty('--card-desc-text-name', config.cardDescTextName || '#1a1a1a');
    document.documentElement.style.setProperty('--card-desc-badge-bg', config.cardDescBadgeBg || '#d32f2f');
    document.documentElement.style.setProperty('--card-desc-badge-text', config.cardDescBadgeText || '#ffffff');
    document.documentElement.style.setProperty('--card-desc-new-price', config.cardDescNewPrice || '#d32f2f');

    document.documentElement.style.setProperty('--card-pack-bg-start', config.cardPackBgStart || '#0d1b2a');
    document.documentElement.style.setProperty('--card-pack-bg-end', config.cardPackBgEnd || '#1b263b');
    document.documentElement.style.setProperty('--card-pack-border', config.cardPackBorder || '#fbc02d');
    document.documentElement.style.setProperty('--card-pack-text-name', config.cardPackTextName || '#ffffff');
    document.documentElement.style.setProperty('--card-pack-price', config.cardPackPrice || '#fbc02d');

    document.documentElement.style.setProperty('--card-unitario-bg-start', config.cardUnitarioBgStart || '#1e1b4b');
    document.documentElement.style.setProperty('--card-unitario-bg-end', config.cardUnitarioBgEnd || '#311042');
    document.documentElement.style.setProperty('--card-unitario-border', config.cardUnitarioBorder || '#fbc02d');
    document.documentElement.style.setProperty('--card-unitario-text-name', config.cardUnitarioTextName || '#ffffff');
    document.documentElement.style.setProperty('--card-unitario-price', config.cardUnitarioPrice || '#fbc02d');

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
    if (fetchTimer) clearTimeout(fetchTimer);
    
    const run = async () => {
        await fetchPromotions();
        fetchTimer = setTimeout(run, fetchInterval);
    };
    fetchTimer = setTimeout(run, fetchInterval);
}

function scheduleDisplayConfigFetch() {
    if (configTimer) clearTimeout(configTimer);
    
    const run = async () => {
        await fetchDisplayConfig(false);
        configTimer = setTimeout(run, DISPLAY_CONFIG_REFRESH_INTERVAL);
    };
    configTimer = setTimeout(run, DISPLAY_CONFIG_REFRESH_INTERVAL);
}

function applyLiveConfigChange(previousState) {
    const fetchTimingChanged = previousState.fetchInterval !== fetchInterval;
    const filterActiveOnlyChanged = previousState.filterActiveOnly !== (displayConfig && displayConfig.filterActiveOnly);
    const presentationChanged =
        previousState.layoutMode !== layoutMode ||
        previousState.itemsPerPage !== itemsPerPage ||
        previousState.carouselInterval !== carouselInterval ||
        previousState.vitrineItemInterval !== vitrineItemInterval ||
        filterActiveOnlyChanged;

    if (fetchTimingChanged) {
        schedulePromotionFetch();
    }

    if (presentationChanged) {
        currentPage = 0;
        vitrineActiveIndex = 0;
        if (filterActiveOnlyChanged) {
            fetchPromotions();
        } else {
            updateCarousel();
        }
    }
}

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function filterPromotionsIfNecessary(promotions) {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    return promotions.filter(item => {
        // 1. Validação de Intervalo de Datas — SEMPRE aplicada
        if (item.data_inicio && item.data_inicio.trim() !== '') {
            if (todayStr < item.data_inicio.trim()) {
                return false; // A oferta ainda não começou
            }
        }

        if (item.data_fim && item.data_fim.trim() !== '') {
            if (todayStr > item.data_fim.trim()) {
                return false; // A oferta já terminou
            }
        } else if (item.data_validade && item.data_validade.trim() !== '') {
            if (todayStr > item.data_validade.trim()) {
                return false; // A oferta já expirou
            }
        }

        // 2. Validação de Dias da Semana e Horário — somente quando filterActiveOnly está ativo
        if (!displayConfig || displayConfig.filterActiveOnly !== true) {
            return true;
        }

        // 2. Validação de Dias da Semana
        if (item.dias_semana && String(item.dias_semana).trim() !== '') {
            const todayDay = now.getDay(); // 0 (Domingo) a 6 (Sábado)
            const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            const dayShortNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

            const rawDays = String(item.dias_semana)
                .split(',')
                .map(d => d.trim().toLowerCase())
                .filter(Boolean);

            if (rawDays.length > 0) {
                const matchesDay = rawDays.some(d => {
                    if (d === String(todayDay)) return true;
                    if (d === dayNames[todayDay] || d.startsWith(dayNames[todayDay])) return true;
                    if (todayDay === 2 && (d === 'terça' || d.startsWith('terça'))) return true;
                    if (d === dayShortNames[todayDay]) return true;
                    return false;
                });

                if (!matchesDay) {
                    return false; // Não é dia de exibição para este produto hoje
                }
            }
        }

        // 3. Validação de Faixa de Horário
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeVal = currentHours * 60 + currentMinutes;

        if (item.hora_inicio && item.hora_inicio.trim() !== '') {
            const matchStart = item.hora_inicio.trim().match(/^(\d{1,2}):(\d{2})/);
            if (matchStart) {
                const startTimeVal = parseInt(matchStart[1], 10) * 60 + parseInt(matchStart[2], 10);
                if (currentTimeVal < startTimeVal) {
                    return false; // Antes da hora de início
                }
            }
        }

        if (item.hora_fim && item.hora_fim.trim() !== '') {
            const matchEnd = item.hora_fim.trim().match(/^(\d{1,2}):(\d{2})/);
            if (matchEnd) {
                const endTimeVal = parseInt(matchEnd[1], 10) * 60 + parseInt(matchEnd[2], 10);
                if (currentTimeVal > endTimeVal) {
                    return false; // Depois da hora de término
                }
            }
        }

        return true;
    });
}

async function fetchPromotions() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro na resposta da API');
        
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Formato inesperado da API');
        const normalizedData = data.map(normalizePromotion).filter(Boolean);
        const filteredData = filterPromotionsIfNecessary(normalizedData);
        lastFetchFailed = false;
        
        const dataChanged = !carouselInitialized || JSON.stringify(filteredData) !== JSON.stringify(allPromotions);
        if (dataChanged) {
            allPromotions = filteredData;
            currentPage = 0;
            vitrineActiveIndex = 0;
            carouselInitialized = true;
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

    // Tipo de promoção: 'preco_fixo' | 'leva_paga' | 'desconto' | 'pack'
    // null/vazio -> comportamento padrão (preco_fixo)
    const tipoRaw = String(item.tipo_promo || '').trim().toLowerCase();
    const TIPOS_VALIDOS = ['preco_fixo', 'leva_paga', 'desconto', 'pack', 'unitario'];
    const tipo_promo = TIPOS_VALIDOS.includes(tipoRaw) ? tipoRaw : 'preco_fixo';

    return {
        ...item,
        id: item.id != null ? item.id : cryptoRandomId(),
        nome_produto: normalizeText(item.nome_produto || item.nome || 'Produto em oferta'),
        preco_anterior: item.preco_anterior != null ? item.preco_anterior : null,
        preco_atual: isNaN(currentPrice) ? 0 : currentPrice,
        link_imagem: String(item.link_imagem || '').trim(),
        data_validade: String(item.data_validade || '').trim(),
        data_inicio: String(item.data_inicio || '').trim(),
        data_fim: String(item.data_fim || item.data_validade || '').trim(),
        dias_semana: item.dias_semana || '',
        hora_inicio: String(item.hora_inicio || '').trim(),
        hora_fim: String(item.hora_fim || '').trim(),
        texto_validade: normalizeText(item.texto_validade || ''),
        // Campos de tipo de promoção
        tipo_promo,
        qtd_leva: item.qtd_leva != null ? parseInt(item.qtd_leva, 10) : null,
        qtd_paga: item.qtd_paga != null ? parseInt(item.qtd_paga, 10) : null,
        percentual_desconto: item.percentual_desconto != null ? parseFloat(item.percentual_desconto) : null,
        qtd_minima: item.qtd_minima != null ? parseInt(item.qtd_minima, 10) : null, // quantidade mínima p/ ganhar o desconto
        qtd_pack: item.qtd_pack != null ? parseInt(item.qtd_pack, 10) : null,
        condicao_qty: String(item.condicao_qty || item.modo_qty || '').trim().toLowerCase()
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

function isLastActiveDay(item) {
    const endDateStr = item.data_fim || item.data_validade;
    if (!endDateStr || endDateStr.trim() === '') {
        return false;
    }

    const now = new Date();
    const todayStr = getLocalDateString(now);

    if (todayStr > endDateStr) {
        return false;
    }

    // Se hoje é exatamente o dia de término da promoção, hoje é o último dia
    if (todayStr === endDateStr) {
        return true;
    }

    // Se hoje ela não está ativa de acordo com o filtro (ex: dia da semana errado),
    // hoje não é o último dia de exibição
    if (filterPromotionsIfNecessary([item]).length === 0) {
        return false;
    }

    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    if (isNaN(endDate.getTime())) {
        return false;
    }
    endDate.setHours(0, 0, 0, 0);

    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);

    // Itera dia por dia a partir de amanhã até o dia final de vigência
    while (true) {
        checkDate.setDate(checkDate.getDate() + 1);
        if (checkDate.getTime() > endDate.getTime()) {
            break;
        }

        // Se tem restrição de dias da semana, verifica se o dia futuro é ativo
        if (item.dias_semana && String(item.dias_semana).trim() !== '') {
            const checkDayOfWeek = checkDate.getDay();
            const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            const dayShortNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

            const rawDays = String(item.dias_semana)
                .split(',')
                .map(d => d.trim().toLowerCase())
                .filter(Boolean);

            const matchesDay = rawDays.some(d => {
                if (d === String(checkDayOfWeek)) return true;
                if (d === dayNames[checkDayOfWeek] || d.startsWith(dayNames[checkDayOfWeek])) return true;
                if (checkDayOfWeek === 2 && (d === 'terça' || d.startsWith('terça'))) return true;
                if (d === dayShortNames[checkDayOfWeek]) return true;
                return false;
            });

            if (matchesDay) {
                return false; // Existe outro dia ativo no futuro antes da data fim
            }
        } else {
            return false; // Sem limites de dia da semana, então amanhã com certeza é ativo
        }
    }

    return true; // Não há mais dias ativos futuros até a data final, hoje é o último dia!
}

function getValidityBadgeText(item) {
    return getValidityBadgeParts(item).map(part => part.value).join(' - ');
}

function getValidityBadgeParts(item) {
    const customText = item.texto_validade && item.texto_validade.trim() !== ''
        ? item.texto_validade.trim().toUpperCase()
        : '';

    if (customText) return [{ type: 'text', label: 'OFERTA', value: customText }];

    if (isLastActiveDay(item)) {
        return [{ type: 'date', label: 'VALIDADE', value: 'ÚLTIMO DIA!' }];
    }

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
        const tipo = item.tipo_promo || 'preco_fixo';

        if (tipo === 'leva_paga') {
            carouselContainer.appendChild(buildCardLevaPaga(item));
        } else if (tipo === 'desconto') {
            carouselContainer.appendChild(buildCardDesconto(item));
        } else if (tipo === 'pack') {
            carouselContainer.appendChild(buildCardPack(item));
        } else if (tipo === 'unitario') {
            carouselContainer.appendChild(buildCardUnitario(item));
        } else {
            carouselContainer.appendChild(buildCardPrecoFixo(item));
        }
    });
}

// ── BUILDERS DE CARD POR TIPO ─────────────────────────────────────────────────

// Helper: cria a estrutura base de um card (imagem + info wrapper)
function createCardBase(item, extraClass) {
    const card = document.createElement('div');
    card.className = 'product-card' + (extraClass ? ` ${extraClass}` : '');
    applyTextSizing(card, item);

    const validityParts = getValidityBadgeParts(item);
    if (validityParts.length > 0) card.classList.add('has-schedule');

    const isSemFoto = layoutMode === 'sem-foto' || layoutMode === 'sem-foto-destaque';
    const validityText = getValidityBadgeText(item);

    if (isSemFoto) {
        // Badge decorativo no topo para modos sem foto
        const tipo = item.tipo_promo || 'preco_fixo';
        
        let showBadge = false;
        let badgeText = '';

        if (validityText) {
            showBadge = true;
            badgeText = validityText;
        } else {
            if (tipo === 'preco_fixo') {
                showBadge = true;
                badgeText = 'OFERTA IMPERDÍVEL';
            } else if (tipo === 'desconto' && item.percentual_desconto != null) {
                showBadge = true;
                badgeText = `${item.percentual_desconto}% OFF`;
            } else if (tipo === 'leva_paga') {
                showBadge = true;
                badgeText = `LEVE ${item.qtd_leva || '?'} PAGUE ${item.qtd_paga || '?'}`;
            } else if (tipo === 'unitario' || tipo === 'pack') {
                showBadge = true;
                badgeText = 'ATACADO';
            } else {
                showBadge = true;
                badgeText = 'OFERTA';
            }
        }

        if (showBadge) {
            const badge = document.createElement('div');
            badge.className = 'promo-badge';
            badge.textContent = badgeText;
            card.appendChild(badge);
        }
    } else {
        // Seção de imagem normal
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'product-image-wrapper';
        const imgEl = document.createElement('img');
        imgEl.className = 'product-image';
        imgEl.alt = 'Produto';
        imgWrapper.appendChild(imgEl);
        card.appendChild(imgWrapper);
        setProductImage(imgEl, imgWrapper, item.link_imagem);
    }

    // Info wrapper
    const info = document.createElement('div');
    info.className = 'product-info';
    card.appendChild(info);

    // Badge de agenda (dias/horário) — inserido pelo builder após o nome
    const validityBadgeEl = document.createElement('span');
    validityBadgeEl.className = 'validity-badge';
    validityBadgeEl.style.display = 'none';
    
    // Se for modo sem foto e já estivermos exibindo a validade no badge superior (topo),
    // ocultamos o badge de validade interno para não repetir a mesma informação.
    if (!isSemFoto || !validityText) {
        renderValidityBadges(validityBadgeEl, item);
    }

    return { card, info, validityBadgeEl };
}


// Tipo: Preço Fixo (comportamento original)
function buildCardPrecoFixo(item) {
    // Usa o template HTML original para máxima compatibilidade
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

    // Retorna o fragmento como elemento
    const wrapper = document.createElement('div');
    wrapper.appendChild(clone);
    return wrapper.firstElementChild;
}

// Tipo: Leva e Paga
function buildCardLevaPaga(item) {
    const { card, info, validityBadgeEl } = createCardBase(item, 'card-leva-paga');

    const name = document.createElement('h2');
    name.className = 'product-name';
    name.textContent = item.nome_produto;
    info.appendChild(name);
    info.appendChild(validityBadgeEl); // badge de validade abaixo do nome

    // Preço unitário (opcional)
    if (item.preco_atual > 0) {
        const priceRow = document.createElement('div');
        priceRow.className = 'lp-price-row';
        priceRow.innerHTML = `<span class="lp-unit-label">Preço unitário</span><span class="lp-unit-price">${formatCurrency(item.preco_atual)}</span>`;
        info.appendChild(priceRow);
    }

    // Badge LEVE X → PAGUE Y
    const badgeWrap = document.createElement('div');
    badgeWrap.className = 'lp-badge-wrap';

    const qtdLeva = item.qtd_leva || '?';
    const qtdPaga = item.qtd_paga || '?';

    badgeWrap.innerHTML = `
        <span class="lp-block lp-leve">
            <span class="lp-num">${qtdLeva}</span>
            <span class="lp-label">LEVE</span>
        </span>
        <span class="lp-sep">→</span>
        <span class="lp-block lp-pague">
            <span class="lp-num">${qtdPaga}</span>
            <span class="lp-label">PAGUE</span>
        </span>
    `;
    info.appendChild(badgeWrap);

    return card;
}



// Tipo: Desconto Percentual
function buildCardDesconto(item) {
    const { card, info, validityBadgeEl } = createCardBase(item, 'card-desconto');

    const name = document.createElement('h2');
    name.className = 'product-name';
    name.textContent = item.nome_produto;
    info.appendChild(name);
    info.appendChild(validityBadgeEl);

    // Condição de quantidade mínima (ex: "A partir de 3 unidades" ou "A cada 3 unidades")
    if (item.qtd_minima && item.qtd_minima > 1) {
        const cond = document.createElement('div');
        cond.className = 'desc-qty-cond';
        if (item.condicao_qty === 'a_cada' || item.condicao_qty === 'cada' || item.condicao_qty === 'a cada') {
            cond.textContent = `A cada ${item.qtd_minima} unidades`;
        } else {
            cond.textContent = `A partir de ${item.qtd_minima} unidades`;
        }
        info.appendChild(cond);
    }

    // Linha: badge de % + preços
    const row = document.createElement('div');
    row.className = 'desc-row';

    const pct = item.percentual_desconto;
    const badge = document.createElement('div');
    badge.className = 'desc-pct-badge';
    if (pct != null && !isNaN(pct)) {
        badge.innerHTML = `<span class="desc-pct-num">${pct}%</span><span class="desc-pct-label">OFF</span>`;
    } else {
        badge.innerHTML = `<span class="desc-pct-label">DESCONTO</span>`;
    }
    row.appendChild(badge);

    const prices = document.createElement('div');
    prices.className = 'desc-prices';
    if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
        const old = document.createElement('span');
        old.className = 'old-price';
        old.textContent = formatCurrency(item.preco_anterior);
        prices.appendChild(old);
    }
    const newP = document.createElement('span');
    newP.className = 'new-price';
    newP.textContent = formatCurrency(item.preco_atual);
    prices.appendChild(newP);
    row.appendChild(prices);

    info.appendChild(row);
    return card;
}



// Tipo: Pack (quantidade por preço)
function buildCardPack(item) {
    const { card, info, validityBadgeEl } = createCardBase(item, 'card-pack');

    const name = document.createElement('h2');
    name.className = 'product-name';
    name.textContent = item.nome_produto;
    info.appendChild(name);
    info.appendChild(validityBadgeEl); // badge de validade abaixo do nome

    const qtd = item.qtd_pack;
    if (qtd && qtd > 0) {
        const label = document.createElement('div');
        label.className = 'pack-qty-label';
        label.textContent = `${qtd} unidades por`;
        info.appendChild(label);
    }

    const priceBadge = document.createElement('div');
    priceBadge.className = 'pack-price-badge';
    priceBadge.textContent = formatCurrency(item.preco_atual);
    info.appendChild(priceBadge);

    if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
        const old = document.createElement('div');
        old.className = 'pack-old-price';
        old.textContent = `Antes: ${formatCurrency(item.preco_anterior)}`;
        info.appendChild(old);
    }

    return card;
}

// Tipo: Unitario (Preço unitário por quantidade)
function buildCardUnitario(item) {
    const { card, info, validityBadgeEl } = createCardBase(item, 'card-unitario');

    const name = document.createElement('h2');
    name.className = 'product-name';
    name.textContent = item.nome_produto;
    info.appendChild(name);
    info.appendChild(validityBadgeEl);

    const qty = item.qtd_minima || item.qtd_pack || 3;
    const label = document.createElement('div');
    label.className = 'unitario-qty-label';
    if (item.condicao_qty === 'a_cada' || item.condicao_qty === 'cada' || item.condicao_qty === 'a cada') {
        label.textContent = `Comprando ${qty} unidades`;
    } else {
        label.textContent = `A partir de ${qty} unidades`;
    }
    info.appendChild(label);

    const eachLabel = document.createElement('div');
    eachLabel.className = 'unitario-each-label';
    eachLabel.textContent = 'cada uma sai por:';
    info.appendChild(eachLabel);

    const priceBadge = document.createElement('div');
    priceBadge.className = 'unitario-price-badge';
    priceBadge.textContent = formatCurrency(item.preco_atual);
    info.appendChild(priceBadge);

    if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
        const old = document.createElement('div');
        old.className = 'unitario-old-price';
        old.textContent = `Antes: ${formatCurrency(item.preco_anterior)}`;
        info.appendChild(old);
    }

    return card;
}

// ─────────────────────────────────────────────────────────────────────────────

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
        listInfo.appendChild(listName);

        const priceRow = document.createElement('div');
        priceRow.className = 'list-price-row';
        priceRow.style.display = 'flex';
        priceRow.style.alignItems = 'center';
        priceRow.style.gap = '8px';
        priceRow.style.flexWrap = 'wrap';

        const listPrice = document.createElement('div');
        listPrice.className = 'list-price';
        listPrice.textContent = formatCurrency(item.preco_atual);
        priceRow.appendChild(listPrice);

        // Customizações e badges por tipo de promoção na lista lateral
        const tipo = item.tipo_promo || 'preco_fixo';
        if (tipo === 'leva_paga') {
            const badge = document.createElement('span');
            badge.className = 'vitrine-badge vitrine-badge-lp';
            badge.textContent = `Leve ${item.qtd_leva || '?'} Pague ${item.qtd_paga || '?'}`;
            priceRow.appendChild(badge);
        } else if (tipo === 'desconto') {
            if (item.percentual_desconto != null && !isNaN(item.percentual_desconto)) {
                const badge = document.createElement('span');
                badge.className = 'vitrine-badge vitrine-badge-desc';
                badge.textContent = `${item.percentual_desconto}% OFF`;
                priceRow.appendChild(badge);
            }
            if (item.qtd_minima && item.qtd_minima > 1) {
                const qBadge = document.createElement('span');
                qBadge.className = 'vitrine-badge vitrine-badge-qty';
                const prefix = (item.condicao_qty === 'a_cada' || item.condicao_qty === 'cada' || item.condicao_qty === 'a cada') ? 'Cada' : 'Mín.';
                qBadge.textContent = `${prefix} ${item.qtd_minima} un.`;
                priceRow.appendChild(qBadge);
            }
        } else if (tipo === 'pack') {
            const badge = document.createElement('span');
            badge.className = 'vitrine-badge vitrine-badge-pack';
            badge.textContent = `Pack ${item.qtd_pack || '?'} un.`;
            priceRow.appendChild(badge);
        } else if (tipo === 'unitario') {
            const badge = document.createElement('span');
            badge.className = 'vitrine-badge vitrine-badge-unit';
            const prefix = (item.condicao_qty === 'a_cada' || item.condicao_qty === 'cada' || item.condicao_qty === 'a cada') ? 'Cada' : 'Mín.';
            badge.textContent = `${prefix} ${item.qtd_minima || item.qtd_pack || '?'} un.`;
            priceRow.appendChild(badge);
        }

        listInfo.appendChild(priceRow);
        listItem.appendChild(listInfo);
        sidebar.appendChild(listItem);
    });

    // Atualiza a area de destaque com o item ativo
    updateVitrineHighlight(itemsToShow[vitrineActiveIndex], highlightArea);
}

function updateVitrineHighlight(item, container) {
    if (!item) return;

    container.innerHTML = '';

    const tipo = item.tipo_promo || 'preco_fixo';

    const card = document.createElement('div');
    // Adiciona classe do tipo para herdar background/cores corretos
    const typeClass = tipo !== 'preco_fixo' ? ` card-${tipo.replace(/_/g, '-')}` : '';
    card.className = `product-card large-vitrine-card${typeClass}`;
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

    if (tipo === 'leva_paga') {
        // ── Leva e Paga na vitrine ──
        if (item.preco_atual > 0) {
            const pr = document.createElement('div');
            pr.className = 'lp-price-row';
            pr.innerHTML = `<span class="lp-unit-label">Preço unitário</span><span class="lp-unit-price">${formatCurrency(item.preco_atual)}</span>`;
            info.appendChild(pr);
        }

        const qtdLeva = item.qtd_leva || '?';
        const qtdPaga = item.qtd_paga || '?';
        const bw = document.createElement('div');
        bw.className = 'lp-badge-wrap';
        bw.innerHTML = `
            <span class="lp-block lp-leve"><span class="lp-num">${qtdLeva}</span><span class="lp-label">LEVE</span></span>
            <span class="lp-sep">→</span>
            <span class="lp-block lp-pague"><span class="lp-num">${qtdPaga}</span><span class="lp-label">PAGUE</span></span>
        `;
        info.appendChild(bw);

    } else if (tipo === 'desconto') {
        // ── Desconto na vitrine ──
        if (item.qtd_minima && item.qtd_minima > 1) {
            const cond = document.createElement('div');
            cond.className = 'desc-qty-cond';
            if (item.condicao_qty === 'a_cada' || item.condicao_qty === 'cada' || item.condicao_qty === 'a cada') {
                cond.textContent = `A cada ${item.qtd_minima} unidades`;
            } else {
                cond.textContent = `A partir de ${item.qtd_minima} unidades`;
            }
            info.appendChild(cond);
        }
        const row = document.createElement('div');
        row.className = 'desc-row';
        const pct = item.percentual_desconto;
        const bdg = document.createElement('div');
        bdg.className = 'desc-pct-badge';
        bdg.innerHTML = pct != null && !isNaN(pct)
            ? `<span class="desc-pct-num">${pct}%</span><span class="desc-pct-label">OFF</span>`
            : `<span class="desc-pct-label">DESCONTO</span>`;
        row.appendChild(bdg);
        const prices = document.createElement('div');
        prices.className = 'desc-prices';
        if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
            const old = document.createElement('span');
            old.className = 'old-price';
            old.textContent = formatCurrency(item.preco_anterior);
            prices.appendChild(old);
        }
        const newP = document.createElement('span');
        newP.className = 'new-price';
        newP.textContent = formatCurrency(item.preco_atual);
        prices.appendChild(newP);
        row.appendChild(prices);
        info.appendChild(row);

    } else if (tipo === 'pack') {
        // ── Pack na vitrine ──
        const qtd = item.qtd_pack;
        if (qtd && qtd > 0) {
            const lbl = document.createElement('div');
            lbl.className = 'pack-qty-label';
            lbl.textContent = `${qtd} unidades por`;
            info.appendChild(lbl);
        }
        const pb = document.createElement('div');
        pb.className = 'pack-price-badge';
        pb.textContent = formatCurrency(item.preco_atual);
        info.appendChild(pb);
        if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
            const old = document.createElement('div');
            old.className = 'pack-old-price';
            old.textContent = `Antes: ${formatCurrency(item.preco_anterior)}`;
            info.appendChild(old);
        }

    } else if (tipo === 'unitario') {
        // ── Unitário na vitrine ──
        const qty = item.qtd_minima || item.qtd_pack || 3;
        const lbl = document.createElement('div');
        lbl.className = 'unitario-qty-label';
        if (item.condicao_qty === 'a_cada' || item.condicao_qty === 'cada' || item.condicao_qty === 'a cada') {
            lbl.textContent = `Comprando ${qty} unidades`;
        } else {
            lbl.textContent = `A partir de ${qty} unidades`;
        }
        info.appendChild(lbl);

        const eachLbl = document.createElement('div');
        eachLbl.className = 'unitario-each-label';
        eachLbl.textContent = 'cada uma sai por:';
        info.appendChild(eachLbl);

        const pb = document.createElement('div');
        pb.className = 'unitario-price-badge';
        pb.textContent = formatCurrency(item.preco_atual);
        info.appendChild(pb);

        if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
            const old = document.createElement('div');
            old.className = 'unitario-old-price';
            old.textContent = `Antes: ${formatCurrency(item.preco_anterior)}`;
            info.appendChild(old);
        }

    } else {
        // ── Preço Fixo (padrão) na vitrine ──
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
    }

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

// Transição de entrada e captura de links
function setupTransitions() {
    requestAnimationFrame(() => {
        document.body.classList.add('page-loaded');
    });

    // Captura links locais (como o logo para voltar à tela principal)
    document.querySelectorAll("a").forEach(link => {
        if (
            link.hostname === window.location.hostname &&
            !link.hash &&
            link.getAttribute("target") !== "_blank" &&
            !link.href.startsWith("javascript:")
        ) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUrl = link.href;
                document.body.classList.add('page-exit');
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 350);
            });
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTransitions);
} else {
    setupTransitions();
}


