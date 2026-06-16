const loginForm = document.getElementById('loginForm');
const btnLogin = document.getElementById('btnLogin');

// Executa animação de entrada e configura transição
function setupTransitions() {
    requestAnimationFrame(() => {
        document.body.classList.add('page-loaded');
    });

    // Captura o link de voltar
    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            const targetUrl = backLink.href;
            document.body.classList.add('page-exit');
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 350);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTransitions);
} else {
    setupTransitions();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    btnLogin.innerText = 'Autenticando...';
    btnLogin.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Transição suave para o painel
                document.body.classList.add('page-exit');
                setTimeout(() => {
                    window.location.href = '/config';
                }, 350);
                return;
            }
        }

        showToast('Usuario ou senha incorretos.');
    } catch (err) {
        showToast('Erro ao tentar conectar com o servidor.');
    } finally {
        btnLogin.innerText = 'Entrar';
        btnLogin.disabled = false;
    }
});

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

