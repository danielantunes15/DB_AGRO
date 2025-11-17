// js/db-central-ajuda.js

// --- IMPORTANTE: COLOQUE AQUI AS CHAVES DO SEU PROJETO "DB SISTEMAS" ---
// (Copiado de db_sistemas/js/config.js)
const DB_SISTEMAS_URL = 'https://hdmhxtatupfrkwbyusup.supabase.co';
const DB_SISTEMAS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbWh4dGF0dXBmcmt3Ynl1c3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAzNDgsImV4cCI6MjA3ODYxNjM0OH0.t_2-hT-TtZI1PeGZDHoe-ApWYOT5eCFF2ki8CQa7f9k';
// --------------------------------------------------------------------

// --- IMPORTANTE 2: COLOQUE AQUI O ID (UUID) DO SEU CLIENTE "AGRO CANA" ---
// (O ID da tabela 'auth.users' do seu banco de dados DB SISTEMAS)
const AGRO_CANA_CLIENT_ID = '54a74da2-8c93-4a67-b44f-910690b45a8d'; 
// --------------------------------------------------------------------


// Inicializa um cliente Supabase *separado* apenas para esta página
const sbDbSistemas = supabase.createClient(DB_SISTEMAS_URL, DB_SISTEMAS_KEY);

document.addEventListener('DOMContentLoaded', function() {
    
    // Pega o usuário logado do Agro Cana (APENAS para saber o nome dele, se quisermos)
    const currentUserAgroCana = window.sistemaAuth.verificarAutenticacao();
    const nomeUsuarioAgroCana = currentUserAgroCana?.nome || 'Usuário';

    if (!AGRO_CANA_CLIENT_ID || AGRO_CANA_CLIENT_ID === '54a74da2-8c93-4a67-b44f-910690b45a8d') {
        mostrarMensagem('Erro de configuração: A página não está vinculada a um cliente.', 'error');
        return;
    }

    const novoChamadoBtn = document.getElementById('novo-chamado-btn');
    const cancelChamadoBtn = document.getElementById('cancel-chamado-btn');
    const chamadoForm = document.getElementById('chamado-form');
    const chamadosListContainer = document.getElementById('chamados-list-container');
    const chamadoSiteSelect = document.getElementById('chamado-site');

    // Botão "Novo Chamado" mostra o formulário
    novoChamadoBtn.addEventListener('click', () => {
        chamadoForm.style.display = 'block';
        novoChamadoBtn.style.display = 'none';
        loadUserSitesForSelect();
    });

    // Botão "Cancelar" esconde o formulário
    cancelChamadoBtn.addEventListener('click', () => {
        chamadoForm.style.display = 'none';
        novoChamadoBtn.style.display = 'inline-block';
        chamadoForm.reset();
    });

    // Carrega os sites do "DB Sistemas" no <select>
    async function loadUserSitesForSelect() {
        try {
            const { data: sites, error } = await sbDbSistemas
                .from('sites')
                .select('id, name')
                .eq('user_id', AGRO_CANA_CLIENT_ID); // <--- USA O ID FIXO

            if (error) throw error;

            chamadoSiteSelect.innerHTML = '<option value="">Nenhum (Chamado geral)</option>';
            sites.forEach(site => {
                chamadoSiteSelect.innerHTML += `<option value="${site.id}">${site.name}</option>`;
            });
        } catch (error) {
            console.error('Erro ao carregar sites:', error);
            mostrarMensagem('Não foi possível carregar seus sites do DB Sistemas.', 'error');
        }
    }

    // Carrega a lista de chamados existentes
    async function loadUserChamados() {
        chamadosListContainer.innerHTML = '<p>Carregando chamados...</p>';
        try {
            const { data: chamados, error } = await sbDbSistemas
                .from('chamados')
                .select(`*, sites ( name )`)
                .eq('user_id', AGRO_CANA_CLIENT_ID) // <--- USA O ID FIXO
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (chamados.length === 0) {
                chamadosListContainer.innerHTML = '<p>Nenhum chamado aberto encontrado.</p>';
                return;
            }

            chamadosListContainer.innerHTML = '';
            chamados.forEach(chamado => {
                const siteName = chamado.sites ? chamado.sites.name : 'Geral';
                // Adicionamos quem abriu (do Agro Cana) na descrição
                const descricao = chamado.descricao.includes('[Aberto por:') 
                    ? chamado.descricao 
                    : `${chamado.descricao} <br><small style='color:var(--text-light)'>[Aberto por: ${chamado.data_extra?.aberto_por || 'N/A'}]</small>`;

                chamadosListContainer.innerHTML += `
                    <div class="chamado-card">
                        <strong>${chamado.titulo}</strong> (Status: ${chamado.status})
                        <p>Sistema: ${siteName}</p>
                        <p>${descricao}</p>
                        <small>Aberto em: ${new Date(chamado.created_at).toLocaleString('pt-BR')}</small>
                    </div>
                `;
            });
        } catch (error) {
            console.error('Erro ao buscar chamados:', error);
            mostrarMensagem('Erro ao buscar seus chamados: ' + error.message, 'error');
        }
    }

    // Salvar o novo chamado
    chamadoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const novoChamado = {
            user_id: AGRO_CANA_CLIENT_ID, // <--- USA O ID FIXO
            site_id: document.getElementById('chamado-site').value || null,
            titulo: document.getElementById('chamado-titulo').value,
            descricao: document.getElementById('chamado-descricao').value,
            status: 'aberto',
            // Campo JSONB opcional para saber quem abriu
            data_extra: { 
                aberto_por: nomeUsuarioAgroCana 
            }
        };
        
        // (Opcional: Adicione a coluna 'data_extra' (tipo jsonb) na sua tabela 'chamados' para salvar quem abriu)

        try {
            const { error } = await sbDbSistemas.from('chamados').insert([novoChamado]);
            if (error) throw error;

            mostrarMensagem('Chamado aberto com sucesso!', 'success');
            chamadoForm.style.display = 'none';
            novoChamadoBtn.style.display = 'inline-block';
            chamadoForm.reset();
            loadUserChamados(); 

        } catch (error) {
            console.error('Erro ao abrir chamado:', error);
            mostrarMensagem('Erro ao abrir chamado: ' + error.message, 'error');
        }
    });

    loadUserChamados();
});