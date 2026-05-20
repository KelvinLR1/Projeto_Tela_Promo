const loginForm = document.getElementById('loginForm');
const btnLogin = document.getElementById('btnLogin');

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
                window.location.href = '/config';
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
