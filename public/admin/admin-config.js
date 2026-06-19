const hostUrl = window.location.origin;

const layoutOptions = [
    { value: 'padrao', label: 'Modo Padrao', detail: 'Grid equilibrado para 4 ofertas.' },
    { value: 'destaque', label: 'Modo Destaque', detail: 'Uma oferta grande por vez.' },
    { value: 'compacto', label: 'Modo Compacto', detail: 'Grade densa para mais produtos.' },
    { value: 'vitrine', label: 'Modo Vitrine', detail: 'Lista lateral com oferta em destaque.' },
    { value: 'sem-foto', label: 'Sem Foto (Grade)', detail: 'Grade tipografica para ofertas sem imagem.' },
    { value: 'sem-foto-destaque', label: 'Sem Foto (Destaque)', detail: 'Uma oferta tipografica gigante.' }
];

const dbLabels = {
    mysql: 'MySQL',
    postgres: 'PostgreSQL',
    postgresql: 'PostgreSQL',
    sqlserver: 'SQL Server',
    mssql: 'SQL Server'
};

function displayLink(layout) {
    return `${hostUrl}/display?layout=${layout}`;
}

const fields = {
    dbType: document.getElementById('dbType'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    dbInstance: document.getElementById('dbInstance'),
    database: document.getElementById('database'),
    user: document.getElementById('user'),
    password: document.getElementById('password'),
    dbMockFallback: document.getElementById('dbMockFallback'),
    dbQuery: document.getElementById('dbQuery'),
    displayTitle: document.getElementById('displayTitle'),
    displayFooter: document.getElementById('displayFooter'),
    displayFetchInterval: document.getElementById('displayFetchInterval'),
    displayCarouselInterval: document.getElementById('displayCarouselInterval'),
    displayVitrineInterval: document.getElementById('displayVitrineInterval'),
    displayPrimaryColor: document.getElementById('displayPrimaryColor'),
    displayHeaderMidColor: document.getElementById('displayHeaderMidColor'),
    displayAccentColor: document.getElementById('displayAccentColor'),
    displayBackgroundColor: document.getElementById('displayBackgroundColor'),
    displayBgCenterColor: document.getElementById('displayBgCenterColor'),
    displayFooterBgColor: document.getElementById('displayFooterBgColor'),
    localImagesPath: document.getElementById('localImagesPath'),
    displayFilterActiveOnly: document.getElementById('displayFilterActiveOnly'),

    cardPadraoBgStart: document.getElementById('cardPadraoBgStart'),
    cardPadraoBgEnd: document.getElementById('cardPadraoBgEnd'),
    cardPadraoBorder: document.getElementById('cardPadraoBorder'),
    cardPadraoTextName: document.getElementById('cardPadraoTextName'),
    cardPadraoTextPrice: document.getElementById('cardPadraoTextPrice'),

    cardLevaBgStart: document.getElementById('cardLevaBgStart'),
    cardLevaBgEnd: document.getElementById('cardLevaBgEnd'),
    cardLevaBorder: document.getElementById('cardLevaBorder'),
    cardLevaTextName: document.getElementById('cardLevaTextName'),
    cardLeveBg: document.getElementById('cardLeveBg'),
    cardPagueBg: document.getElementById('cardPagueBg'),
    cardLevaUnitPrice: document.getElementById('cardLevaUnitPrice'),

    cardDescBgStart: document.getElementById('cardDescBgStart'),
    cardDescBgEnd: document.getElementById('cardDescBgEnd'),
    cardDescBorder: document.getElementById('cardDescBorder'),
    cardDescTextName: document.getElementById('cardDescTextName'),
    cardDescBadgeBg: document.getElementById('cardDescBadgeBg'),
    cardDescBadgeText: document.getElementById('cardDescBadgeText'),
    cardDescNewPrice: document.getElementById('cardDescNewPrice'),

    cardPackBgStart: document.getElementById('cardPackBgStart'),
    cardPackBgEnd: document.getElementById('cardPackBgEnd'),
    cardPackBorder: document.getElementById('cardPackBorder'),
    cardPackTextName: document.getElementById('cardPackTextName'),
    cardPackPrice: document.getElementById('cardPackPrice'),

    cardUnitarioBgStart: document.getElementById('cardUnitarioBgStart'),
    cardUnitarioBgEnd: document.getElementById('cardUnitarioBgEnd'),
    cardUnitarioBorder: document.getElementById('cardUnitarioBorder'),
    cardUnitarioTextName: document.getElementById('cardUnitarioTextName'),
    cardUnitarioPrice: document.getElementById('cardUnitarioPrice')
};

const colorPropertyMap = {
    displayPrimaryColor: '--promo-primary',
    displayHeaderMidColor: '--promo-header-mid',
    displayAccentColor: '--promo-accent',
    displayBackgroundColor: '--promo-background',
    displayBgCenterColor: '--promo-bg-center',
    displayFooterBgColor: '--promo-footer-bg',

    cardPadraoBgStart: '--card-padrao-bg-start',
    cardPadraoBgEnd: '--card-padrao-bg-end',
    cardPadraoBorder: '--card-padrao-border',
    cardPadraoTextName: '--card-padrao-text-name',
    cardPadraoTextPrice: '--card-padrao-text-price',

    cardLevaBgStart: '--card-leva-bg-start',
    cardLevaBgEnd: '--card-leva-bg-end',
    cardLevaBorder: '--card-leva-border',
    cardLevaTextName: '--card-leva-text-name',
    cardLeveBg: '--card-leve-bg',
    cardPagueBg: '--card-pague-bg',
    cardLevaUnitPrice: '--card-leva-unit-price',

    cardDescBgStart: '--card-desc-bg-start',
    cardDescBgEnd: '--card-desc-bg-end',
    cardDescBorder: '--card-desc-border',
    cardDescTextName: '--card-desc-text-name',
    cardDescBadgeBg: '--card-desc-badge-bg',
    cardDescBadgeText: '--card-desc-badge-text',
    cardDescNewPrice: '--card-desc-new-price',

    cardPackBgStart: '--card-pack-bg-start',
    cardPackBgEnd: '--card-pack-bg-end',
    cardPackBorder: '--card-pack-border',
    cardPackTextName: '--card-pack-text-name',
    cardPackPrice: '--card-pack-price',

    cardUnitarioBgStart: '--card-unitario-bg-start',
    cardUnitarioBgEnd: '--card-unitario-bg-end',
    cardUnitarioBorder: '--card-unitario-border',
    cardUnitarioTextName: '--card-unitario-text-name',
    cardUnitarioPrice: '--card-unitario-price'
};

function syncAllPreviews() {
    for (const [fieldId, cssVarName] of Object.entries(colorPropertyMap)) {
        const input = fields[fieldId];
        if (input) {
            document.documentElement.style.setProperty(cssVarName, input.value);
        }
    }
    // Sincroniza o texto do título e rodapé na miniatura da tela
    const screenTitle = document.getElementById('previewScreenTitle');
    const screenFooter = document.getElementById('previewScreenFooter');
    if (screenTitle && fields.displayTitle) {
        screenTitle.textContent = fields.displayTitle.value || 'OFERTAS IMPERDIVEIS';
    }
    if (screenFooter && fields.displayFooter) {
        screenFooter.textContent = fields.displayFooter.value || '';
    }
}

function initLivePreviews() {
    for (const [fieldId, cssVarName] of Object.entries(colorPropertyMap)) {
        const input = fields[fieldId];
        if (input) {
            input.addEventListener('input', () => {
                document.documentElement.style.setProperty(cssVarName, input.value);
            });
        }
    }
    // Sincronização em tempo real de textos
    if (fields.displayTitle) {
        fields.displayTitle.addEventListener('input', () => {
            const screenTitle = document.getElementById('previewScreenTitle');
            if (screenTitle) {
                screenTitle.textContent = fields.displayTitle.value || 'OFERTAS IMPERDIVEIS';
            }
        });
    }
    if (fields.displayFooter) {
        fields.displayFooter.addEventListener('input', () => {
            const screenFooter = document.getElementById('previewScreenFooter');
            if (screenFooter) {
                screenFooter.textContent = fields.displayFooter.value || '';
            }
        });
    }
}

function initLayoutOptions() {
    const linksContainer = document.getElementById('layoutLinks');
    linksContainer.innerHTML = layoutOptions.map(item =>
        `<article class="layout-card">
            <div>
                <h3>${item.label}</h3>
                <p>${item.detail}</p>
            </div>
            <div class="layout-actions">
                <button type="button" class="icon-button" data-copy-layout="${item.value}" title="Copiar link" aria-label="Copiar link de ${item.label}">Copiar</button>
                <button type="button" class="icon-button open" data-open-layout="${item.value}" title="Abrir tela" aria-label="Abrir ${item.label}">Abrir</button>
            </div>
        </article>`
    ).join('');
}

function setButtonBusy(button, text) {
    if (!button) return () => {};
    const previousText = button.textContent;
    button.textContent = text;
    button.disabled = true;
    return () => {
        button.textContent = previousText;
        button.disabled = false;
    };
}

function millisecondsToSeconds(milliseconds, fallbackSeconds) {
    const value = Number(milliseconds);
    if (!Number.isFinite(value) || value <= 0) return fallbackSeconds;
    return Math.round(value / 1000);
}

function secondsToMilliseconds(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '';
    return Math.round(value * 1000);
}

function secondsLabel(secondsValue) {
    const seconds = Math.round(Number(secondsValue || 0));
    return seconds > 0 ? `${seconds}s` : '-';
}

function updateSummary() {
    document.getElementById('summaryDb').textContent = dbLabels[fields.dbType.value] || fields.dbType.value || '-';
    document.getElementById('summaryFetch').textContent = secondsLabel(fields.displayFetchInterval.value);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show toast-${type}`;

    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
        toast.classList.remove('show');
    }, 3800);
}

function getFormData() {
    return {
        dbType: fields.dbType.value,
        host: fields.host.value,
        port: fields.port.value,
        dbInstance: fields.dbInstance.value,
        database: fields.database.value,
        user: fields.user.value,
        password: fields.password.value,
        dbMockFallback: fields.dbMockFallback.value === 'true',
        dbQuery: fields.dbQuery.value
    };
}

function getDisplayFormData() {
    return {
        localImagesPath: fields.localImagesPath.value,
        title: fields.displayTitle.value,
        footerText: fields.displayFooter.value,
        fetchInterval: secondsToMilliseconds(fields.displayFetchInterval.value),
        carouselInterval: secondsToMilliseconds(fields.displayCarouselInterval.value),
        vitrineItemInterval: secondsToMilliseconds(fields.displayVitrineInterval.value),
        primaryColor: fields.displayPrimaryColor.value,
        headerMidColor: fields.displayHeaderMidColor.value,
        accentColor: fields.displayAccentColor.value,
        backgroundColor: fields.displayBackgroundColor.value,
        bgCenterColor: fields.displayBgCenterColor.value,
        footerBgColor: fields.displayFooterBgColor.value,
        filterActiveOnly: fields.displayFilterActiveOnly.value === 'true',

        cardPadraoBgStart: fields.cardPadraoBgStart.value,
        cardPadraoBgEnd: fields.cardPadraoBgEnd.value,
        cardPadraoBorder: fields.cardPadraoBorder.value,
        cardPadraoTextName: fields.cardPadraoTextName.value,
        cardPadraoTextPrice: fields.cardPadraoTextPrice.value,

        cardLevaBgStart: fields.cardLevaBgStart.value,
        cardLevaBgEnd: fields.cardLevaBgEnd.value,
        cardLevaBorder: fields.cardLevaBorder.value,
        cardLevaTextName: fields.cardLevaTextName.value,
        cardLeveBg: fields.cardLeveBg.value,
        cardPagueBg: fields.cardPagueBg.value,
        cardLevaUnitPrice: fields.cardLevaUnitPrice.value,

        cardDescBgStart: fields.cardDescBgStart.value,
        cardDescBgEnd: fields.cardDescBgEnd.value,
        cardDescBorder: fields.cardDescBorder.value,
        cardDescTextName: fields.cardDescTextName.value,
        cardDescBadgeBg: fields.cardDescBadgeBg.value,
        cardDescBadgeText: fields.cardDescBadgeText.value,
        cardDescNewPrice: fields.cardDescNewPrice.value,

        cardPackBgStart: fields.cardPackBgStart.value,
        cardPackBgEnd: fields.cardPackBgEnd.value,
        cardPackBorder: fields.cardPackBorder.value,
        cardPackTextName: fields.cardPackTextName.value,
        cardPackPrice: fields.cardPackPrice.value,

        cardUnitarioBgStart: fields.cardUnitarioBgStart.value,
        cardUnitarioBgEnd: fields.cardUnitarioBgEnd.value,
        cardUnitarioBorder: fields.cardUnitarioBorder.value,
        cardUnitarioTextName: fields.cardUnitarioTextName.value,
        cardUnitarioPrice: fields.cardUnitarioPrice.value
    };
}

function applyDbDefaults() {
    const defaults = { mysql: '3306', postgres: '5432', sqlserver: '1433' };
    fields.port.value = defaults[fields.dbType.value] || fields.port.value;
    const isSqlServer = fields.dbType.value === 'sqlserver';
    document.getElementById('instanceField').style.display = isSqlServer ? '' : 'none';
    updateSummary();
}

async function loadCurrentConfig() {
    try {
        const response = await fetch('/api/config/current');
        if (!response.ok) throw new Error('Falha ao carregar conexao');

        const data = await response.json();
        fields.dbType.value = data.dbType || 'mysql';
        fields.host.value = data.host || '';
        fields.port.value = data.port || '';
        fields.dbInstance.value = data.dbInstance || '';
        fields.database.value = data.database || '';
        fields.user.value = data.user || '';
        fields.password.value = data.password || '';
        fields.dbMockFallback.value = data.dbMockFallback !== false ? 'true' : 'false';
        fields.dbQuery.value = data.dbQuery || '';
        // Mostra/oculta campo de instância conforme o tipo de banco carregado
        const isSqlServer = (data.dbType || 'mysql') === 'sqlserver';
        document.getElementById('instanceField').style.display = isSqlServer ? '' : 'none';
        updateSummary();
    } catch (err) {
        showToast('Erro ao carregar configuracoes de conexao.', 'error');
    }
}

async function loadDisplayConfig() {
    try {
        const response = await fetch('/api/config/display');
        if (!response.ok) throw new Error('Falha ao carregar visual');

        const data = await response.json();
        fields.localImagesPath.value = data.localImagesPath || '';
        fields.displayTitle.value = data.title || '';
        fields.displayFooter.value = data.footerText || '';
        fields.displayFetchInterval.value = millisecondsToSeconds(data.fetchInterval, 30);
        fields.displayCarouselInterval.value = millisecondsToSeconds(data.carouselInterval, 10);
        fields.displayVitrineInterval.value = millisecondsToSeconds(data.vitrineItemInterval, 6);
        fields.displayPrimaryColor.value = data.primaryColor || '#d32f2f';
        fields.displayHeaderMidColor.value = data.headerMidColor || '#f44336';
        fields.displayAccentColor.value = data.accentColor || '#fbc02d';
        fields.displayBackgroundColor.value = data.backgroundColor || '#111111';
        fields.displayBgCenterColor.value = data.bgCenterColor || '#222222';
        fields.displayFooterBgColor.value = data.footerBgColor || '#111111';
        fields.displayFilterActiveOnly.value = data.filterActiveOnly ? 'true' : 'false';

        fields.cardPadraoBgStart.value = data.cardPadraoBgStart || '#ffffff';
        fields.cardPadraoBgEnd.value = data.cardPadraoBgEnd || '#f0f0f0';
        fields.cardPadraoBorder.value = data.cardPadraoBorder || '#fbc02d';
        fields.cardPadraoTextName.value = data.cardPadraoTextName || '#333333';
        fields.cardPadraoTextPrice.value = data.cardPadraoTextPrice || '#d32f2f';

        fields.cardLevaBgStart.value = data.cardLevaBgStart || '#0f2027';
        fields.cardLevaBgEnd.value = data.cardLevaBgEnd || '#2c5364';
        fields.cardLevaBorder.value = data.cardLevaBorder || '#fbc02d';
        fields.cardLevaTextName.value = data.cardLevaTextName || '#ffffff';
        fields.cardLeveBg.value = data.cardLeveBg || '#7a5c00';
        fields.cardPagueBg.value = data.cardPagueBg || '#7a1020';
        fields.cardLevaUnitPrice.value = data.cardLevaUnitPrice || '#fbc02d';

        fields.cardDescBgStart.value = data.cardDescBgStart || '#ffffff';
        fields.cardDescBgEnd.value = data.cardDescBgEnd || '#ffffff';
        fields.cardDescBorder.value = data.cardDescBorder || '#d32f2f';
        fields.cardDescTextName.value = data.cardDescTextName || '#1a1a1a';
        fields.cardDescBadgeBg.value = data.cardDescBadgeBg || '#d32f2f';
        fields.cardDescBadgeText.value = data.cardDescBadgeText || '#ffffff';
        fields.cardDescNewPrice.value = data.cardDescNewPrice || '#d32f2f';

        fields.cardPackBgStart.value = data.cardPackBgStart || '#0d1b2a';
        fields.cardPackBgEnd.value = data.cardPackBgEnd || '#1b263b';
        fields.cardPackBorder.value = data.cardPackBorder || '#fbc02d';
        fields.cardPackTextName.value = data.cardPackTextName || '#ffffff';
        fields.cardPackPrice.value = data.cardPackPrice || '#fbc02d';

        fields.cardUnitarioBgStart.value = data.cardUnitarioBgStart || '#1e1b4b';
        fields.cardUnitarioBgEnd.value = data.cardUnitarioBgEnd || '#311042';
        fields.cardUnitarioBorder.value = data.cardUnitarioBorder || '#fbc02d';
        fields.cardUnitarioTextName.value = data.cardUnitarioTextName || '#ffffff';
        fields.cardUnitarioPrice.value = data.cardUnitarioPrice || '#fbc02d';

        updateSummary();
        syncAllPreviews();
    } catch (err) {
        showToast('Erro ao carregar visual da tela.', 'error');
    }
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Falha inesperada');
    }
    return result;
}

document.getElementById('btnTest').addEventListener('click', async (event) => {
    const done = setButtonBusy(event.currentTarget, 'Testando');
    showToast('Testando conexao com o banco...', 'info');

    try {
        await postJson('/api/config/test', getFormData());
        showToast('Conexao testada com sucesso.', 'success');
    } catch (err) {
        showToast(`Falha na conexao: ${err.message}`, 'error');
    } finally {
        done();
    }
});

// Lógica do Botão "Testar SQL" e Modal
const modalOverlay = document.getElementById('sqlTestModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const resultHead = document.getElementById('sqlResultHead');
const resultBody = document.getElementById('sqlResultBody');

document.getElementById('btnTestQuery').addEventListener('click', async (event) => {
    const done = setButtonBusy(event.currentTarget, 'Testando');
    showToast('Executando consulta...', 'info');

    try {
        const result = await postJson('/api/config/test-query', getFormData());
        
        // Limpar tabela
        resultHead.innerHTML = '';
        resultBody.innerHTML = '';

        if (!result.data || result.data.length === 0) {
            resultBody.innerHTML = '<tr><td colspan="100%">Nenhum registro encontrado.</td></tr>';
        } else {
            // Criar cabeçalhos dinamicamente
            const columns = Object.keys(result.data[0]);
            const trHead = document.createElement('tr');
            columns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                trHead.appendChild(th);
            });
            resultHead.appendChild(trHead);

            // Criar linhas
            result.data.forEach(row => {
                const tr = document.createElement('tr');
                columns.forEach(col => {
                    const td = document.createElement('td');
                    td.textContent = row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL';
                    tr.appendChild(td);
                });
                resultBody.appendChild(tr);
            });
        }
        
        modalOverlay.classList.add('show');
    } catch (err) {
        showToast(`Erro na consulta: ${err.message}`, 'error');
    } finally {
        done();
    }
});

btnCloseModal.addEventListener('click', () => {
    modalOverlay.classList.remove('show');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('show');
    }
});

document.getElementById('configForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const done = setButtonBusy(event.submitter, 'Salvando...');
    showToast('Salvando todas as configurações...', 'info');

    try {
        await Promise.all([
            postJson('/api/config/save', getFormData()),
            postJson('/api/config/display/save', getDisplayFormData())
        ]);
        showToast('Todas as configurações foram salvas.', 'success');
        updateSummary();
    } catch (err) {
        showToast(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
        done();
    }
});

document.getElementById('layoutLinks').addEventListener('click', (event) => {
    const copyButton = event.target.closest('[data-copy-layout]');
    const openButton = event.target.closest('[data-open-layout]');

    if (copyButton) {
        const link = displayLink(copyButton.dataset.copyLayout);
        navigator.clipboard.writeText(link)
            .then(() => showToast('Link copiado.', 'success'))
            .catch(() => showToast('Erro ao copiar link.', 'error'));
    }

    if (openButton) {
        window.open(displayLink(openButton.dataset.openLayout), '_blank');
    }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            document.body.classList.add('page-exit');
            setTimeout(() => {
                window.location.href = '/login';
            }, 350);
        }
    } catch (err) {
        showToast('Erro ao encerrar a sessao.', 'error');
    }
});

fields.dbType.addEventListener('change', applyDbDefaults);
fields.displayFetchInterval.addEventListener('input', updateSummary);

document.getElementById('btnRestoreDefaults').addEventListener('click', function () {
    if (this.dataset.confirming === 'true') {
        // Segundo clique: Aplica as restaurações
        this.dataset.confirming = 'false';
        this.textContent = 'Restaurar Padrões';
        this.style.background = '';
        this.style.borderColor = '';
        this.style.color = '';

        fields.displayTitle.value = 'OFERTAS IMPERDIVEIS';
        fields.displayFooter.value = 'Aproveite! Promocoes validas enquanto durarem os estoques.';
        fields.displayFetchInterval.value = 30;
        fields.displayCarouselInterval.value = 10;
        fields.displayVitrineInterval.value = 6;
        fields.displayFilterActiveOnly.value = 'false';

        const setColor = (field, value) => {
            if (!field) return;
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setColor(fields.displayPrimaryColor, '#d32f2f');
        setColor(fields.displayHeaderMidColor, '#f44336');
        setColor(fields.displayAccentColor, '#fbc02d');
        setColor(fields.displayBackgroundColor, '#111111');
        setColor(fields.displayBgCenterColor, '#222222');
        setColor(fields.displayFooterBgColor, '#111111');

        setColor(fields.cardPadraoBgStart, '#ffffff');
        setColor(fields.cardPadraoBgEnd, '#f0f0f0');
        setColor(fields.cardPadraoBorder, '#fbc02d');
        setColor(fields.cardPadraoTextName, '#333333');
        setColor(fields.cardPadraoTextPrice, '#d32f2f');

        setColor(fields.cardLevaBgStart, '#0f2027');
        setColor(fields.cardLevaBgEnd, '#2c5364');
        setColor(fields.cardLevaBorder, '#fbc02d');
        setColor(fields.cardLevaTextName, '#ffffff');
        setColor(fields.cardLeveBg, '#7a5c00');
        setColor(fields.cardPagueBg, '#7a1020');
        setColor(fields.cardLevaUnitPrice, '#fbc02d');

        setColor(fields.cardDescBgStart, '#ffffff');
        setColor(fields.cardDescBgEnd, '#ffffff');
        setColor(fields.cardDescBorder, '#d32f2f');
        setColor(fields.cardDescTextName, '#1a1a1a');
        setColor(fields.cardDescBadgeBg, '#d32f2f');
        setColor(fields.cardDescBadgeText, '#ffffff');
        setColor(fields.cardDescNewPrice, '#d32f2f');

        setColor(fields.cardPackBgStart, '#0d1b2a');
        setColor(fields.cardPackBgEnd, '#1b263b');
        setColor(fields.cardPackBorder, '#fbc02d');
        setColor(fields.cardPackTextName, '#ffffff');
        setColor(fields.cardPackPrice, '#fbc02d');

        setColor(fields.cardUnitarioBgStart, '#1e1b4b');
        setColor(fields.cardUnitarioBgEnd, '#311042');
        setColor(fields.cardUnitarioBorder, '#fbc02d');
        setColor(fields.cardUnitarioTextName, '#ffffff');
        setColor(fields.cardUnitarioPrice, '#fbc02d');

        showToast('Padrões de fábrica aplicados temporariamente. Clique em Salvar para gravar.', 'info');
        updateSummary();
    } else {
        // Primeiro clique: Inicia a confirmação visual
        this.dataset.confirming = 'true';
        this.textContent = 'Clique para Confirmar';
        this.style.background = '#ff5252';
        this.style.borderColor = '#ff5252';
        this.style.color = '#ffffff';

        // Timer para resetar o botão caso não haja o segundo clique em 4 segundos
        const btn = this;
        window.clearTimeout(btn.confirmTimeout);
        btn.confirmTimeout = window.setTimeout(() => {
            if (btn.dataset.confirming === 'true') {
                btn.dataset.confirming = 'false';
                btn.textContent = 'Restaurar Padrões';
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
            }
        }, 4000);
    }
});

initLayoutOptions();
loadCurrentConfig();
loadDisplayConfig();
initLivePreviews();

// Logica de alternancia de abas
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            const pane = document.getElementById(`pane-${targetTab}`);
            if (pane) pane.classList.add('active');
        });
    });
}

initTabs();

// Transição de entrada e captura de links
function setupTransitions() {
    requestAnimationFrame(() => {
        document.body.classList.add('page-loaded');
    });

    // Captura links locais do painel para saída suave
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

// ── LOGO UPLOAD ──────────────────────────────────────────────────────────────
const logoFileInput  = document.getElementById('logoFileInput');
const btnUploadLogo  = document.getElementById('btnUploadLogo');
const btnResetLogo   = document.getElementById('btnResetLogo');
const logoPreview    = document.getElementById('logoPreview');
const logoFileName   = document.getElementById('logoFileName');

let selectedLogoFile = null;

logoFileInput.addEventListener('change', () => {
    const file = logoFileInput.files[0];
    if (!file) return;
    selectedLogoFile = file;
    logoFileName.textContent = `Selecionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    btnUploadLogo.disabled = false;
    const reader = new FileReader();
    reader.onload = (e) => { logoPreview.src = e.target.result; };
    reader.readAsDataURL(file);
});

