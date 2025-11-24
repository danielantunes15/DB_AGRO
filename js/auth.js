// js/auth.js - Revertido para Supabase Auth Nativo + RLS

class SistemaAuth {
    constructor() {
        this.usuarioLogado = null; 
        this.perfilUsuario = null; 
        this.verificacaoEmAndamento = null; 
    }

    // 1. Busca a sessão nativa e o perfil
    async carregarSessaoEPerfil() {
        
        if (!window.dbAgroClient) {
             throw new Error("Cliente Supabase (dbAgroClient) não inicializado. Verifique js/config.js.");
        }

        if (this.verificacaoEmAndamento) {
            return this.verificacaoEmAndamento;
        }

        this.verificacaoEmAndamento = new Promise(async (resolve, reject) => {
            try {
                // --- NOVO: Lógica de Sessão Nativa ---
                const { data: { session }, error: sessionError } = await window.dbAgroClient.auth.getSession();
                this.usuarioLogado = null;
                this.perfilUsuario = null;

                if (sessionError) {
                    throw new Error("Erro ao buscar sessão: " + sessionError.message);
                }

                if (session && session.user) {
                    this.usuarioLogado = session.user;

                    // Busca o perfil na tabela 'profiles'
                    const { data: perfil, error: perfilError } = await window.dbAgroClient
                        .from('profiles') 
                        .select('nome, tipo, ativo, empresa_id') 
                        .eq('id', this.usuarioLogado.id) 
                        .single();

                    if (perfilError) {
                        if (perfilError.code === 'PGRST116') { // "single() returned 0 rows"
                             // Se a conta existe no Auth mas não no profiles (deve ser um e-mail válido!)
                            throw new Error(`Usuário não possui perfil cadastrado. Necessário RLS e/ou trigger.`);
                        }
                        throw new Error("Erro ao buscar perfil do usuário: " + perfilError.message);
                    }
                    
                    if (!perfil.ativo) {
                        console.warn('Usuário está logado, mas inativo. Fazendo logout.');
                        await this.fazerLogout();
                        resolve(null); 
                        return;
                    }

                    this.perfilUsuario = perfil;
                    
                    this.usuarioLogado.nome = perfil.nome || this.usuarioLogado.email; 
                    this.usuarioLogado.tipo = perfil.tipo;
                    this.usuarioLogado.empresa_id = perfil.empresa_id;

                    console.log('Sessão ativa e perfil carregado para:', this.usuarioLogado.nome, `(Empresa: ${this.usuarioLogado.empresa_id}, Tipo: ${this.usuarioLogado.tipo})`);
                    resolve(this.usuarioLogado); 
                
                } else {
                    resolve(null);
                }
            } catch (error) {
                console.error('Erro no carregarSessaoEPerfil:', error.message);
                this.usuarioLogado = null;
                this.perfilUsuario = null;
                reject(error); 
            }
        });
        
        return this.verificacaoEmAndamento;
    }

    // 2. Fazer Logout (Revertido para Auth Nativo)
    async fazerLogout(doRedirect = true) {
        console.log('Fazendo logout (Supabase Auth)...');
        
        if (window.dbAgroClient) {
            const { error } = await window.dbAgroClient.auth.signOut();
            if (error) console.error('Erro ao sair:', error.message);
        }
        this.usuarioLogado = null;
        this.perfilUsuario = null;
        this.verificacaoEmAndamento = null; 
        
        if (doRedirect) {
            window.location.href = 'login.html';
        }
    }
    // (O restante dos métodos são mantidos, usando as propriedades atualizadas do perfil)
    async requerAutenticacao() {
        // ... (lógica de autenticação e redirecionamento de auth.js, mantida)
        try {
            const usuario = await this.carregarSessaoEPerfil();
            
            // Redirecionamento de login.html, etc... (a lógica inteira é mantida)
            if (!usuario && !window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
                return false;
            }
            // ... (restante das checagens de permissão)
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

// (O restante do código de verificação automática do auth.js é mantido)
window.sistemaAuth = new SistemaAuth();

document.addEventListener('DOMContentLoaded', function() {
    
    // Checagem defensiva: Se window.dbAgroClient não foi definido (erro no config.js), não faz nada
    if (!window.dbAgroClient) {
         console.error("Autenticação não pode iniciar. Cliente Supabase (dbAgroClient) ausente.");
         return;
    }
    
    // Verifica se é a página de login
    if (window.location.pathname.includes('login.html')) {
        window.dbAgroClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.sistemaAuth.carregarSessaoEPerfil().then(() => {
                    const usuario = window.sistemaAuth.verificarAutenticacao();
                    if (usuario?.tipo === 'superadmin') {
                        window.location.href = 'gerenciamento-saas.html';
                    } else if (usuario) {
                        window.location.href = 'index.html';
                    }
                }).catch(error => {
                    console.error('Erro ao verificar perfil no login:', error);
                });
            }
        });
        return;
    }
    
    // Verificar autenticação em todas as outras páginas
    window.sistemaAuth.requerAutenticacao().then(usuario => {
        // NOVO: Se o usuário é SuperAdmin, garante que ele está no painel dele, a menos que ele esteja na página de logs (que também é para admin)
        if (window.sistemaAuth.isSuperAdmin() && 
            !window.location.pathname.includes('gerenciamento-saas.html') &&
            !window.location.pathname.includes('gerenciamento-logs.html')) {
            window.location.href = 'gerenciamento-saas.html';
        }
    });
});