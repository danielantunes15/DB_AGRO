// js/login.js
// Lógica da tela de login do DB AGRO
// ESTA VERSÃO USA O SISTEMA DE AUTENTICAÇÃO CUSTOMIZADO (js/auth.js)

document.addEventListener('DOMContentLoaded', () => {
    
    // Verifica se os scripts principais foram carregados
    if (!window.supabase) {
        console.error('Erro Crítico: Cliente Supabase não encontrado. Verifique o js/config.js');
        showMessage('Erro na configuração do sistema (config). Contate o suporte.', 'error');
        return;
    }
    if (!window.sistemaAuth) {
        console.error('Erro Crítico: Sistema de Autenticação não encontrado. Verifique o js/auth.js');
        showMessage('Erro na configuração do sistema (auth). Contate o suporte.', 'error');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const messageDiv = document.getElementById('login-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const emailInput = document.getElementById('email'); // 'email' é o username no seu sistema

    // 1. Verificar se o usuário já está logado (usando o sistemaAuth)
    if (window.sistemaAuth.verificarAutenticacao()) {
        console.log('Sessão ativa encontrada. Redirecionando para o painel...');
        window.location.href = 'index.html';
    }

    // Função para exibir mensagens (usa a função de utils.js)
    function showMessage(message, type = 'error') {
        // A função 'mostrarMensagem' agora vem do 'utils.js'
        if (typeof mostrarMensagem === 'function') {
            mostrarMensagem(message, type);
        } else {
            // Fallback caso utils.js não carregue
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

    // 2. Lidar com o envio do formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        if (messageDiv) messageDiv.style.display = 'none';

        const username = emailInput.value; // O campo 'email' é usado como 'username'
        const password = document.getElementById('password').value;

        try {
            // Usando o SEU sistema de autenticação (de js/auth.js)
            const resultado = await window.sistemaAuth.fazerLogin(username, password);

            if (resultado.success) {
                // Sucesso!
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // Erro (ex: "Usuário ou senha incorretos")
                throw new Error(resultado.error);
            }
        } catch (err) {
            console.error('Erro no login:', err.message);
            showMessage(err.message, 'error');
            setLoading(false);
        }
    });

    // 3. Lidar com "Esqueceu a senha?"
    // (Aviso: Esta funcionalidade não existe no seu auth.js. 
    // Vamos apenas exibir uma mensagem de "Contate o Suporte")
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showMessage('Para redefinir sua senha, por favor, contate o administrador do sistema.', 'error');
    });
});