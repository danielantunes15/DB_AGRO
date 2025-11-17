document.addEventListener('DOMContentLoaded', async function() {
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const funcionarioForm = document.getElementById('funcionario-form');
    const turmaForm = document.getElementById('turma-form');
    const funcionariosList = document.getElementById('funcionarios-list');
    const turmasList = document.getElementById('turmas-list');
    const turmaFuncionarioSelect = document.getElementById('turma-funcionario');
    const codigoFuncionarioInput = document.getElementById('codigo-funcionario'); // Elemento do código

    // NOVOS ELEMENTOS PARA FILTRO
    const filtroForm = document.getElementById('filtro-funcionarios-form');
    const filtroNomeCpf = document.getElementById('filtro-nome-cpf');
    const filtroTurmaSelect = document.getElementById('filtro-turma');
    const limparFiltroFuncionariosBtn = document.getElementById('limpar-filtro-funcionarios');
    // FIM NOVOS ELEMENTOS
    
    let funcionarioEditandoId = null;
    let turmaEditandoId = null;

    // Máscaras para CPF e Telefone
    function aplicarMascaras() {
        const cpfInput = document.getElementById('cpf-funcionario');
        const telefoneInput = document.getElementById('telefone-funcionario');

        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            
            e.target.value = value;
        });

        telefoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length === 11) {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (value.length === 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            }
            
            e.target.value = value;
        });
    }

    try {
        loadingElement.style.display = 'block';
        contentElement.style.display = 'none';
        errorElement.style.display = 'none';

        await testarConexaoSupabase();
        
        loadingElement.style.display = 'none';
        contentElement.style.display = 'block';

        aplicarMascaras();
        await carregarTurmasParaSelect();
        await carregarTurmasParaFiltro();
        await carregarFuncionarios(); // Carrega todos na inicialização
        await carregarTurmas();
        
        // NOVO: Sugere o próximo código ao carregar a página
        if (codigoFuncionarioInput) {
            await sugerirProximoCodigo();
        }
        
        funcionarioForm.addEventListener('submit', salvarFuncionario);
        turmaForm.addEventListener('submit', salvarTurma);

        // NOVOS LISTENERS PARA FILTRO
        if (filtroForm) filtroForm.addEventListener('submit', aplicarFiltrosFuncionarios);
        if (limparFiltroFuncionariosBtn) limparFiltroFuncionariosBtn.addEventListener('click', limparFiltrosFuncionarios);
        // FIM NOVOS LISTENERS

    } catch (error) {
        console.error('Erro na inicialização:', error);
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
    }
    
    // FUNÇÃO NOVO: Sugere o próximo código sequencial
    async function sugerirProximoCodigo() {
        if (!codigoFuncionarioInput) return;
        
        try {
            // 1. Busca o último código cadastrado, ordenando de forma descendente e limitando a 1
            const { data, error } = await supabase
                .from('funcionarios')
                .select('codigo')
                .order('codigo', { ascending: false })
                .limit(1);

            if (error) throw error;
            
            let proximoCodigo = 1;
            
            if (data && data.length > 0 && data[0].codigo) {
                // 2. Converte o último código para número, incrementa
                const ultimoCodigo = parseInt(data[0].codigo.replace(/\D/g, ''));
                if (!isNaN(ultimoCodigo)) {
                    proximoCodigo = ultimoCodigo + 1;
                }
            }
            
            // 3. Formata o número de volta para string de 2 dígitos (ex: 1 -> '01', 15 -> '15')
            const codigoFormatado = String(proximoCodigo).padStart(2, '0');
            
            // 4. Preenche o campo (somente se não estiver em modo de edição)
            if (!funcionarioEditandoId) {
                codigoFuncionarioInput.value = codigoFormatado;
                // NOVO: Define como somente leitura para evitar alteração
                codigoFuncionarioInput.readOnly = true; 
            }

        } catch (error) {
            console.error('Erro ao sugerir código:', error);
            // Em caso de erro, define o valor padrão para 01 e permite edição manual
            codigoFuncionarioInput.value = '01';
            codigoFuncionarioInput.readOnly = false; 
            mostrarMensagem('Atenção: Não foi possível sugerir o código automático. Verifique a lista.', 'error');
        }
    }


    function limparFormularioFuncionario() {
        funcionarioForm.reset();
        funcionarioEditandoId = null;
        document.querySelector('#funcionario-form button[type="submit"]').textContent = 'Salvar Funcionário';
        
        // NOVO: Garante que o campo seja somente leitura e sugere o próximo código
        if (codigoFuncionarioInput) {
            codigoFuncionarioInput.readOnly = true; 
        }
        sugerirProximoCodigo();
    }

    function limparFormularioTurma() {
        turmaForm.reset();
        turmaEditandoId = null;
        document.querySelector('#turma-form button[type="submit"]').textContent = 'Salvar Turma';
    }

    async function salvarFuncionario(e) {
        e.preventDefault();
        
        const nome = document.getElementById('nome-funcionario').value.trim();
        const cpf = document.getElementById('cpf-funcionario').value.replace(/\D/g, '');
        const codigo = document.getElementById('codigo-funcionario').value.trim(); // NOVO: Captura o código
        const nascimento = document.getElementById('nascimento-funcionario').value;
        const telefone = document.getElementById('telefone-funcionario').value.replace(/\D/g, '');
        const funcao = document.getElementById('funcao-funcionario').value;
        const turmaId = document.getElementById('turma-funcionario').value;
        
        // Adiciona 'codigo' nas validações
        if (!nome || !cpf || !codigo || !nascimento || !funcao || !turmaId) { 
            mostrarMensagem('Preencha todos os campos obrigatórios, incluindo o Código.', 'error');
            return;
        }

        if (cpf.length !== 11) {
            mostrarMensagem('CPF deve ter 11 dígitos.', 'error');
            return;
        }
        
        // NOVO: Validação para Código (ex: 01, 15)
        if (!/^\d{1,2}$/.test(codigo)) {
            mostrarMensagem('O Código do Funcionário deve ter 1 ou 2 dígitos numéricos (ex: 01, 15).', 'error');
            return;
        }
        
        try {
            // NOVO: Verificar se o código já existe (CORREÇÃO DE UUID)
            let queryCheckCode = supabase
                .from('funcionarios')
                .select('id')
                .eq('codigo', codigo);

            // CORREÇÃO: Apenas adiciona o filtro .neq('id', ...) se estivermos em modo de edição.
            // Isso evita passar um valor vazio ("") para um campo UUID.
            if (funcionarioEditandoId) {
                queryCheckCode = queryCheckCode.neq('id', funcionarioEditandoId);
            }

            const { data: existingCode, error: codeCheckError } = await queryCheckCode.maybeSingle();
            
            if (codeCheckError) throw codeCheckError;

            if (existingCode) {
                mostrarMensagem('ERRO: Este Código de Funcionário já está em uso.', 'error');
                return;
            }

            let resultado;
            
            if (funcionarioEditandoId) {
                // Editar funcionário existente
                resultado = await supabase
                    .from('funcionarios')
                    .update({
                        nome: nome,
                        cpf: cpf,
                        codigo: codigo, // NOVO: Salva o código
                        data_nascimento: nascimento,
                        telefone: telefone,
                        funcao: funcao,
                        turma: turmaId
                    })
                    .eq('id', funcionarioEditandoId)
                    .select()
                    .single();
                    
                mostrarMensagem('Funcionário atualizado com sucesso!');
            } else {
                // Criar novo funcionário
                resultado = await supabase
                    .from('funcionarios')
                    .insert([{
                        nome: nome,
                        cpf: cpf,
                        codigo: codigo, // NOVO: Salva o código
                        data_nascimento: nascimento,
                        telefone: telefone,
                        funcao: funcao,
                        turma: turmaId
                    }])
                    .select()
                    .single();
                    
                mostrarMensagem('Funcionário salvo com sucesso!');
            }
                
            if (resultado.error) throw resultado.error;
            
            limparFormularioFuncionario();
            await carregarFuncionarios(); // Recarrega lista após salvar
            
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            
            // VERIFICAÇÃO ESPECÍFICA PARA ERRO DE CPF DUPLICADO (chave única: 23505)
            if (error.code === '23505' && error.message.includes('funcionarios_cpf_key')) {
                mostrarMensagem('ERRO: Este CPF já está cadastrado no sistema. Verifique o CPF ou edite o funcionário existente.', 'error');
            } else {
                mostrarMensagem('Erro ao salvar funcionário: ' + error.message, 'error');
            }
        }
    }

    async function salvarTurma(e) {
        e.preventDefault();
        
        const nome = document.getElementById('nome-turma').value.trim();
        const encarregado = document.getElementById('encarregado-turma').value.trim();
        
        if (!nome) {
            mostrarMensagem('Informe o nome da turma.', 'error');
            return;
        }
        
        try {
            let resultado;
            
            if (turmaEditandoId) {
                // Editar turma existente
                resultado = await supabase
                    .from('turmas')
                    .update({
                        nome: nome,
                        encarregado: encarregado
                    })
                    .eq('id', turmaEditandoId)
                    .select()
                    .single();
                    
                mostrarMensagem('Turma atualizada com sucesso!');
            } else {
                // Criar nova turma
                resultado = await supabase
                    .from('turmas')
                    .insert([{
                        nome: nome,
                        encarregado: encarregado
                    }])
                    .select()
                    .single();
                    
                mostrarMensagem('Turma salva com sucesso!');
            }
                
            if (resultado.error) throw resultado.error;
            
            limparFormularioTurma();
            await carregarTurmasParaSelect();
            await carregarTurmasParaFiltro();
            await carregarTurmas();
            
        } catch (error) {
            console.error('Erro ao salvar turma:', error);
            mostrarMensagem('Erro ao salvar turma: ' + error.message, 'error');
        }
    }

    async function carregarTurmasParaSelect() {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .order('nome');
                
            if (error) throw error;
            
            turmaFuncionarioSelect.innerHTML = '<option value="">Selecione a turma</option>';
            data.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                turmaFuncionarioSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        }
    }

    // NOVO: Função para carregar turmas no filtro
    async function carregarTurmasParaFiltro() {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .order('nome');
                
            if (error) throw error;
            
            filtroTurmaSelect.innerHTML = '<option value="">Todas as Turmas</option>';
            data.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                filtroTurmaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar turmas para filtro:', error);
        }
    }
    
    // NOVO: Função para aplicar filtros
    async function aplicarFiltrosFuncionarios(e) {
        e.preventDefault();
        
        const filtroNomeCpfValue = filtroNomeCpf.value.trim();
        const filtroTurmaId = filtroTurmaSelect.value;
        
        await carregarFuncionarios(filtroNomeCpfValue, filtroTurmaId);
    }
    
    // NOVO: Função para limpar filtros
    async function limparFiltrosFuncionarios() {
        filtroNomeCpf.value = '';
        filtroTurmaSelect.value = '';
        await carregarFuncionarios();
    }

    // FUNÇÃO ATUALIZADA: carregarFuncionarios com Filtro e Agrupamento
    async function carregarFuncionarios(filtroTexto = '', filtroTurmaId = '') {
        try {
            let query = supabase
                .from('funcionarios')
                .select(`
                    id,
                    nome,
                    cpf,
                    codigo,
                    data_nascimento,
                    telefone,
                    funcao,
                    turmas(id, nome)
                `)
                .order('codigo')
                .order('nome'); 
            
            // Aplicar filtro de Turma na consulta Supabase
            if (filtroTurmaId) {
                query = query.eq('turma', filtroTurmaId);
            }

            const { data, error } = await query;
                
            if (error) throw error;
            
            let funcionariosFiltrados = data || [];
            
            // Aplicar filtro de Texto (Nome ou CPF) em memória
            if (filtroTexto) {
                const termo = filtroTexto.toLowerCase();
                funcionariosFiltrados = funcionariosFiltrados.filter(f => 
                    f.nome.toLowerCase().includes(termo) || 
                    f.cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
                );
            }
            
            if (funcionariosFiltrados.length === 0) {
                funcionariosList.innerHTML = '<p>Nenhum funcionário encontrado com os filtros aplicados.</p>';
                return;
            }
            
            // 1. Agrupar funcionários por Turma
            const funcionariosPorTurma = funcionariosFiltrados.reduce((acc, funcionario) => {
                const nomeTurma = funcionario.turmas?.nome || 'Sem Turma Atribuída';
                if (!acc[nomeTurma]) {
                    acc[nomeTurma] = [];
                }
                acc[nomeTurma].push(funcionario);
                return acc;
            }, {});
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Cód.</th>
                            <th>Nome</th>
                            <th>CPF</th>
                            <th>Nascimento</th>
                            <th>Telefone</th>
                            <th>Função</th>
                            <th>Turma</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            // 2. Iterar sobre os grupos e construir o HTML
            const nomesTurmas = Object.keys(funcionariosPorTurma).sort();
            
            nomesTurmas.forEach(nomeTurma => {
                // Linha de agrupamento por turma
                html += `
                    <tr class="turma-group-row">
                        <td colspan="8">Turma: ${nomeTurma}</td>
                    </tr>
                `;
                
                funcionariosPorTurma[nomeTurma].forEach(funcionario => {
                    const nascimento = new Date(funcionario.data_nascimento).toLocaleDateString('pt-BR');
                    const telefone = funcionario.telefone ? 
                        funcionario.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') : 
                        'Não informado';
                    
                    html += `
                        <tr>
                            <td>${funcionario.codigo || 'N/A'}</td>
                            <td>${funcionario.nome}</td>
                            <td>${funcionario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                            <td>${nascimento}</td>
                            <td>${telefone}</td>
                            <td>${formatarFuncao(funcionario.funcao)}</td>
                            <td>${nomeTurma}</td>
                            <td>
                                <button class="btn-secondary btn-sm" onclick="editarFuncionario('${funcionario.id}')">Editar</button>
                                <button class="btn-remove btn-sm" onclick="excluirFuncionario('${funcionario.id}')" title="Excluir">
                                    <i class="delete-icon">🗑️</i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            });
            
            html += '</tbody></table>';
            funcionariosList.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            funcionariosList.innerHTML = '<p>Erro ao carregar funcionários. Verifique sua conexão e permissões do banco.</p>';
        }
    }

    async function carregarTurmas() {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('*')
                .order('nome');
                
            if (error) throw error;
            
            if (data.length === 0) {
                turmasList.innerHTML = '<p>Nenhuma turma cadastrada.</p>';
                return;
            }
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Encarregado</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach(turma => {
                html += `
                    <tr>
                        <td>${turma.nome}</td>
                        <td>${turma.encarregado || 'Não definido'}</td>
                        <td>
                            <button class="btn-secondary" onclick="editarTurma('${turma.id}')">Editar</button>
                            <button class="btn-remove" onclick="excluirTurma('${turma.id}')" title="Excluir">
                                <i class="delete-icon">🗑️</i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            turmasList.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            turmasList.innerHTML = '<p>Erro ao carregar turmas.</p>';
        }
    }

    function formatarFuncao(funcao) {
        const funcoes = {
            'cortador': 'Cortador de Cana',
            'apontador': 'Apontador',
            'fiscal': 'Fiscal de Corte',
            'motorista': 'Motorista',
            'encarregado': 'Encarregado'
        };
        return funcoes[funcao] || funcao;
    }

    // Funções globais
    window.editarFuncionario = async function(id) {
        try {
            const { data: funcionario, error } = await supabase
                .from('funcionarios')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            
            // Preencher o formulário com os dados do funcionário
            document.getElementById('nome-funcionario').value = funcionario.nome;
            document.getElementById('cpf-funcionario').value = funcionario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            document.getElementById('codigo-funcionario').value = funcionario.codigo || ''; // NOVO: Preenche o código
            document.getElementById('nascimento-funcionario').value = funcionario.data_nascimento;
            document.getElementById('telefone-funcionario').value = funcionario.telefone ? funcionario.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') : '';
            document.getElementById('funcao-funcionario').value = funcionario.funcao;
            document.getElementById('turma-funcionario').value = funcionario.turma;
            
            funcionarioEditandoId = id;
            document.querySelector('#funcionario-form button[type="submit"]').textContent = 'Atualizar Funcionário';
            
            // NOVO: Remove readonly em modo de edição
            if (codigoFuncionarioInput) {
                codigoFuncionarioInput.readOnly = false; 
            }

            // Rolagem suave até o formulário
            document.getElementById('funcionario-form').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Erro ao carregar funcionário para edição:', error);
            mostrarMensagem('Erro ao carregar dados do funcionário: ' + error.message, 'error');
        }
    };

    window.excluirFuncionario = async function(id) {
        if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;
        
        try {
            const { error } = await supabase
                .from('funcionarios')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            mostrarMensagem('Funcionário excluído com sucesso!');
            await carregarFuncionarios();
            
        } catch (error) {
            console.error('Erro ao excluir funcionário:', error);
            mostrarMensagem('Erro ao excluir funcionário: ' + error.message, 'error');
        }
    };

    window.editarTurma = async function(id) {
        try {
            const { data: turma, error } = await supabase
                .from('turmas')
                .select('*')
                .eq('id', id)
                .single();
                
            if (error) throw error;
            
            // Preencher o formulário com os dados da turma
            document.getElementById('nome-turma').value = turma.nome;
            document.getElementById('encarregado-turma').value = turma.encarregado || '';
            
            turmaEditandoId = id;
            document.querySelector('#turma-form button[type="submit"]').textContent = 'Atualizar Turma';
            
            // Rolagem suave até o formulário
            document.getElementById('turma-form').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Erro ao carregar turma para edição:', error);
            mostrarMensagem('Erro ao carregar dados da turma: ' + error.message, 'error');
        }
    };

    window.excluirTurma = async function(id) {
        if (!confirm('Tem certeza que deseja excluir esta turma? Esta ação não poderá ser desfeita.')) return;
        
        try {
            const { error } = await supabase
                .from('turmas')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            mostrarMensagem('Turma excluída com sucesso!');
            await carregarTurmas();
            await carregarTurmasParaSelect();
            
        } catch (error) {
            console.error('Erro ao excluir turma:', error);
            mostrarMensagem('Erro ao excluir turma: ' + error.message, 'error');
        }
    };

    window.cancelarEdicaoFuncionario = function() {
        limparFormularioFuncionario();
        mostrarMensagem('Edição cancelada.');
    };

    window.cancelarEdicaoTurma = function() {
        limparFormularioTurma();
        mostrarMensagem('Edição cancelada.');
    };
});