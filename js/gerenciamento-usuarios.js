// js/gerenciamento-usuarios.js
// VERSÃO CORRIGIDA PARA USAR SUPABASE AUTH (Opção 2)

// Funções do Modal (precisam ser globais para o HTML inline)
const modalEditar = document.getElementById('modal-editar');
const formEditarUsuario = document.getElementById('form-editar-usuario');

function abrirModal() {
    if(modalEditar) modalEditar.style.display = 'block';
}

window.fecharModal = function() {
    if(modalEditar) modalEditar.style.display = 'none';
    if(formEditarUsuario) formEditarUsuario.reset();
}
// Fim das Funções do Modal

document.addEventListener('DOMContentLoaded', async function() {
    // A verificação de admin já foi feita no script inline do HTML
    
    // Elementos do DOM
    const usuariosBody = document.getElementById('usuarios-body');
    const formNovoUsuario = document.getElementById('form-novo-usuario');
    
    // Event Listeners
    if (formNovoUsuario) formNovoUsuario.addEventListener('submit', criarUsuario);
    if (formEditarUsuario) formEditarUsuario.addEventListener('submit', salvarEdicaoUsuario);

    // Carregar dados iniciais
    await carregarListaUsuarios();
    
    // Função para carregar lista de usuários (lendo da tabela 'profiles')
    async function carregarListaUsuarios() {
        try {
            if (!usuariosBody) return;
            
            usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>';
            
            // Pega o ID da empresa do admin logado
            const empresaId = window.sistemaAuth.getEmpresaId();
            if (!empresaId) {
                 throw new Error("ID da empresa do administrador não encontrado.");
            }

            // Busca todos os perfis DA MESMA EMPRESA
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('empresa_id', empresaId) // Filtra pela empresa do admin
                .order('nome', { ascending: true });

            if (error) throw error;

            usuariosBody.innerHTML = '';

            if (!profiles || profiles.length === 0) {
                usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum usuário encontrado</td></tr>';
                return;
            }

            profiles.forEach(perfil => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>${perfil.nome || 'N/A'}</td>
                    <td>${perfil.email || 'N/A'}</td>
                    <td>${perfil.tipo === 'admin' ? 'Administrador' : 'Usuário Normal'}</td>
                    <td>
                        <span class="status-badge ${perfil.ativo ? 'active' : 'inactive'}">
                            ${perfil.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>${new Date(perfil.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn-edit" data-id="${perfil.id}">Editar</button>
                        <button class="btn-danger" data-id="${perfil.id}" data-nome="${perfil.nome}">
                            Excluir
                        </button>
                    </td>
                `;

                usuariosBody.appendChild(tr);
            });

            adicionarEventListenersAcoes();

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            mostrarMensagem('Erro ao carregar lista de usuários: ' + error.message, 'error');
            if (usuariosBody) {
                usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Erro ao carregar usuários</td></tr>';
            }
        }
    }

    // Função para adicionar event listeners às ações
    function adicionarEventListenersAcoes() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                abrirModalEditar(btn.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = btn.getAttribute('data-id');
                const userName = btn.getAttribute('data-nome');
                excluirUsuario(userId, userName);
            });
        });
    }

    // Função para criar novo usuário (CHAMANDO EDGE FUNCTION)
    async function criarUsuario(e) {
        e.preventDefault();

        const nome = document.getElementById('novo-nome').value.trim();
        const email = document.getElementById('novo-username').value.trim(); // Campo agora é email
        const senha = document.getElementById('nova-senha').value;
        const tipo = document.getElementById('tipo-usuario').value;
        
        // Pega o ID da empresa do admin logado
        const empresaId = window.sistemaAuth.getEmpresaId();

        if (!nome || !email || !senha) {
            mostrarMensagem('Preencha nome, email e senha.', 'error');
            return;
        }
        if (senha.length < 6) {
            mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        try {
            // Chama a Edge Function 'admin-create-user'
            const { data, error } = await supabase.functions.invoke('admin-create-user', {
                body: {
                    email: email,
                    senha: senha,
                    nome: nome,
                    tipo: tipo,
                    empresa_id: empresaId // Passa a empresa_id do admin
                }
            });

            if (error) throw error; // Erro da Edge Function
            if (data.error) throw new Error(data.error); // Erro de lógica dentro da função

            mostrarMensagem('Usuário criado com sucesso!', 'success');
            formNovoUsuario.reset();
            await carregarListaUsuarios();
            
            // Alterna para a aba de lista (se a função existir)
            const switchTab = window.switchTab || function() {};
            switchTab('lista-usuarios');

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            mostrarMensagem('Erro ao criar usuário: ' + error.message, 'error');
        }
    }

    // Função para abrir modal de edição
    async function abrirModalEditar(userId) {
        try {
            const { data: perfil, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            document.getElementById('editar-id').value = perfil.id;
            document.getElementById('editar-nome').value = perfil.nome || '';
            document.getElementById('editar-username').value = perfil.email || ''; // Campo é email
            document.getElementById('editar-username').readOnly = true; // Não pode mudar email
            document.getElementById('editar-tipo').value = perfil.tipo;
            document.getElementById('editar-ativo').checked = perfil.ativo;
            
            document.getElementById('editar-senha').value = '';

            abrirModal(); // Chama a função global

        } catch (error) {
            console.error('Erro ao carregar usuário para edição:', error);
            mostrarMensagem('Erro ao carregar dados do usuário: ' + error.message, 'error');
        }
    }

    // Função para salvar edição do usuário (CHAMANDO EDGE FUNCTION)
    async function salvarEdicaoUsuario(e) {
        e.preventDefault();

        const id = document.getElementById('editar-id').value;
        const nome = document.getElementById('editar-nome').value.trim();
        const tipo = document.getElementById('editar-tipo').value;
        const ativo = document.getElementById('editar-ativo').checked;
        const novaSenha = document.getElementById('editar-senha').value;

        if (!nome) {
            mostrarMensagem('O campo Nome é obrigatório.', 'error');
            return;
        }

        const dadosUpdate = {
            user_id: id,
            nome: nome,
            tipo: tipo,
            ativo: ativo
        };

        // Adiciona a senha apenas se ela foi preenchida
        if (novaSenha) {
            if (novaSenha.length < 6) {
                mostrarMensagem('A nova senha deve ter pelo menos 6 caracteres', 'error');
                return;
            }
            dadosUpdate.senha = novaSenha;
        }

        try {
            // Chama a Edge Function 'admin-update-user'
            const { data, error } = await supabase.functions.invoke('admin-update-user', {
                body: dadosUpdate
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            mostrarMensagem('Usuário atualizado com sucesso!', 'success');
            fecharModal();
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            mostrarMensagem('Erro ao atualizar usuário: ' + error.message, 'error');
        }
    }

    // Função para excluir usuário (CHAMANDO EDGE FUNCTION)
    async function excluirUsuario(userId, userName) {
        if (userId === window.sistemaAuth.verificarAutenticacao()?.id) {
            mostrarMensagem('Você não pode excluir a si mesmo.', 'error');
            return;
        }
        
        if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário "${userName}"? Esta ação não pode ser desfeita!`)) {
            return;
        }

        try {
            // Chama a Edge Function 'admin-delete-user'
            const { data, error } = await supabase.functions.invoke('admin-delete-user', {
                body: { user_id: userId }
            });
            
            if (error) throw error;
            if (data.error) throw new Error(data.error);

            mostrarMensagem('Usuário excluído permanentemente do sistema!', 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            mostrarMensagem('Erro ao excluir usuário: ' + error.message, 'error');
        }
    }
});