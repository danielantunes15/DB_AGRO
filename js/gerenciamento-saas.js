// js/gerenciamento-saas.js
document.addEventListener('DOMContentLoaded', async function() {
    
    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const saasContent = document.getElementById('saas-content');
    const accessDeniedMessage = document.getElementById('access-denied-message');
    const listaEmpresasBody = document.getElementById('lista-empresas');
    const totalEmpresasStat = document.getElementById('total-empresas');
    const faturasPendentesStat = document.getElementById('faturas-pendentes');
    const chamadosAbertosStat = document.getElementById('chamados-abertos');
    const formNovaEmpresa = document.getElementById('nova-empresa-form');
    const faturasListContainer = document.getElementById('faturas-list-container');
    const chamadosListContainer = document.getElementById('chamados-list-container');
    
    // Checagem defensiva para inicialização dos clientes Supabase
    if (!window.supabase) {
         mostrarMensagem('Erro: O cliente principal do DB AGRO não está carregado. Verifique a configuração.', 'error');
         loadingElement.style.display = 'none';
         return;
    }
    
    // Chaves do DB Sistemas (para faturas e chamados)
    const DB_SISTEMAS_URL = 'https://hdmhxtatupfrkwbyusup.supabase.co'; 
    const DB_SISTEMAS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbWh4dGF0dXBmcmt3Ynl1c3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAzNDgsImV4cCI6MjA3ODYxNjM0OH0.t_2-hT-TtZI1PeGZDHoe-ApWYOT5eCFF2ki8CQa7f9k';
    
    // Inicializa o cliente Supabase SECUNDÁRIO
    const sbDbSistemas = supabase.createClient(DB_SISTEMAS_URL, DB_SISTEMAS_KEY);


    try {
        // 1. Verificar Autenticação e Permissão
        await window.sistemaAuth.carregarSessaoEPerfil();
        
        if (!window.sistemaAuth.isSuperAdmin()) {
            loadingElement.style.display = 'none';
            accessDeniedMessage.style.display = 'block';
            return;
        }

        // 2. É Super Admin: Mostra conteúdo e carrega dados
        loadingElement.style.display = 'none';
        saasContent.style.display = 'block';

        await Promise.all([
            loadEmpresas(),
            loadChamadosGlobais(),
            loadFaturasGlobais()
        ]);
        
        // 3. Configurar Event Listeners
        formNovaEmpresa.addEventListener('submit', criarNovaEmpresa);
        configurarTabs();

    } catch (error) {
        console.error('Erro na inicialização do painel SAAS:', error);
        mostrarMensagem('Erro fatal ao carregar o painel: ' + error.message, 'error');
        loadingElement.style.display = 'none';
    }
    
    // --- Funções de Gestão de Empresas ---

    async function loadEmpresas() {
        try {
            // Busca todas as empresas (RLS do SuperAdmin deve permitir isso)
            const { data, error, count } = await supabase
                .from('empresas') // Assumindo uma nova tabela 'empresas' para o SaaS
                .select(`
                    *,
                    profiles(count)
                `, { count: 'exact' });

            if (error) throw error;
            
            totalEmpresasStat.textContent = count;
            listaEmpresasBody.innerHTML = '';

            if (data.length === 0) {
                 listaEmpresasBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma empresa cadastrada.</td></tr>';
                 return;
            }

            data.forEach(empresa => {
                const totalUsuarios = empresa.profiles[0]?.count || 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${empresa.nome}</td>
                    <td>${empresa.id.substring(0, 8)}...</td>
                    <td><span class="status-badge ${empresa.ativo ? 'status-ativo' : 'status-inativo'}">${empresa.ativo ? 'Ativa' : 'Inativa'}</span></td>
                    <td>${totalUsuarios}</td>
                    <td class="actions-cell">
                        <button class="btn btn-secondary btn-sm" onclick="toggleEmpresaStatus('${empresa.id}', ${empresa.ativo})">
                            ${empresa.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="excluirEmpresa('${empresa.id}', '${empresa.nome}')">Excluir</button>
                    </td>
                `;
                 listaEmpresasBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            mostrarMensagem('Erro ao carregar lista de empresas: ' + error.message, 'error');
            listaEmpresasBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #dc3545;">Erro ao carregar empresas.</td></tr>';
        }
    }
    
    async function criarNovaEmpresa(e) {
        e.preventDefault();
        
        const nomeEmpresa = document.getElementById('nome-empresa').value.trim();
        const emailAdmin = document.getElementById('email-admin').value.trim();
        const senhaAdmin = document.getElementById('senha-admin').value;
        
        if (!nomeEmpresa || !emailAdmin || senhaAdmin.length < 6) {
            mostrarMensagem('Preencha todos os campos. A senha deve ter no mínimo 6 caracteres.', 'error');
            return;
        }

        try {
            // Chamando a Edge Function que cria a Empresa e o Admin (Requer que a função exista no Supabase)
            const { data, error } = await supabase.functions.invoke('saas-create-company', {
                body: {
                    nomeEmpresa: nomeEmpresa,
                    emailAdmin: emailAdmin,
                    senhaAdmin: senhaAdmin
                }
            });

            if (error) throw error; 
            if (data.error) throw new Error(data.error); 

            mostrarMensagem(`Empresa "${nomeEmpresa}" criada com sucesso! Admin: ${emailAdmin}`, 'success');
            formNovaEmpresa.reset();
            loadEmpresas();

        } catch (error) {
            console.error('Erro ao criar empresa:', error);
            mostrarMensagem('Erro ao criar nova empresa: ' + error.message, 'error');
        }
    }

    window.toggleEmpresaStatus = async function(empresaId, isCurrentlyActive) {
        const novoStatus = !isCurrentlyActive;
        const acao = novoStatus ? 'Ativar' : 'Desativar';
        if (!confirm(`Tem certeza que deseja ${acao} a empresa ${empresaId.substring(0, 8)}...?`)) return;

        try {
            // Requer que o SuperAdmin tenha permissão de UPDATE
            const { error } = await supabase
                .from('empresas')
                .update({ ativo: novoStatus })
                .eq('id', empresaId);

            if (error) throw error;
            
            mostrarMensagem(`Empresa ${empresaId.substring(0, 8)}... ${novoStatus ? 'Ativada' : 'Desativada'} com sucesso.`, 'success');
            loadEmpresas();

        } catch (error) {
            console.error(`Erro ao ${acao} empresa:`, error);
            mostrarMensagem(`Erro ao ${acao} empresa: ` + error.message, 'error');
        }
    }
    
    window.excluirEmpresa = async function(empresaId, nomeEmpresa) {
        if (!confirm(`⚠️ AVISO CRÍTICO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE a empresa "${nomeEmpresa}"? Esta ação é IRREVERSÍVEL e DELETARÁ TODOS OS DADOS DA EMPRESA!`)) return;
        
        try {
            // Chamando Edge Function para exclusão em cascata (REQUER IMPLEMENTAÇÃO NO SUPABASE)
             const { data, error } = await supabase.functions.invoke('saas-delete-company', {
                body: { empresa_id: empresaId }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error); 

            mostrarMensagem(`Empresa ${nomeEmpresa} excluída permanentemente!`, 'success');
            loadEmpresas();

        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            mostrarMensagem('Erro ao excluir empresa: ' + error.message, 'error');
        }
    }
    
    // --- Funções de Faturas (DB Sistemas) ---

    async function loadFaturasGlobais() {
        if (!sbDbSistemas) return; // Checagem defensiva

        try {
            // Busca Faturas e Sites de TODOS os clientes (Removendo o filtro user_id do db-faturas.js)
            const { data: sites, error } = await sbDbSistemas
                .from('sites')
                .select(`
                    id, name, url, user_id,
                    faturas (
                        id, descricao, valor, data_vencimento, status_pagamento
                    )
                `)
                .order('user_id') 
                .order('name'); 

            if (error) throw error;
            
            let totalPendentes = 0;
            let faturasHtml = `<table>
                                <thead>
                                    <tr>
                                        <th>Cliente ID</th>
                                        <th>Sistema</th>
                                        <th>Descrição</th>
                                        <th>Vencimento</th>
                                        <th>Valor</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>`;

            sites.forEach(site => {
                site.faturas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
                site.faturas.forEach(fatura => {
                    const statusInfo = getStatusInfo(fatura);
                    if (statusInfo.isPending) {
                         totalPendentes += fatura.valor;
                    }
                    
                    faturasHtml += `
                        <tr>
                            <td>${site.user_id.substring(0, 8)}...</td>
                            <td>${site.name}</td>
                            <td>${fatura.descricao}</td>
                            <td>${statusInfo.dataFormatada}</td>
                            <td>${statusInfo.valorFormatado}</td>
                            <td><span class="status-badge ${statusInfo.statusClass}">${statusInfo.statusText}</span></td>
                            <td class="actions-cell">
                                <button class="btn btn-primary btn-sm" onclick="marcarFatura('${fatura.id}', 'pago')">Pagar</button>
                                <button class="btn btn-secondary btn-sm" onclick="verDetalhesFatura('${fatura.id}')">Detalhes</button>
                            </td>
                        </tr>
                    `;
                });
            });
            
            faturasHtml += '</tbody></table>';

            faturasListContainer.innerHTML = faturasHtml;
            faturasPendentesStat.textContent = formatBRL(totalPendentes);

        } catch (error) {
            console.error('Erro ao buscar faturas globais:', error);
            mostrarMensagem('Erro ao buscar faturas globais: ' + error.message, 'error');
            faturasListContainer.innerHTML = '<p class="alert-error">Erro ao carregar faturas globais.</p>';
        }
    }
    
    function getStatusInfo(fatura) {
        let statusText = '';
        let statusClass = '';
        let isPending = false;

        const dataVencimento = new Date(fatura.data_vencimento + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        if (fatura.status_pagamento === 'pago') {
            statusText = 'Pago';
            statusClass = 'status-ativo';
        } else if (dataVencimento < hoje) {
            statusText = 'ATRASADO';
            statusClass = 'status-inativo';
            isPending = true;
        } else {
            statusText = 'Pendente';
            statusClass = 'status-pendente-custom'; // Usar uma classe customizada
            isPending = true;
        }

        const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');
        const valorFormatado = formatBRL(fatura.valor);

        return { statusText, statusClass, isPending, dataFormatada, valorFormatado };
    }
    
    function formatBRL(value) {
         return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    
    // --- Funções de Chamados (DB Sistemas) ---

    async function loadChamadosGlobais() {
        if (!sbDbSistemas) return; // Checagem defensiva
        
        try {
            // Busca Chamados de TODOS os clientes (Removendo o filtro user_id do db-central-ajuda.js)
            const { data: chamados, error } = await sbDbSistemas
                .from('chamados')
                .select(`*, sites ( name )`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const totalAbertos = chamados.filter(c => c.status === 'aberto' || c.status === 'aguardando').length;
            chamadosAbertosStat.textContent = totalAbertos;
            
            if (chamados.length === 0) {
                 chamadosListContainer.innerHTML = '<p>Nenhum chamado encontrado.</p>';
                 return;
            }
            
            chamadosListContainer.innerHTML = '';
            chamados.forEach(chamado => {
                const siteName = chamado.sites ? chamado.sites.name : 'Geral';
                const statusClass = chamado.status === 'aberto' ? 'aberto' : (chamado.status === 'fechado' ? 'pago' : 'pendente');

                chamadosListContainer.innerHTML += `
                    <div class="chamado-card">
                        <strong>${chamado.titulo}</strong> (Cliente ID: ${chamado.user_id.substring(0, 8)}...)
                        <p>Sistema: ${siteName}</p>
                        <p>${chamado.descricao.substring(0, 100)}...</p>
                        <div class="db-info-item">
                            <small>Aberto em: ${new Date(chamado.created_at).toLocaleString('pt-BR')}</small>
                            <span class="db-info-status ${statusClass}">Status: ${chamado.status.toUpperCase()}</span>
                        </div>
                         <div class="form-actions" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                            <button class="btn btn-primary btn-sm">Responder</button>
                            <button class="btn btn-secondary btn-sm">Fechar</button>
                        </div>
                    </div>
                `;
            });

        } catch (error) {
            console.error('Erro ao buscar chamados globais:', error);
            mostrarMensagem('Erro ao buscar chamados globais: ' + error.message, 'error');
            chamadosListContainer.innerHTML = '<p class="alert-error">Erro ao carregar chamados globais.</p>';
        }
    }


    // --- Lógica de Tabs ---
    function configurarTabs() {
        const tabBtns = document.querySelectorAll('.saas-tab-btn');
        const tabContents = document.querySelectorAll('.saas-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

});