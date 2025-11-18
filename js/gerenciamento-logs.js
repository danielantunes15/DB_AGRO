// js/gerenciamento-logs.js
// VERSÃO CORRIGIDA PARA USAR O NOVO SISTEMA DE AUTH (Supabase Auth)

document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. (NOVO) Aguarda a autenticação e o carregamento do perfil
    try {
        await window.sistemaAuth.requerAutenticacao();
    } catch (error) {
        // Se falhar (ex: perfil não existe), o 'requerAutenticacao' já redirecionou
        return; 
    }

    // 2. (NOVO) Agora, verifica se é admin (de forma síncrona)
    if (!window.sistemaAuth.isAdmin()) {
        console.warn('Acesso negado à página de logs.');
        document.body.innerHTML = '<div class="card" style="padding: 2rem; background-color: #f8d7da; color: #721c24;"><h2>Acesso Negado</h2><p>Você precisa ser administrador para ver esta página.</p><a href="index.html" class="btn btn-primary">Voltar</a></div>';
        return;
    }
    
    // Se chegou aqui, é admin.

    // Elementos do DOM
    const logoutBtn = document.getElementById('logout-btn'); // 'logout-btn' é global do layout
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
    // O logout-btn é tratado pelo layout.js
    applyFiltersBtn.addEventListener('click', aplicarFiltros);
    resetFiltersBtn.addEventListener('click', resetarFiltros);
    prevPageBtn.addEventListener('click', () => mudarPagina(-1));
    nextPageBtn.addEventListener('click', () => mudarPagina(1));

    // Carregar dados iniciais
    await carregarUsuariosFiltro();
    await carregarLogs();

    // Função para carregar usuários no filtro
    async function carregarUsuariosFiltro() {
        try {
            // Busca da tabela 'profiles'
            const { data: usuarios, error } = await supabase
                .from('profiles')
                .select('id, nome, email') // Usamos 'email' como username
                .order('nome');

            if (error) throw error;

            filterUser.innerHTML = '<option value="">Todos os usuários</option>';
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.email; // Filtra pelo email
                option.textContent = `${usuario.nome} (${usuario.email})`;
                filterUser.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    // Função para carregar logs
    async function carregarLogs() {
        try {
            // Tabela de logs do Supabase: 'audit.logs'
            // Precisamos de uma view ou RPC para acessá-la, pois RLS não se aplica facilmente
            // Vamos assumir que você criou uma VIEW chamada 'logs_de_acesso'
            
            let query = supabase
                .from('logs_de_acesso') // ATENÇÃO: Você precisará criar esta VIEW no Supabase
                .select('*', { count: 'exact' })
                .order('timestamp', { ascending: false });

            // Aplicar filtros
            if (currentFilters.user) {
                // A view deve expor o email ou username
                query = query.eq('user_email', currentFilters.user); 
            }
            if (currentFilters.action) {
                query = query.ilike('action_name', `%${currentFilters.action}%`); // ex: 'login'
            }
            if (currentFilters.date) {
                const startDate = new Date(currentFilters.date);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                
                query = query.gte('timestamp', startDate.toISOString())
                            .lt('timestamp', endDate.toISOString());
            }
            if (currentFilters.success !== undefined && currentFilters.success !== "") {
                // 'success' pode não estar disponível, depende da view
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
            mostrarMensagem('Erro ao carregar logs de acesso. Verifique se a VIEW "logs_de_acesso" existe e tem permissão de SELECT.', 'error');
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
            
            const dataHora = new Date(log.timestamp).toLocaleString('pt-BR');
            // 'success' não existe por padrão, então assumimos sucesso
            const statusText = 'Sucesso'; 
            const statusClass = 'status-success';
            
            tr.innerHTML = `
                <td>${dataHora}</td>
                <td>${log.user_email || 'Sistema'}</td>
                <td>${log.action_name || 'N/A'}</td>
                <td>${log.ip_address || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${log.error_message || '-'}</td>
            `;

            logsBody.appendChild(tr);
        });
    }

    function atualizarPaginacao(totalItens) {
        const totalPages = Math.ceil(totalItens / itemsPerPage);
        
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function mudarPagina(direction) {
        currentPage += direction;
        carregarLogs();
    }

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