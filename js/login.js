// js/login.js - CORRIGIDO PARA USAR RPC (A Solução Mais Simples e Segura)

document.addEventListener('DOMContentLoaded', () => {
    
    if (!window.dbAgroClient) {
        console.error('Erro Crítico: Cliente Supabase (dbAgroClient) não encontrado.');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const messageDiv = document.getElementById('login-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const emailInput = document.getElementById('email'); // Campo de Login
    
    const toggleEmpresa = document.getElementById('toggle-empresa-login');
    const toggleAdmin = document.getElementById('toggle-admin-login');
    let currentLoginType = 'empresa'; 

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
    
    function toggleLoginMode(type) {
        currentLoginType = type;
        if (type === 'empresa') {
            toggleEmpresa.classList.remove('btn-secondary');
            toggleEmpresa.classList.add('btn-primary');
            toggleAdmin.classList.remove('btn-primary');
            toggleAdmin.classList.add('btn-secondary');
        } else {
            toggleEmpresa.classList.remove('btn-primary');
            toggleEmpresa.classList.add('btn-secondary');
            toggleAdmin.classList.remove('btn-secondary');
            toggleAdmin.classList.add('btn-primary');
        }
        if (messageDiv) messageDiv.style.display = 'none';
    }
    
    if (toggleEmpresa) toggleEmpresa.addEventListener('click', () => toggleLoginMode('empresa'));
    if (toggleAdmin) toggleAdmin.addEventListener('click', () => toggleLoginMode('admin-saas'));

    // 1. Verificar se o usuário já está logado (usando a lógica de sessão local do auth.js)
    window.sistemaAuth.carregarSessaoEPerfil().then(usuario => {
         if (!usuario) toggleLoginMode('empresa');
    });

    // 2. Lidar com o envio do formulário de login (CHAMADA RPC)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        if (messageDiv) messageDiv.style.display = 'none';

        // O valor do input (texto) é usado como username (ex: DANIEL.ANTUNES)
        const username = emailInput.value.trim(); 
        const password = document.getElementById('password').value;

        try {
            // CHAMADA AO RPC: custom_login
            const { data: userProfiles, error } = await window.dbAgroClient.rpc('custom_login', {
                username: username,
                plain_password: password
            });

            if (error) {
                console.error('Erro RPC de Login:', error);
                throw new Error("Erro de comunicação com o banco de dados."); 
            }
            
            // O RPC retorna um array com 1 ou 0 perfis
            const userProfile = userProfiles ? userProfiles[0] : null;

            if (!userProfile) {
                throw new Error("Login ou senha incorretos.");
            }
            
            if (!userProfile.ativo) {
                throw new Error("Usuário inativo. Contate o administrador.");
            }

            // --- VALIDAÇÃO DE TIPO E CRIAÇÃO DA SESSÃO LOCAL ---
            const isSuperAdmin = userProfile.tipo === 'superadmin';

            if (isSuperAdmin && currentLoginType !== 'admin-saas') {
                throw new Error("Use o modo 'Login Gerenciador' para esta conta.");
            }
            if (!isSuperAdmin && currentLoginType === 'admin-saas') {
                throw new Error("Acesso negado. Esta conta não é de Gerenciador Central.");
            }
            
            // Salva o perfil no localStorage para que o auth.js possa lê-lo
            localStorage.setItem('localSessionProfile', JSON.stringify({
                 id: userProfile.id,
                 tipo: userProfile.tipo,
                 empresa_id: userProfile.empresa_id,
                 email: userProfile.email,
                 nome: userProfile.nome,
                 login_time: Date.now()
            })); 

            // Força o auth.js a carregar o novo perfil e redirecionar
            await window.sistemaAuth.carregarSessaoEPerfil(); 
            
            const redirectUrl = isSuperAdmin ? 'gerenciamento-saas.html' : 'index.html';

            showMessage('Login realizado com sucesso! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);

        } catch (err) {
            console.error('Erro no login:', err.message);
            showMessage('Erro: ' + (err.message.includes('Login ou senha') ? 'Login ou senha incorretos.' : err.message), 'error');
            setLoading(false);
            localStorage.removeItem('localSessionProfile');
        }
    });

    // 3. Lidar com "Esqueceu a senha?" (Desativado)
    document.getElementById('forgot-password-link').addEventListener('click', (e) => {
        e.preventDefault();
        showMessage('Recuperação de senha desativada.', 'error');
    });
});