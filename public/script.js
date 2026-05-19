const API_URL = '/api/promocoes';
const FETCH_INTERVAL = 30000; // 30 segundos para buscar no banco
const CAROUSEL_INTERVAL = 10000; // 10 segundos por página no carrossel normal
const VITRINE_ITEM_INTERVAL = 6000; // 6 segundos por item no modo vitrine

// Configuração de Layout dinâmico via URL
const urlParams = new URLSearchParams(window.location.search);
const layoutMode = urlParams.get('layout') || 'padrao';

let itemsPerPage = 4;
if (layoutMode === 'destaque') {
    itemsPerPage = 1;
    document.body.classList.add('layout-destaque');
} else if (layoutMode === 'compacto') {
    itemsPerPage = 6;
    document.body.classList.add('layout-compacto');
} else if (layoutMode === 'vitrine') {
    itemsPerPage = 5; // A lista da esquerda terá até 5 itens por vez
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
let vitrineActiveIndex = 0; // Para o layout vitrine
let lastFetchFailed = false;

const carouselContainer = document.getElementById('carousel-container');
const template = document.getElementById('product-template');

async function init() {
    await fetchPromotions();
    setInterval(fetchPromotions, FETCH_INTERVAL);
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
        } else if (carouselContainer.querySelector('.status-message')) {
            renderCurrentPage();
        }
    } catch (error) {
        console.error('Falha ao buscar promoções:', error);
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

function normalizePromotion(item) {
    if (!item || typeof item !== 'object') return null;

    const currentPrice = parseFloat(item.preco_atual);

    return {
        ...item,
        id: item.id ?? cryptoRandomId(),
        nome_produto: String(item.nome_produto || item.nome || 'Produto em oferta').trim(),
        preco_anterior: item.preco_anterior ?? null,
        preco_atual: isNaN(currentPrice) ? 0 : currentPrice,
        link_imagem: String(item.link_imagem || '').trim(),
        data_validade: String(item.data_validade || '').trim(),
        texto_validade: String(item.texto_validade || '').trim()
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
        imgElement.src = imageUrl;
    } else {
        showImageFallback(imgElement, imgWrapper);
    }
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
    if (item.texto_validade && item.texto_validade.trim() !== '') {
        return item.texto_validade.trim().toUpperCase();
    }

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
                return "SÓ HOJE!";
            } else if (diffDays === 1) {
                return "ATÉ AMANHÃ!";
            } else if (diffDays > 1 && diffDays <= 7) {
                const diasSemana = ["DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"];
                return `ATÉ ${diasSemana[valDate.getDay()]}`;
            } else if (diffDays > 7) {
                return `ATÉ ${day}/${month}`;
            }
        } catch (e) {
            // Ignora erro
        }
    }
    return "";
}

function updateCarousel() {
    if (carouselTimer) clearInterval(carouselTimer);
    
    renderCurrentPage();

    if (layoutMode === 'vitrine') {
        if (allPromotions.length > 1) {
            carouselTimer = setInterval(nextVitrineItem, VITRINE_ITEM_INTERVAL);
        }
    } else {
        if (allPromotions.length > itemsPerPage) {
            carouselTimer = setInterval(nextPage, CAROUSEL_INTERVAL);
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
            carouselContainer.innerHTML = '<h2 style="color: #fff; font-size: 5vh;">Nenhuma promoção ativa no momento.</h2>';
            carouselContainer.classList.remove('fade-out');
            return;
        }

        const startIndex = (currentPage * itemsPerPage) % allPromotions.length;
        const itemsToShow = [];
        
        if (allPromotions.length <= itemsPerPage) {
            // Se tivermos menos itens que o limite da página, mostramos todos
            itemsToShow.push(...allPromotions);
        } else {
            // Se tivermos mais itens, garantimos que a tela sempre fique CHEIA
            // pegando os próximos itens do array circular
            for (let i = 0; i < itemsPerPage; i++) {
                const itemIndex = (startIndex + i) % allPromotions.length;
                itemsToShow.push(allPromotions[itemIndex]);
            }
        }

        if (layoutMode === 'vitrine') {
            renderVitrine(itemsToShow);
        } else {
            renderGrid(itemsToShow);
        }

        carouselContainer.classList.remove('fade-out');
    }, 800);
}