btnUploadLogo.addEventListener('click', async () => {
    if (!selectedLogoFile) return;
    const done = setButtonBusy(btnUploadLogo, 'Enviando...');
    try {
        const formData = new FormData();
        formData.append('logo', selectedLogoFile);
        const response = await fetch('/api/logo/upload', { method: 'POST', body: formData });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) throw new Error(result.error || 'Falha no upload');
        const ts = Date.now();
        document.querySelectorAll('img[src*="/logo.png"]').forEach(img => { img.src = `/logo.png?_t=${ts}`; });
        logoPreview.src = `/display-logo.png?_t=${ts}`;
        selectedLogoFile = null;
        logoFileInput.value = '';
        logoFileName.textContent = '✅ Logo atualizado com sucesso!';
        btnUploadLogo.disabled = true;
        showToast('Logo da empresa atualizado!', 'success');
    } catch (err) {
        showToast(`Erro ao enviar logo: ${err.message}`, 'error');
    } finally {
        done();
    }
});

btnResetLogo.addEventListener('click', async function () {
    if (!window.confirm('Restaurar o logo padrão? A imagem enviada será substituída pelo logo original.')) return;

    const done = setButtonBusy(btnResetLogo, 'Restaurando...');
    try {
        const response = await fetch('/api/logo/reset', { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) throw new Error(result.error || 'Falha ao restaurar');
        const ts = Date.now();
        logoPreview.src = `/display-logo.png?_t=${ts}`;
        logoFileName.textContent = '↩ Logo padrão restaurado.';
        selectedLogoFile = null;
        logoFileInput.value = '';
        btnUploadLogo.disabled = true;
        showToast('Logo padrão restaurado!', 'success');
    } catch (err) {
        showToast(`Erro ao restaurar logo: ${err.message}`, 'error');
    } finally {
        done();
    }
});
// ─────────────────────────────────────────────────────────────────────────────
