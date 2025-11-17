// js/auth.js - Sistema de autenticação customizado CORRIGIDO
class SistemaAuth {
    constructor() {
        this.usuarioLogado = null;
        this.tempoSessao = 8 * 60 * 60 * 1000; // 8 horas em milissegundos
        this.carregarUsuarioSalvo();
    }

    // Carregar usuário do localStorage com verificação de expiração
    carregarUsuarioSalvo() {
        try {
            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            const timestampLogin = localStorage.getItem('loginTimestamp');
            const manterConectado = localStorage.getItem('manterLogado') === 'true';

            if (!usuarioSalvo || !timestampLogin) {
                this.limparSessao();
                return;
            }

            const tempoLogado = Date.now() - parseInt(timestampLogin);
            
            // Verificar se a sessão expirou
            if (!manterConectado && tempoLogado > this.tempoSessao) {
                console.log('Sessão expirada. Fazendo logout...');
                this.fazerLogout();
                return;
            }

            // Se manter conectado, verificar após 7 dias
            if (manterConectado && tempoLogado > (7 * 24 * 60 * 60 * 1000)) {
                console.log('Sessão "manter conectado" expirada (7 dias).');
                this.fazerLogout();
                return;
            }

            this.usuarioLogado = JSON.parse(usuarioSalvo);
            console.log('Usuário carregado:', this.usuarioLogado.nome);
            
            // Atualizar timestamp para renovar sessão
            if (!manterConectado) {
                this.atualizarTimestamp();
            }

        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            this.limparSessao();
        }
    }

    // Atualizar timestamp da sessão
    atualizarTimestamp() {
        localStorage.setItem('loginTimestamp', Date.now().toString());
    }

    // Limpar dados da sessão
    limparSessao() {
        this.usuarioLogado = null;
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('loginTimestamp');
        // Não remove 'manterLogado' para lembrar a preferência
    }

    // Verificar se o usuário está autenticado
    verificarAutenticacao() {
        this.carregarUsuarioSalvo(); // Sempre verificar expiração
        return this.usuarioLogado;
    }

    // Fazer login
    async fazerLogin(username, senha) {
        try {
            // Validações básicas
            if (!username || !senha) {
                throw new Error('Preencha usuário e senha');
            }

            // Fazer hash da senha
            const senhaHash = await this.hashSenha(senha);
            
            // Buscar usuário no banco
            const { data: usuarios, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('username', username)
                .eq('senha_hash', senhaHash)
                .eq('ativo', true)
                .maybeSingle();

            if (error) {
                console.error('Erro Supabase:', error);
                throw new Error('Erro de conexão com o banco de dados');
            }

            if (!usuarios) {
                throw new Error('Usuário ou senha incorretos');
            }

            // Salvar usuário logado (sem a senha)
            this.usuarioLogado = {
                id: usuarios.id,
                nome: usuarios.nome,
                username: usuarios.username,
                tipo: usuarios.tipo,
                ativo: usuarios.ativo
            };

            // Salvar no localStorage
            localStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            localStorage.setItem('loginTimestamp', Date.now().toString());
            
            console.log('Login realizado com sucesso:', this.usuarioLogado.nome);
            
            return { success: true, usuario: this.usuarioLogado };

        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: error.message };
        }
    }

    // Fazer logout
    fazerLogout() {
        console.log('Fazendo logout do usuário:', this.usuarioLogado?.nome);
        this.limparSessao();
        window.location.href = 'login.html';
    }

    // Forçar verificação de autenticação (usar nas páginas)
    requerAutenticacao() {
        const usuario = this.verificarAutenticacao();
        
        if (!usuario) {
            console.log('Acesso negado: usuário não autenticado');
            // Delay para evitar loop de redirecionamento
            setTimeout(() => {
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }, 100);
            return false;
        }
        
        return true;
    }

    // Verificar se usuário é admin
    isAdmin() {
        return this.usuarioLogado && this.usuarioLogado.tipo === 'admin';
    }

    // Redirecionar se não for admin
    requerAdmin() {
        if (!this.requerAutenticacao()) return false;
        
        if (!this.isAdmin()) {
            console.log('Acesso negado: permissão de administrador requerida');
            alert('Acesso restrito a administradores');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }

    // Função de hash da senha
    async hashSenha(senha) {
        try {
            // Usando Web Crypto API para hash seguro
            const encoder = new TextEncoder();
            const data = encoder.encode(senha + 'agrocana_salt_2024');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error('Erro ao gerar hash:', error);
            // Fallback simples se crypto não estiver disponível
            return btoa(senha);
        }
    }

    // Verificar se a sessão está próxima de expirar (para avisos)
    sessaoProximaExpirar() {
        const timestampLogin = localStorage.getItem('loginTimestamp');
        const manterConectado = localStorage.getItem('manterLogado') === 'true';
        
        if (!timestampLogin || manterConectado) return false;
        
        const tempoLogado = Date.now() - parseInt(timestampLogin);
        const tempoRestante = this.tempoSessao - tempoLogado;
        
        // Retornar true se faltar menos de 5 minutos
        return tempoRestante < (5 * 60 * 1000);
    }

    // Renovar sessão (usar quando usuário fizer alguma ação)
    renovarSessao() {
        if (this.usuarioLogado) {
            this.atualizarTimestamp();
            console.log('Sessão renovada para:', this.usuarioLogado.nome);
        }
    }

    // Obter informações da sessão
    getInfoSessao() {
        const timestampLogin = localStorage.getItem('loginTimestamp');
        const manterConectado = localStorage.getItem('manterLogado') === 'true';
        
        if (!timestampLogin) return null;
        
        const loginTime = new Date(parseInt(timestampLogin));
        const tempoLogado = Date.now() - parseInt(timestampLogin);
        const tempoRestante = this.tempoSessao - tempoLogado;
        
        return {
            usuario: this.usuarioLogado,
            loginTime: loginTime,
            tempoLogado: tempoLogado,
            tempoRestante: tempoRestante,
            manterConectado: manterConectado,
            expirada: tempoRestante <= 0
        };
    }
}

// Instância global do sistema de autenticação
window.sistemaAuth = new SistemaAuth();

// Verificação automática em todas as páginas (exceto login)
document.addEventListener('DOMContentLoaded', function() {
    // Não verificar na página de login
    if (window.location.pathname.includes('login.html')) {
        // Se já estiver logado e acessar login, redirecionar para index
        if (window.sistemaAuth.verificarAutenticacao()) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
        return;
    }
    
    // Verificar autenticação em todas as outras páginas
    console.log('Verificando autenticação...');
    window.sistemaAuth.requerAutenticacao();
});

// Renovar sessão em interações do usuário
document.addEventListener('click', function() {
    if (window.sistemaAuth && window.sistemaAuth.verificarAutenticacao()) {
        window.sistemaAuth.renovarSessao();
    }
});

// Verificar expiração periodicamente (a cada minuto)
setInterval(() => {
    if (window.sistemaAuth && window.sistemaAuth.verificarAutenticacao()) {
        if (window.sistemaAuth.sessaoProximaExpirar()) {
            console.warn('Sessão próxima de expirar');
            // Pode mostrar um aviso para o usuário aqui
        }
    }
}, 60000); // 1 minuto