// danielantunes15/db_agro/DB_AGRO-4705d31b581db2fc246a71b6285838ddc3f71e7c/js/gerenciamento-usuarios.js

// Funções globais de modal (Assumindo que estão em utils.js ou outro lugar, mas incluídas aqui para completude)
window.abrirModal = function(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.style.display = 'block';
    }
};

window.fecharModal = function() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
};

document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabase) {
        console.error('Erro Crítico: Cliente Supabase não encontrado.');
        return;
    }
    
    // ---------------------- Variáveis e DOM ----------------------
    const listaUsuariosDiv = document.getElementById('lista-usuarios');
    const mensagemDiv = document.getElementById('mensagem-usuarios');
    const formNovoUsuario = document.getElementById('form-novo-usuario');
    const formEditarUsuario = document.getElementById('form-editar-usuario');
    
    // Elementos de contexto
    const usuarioLogado = window.sistemaAuth.verificarAutenticacao();
    const isSuperAdmin = window.sistemaAuth.isSuperAdmin();
    const empresaId = window.sistemaAuth.getEmpresaId();

    // ---------------------- Funções de Utilidade ----------------------

    function mostrarMensagem(mensagem, tipo = 'error') {
        if (mensagemDiv) {
            mensagemDiv.style.display = 'block';
            mensagemDiv.className = `mensagem ${tipo}`;
            mensagemDiv.textContent = mensagem;
            setTimeout(() => {
                mensagemDiv.style.display = 'none';
            }, 5000);
        }
    }

    function limparLista() {
        if (listaUsuariosDiv) {
            listaUsuariosDiv.innerHTML = '';
        }
    }

    // ---------------------- Funções de Carregamento de Dados ----------------------
    
    async function carregarListaUsuarios() {
        limparLista();
        mostrarMensagem('Carregando usuários...', 'info');

        try {
            let query = supabase.from('profiles').select('id, nome, email, tipo, ativo, created_at, empresa_id');
            
            // Aplica filtro por empresa, exceto para SuperAdmin
            if (!isSuperAdmin) {
                if (!empresaId) {
                    throw new Error("Usuário administrador não está associado a uma empresa.");
                }
                query = query.eq('empresa_id', empresaId);
            }
            
            // Ordena pelo nome
            query = query.order('nome', { ascending: true });

            const { data: usuarios, error } = await query;

            if (error) throw error;

            if (!usuarios || usuarios.length === 0) {
                mostrarMensagem('Nenhum usuário encontrado.', 'info');
                return;
            }

            renderizarListaUsuarios(usuarios);
            mostrarMensagem('', 'info'); // Limpa a mensagem de carregamento

        } catch (error) {
            console.error('Erro ao carregar lista de usuários:', error);
            mostrarMensagem('Falha ao carregar usuários: ' + error.message, 'error');
        }
    }

    function renderizarListaUsuarios(usuarios) {
        let html = `
            <table class="tabela-usuarios">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Login (Email)</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        usuarios.forEach(user => {
            const isSelf = user.id === usuarioLogado.id;
            // Admins e SuperAdmins não podem alterar a si mesmos via esta tela (devem usar Perfil)
            const acoes = isSelf 
                ? `<span class="tag tag-disabled">Seu Perfil</span>` 
                : `
                    <button class="btn btn-sm btn-secondary" onclick="preencherEdicao('${user.id}')" title="Editar Usuário">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="excluirUsuario('${user.id}', '${user.nome}')" title="Excluir Usuário">Excluir</button>
                `;
            
            const statusTag = user.ativo 
                ? `<span class="tag tag-active">Ativo</span>` 
                : `<span class="tag tag-inactive">Inativo</span>`;

            html += `
                <tr>
                    <td>${user.id.substring(0, 8)}...</td>
                    <td>${user.nome}</td>
                    <td>${user.email}</td>
                    <td>${user.tipo}</td>
                    <td>${statusTag}</td>
                    <td>${acoes}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        listaUsuariosDiv.innerHTML = html;
    }
    
    // ---------------------- Funções de CRUD (MODIFICADAS) ----------------------

    // Função para criar novo usuário (MODIFICADO: Direto no 'profiles' + Função para senha)
    async function criarUsuario(e) {
        e.preventDefault();
        
        // Desativa o botão para evitar cliques duplicados
        const submitButton = document.getElementById('btn-salvar-novo-usuario');
        if (submitButton) submitButton.disabled = true;

        const nome = document.getElementById('novo-nome').value.trim();
        const email = document.getElementById('novo-username').value.trim().toUpperCase(); // Usando como LOGIN
        const senha = document.getElementById('nova-senha').value;
        const tipo = document.getElementById('tipo-usuario').value;
        
        const empresaIdParaInsercao = isSuperAdmin && tipo === 'superadmin' ? null : empresaId;

        if (!nome || !email || !senha) {
            mostrarMensagem('Preencha nome, login (email) e senha.', 'error');
            if (submitButton) submitButton.disabled = false;
            return;
        }
        if (senha.length < 6) {
            mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
            if (submitButton) submitButton.disabled = false;
            return;
        }
        
        try {
            // 1. Inserir o novo perfil (o email é o campo de login/username)
            const { data: novoPerfil, error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    nome: nome,
                    email: email, 
                    tipo: tipo,
                    ativo: true,
                    // Garante que SuperAdmins não tenham empresa_id
                    empresa_id: empresaIdParaInsercao
                }])
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') { // Código de violação de Unique Constraint
                    throw new Error('Este login (email) já está em uso. Tente outro.');
                }
                throw insertError;
            }
            
            // 2. Chamar a Edge Function para salvar a senha com hash
            // ⚠️ FUNÇÃO local-set-password PRECISA SER IMPLEMENTADA no Supabase
            const { data: senhaResult, error: senhaError } = await supabase.functions.invoke('local-set-password', {
                body: { user_id: novoPerfil.id, password: senha }
            });
            
            if (senhaError || senhaResult?.error) {
                 // Tenta reverter a criação do usuário se a senha falhar
                 await supabase.from('profiles').delete().eq('id', novoPerfil.id); 
                 throw new Error('Falha crítica ao salvar a senha. Usuário desfeito.');
            }

            mostrarMensagem('Usuário criado com sucesso! (Login: ' + email + ')', 'success');
            formNovoUsuario.reset();
            await carregarListaUsuarios();
            
            // Fecha o modal ou muda para a lista, se a função switchTab existir
            if (window.switchTab) {
                window.switchTab('lista-usuarios');
            } else {
                 window.fecharModal();
            }


        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            mostrarMensagem('Erro ao criar usuário: ' + (error.message || 'Erro desconhecido.'), 'error');
        } finally {
             if (submitButton) submitButton.disabled = false;
        }
    }


    // Função para preencher o modal de edição
    window.preencherEdicao = async function(userId) {
        
        // Remove a senha antiga para evitar vazamento
        document.getElementById('editar-senha').value = ''; 

        try {
            const { data: user, error } = await supabase
                .from('profiles')
                .select('id, nome, email, tipo, ativo')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (!user) throw new Error('Usuário não encontrado.');

            document.getElementById('editar-id').value = user.id;
            document.getElementById('editar-nome').value = user.nome;
            document.getElementById('editar-username').value = user.email; // O login não deve ser editável
            document.getElementById('editar-tipo').value = user.tipo;
            document.getElementById('editar-ativo').checked = user.ativo;
            
            // Desabilita campos de tipo e login/email se não for SuperAdmin
            const usernameInput = document.getElementById('editar-username');
            const tipoSelect = document.getElementById('editar-tipo');
            
            usernameInput.disabled = true; // Login/Email não pode ser alterado
            tipoSelect.disabled = !isSuperAdmin; // Apenas SuperAdmin pode mudar o tipo
            
            // Garante que o SuperAdmin não possa ser desativado
            if (user.tipo === 'superadmin') {
                document.getElementById('editar-ativo').disabled = true;
            } else {
                document.getElementById('editar-ativo').disabled = false;
            }


            window.abrirModal('modal-editar-usuario');

        } catch (error) {
            console.error('Erro ao carregar dados para edição:', error);
            mostrarMensagem('Erro ao carregar dados do usuário.', 'error');
        }
    };
    

    // Função para salvar edição do usuário (MODIFICADO: Direto no 'profiles' + Função para senha)
    async function salvarEdicaoUsuario(e) {
        e.preventDefault();
        
        const submitButton = document.getElementById('btn-salvar-edicao-usuario');
        if (submitButton) submitButton.disabled = true;

        const id = document.getElementById('editar-id').value;
        const nome = document.getElementById('editar-nome').value.trim();
        const tipo = document.getElementById('editar-tipo').value;
        const ativo = document.getElementById('editar-ativo').checked;
        const novaSenha = document.getElementById('editar-senha').value;
        
        if (!nome) {
            mostrarMensagem('O campo Nome é obrigatório.', 'error');
            if (submitButton) submitButton.disabled = false;
            return;
        }

        try {
            // 1. Atualizar o perfil (nome, tipo, ativo)
            const updatePayload = {
                nome: nome,
                ativo: ativo,
            };
            
            // Apenas SuperAdmin pode alterar o tipo
            if (isSuperAdmin) {
                updatePayload.tipo = tipo;
                // Garante que SuperAdmin não tenha empresa_id
                if (tipo === 'superadmin') {
                     updatePayload.empresa_id = null;
                }
            }
            
            const { error: perfilError } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', id);

            if (perfilError) throw perfilError;
            
            let sucessoMsg = 'Usuário atualizado com sucesso!';

            // 2. Se nova senha foi fornecida, chamar a Edge Function para hash
            if (novaSenha) {
                if (novaSenha.length < 6) {
                    mostrarMensagem('A nova senha deve ter pelo menos 6 caracteres', 'error');
                    // Não reverte o perfil, apenas falha na senha
                    if (submitButton) submitButton.disabled = false; 
                    return;
                }
                
                // ⚠️ FUNÇÃO local-set-password PRECISA SER IMPLEMENTADA
                const { data: senhaResult, error: senhaError } = await supabase.functions.invoke('local-set-password', {
                    body: { user_id: id, password: novaSenha }
                });
                
                if (senhaError || senhaResult?.error) {
                    throw new Error('Falha ao atualizar a senha no servidor. Perfil atualizado, mas senha não.');
                }
                sucessoMsg = 'Usuário e Senha atualizados com sucesso!';
            }
            
            mostrarMensagem(sucessoMsg, 'success');
            
            window.fecharModal();
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            mostrarMensagem('Erro ao atualizar usuário: ' + (error.message || 'Erro desconhecido.'), 'error');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    // Função para excluir usuário (MODIFICADO: Direto no 'profiles')
    window.excluirUsuario = async function(userId, userName) {
        if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário "${userName}"? Esta ação não pode ser desfeita!`)) {
            return;
        }

        if (userId === usuarioLogado.id) {
            mostrarMensagem('Você não pode excluir seu próprio perfil através desta tela.', 'error');
            return;
        }

        try {
             // Excluir o perfil
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
                
            if (error) throw error;

            mostrarMensagem('Usuário excluído permanentemente do sistema!', 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            mostrarMensagem('Erro ao excluir usuário: ' + (error.message || 'Erro desconhecido.'), 'error');
        }
    }


    // ---------------------- Event Listeners ----------------------
    if (formNovoUsuario) formNovoUsuario.addEventListener('submit', criarUsuario);
    if (formEditarUsuario) formEditarUsuario.addEventListener('submit', salvarEdicaoUsuario);
    
    // Associa eventos de fechar modal (se necessário, dependendo de onde fecharModal está)
    document.querySelectorAll('.modal .close-button, .modal-footer .btn-secondary').forEach(btn => {
        btn.addEventListener('click', window.fecharModal);
    });

    // ---------------------- Inicialização ----------------------
    await carregarListaUsuarios();
});