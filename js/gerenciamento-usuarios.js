// js/gerenciamento-usuarios.js

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário atual é administrador
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    
    if (!usuarioLogado || usuarioLogado.tipo !== 'admin') {
        // Se não for administrador, não carregar a funcionalidade
        console.log('Acesso negado: usuário não é administrador');
        return;
    }

    // Elementos do DOM
    const logoutBtn = document.getElementById('logout-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const usuariosBody = document.getElementById('usuarios-body');
    const formNovoUsuario = document.getElementById('form-novo-usuario');
    const modalEditar = document.getElementById('modal-editar');
    const formEditarUsuario = document.getElementById('form-editar-usuario');
    const fecharModalBtn = document.getElementById('fechar-modal');
    const closeModalSpan = document.querySelector('.close');

    // Event Listeners
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Forms
    if (formNovoUsuario) formNovoUsuario.addEventListener('submit', criarUsuario);
    if (formEditarUsuario) formEditarUsuario.addEventListener('submit', salvarEdicaoUsuario);

    // Modal
    if (fecharModalBtn) fecharModalBtn.addEventListener('click', fecharModal);
    if (closeModalSpan) closeModalSpan.addEventListener('click', fecharModal);
    window.addEventListener('click', (e) => {
        if (e.target === modalEditar) fecharModal();
    });

    // Carregar dados iniciais
    carregarListaUsuarios();

    // Função para logout
    function logout() {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    }

    // Função para alternar entre abas
    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    // Função para carregar lista de usuários
    async function carregarListaUsuarios() {
        try {
            if (!usuariosBody) return;
            
            usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>';

            const { data: usuarios, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .order('criado_em', { ascending: false });

            if (error) {
                console.error('Erro detalhado:', error);
                if (error.message.includes('does not exist')) {
                    throw new Error('Tabela sistema_usuarios não encontrada. Verifique o SQL no Supabase.');
                }
                throw error;
            }

            usuariosBody.innerHTML = '';

            if (!usuarios || usuarios.length === 0) {
                usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum usuário encontrado</td></tr>';
                return;
            }

            usuarios.forEach(usuario => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>${usuario.nome || 'N/A'}</td>
                    <td>${usuario.username}</td>
                    <td>${usuario.tipo === 'admin' ? 'Administrador' : 'Usuário Normal'}</td>
                    <td>
                        <span class="status-badge ${usuario.ativo ? 'active' : 'inactive'}">
                            ${usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>${new Date(usuario.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn-edit" data-id="${usuario.id}">Editar</button>
                        <button class="btn-toggle ${usuario.ativo ? 'btn-warning' : 'btn-success'}" 
                            data-id="${usuario.id}" data-active="${usuario.ativo}">
                            ${usuario.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button class="btn-danger" data-id="${usuario.id}" data-nome="${usuario.nome}">
                            Excluir
                        </button>
                    </td>
                `;

                usuariosBody.appendChild(tr);
            });

            // Adicionar eventos aos botões
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

        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = btn.getAttribute('data-id');
                const currentlyActive = btn.getAttribute('data-active') === 'true';
                toggleUsuario(userId, currentlyActive);
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

    // Função para criar novo usuário
    async function criarUsuario(e) {
        e.preventDefault();

        const nome = document.getElementById('novo-nome').value.trim();
        const username = document.getElementById('novo-username').value.trim();
        const senha = document.getElementById('nova-senha').value;
        const tipo = document.getElementById('tipo-usuario').value;

        if (!nome || !username || !senha) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (senha.length < 6) {
            mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        try {
            // Verificar se username já existe
            const { data: existing, error: checkError } = await supabase
                .from('sistema_usuarios')
                .select('id')
                .eq('username', username)
                .maybeSingle();

            if (checkError) {
                console.error('Erro ao verificar username:', checkError);
                throw checkError;
            }

            if (existing) {
                mostrarMensagem('Username já está em uso', 'error');
                return;
            }

            // Fazer hash da senha (AGORA QUE window.sistemaAuth ESTÁ CARREGADO)
            const senhaHash = await window.sistemaAuth.hashSenha(senha);

            // Criar usuário
            const { error: insertError } = await supabase
                .from('sistema_usuarios')
                .insert({
                    nome: nome,
                    username: username,
                    senha_hash: senhaHash,
                    tipo: tipo,
                    ativo: true,
                    criado_em: new Date().toISOString()
                });

            if (insertError) {
                console.error('Erro ao inserir usuário:', insertError);
                throw insertError;
            }

            mostrarMensagem('Usuário criado com sucesso!', 'success');
            formNovoUsuario.reset();
            await carregarListaUsuarios();
            switchTab('lista-usuarios');

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            mostrarMensagem('Erro ao criar usuário: ' + error.message, 'error');
        }
    }

    // Função para abrir modal de edição
    async function abrirModalEditar(userId) {
        try {
            const { data: usuario, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            document.getElementById('editar-id').value = usuario.id;
            document.getElementById('editar-nome').value = usuario.nome || '';
            document.getElementById('editar-username').value = usuario.username || '';
            document.getElementById('editar-tipo').value = usuario.tipo;
            document.getElementById('editar-ativo').checked = usuario.ativo;
            
            // Limpar o campo de senha no modal, por segurança
            document.getElementById('editar-senha').value = '';

            modalEditar.style.display = 'block';

        } catch (error) {
            console.error('Erro ao carregar usuário para edição:', error);
            mostrarMensagem('Erro ao carregar dados do usuário: ' + error.message, 'error');
        }
    }

    // Função para fechar modal
    function fecharModal() {
        modalEditar.style.display = 'none';
        formEditarUsuario.reset();
    }

    // Função para salvar edição do usuário (CORRIGIDA)
    async function salvarEdicaoUsuario(e) {
        e.preventDefault();

        const id = document.getElementById('editar-id').value;
        const nome = document.getElementById('editar-nome').value.trim();
        const username = document.getElementById('editar-username').value.trim();
        const tipo = document.getElementById('editar-tipo').value;
        const ativo = document.getElementById('editar-ativo').checked;
        const novaSenha = document.getElementById('editar-senha').value; // NOVO: Captura a nova senha

        if (!nome || !username) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        try {
            // Verificar se username já existe (excluindo o próprio usuário)
            const { data: existing, error: checkError } = await supabase
                .from('sistema_usuarios')
                .select('id')
                .eq('username', username)
                .neq('id', id)
                .maybeSingle();

            if (checkError) {
                console.error('Erro ao verificar username:', checkError);
                throw checkError;
            }

            if (existing) {
                mostrarMensagem('Username já está em uso', 'error');
                return;
            }

            // Objeto de dados para atualização
            const updateData = { 
                nome: nome, 
                username: username, 
                tipo: tipo, 
                ativo: ativo,
                atualizado_em: new Date().toISOString()
            };
            
            // NOVO: Tratar a atualização de senha
            if (novaSenha) {
                if (novaSenha.length < 6) {
                    mostrarMensagem('A nova senha deve ter pelo menos 6 caracteres', 'error');
                    return;
                }
                // Fazer hash da senha
                const senhaHash = await window.sistemaAuth.hashSenha(novaSenha);
                updateData.senha_hash = senhaHash;
            }

            // Atualizar usuário
            const { error } = await supabase
                .from('sistema_usuarios')
                .update(updateData) // Usa o objeto com ou sem o hash da senha
                .eq('id', id);

            if (error) throw error;
            
            // Mensagem de sucesso personalizada se a senha foi alterada
            if (novaSenha) {
                mostrarMensagem('Usuário e senha atualizados com sucesso!', 'success');
            } else {
                mostrarMensagem('Usuário atualizado com sucesso!', 'success');
            }

            fecharModal();
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            mostrarMensagem('Erro ao atualizar usuário: ' + error.message, 'error');
        }
    }

    // Função para ativar/desativar usuário
    async function toggleUsuario(userId, currentlyActive) {
        if (!confirm(`Tem certeza que deseja ${currentlyActive ? 'desativar' : 'ativar'} este usuário?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('sistema_usuarios')
                .update({ 
                    ativo: !currentlyActive,
                    atualizado_em: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            mostrarMensagem(`Usuário ${currentlyActive ? 'desativado' : 'ativado'} com sucesso!`, 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            mostrarMensagem('Erro ao alterar status do usuário: ' + error.message, 'error');
        }
    }

    // Função para excluir usuário
    async function excluirUsuario(userId, userName) {
        if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário "${userName}"? Esta ação não pode ser desfeita!`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('sistema_usuarios')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            mostrarMensagem('Usuário excluído permanentemente do sistema!', 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            mostrarMensagem('Erro ao excluir usuário: ' + error.message, 'error');
        }
    }
});