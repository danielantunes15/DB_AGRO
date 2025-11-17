// js/gerenciamento-logs.js
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação e permissões
    if (!await verificarPermissoes()) return;

    // Elementos do DOM
    const logoutBtn = document.getElementById('logout-btn');
    const logsBody = document.getElementById('logs-body');
    const filterUser = document.getElementById('filter-user');
    const filterAction = document.getElementById('filter-action');
    const filterDate = document.getElementById('filter-date');
    const filterSuccess = document.getElementById('filter-success');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    // Variáveis de estado
    let currentPage = 1;
    const itemsPerPage = 20;
    let currentFilters = {};

    // Event Listeners
    logoutBtn.addEventListener('click', logout);
    applyFiltersBtn.addEventListener('click', aplicarFiltros);
    resetFiltersBtn.addEventListener('click', resetarFiltros);
    prevPageBtn.addEventListener('click', () => mudarPagina(-1));
    nextPageBtn.addEventListener('click', () => mudarPagina(1));

    // Carregar dados iniciais
    await carregarUsuariosFiltro();
    await carregarLogs();

    // Função para verificar permissões
    async function verificarPermissoes() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }

        // Verificar se é admin
        const user = session.user;
        const { data: perfil } = await supabase
            .from('profiles')
            .select('tipo, ativo')
            .eq('id', user.id)
            .single();

        if (!perfil?.ativo) {
            alert('Sua conta está desativada.');
            await logout();
            return false;
        }

        if (perfil.tipo !== 'admin') {
            alert('Acesso negado. Apenas administradores podem visualizar logs.');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    }

    // Função para logout
    async function logout() {
        try {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    // Função para carregar usuários no filtro
    async function carregarUsuariosFiltro() {
        try {
            const { data: usuarios, error } = await supabase
                .from('profiles')
                .select('username, nome')
                .order('nome');

            if (error) throw error;

            filterUser.innerHTML = '<option value="">Todos os usuários</option>';
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.username;
                option.textContent = `${usuario.nome} (${usuario.username})`;
                filterUser.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    // Função para carregar logs
    async function carregarLogs() {
        try {
            let query = supabase
                .from('access_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (currentFilters.user) {
                query = query.eq('username', currentFilters.user);
            }

            if (currentFilters.action) {
                query = query.eq('action', currentFilters.action);
            }

            if (currentFilters.date) {
                const startDate = new Date(currentFilters.date);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                
                query = query.gte('created_at', startDate.toISOString())
                            .lt('created_at', endDate.toISOString());
            }

            if (currentFilters.success !== undefined) {
                query = query.eq('success', currentFilters.success === 'true');
            }

            // Paginação
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data: logs, error, count } = await query.range(from, to);

            if (error) throw error;

            exibirLogs(logs);
            atualizarPaginacao(count);

        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            mostrarMensagem('Erro ao carregar logs de acesso', 'error');
        }
    }

    // Função para exibir logs na tabela
    function exibirLogs(logs) {
        logsBody.innerHTML = '';

        if (!logs || logs.length === 0) {
            logsBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum log encontrado</td></tr>';
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            
            const dataHora = new Date(log.created_at).toLocaleString('pt-BR');
            const statusText = log.success ? 'Sucesso' : 'Falha';
            const statusClass = log.success ? 'status-success' : 'status-error';
            
            tr.innerHTML = `
                <td>${dataHora}</td>
                <td>${log.username}</td>
                <td>${traduzirAcao(log.action)}</td>
                <td>${log.ip_address || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${log.error_message || '-'}</td>
            `;

            logsBody.appendChild(tr);
        });
    }

    // Função para traduzir ações
    function traduzirAcao(acao) {
        const traducoes = {
            'login': 'Login',
            'logout': 'Logout',
            'password_change': 'Alteração de Senha',
            'user_created': 'Usuário Criado',
            'user_updated': 'Usuário Atualizado'
        };
        
        return traducoes[acao] || acao;
    }

    // Função para atualizar paginação
    function atualizarPaginacao(totalItens) {
        const totalPages = Math.ceil(totalItens / itemsPerPage);
        
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Função para mudar página
    function mudarPagina(direction) {
        currentPage += direction;
        carregarLogs();
    }

    // Função para aplicar filtros
    function aplicarFiltros() {
        currentFilters = {
            user: filterUser.value,
            action: filterAction.value,
            date: filterDate.value,
            success: filterSuccess.value
        };

        currentPage = 1;
        carregarLogs();
    }

    // Função para resetar filtros
    function resetarFiltros() {
        filterUser.value = '';
        filterAction.value = '';
        filterDate.value = '';
        filterSuccess.value = '';
        
        currentFilters = {};
        currentPage = 1;
        carregarLogs();
    }
});