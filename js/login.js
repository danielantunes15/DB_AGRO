// js/login.js - Revertido para Supabase Auth Nativo + RLS
// Usa o campo 'email' no front-end para o login.

document.addEventListener('DOMContentLoaded', () => {
    
    if (!window.dbAgroClient) {
        console.error('Erro Crítico: Cliente Supabase (dbAgroClient) não encontrado. Verifique o js/config.js');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const messageDiv = document.getElementById('login-message');
    const emailInput = document.getElementById('email'); 
    
    // Simplificando o front-end: Remove a lógica de alternância (toggle)
    const toggleEmpresa = document.getElementById('toggle-empresa-login');
    const toggleAdmin = document.getElementById('toggle-admin-login');
    if (toggleEmpresa) toggleEmpresa.classList.remove('btn-secondary');
    if (toggleAdmin) toggleAdmin.style.display = 'none';

    function showMessage(message, type = 'error') {
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = message;
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            loginButton.disabled = true;
            loginButton.textContent = 'Entrando...';
        } else {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    }
    
    // 1. Lógica para verificação de sessão inicial (feita em auth.js)
    // O auth.js redireciona se já estiver logado.

    // 2. Lidar com o envio do formulário de login (REVERTIDO PARA AUTH NATIVO)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        if (messageDiv) messageDiv.style.display = 'none';

        // Usa o campo 'email' para o login no Supabase Auth.
        // Se você mudou o campo para "Login" no HTML, ele ainda envia o valor do ID 'email'.
        const email = emailInput.value;
        const password = document.getElementById('password').value;

        try {
            // Chamada nativa ao Supabase Auth
            const { error } = await window.dbAgroClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                // Erros comuns: Invalid login credentials
                throw error; 
            }
            
            // Sucesso! A sessão é criada. Agora, verifica o perfil para redirecionar.
            await window.sistemaAuth.carregarSessaoEPerfil(); 
            
            const usuario = window.sistemaAuth.verificarAutenticacao();
            
            if (!usuario) {
                // Se a sessãoAuth deu certo, mas o perfil não foi encontrado/está inativo
                showMessage('Login realizado, mas perfil inválido ou inativo. Faça login novamente.', 'error');
                await window.dbAgroClient.auth.signOut();
                setLoading(false);
                return;
            }

            const isSuperAdmin = usuario.tipo === 'superadmin';
            const redirectUrl = isSuperAdmin ? 'gerenciamento-saas.html' : 'index.html';

            showMessage('Login realizado com sucesso! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);

        } catch (err) {
            console.error('Erro no login:', err.message);
            if (err.message.includes('Invalid login credentials')) {
                showMessage('Login ou senha incorretos.', 'error');
            } else {
                showMessage('Erro de rede. Verifique sua conexão.', 'error');
            }
            setLoading(false);
        }
    });

    // 3. Lidar com "Esqueceu a senha?" (Volta a usar a função nativa)
    // Se o campo 'email' for realmente um login como ADMIN.EMPRESA, a recuperação NATIVA do Supabase não funcionará.
    // É necessário que o login seja um e-mail válido no Auth.
    // No seu novo modelo, a recuperação deve ser desativada.
    document.getElementById('forgot-password-link').addEventListener('click', (e) => {
        e.preventDefault();
        showMessage('Recuperação de senha desativada. Contate o administrador.', 'error');
    });
});