// js/auth.js - NOVO SISTEMA DE AUTENTICAÇÃO LOCAL (Leitor de Perfil)

class SistemaAuth {
    constructor() {
        this.usuarioLogado = null; 
        this.perfilUsuario = null; 
        this.verificacaoEmAndamento = null; 
    }

    // 1. (MODIFICADO) Busca a sessão do localStorage
    async carregarSessaoEPerfil() {
        
        if (!window.dbAgroClient) {
             throw new Error("Cliente Supabase (dbAgroClient) não inicializado.");
        }

        if (this.verificacaoEmAndamento) {
            return this.verificacaoEmAndamento;
        }

        this.verificacaoEmAndamento = new Promise(async (resolve, reject) => {
            try {
                // --- Lógica de Sessão Local ---
                const sessionString = localStorage.getItem('localSessionProfile');
                this.usuarioLogado = null;
                this.perfilUsuario = null;

                if (!sessionString) {
                    resolve(null); // Sem token, sem sessão
                    return;
                }
                
                const perfil = JSON.parse(sessionString);
                
                // Validação mínima
                if (!perfil || !perfil.id || !perfil.tipo || !perfil.login_time) {
                    this.fazerLogout(false);
                    resolve(null);
                    return;
                }

                // Simulação da estrutura de usuário do Supabase Auth
                this.perfilUsuario = perfil;
                this.usuarioLogado = {
                    id: perfil.id,
                    email: perfil.email,
                    nome: perfil.nome || perfil.email, 
                    tipo: perfil.tipo,
                    empresa_id: perfil.empresa_id
                };
                
                // --- Fim da Lógica de Sessão Local ---

                // Você pode adicionar aqui uma RPC para revalidar a sessão no banco se for necessário mais segurança
                
                console.log('Sessão ativa e perfil local carregado para:', this.usuarioLogado.nome, `(Empresa: ${this.usuarioLogado.empresa_id}, Tipo: ${this.usuarioLogado.tipo})`);
                resolve(this.usuarioLogado); 

            } catch (error) {
                console.error('Erro no carregarSessaoEPerfil:', error.message);
                this.fazerLogout(false);
                reject(error); 
            }
        });
        
        return this.verificacaoEmAndamento;
    }

    // 2. Fazer Logout (MODIFICADO)
    async fazerLogout(doRedirect = true) {
        console.log('Fazendo logout (Local)...');
        
        // Remove o token local
        localStorage.removeItem('localSessionProfile');
        
        this.usuarioLogado = null;
        this.perfilUsuario = null;
        this.verificacaoEmAndamento = null; 
        
        if (doRedirect) {
            window.location.href = 'login.html';
        }
    }

    // 3. Verifica se a página requer autenticação (Mantido, usa a nova lógica)
    async requerAutenticacao() {
        try {
            const usuario = await this.carregarSessaoEPerfil();

            if (!usuario) {
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
                return false;
            }
            
            // Lógica de restrição de acesso SuperAdmin (mantida)
            if (this.isSuperAdmin() && 
                !window.location.pathname.includes('gerenciamento-saas.html') &&
                !window.location.pathname.includes('gerenciamento-logs.html')) {
                window.location.href = 'gerenciamento-saas.html';
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Falha na autenticação, redirecionando para login:', error.message);
            await this.fazerLogout();
            return false;
        }
    }

    isAdmin() {
        return this.perfilUsuario && this.perfilUsuario.tipo === 'admin';
    }
    
    isSuperAdmin() {
        return this.perfilUsuario && this.perfilUsuario.tipo === 'superadmin';
    }
    
    verificarAutenticacao() {
        return this.usuarioLogado;
    }

    getEmpresaId() {
        return this.usuarioLogado ? this.usuarioLogado.empresa_id : null;
    }
}

// Inicialização Global
window.sistemaAuth = new SistemaAuth();

document.addEventListener('DOMContentLoaded', function() {
    
    if (!window.dbAgroClient) {
         console.error("Autenticação não pode iniciar. Cliente Supabase (dbAgroClient) ausente.");
         return;
    }
    
    // Verifica se é a página de login para evitar loop
    if (window.location.pathname.includes('login.html')) {
        window.sistemaAuth.carregarSessaoEPerfil().then(usuario => {
            if (usuario) {
                const redirectUrl = usuario.tipo === 'superadmin' ? 'gerenciamento-saas.html' : 'index.html';
                window.location.href = redirectUrl;
            }
        });
        return;
    }
    
    // Verificar autenticação em todas as outras páginas
    window.sistemaAuth.requerAutenticacao();
});