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
    dbQuery: document.getElementById('dbQuery'),
    displayTitle: document.getElementById('displayTitle'),
    displayFooter: document.getElementById('displayFooter'),
    displayDefaultLayout: document.getElementById('displayDefaultLayout'),
    displayFetchInterval: document.getElementById('displayFetchInterval'),
    displayCarouselInterval: document.getElementById('displayCarouselInterval'),
    displayVitrineInterval: document.getElementById('displayVitrineInterval'),
    displayItemsPadrao: document.getElementById('displayItemsPadrao'),
    displayItemsCompacto: document.getElementById('displayItemsCompacto'),
    displayItemsVitrine: document.getElementById('displayItemsVitrine'),
    displayItemsSemFoto: document.getElementById('displayItemsSemFoto'),
    displayPrimaryColor: document.getElementById('displayPrimaryColor'),
    displayAccentColor: document.getElementById('displayAccentColor'),
    displayBackgroundColor: document.getElementById('displayBackgroundColor'),
    localImagesPath: document.getElementById('localImagesPath')
};

function initLayoutOptions() {
    fields.displayDefaultLayout.innerHTML = layoutOptions
        .map(item => `<option value="${item.value}">${item.label}</option>`)
        .join('');

    const linksContainer = document.getElementById('layoutLinks');
    linksContainer.innerHTML = layoutOptions.map(item => `
        <article class="layout-card">
            <div>
                <h3>${item.label}</h3>
                <p>${item.detail}</p>
            </div>
            <div class="layout-actions">
                <button type="button" class="icon-button" data-copy-layout="${item.value}" title="Copiar link" aria-label="Copiar link de ${item.label}">Copiar</button>
                <button type="button" class="icon-button open" data-open-layout="${item.value}" title="Abrir tela" aria-label="Abrir ${item.label}">Abrir</button>
            </div>
        </article>
    `).join('');
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
    const selectedLayout = layoutOptions.find(item => item.value === fields.displayDefaultLayout.value);
    document.getElementById('summaryLayout').textContent = selectedLayout ? selectedLayout.label.replace('Modo ', '') : 'Padrao';
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
        dbQuery: fields.dbQuery.value
    };
}

function getDisplayFormData() {
    return {
        title: fields.displayTitle.value,
        footerText: fields.displayFooter.value,
        defaultLayout: fields.displayDefaultLayout.value,
        fetchInterval: secondsToMilliseconds(fields.displayFetchInterval.value),
        carouselInterval: secondsToMilliseconds(fields.displayCarouselInterval.value),
        vitrineItemInterval: secondsToMilliseconds(fields.displayVitrineInterval.value),
        itemsPadrao: fields.displayItemsPadrao.value,
        itemsCompacto: fields.displayItemsCompacto.value,
        itemsVitrine: fields.displayItemsVitrine.value,
        itemsSemFoto: fields.displayItemsSemFoto.value,
        primaryColor: fields.displayPrimaryColor.value,
        accentColor: fields.displayAccentColor.value,
        backgroundColor: fields.displayBackgroundColor.value,
        localImagesPath: fields.localImagesPath.value
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
        fields.displayTitle.value = data.title || '';
        fields.displayFooter.value = data.footerText || '';
        fields.displayDefaultLayout.value = data.defaultLayout || 'padrao';
        fields.displayFetchInterval.value = millisecondsToSeconds(data.fetchInterval, 30);
        fields.displayCarouselInterval.value = millisecondsToSeconds(data.carouselInterval, 10);
        fields.displayVitrineInterval.value = millisecondsToSeconds(data.vitrineItemInterval, 6);
        fields.displayItemsPadrao.value = data.itemsPadrao || 4;
        fields.displayItemsCompacto.value = data.itemsCompacto || 6;
        fields.displayItemsVitrine.value = data.itemsVitrine || 5;
        fields.displayItemsSemFoto.value = data.itemsSemFoto || 4;
        fields.displayPrimaryColor.value = data.primaryColor || '#d32f2f';
        fields.displayAccentColor.value = data.accentColor || '#fbc02d';
        fields.displayBackgroundColor.value = data.backgroundColor || '#111111';
        fields.localImagesPath.value = data.localImagesPath || '';
        updateSummary();
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

document.getElementById('configForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const done = setButtonBusy(event.submitter, 'Salvando');

    try {
        await postJson('/api/config/save', getFormData());
        showToast('Configuracoes de conexao salvas.', 'success');
        updateSummary();
    } catch (err) {
        showToast(`Erro ao salvar conexao: ${err.message}`, 'error');
    } finally {
        done();
    }
});

document.getElementById('displayForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const done = setButtonBusy(event.submitter, 'Salvando');

    try {
        await postJson('/api/config/display/save', getDisplayFormData());
        showToast('Visual salvo com sucesso.', 'success');
        updateSummary();
    } catch (err) {
        showToast(`Erro ao salvar visual: ${err.message}`, 'error');
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
        if (response.ok) window.location.href = '/login';
    } catch (err) {
        showToast('Erro ao encerrar a sessao.', 'error');
    }
});

fields.dbType.addEventListener('change', applyDbDefaults);
fields.displayDefaultLayout.addEventListener('change', updateSummary);
fields.displayFetchInterval.addEventListener('input', updateSummary);

initLayoutOptions();
loadCurrentConfig();
loadDisplayConfig();
