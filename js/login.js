// js/login.js
// Lógica da tela de login do DB AGRO
// ESTA VERSÃO USA O SUPABASE AUTH NATIVO (Correto para Opção 2)

document.addEventListener('DOMContentLoaded', () => {
    
    // Se 'config.js' não carregou ou falhou, o supabase não existirá.
    if (!window.supabase) {
        console.error('Erro Crítico: Cliente Supabase não encontrado. Verifique o js/config.js');
        showMessage('Erro na configuração do sistema. Contate o suporte.', 'error');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const messageDiv = document.getElementById('login-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const emailInput = document.getElementById('email');
    
    // NOVO: Elementos de Toggle
    const toggleEmpresa = document.getElementById('toggle-empresa-login');
    const toggleAdmin = document.getElementById('toggle-admin-login');
    let currentLoginType = 'empresa'; // Padrão: login de empresa

    // Função para exibir mensagens
    function showMessage(message, type = 'error') {
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = message;
        }
    }

    // Função para travar/destravar o formulário
    function setLoading(isLoading) {
        if (isLoading) {
            loginButton.disabled = true;
            loginButton.textContent = 'Entrando...';
        } else {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    }
    
    // NOVO: Função para alternar o tipo de login
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
        showMessage(`Modo de Login: ${type === 'empresa' ? 'Empresa' : 'Gerenciador Central'}`, 'success');
        if (messageDiv) messageDiv.style.display = 'none';
    }
    
    if (toggleEmpresa) toggleEmpresa.addEventListener('click', () => toggleLoginMode('empresa'));
    if (toggleAdmin) toggleAdmin.addEventListener('click', () => toggleLoginMode('admin-saas'));


    // 1. Verificar se o usuário já está logado
    // A lógica de redirecionamento agora está em js/auth.js, mas mantemos a chamada.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // Se já tem sessão, a lógica de auth.js vai redirecionar
            console.log('Sessão ativa encontrada. Aguardando redirecionamento de auth.js...');
        } else {
            // Garante que o modo inicial é o de empresa
            toggleLoginMode('empresa');
        }
    });

    // 2. Lidar com o envio do formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        if (messageDiv) messageDiv.style.display = 'none';

        const email = emailInput.value;
        const password = document.getElementById('password').value;

        try {
            // Usando o Supabase Auth nativo
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error; // Cai no bloco catch
            }

            if (data.user) {
                // Agora, verificamos o perfil para decidir o redirecionamento.
                // Carregar o perfil é crucial aqui para saber o tipo de usuário.
                await window.sistemaAuth.carregarSessaoEPerfil();
                
                const isSuperAdmin = window.sistemaAuth.isSuperAdmin();
                
                // NOVO: Se o usuário logado é Super Admin, mas tentou o login de empresa
                if (isSuperAdmin && currentLoginType === 'empresa') {
                    // Isso é um problema de UX, mas vamos redirecioná-lo para o lugar certo
                    showMessage('Você logou como Gerenciador Central. Redirecionando...', 'warning');
                    setTimeout(() => {
                        window.location.href = 'gerenciamento-saas.html';
                    }, 1000);
                    return;
                }
                
                // NOVO: Se o usuário NÃO é Super Admin, mas tentou o login de Admin
                if (!isSuperAdmin && currentLoginType === 'admin-saas') {
                    // Falha de login para o modo errado
                    showMessage('Acesso negado. Esta conta não tem permissões de Gerenciador Central.', 'error');
                    await supabase.auth.signOut(); // Força o logout
                    setLoading(false);
                    return;
                }
                
                // Redirecionamento Final
                const redirectUrl = isSuperAdmin ? 'gerenciamento-saas.html' : 'index.html';

                // Sucesso!
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1000);
            }
        } catch (err) {
            console.error('Erro no login:', err.message);
            if (err.message === 'Invalid login credentials') {
                showMessage('Email ou senha incorretos.', 'error');
            } else {
                showMessage('Erro ao tentar logar. Verifique sua conexão.', 'error');
            }
            setLoading(false);
        }
    });

    // 3. Lidar com "Esqueceu a senha?"
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        
        if (!email) {
            showMessage('Digite seu email no campo "Email" e clique em "Esqueceu a senha?" para recuperá-la.', 'error');
            return;
        }

        setLoading(true);
        if (messageDiv) messageDiv.style.display = 'none';

        try {
            // (Você precisará criar uma página 'reset-password.html')
            const redirectTo = `${window.location.origin}/reset-password.html`;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo,
            });

            if (error) {
                throw error;
            }

            showMessage('Link de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        
        } catch(err) {
            console.error('Erro ao enviar recuperação:', err.message);
            showMessage('Erro ao enviar link de recuperação. Tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    });
});