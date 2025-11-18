// js/auth.js - NOVO SISTEMA DE AUTENTICAÇÃO (NATIVO DO SUPABASE)
// Este script gerencia a sessão do usuário e busca seu perfil (empresa_id, tipo)

class SistemaAuth {
    constructor() {
        this.usuarioLogado = null; // Armazenará o usuário do Supabase (Auth)
        this.perfilUsuario = null; // Armazenará o perfil (da tabela 'profiles')
        this.verificacaoEmAndamento = null; // Promise para controlar a verificação inicial
    }

    // 1. (NOVO) Busca a sessão e o perfil do usuário
    async carregarSessaoEPerfil() {
        // Se a verificação já está em andamento, aguarde ela terminar
        if (this.verificacaoEmAndamento) {
            return this.verificacaoEmAndamento;
        }

        // Inicia uma nova verificação
        this.verificacaoEmAndamento = new Promise(async (resolve, reject) => {
            try {
                // Pega a sessão do Supabase
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw new Error("Erro ao buscar sessão: " + sessionError.message);
                }

                // Se existe uma sessão e um usuário...
                if (session && session.user) {
                    this.usuarioLogado = session.user;

                    // Agora, busca o perfil na tabela 'profiles' para saber a EMPRESA e o TIPO
                    const { data: perfil, error: perfilError } = await supabase
                        .from('profiles') // Você precisará ter esta tabela
                        .select('nome, tipo, ativo, empresa_id') // Pedimos o ID da empresa e o tipo
                        .eq('id', this.usuarioLogado.id) // Liga o ID do auth.users com o ID do profiles
                        .single();

                    if (perfilError) {
                        if (perfilError.code === 'PGRST116') { // "single() returned 0 rows"
                            throw new Error(`Usuário (id: ${this.usuarioLogado.id}) não possui perfil cadastrado na tabela 'profiles'.`);
                        }
                        throw new Error("Erro ao buscar perfil do usuário: " + perfilError.message);
                    }
                    
                    if (!perfil.ativo) {
                        console.warn('Usuário está logado, mas inativo. Fazendo logout.');
                        await this.fazerLogout();
                        resolve(null); // Resolve como nulo, pois o usuário não está ativo
                        return;
                    }

                    // Armazena o perfil
                    this.perfilUsuario = perfil;
                    
                    // Adiciona dados úteis ao objeto principal do usuário
                    this.usuarioLogado.nome = perfil.nome || this.usuarioLogado.email; 
                    this.usuarioLogado.tipo = perfil.tipo;
                    this.usuarioLogado.empresa_id = perfil.empresa_id; // <-- O MAIS IMPORTANTE

                    if (!this.usuarioLogado.empresa_id) {
                         throw new Error(`Usuário ${this.usuarioLogado.nome} não está associado a nenhuma empresa (empresa_id está nulo).`);
                    }

                    console.log('Sessão ativa e perfil carregado para:', this.usuarioLogado.nome, `(Empresa: ${this.usuarioLogado.empresa_id})`);
                    resolve(this.usuarioLogado); // Resolve a promise com o usuário
                
                } else {
                    // Sem sessão, usuário deslogado
                    this.usuarioLogado = null;
                    this.perfilUsuario = null;
                    resolve(null); // Resolve como nulo
                }
            } catch (error) {
                console.error('Erro no carregarSessaoEPerfil:', error.message);
                this.usuarioLogado = null;
                this.perfilUsuario = null;
                reject(error); // Rejeita a promise em caso de erro
            }
        });
        
        return this.verificacaoEmAndamento;
    }

    // 2. Fazer Logout
    async fazerLogout() {
        console.log('Fazendo logout (Supabase Auth)...');
        const { error } = await supabase.auth.signOut();
        this.usuarioLogado = null;
        this.perfilUsuario = null;
        this.verificacaoEmAndamento = null; // Reseta a promise de verificação
        if (error) console.error('Erro ao sair:', error.message);
        window.location.href = 'login.html';
    }

    // 3. Verifica se a página requer autenticação
    async requerAutenticacao() {
        try {
            const usuario = await this.carregarSessaoEPerfil();

            if (!usuario) {
                console.log('Acesso negado: usuário não autenticado. Redirecionando para login.');
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'login.html';
                }
                return false;
            }
            return true;
        } catch (error) {
            // Se houver erro na verificação (ex: perfil não encontrado), desloga
            console.error('Falha na autenticação, redirecionando para login:', error.message);
            await this.fazerLogout();
            return false;
        }
    }

    // 4. Verifica se o usuário é admin
    isAdmin() {
        // Esta função só deve ser chamada DEPOIS que 'requerAutenticacao' foi resolvida
        return this.perfilUsuario && this.perfilUsuario.tipo === 'admin';
    }
    
    // 5. Retorna o usuário logado (sincronamente)
    verificarAutenticacao() {
        // Usado por scripts como 'main.js' para pegar o ID do usuário
        return this.usuarioLogado;
    }

    // 6. Retorna o ID da empresa do usuário logado
    getEmpresaId() {
        return this.usuarioLogado ? this.usuarioLogado.empresa_id : null;
    }
}

// Instância global
window.sistemaAuth = new SistemaAuth();

// Verificação automática em todas as páginas (exceto login)
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('login.html')) {
        // Se já estiver logado (sessão ativa) e acessar login, redirecionar
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.location.href = 'index.html';
            }
        });
        return;
    }
    
    // Verificar autenticação em todas as outras páginas
    // Esta chamada agora é a "porta de entrada" que carrega o perfil
    window.sistemaAuth.requerAutenticacao();
});