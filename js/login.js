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

    // Função para exibir mensagens
    function showMessage(message, type = 'error') {
        messageDiv.style.display = 'block';
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
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

    // 1. Verificar se o usuário já está logado
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('Sessão ativa encontrada. Redirecionando para o painel...');
            window.location.href = 'index.html';
        }
    });

    // 2. Lidar com o envio do formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        messageDiv.style.display = 'none';

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
                // Sucesso!
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
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
        messageDiv.style.display = 'none';

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