// Renderiza layouts padrão, destaque e compacto
function renderGrid(itemsToShow) {
    itemsToShow.forEach(item => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.product-card');
        const imgWrapper = clone.querySelector('.product-image-wrapper');
        const imgElement = clone.querySelector('.product-image');
        
        const validityText = getValidityBadgeText(item);
        applyTextSizing(card, item);

        if (layoutMode === 'sem-foto' || layoutMode === 'sem-foto-destaque') {
            if (imgWrapper) imgWrapper.remove();
            
            // Cria um badge decorativo vermelho e amarelo
            const badge = document.createElement('div');
            badge.className = 'promo-badge';
            badge.textContent = validityText || 'OFERTA IMPERDÍVEL';
            clone.querySelector('.product-card').prepend(badge);
        } else {
            setProductImage(imgElement, imgWrapper, item.link_imagem);

            // Define o badge de validade sutil nos modos com fotos
            const validityBadgeEl = clone.querySelector('.validity-badge');
            if (validityText && validityBadgeEl) {
                validityBadgeEl.textContent = validityText;
                validityBadgeEl.style.display = 'inline-block';
            }
        }
        
        clone.querySelector('.product-name').textContent = item.nome_produto;
        
        const oldPriceEl = clone.querySelector('.old-price');
        if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
            oldPriceEl.textContent = formatCurrency(item.preco_anterior);
        } else {
            oldPriceEl.style.display = 'none';
        }
        
        clone.querySelector('.new-price').textContent = formatCurrency(item.preco_atual);
        
        if (layoutMode === 'padrao' && allPromotions.length <= 2) {
            card.classList.add('large-card');
        }

        carouselContainer.appendChild(clone);
    });
}

// Renderiza o layout dividido (Vitrine)
function renderVitrine(itemsToShow) {
    const sidebar = document.createElement('div');
    sidebar.className = 'vitrine-sidebar';
    
    const highlightArea = document.createElement('div');
    highlightArea.className = 'vitrine-highlight fade-in-element'; // classe p/ animação
    
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

    // Atualiza a área de destaque com o item ativo
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

    const valTextSafe = getValidityBadgeText(item);
    if (valTextSafe) {
        const validity = document.createElement('span');
        validity.className = 'validity-badge';
        validity.style.display = 'inline-block';
        validity.textContent = valTextSafe;
        info.appendChild(validity);
    }

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
    return;

    let imgHtml = '';
    if (item.link_imagem && item.link_imagem.trim() !== '') {
        imgHtml = `<img src="${item.link_imagem}" alt="Produto" class="product-image">`;
    } else {
        imgHtml = `<div class="no-image-placeholder"></div>`;
    }

    let oldPriceHtml = '';
    if (item.preco_anterior && parseFloat(item.preco_anterior) > 0) {
        oldPriceHtml = `<span class="old-price">${formatCurrency(item.preco_anterior)}</span>`;
    }

    const valText = getValidityBadgeText(item);
    let validityHtml = '';
    if (valText) {
        validityHtml = `<span class="validity-badge" style="display: inline-block;">${valText}</span>`;
    }

    container.innerHTML = `
        <div class="product-card large-vitrine-card">
            <div class="product-image-wrapper">
                ${imgHtml}
            </div>
            <div class="product-info">
                <h2 class="product-name">${item.nome_produto}</h2>
                ${validityHtml}
                <div class="prices">
                    ${oldPriceHtml}
                    <span class="new-price">${formatCurrency(item.preco_atual)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Força uma animação
    container.classList.remove('fade-in-element');
    void container.offsetWidth; // trigger reflow
    container.classList.add('fade-in-element');
}

// Lógica de avanço para Vitrine
function nextVitrineItem() {
    const startIndex = (currentPage * itemsPerPage) % allPromotions.length;
    const itemsToShow = [];
    
    if (allPromotions.length <= itemsPerPage) {
        itemsToShow.push(...allPromotions);
    } else {
        for (let i = 0; i < itemsPerPage; i++) {
            const itemIndex = (startIndex + i) % allPromotions.length;
            itemsToShow.push(allPromotions[itemIndex]);
        }
    }
    
    vitrineActiveIndex++;
    
    if (vitrineActiveIndex >= itemsToShow.length) {
        // Acabou a página atual, avança para a próxima página de 5 itens
        vitrineActiveIndex = 0;
        nextPage();
    } else {
        // Apenas atualiza a seleção na tela (sem dar fade na tela toda)
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
