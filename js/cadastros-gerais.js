// js/cadastros-gerais.js - VERSÃO MULTI-EMPRESA (Opção 2)
document.addEventListener('DOMContentLoaded', async function() {
    // Verificação de auth removida do topo, é tratada por auth.js
    
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const funcionarioForm = document.getElementById('funcionario-form');
    const turmaForm = document.getElementById('turma-form');
    const funcionariosList = document.getElementById('funcionarios-list');
    const turmasList = document.getElementById('turmas-list');
    const turmaFuncionarioSelect = document.getElementById('turma-funcionario');
    const codigoFuncionarioInput = document.getElementById('codigo-funcionario'); 

    const filtroForm = document.getElementById('filtro-funcionarios-form');
    const filtroNomeCpf = document.getElementById('filtro-nome-cpf');
    const filtroTurmaSelect = document.getElementById('filtro-turma');
    const limparFiltroFuncionariosBtn = document.getElementById('limpar-filtro-funcionarios');
    
    let funcionarioEditandoId = null;
    let turmaEditandoId = null;

    function aplicarMascaras() {
        const cpfInput = document.getElementById('cpf-funcionario');
        const telefoneInput = document.getElementById('telefone-funcionario');

        if(cpfInput) cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            e.target.value = value;
        });

        if(telefoneInput) telefoneInput.addEventListener('input', function(e) {
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

        // Espera o auth.js carregar o perfil
        await window.sistemaAuth.carregarSessaoEPerfil();
        await testarConexaoSupabase();
        
        loadingElement.style.display = 'none';
        contentElement.style.display = 'block';

        aplicarMascaras();
        await carregarTurmasParaSelect();
        await carregarTurmasParaFiltro();
        await carregarFuncionarios(); 
        await carregarTurmas();
        
        if (codigoFuncionarioInput) {
            await sugerirProximoCodigo();
        }
        
        if(funcionarioForm) funcionarioForm.addEventListener('submit', salvarFuncionario);
        if(turmaForm) turmaForm.addEventListener('submit', salvarTurma);
        if (filtroForm) filtroForm.addEventListener('submit', aplicarFiltrosFuncionarios);
        if (limparFiltroFuncionariosBtn) limparFiltroFuncionariosBtn.addEventListener('click', limparFiltrosFuncionarios);

    } catch (error) {
        console.error('Erro na inicialização:', error);
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
    }
    
    async function sugerirProximoCodigo() {
        if (!codigoFuncionarioInput) return;
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        try {
            const { data, error } = await supabase
                .from('funcionarios')
                .select('codigo')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('codigo', { ascending: false })
                .limit(1);

            if (error) throw error;
            
            let proximoCodigo = 1;
            
            if (data && data.length > 0 && data[0].codigo) {
                const ultimoCodigo = parseInt(data[0].codigo.replace(/\D/g, ''));
                if (!isNaN(ultimoCodigo)) {
                    proximoCodigo = ultimoCodigo + 1;
                }
            }
            
            const codigoFormatado = String(proximoCodigo).padStart(2, '0');
            
            if (!funcionarioEditandoId) {
                codigoFuncionarioInput.value = codigoFormatado;
                codigoFuncionarioInput.readOnly = true; 
            }

        } catch (error) {
            console.error('Erro ao sugerir código:', error);
            codigoFuncionarioInput.value = '01';
            codigoFuncionarioInput.readOnly = false; 
            mostrarMensagem('Atenção: Não foi possível sugerir o código automático.', 'error');
        }
    }

    function limparFormularioFuncionario() {
        funcionarioForm.reset();
        funcionarioEditandoId = null;
        document.querySelector('#funcionario-form button[type="submit"]').textContent = 'Salvar Funcionário';
        
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
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        const nome = document.getElementById('nome-funcionario').value.trim();
        const cpf = document.getElementById('cpf-funcionario').value.replace(/\D/g, '');
        const codigo = document.getElementById('codigo-funcionario').value.trim();
        const nascimento = document.getElementById('nascimento-funcionario').value;
        const telefone = document.getElementById('telefone-funcionario').value.replace(/\D/g, '');
        const funcao = document.getElementById('funcao-funcionario').value;
        const turmaId = document.getElementById('turma-funcionario').value;
        
        if (!nome || !cpf || !codigo || !nascimento || !funcao || !turmaId || !empresaId) { 
            mostrarMensagem('Preencha todos os campos obrigatórios, incluindo o Código.', 'error');
            return;
        }

        if (cpf.length !== 11) {
            mostrarMensagem('CPF deve ter 11 dígitos.', 'error');
            return;
        }
        
        if (!/^\d{1,2}$/.test(codigo)) {
            mostrarMensagem('O Código do Funcionário deve ter 1 ou 2 dígitos numéricos (ex: 01, 15).', 'error');
            return;
        }
        
        try {
            let queryCheckCode = supabase
                .from('funcionarios')
                .select('id')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .eq('codigo', codigo);

            if (funcionarioEditandoId) {
                queryCheckCode = queryCheckCode.neq('id', funcionarioEditandoId);
            }

            const { data: existingCode, error: codeCheckError } = await queryCheckCode.maybeSingle();
            if (codeCheckError) throw codeCheckError;
            if (existingCode) {
                mostrarMensagem('ERRO: Este Código de Funcionário já está em uso.', 'error');
                return;
            }

            const dadosFuncionario = {
                nome: nome,
                cpf: cpf,
                codigo: codigo,
                data_nascimento: nascimento,
                telefone: telefone,
                funcao: funcao,
                turma: turmaId,
                empresa_id: empresaId // <-- ID DA EMPRESA
            };

            let resultado;
            if (funcionarioEditandoId) {
                resultado = await supabase
                    .from('funcionarios')
                    .update(dadosFuncionario)
                    .eq('id', funcionarioEditandoId)
                    .select()
                    .single();
                mostrarMensagem('Funcionário atualizado com sucesso!');
            } else {
                resultado = await supabase
                    .from('funcionarios')
                    .insert([dadosFuncionario])
                    .select()
                    .single();
                mostrarMensagem('Funcionário salvo com sucesso!');
            }
                
            if (resultado.error) throw resultado.error;
            
            limparFormularioFuncionario();
            await carregarFuncionarios();
            
        } catch (error) {
            console.error('Erro ao salvar funcionário:', error);
            if (error.code === '23505' && error.message.includes('funcionarios_cpf_key')) {
                mostrarMensagem('ERRO: Este CPF já está cadastrado no sistema.', 'error');
            } else {
                mostrarMensagem('Erro ao salvar funcionário: ' + error.message, 'error');
            }
        }
    }

    async function salvarTurma(e) {
        e.preventDefault();
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        const nome = document.getElementById('nome-turma').value.trim();
        const encarregado = document.getElementById('encarregado-turma').value.trim();
        
        if (!nome || !empresaId) {
            mostrarMensagem('Informe o nome da turma.', 'error');
            return;
        }

        const dadosTurma = {
            nome: nome,
            encarregado: encarregado,
            empresa_id: empresaId // <-- ID DA EMPRESA
        };
        
        try {
            let resultado;
            if (turmaEditandoId) {
                resultado = await supabase
                    .from('turmas')
                    .update(dadosTurma)
                    .eq('id', turmaEditandoId)
                    .select()
                    .single();
                mostrarMensagem('Turma atualizada com sucesso!');
            } else {
                resultado = await supabase
                    .from('turmas')
                    .insert([dadosTurma])
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
        const empresaId = window.sistemaAuth.getEmpresaId();
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
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

    async function carregarTurmasParaFiltro() {
        const empresaId = window.sistemaAuth.getEmpresaId();
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
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
    
    async function aplicarFiltrosFuncionarios(e) {
        e.preventDefault();
        const filtroNomeCpfValue = filtroNomeCpf.value.trim();
        const filtroTurmaId = filtroTurmaSelect.value;
        await carregarFuncionarios(filtroNomeCpfValue, filtroTurmaId);
    }
    
    async function limparFiltrosFuncionarios() {
        filtroNomeCpf.value = '';
        filtroTurmaSelect.value = '';
        await carregarFuncionarios();
    }

    async function carregarFuncionarios(filtroTexto = '', filtroTurmaId = '') {
        const empresaId = window.sistemaAuth.getEmpresaId();
        try {
            let query = supabase
                .from('funcionarios')
                .select(`
                    id, nome, cpf, codigo, data_nascimento,
                    telefone, funcao, turmas(id, nome)
                `)
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('codigo')
                .order('nome'); 
            
            if (filtroTurmaId) {
                query = query.eq('turma', filtroTurmaId);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            let funcionariosFiltrados = data || [];
            
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
            
            const nomesTurmas = Object.keys(funcionariosPorTurma).sort();
            
            nomesTurmas.forEach(nomeTurma => {
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
        const empresaId = window.sistemaAuth.getEmpresaId();
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('*')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
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
                .single(); // RLS já garante que só podemos editar da nossa empresa
                
            if (error) throw error;
            
            document.getElementById('nome-funcionario').value = funcionario.nome;
            document.getElementById('cpf-funcionario').value = funcionario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            document.getElementById('codigo-funcionario').value = funcionario.codigo || '';
            document.getElementById('nascimento-funcionario').value = funcionario.data_nascimento;
            document.getElementById('telefone-funcionario').value = funcionario.telefone ? funcionario.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') : '';
            document.getElementById('funcao-funcionario').value = funcionario.funcao;
            document.getElementById('turma-funcionario').value = funcionario.turma;
            
            funcionarioEditandoId = id;
            document.querySelector('#funcionario-form button[type="submit"]').textContent = 'Atualizar Funcionário';
            
            if (codigoFuncionarioInput) {
                codigoFuncionarioInput.readOnly = false; 
            }

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
                .single(); // RLS já filtra
                
            if (error) throw error;
            
            document.getElementById('nome-turma').value = turma.nome;
            document.getElementById('encarregado-turma').value = turma.encarregado || '';
            
            turmaEditandoId = id;
            document.querySelector('#turma-form button[type="submit"]').textContent = 'Atualizar Turma';
            
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
            // MODIFICADO: Mensagem de erro mais útil se houver funcionários ligados
            if (error.code === '23503') { // Foreign key violation
                 mostrarMensagem('Erro: Não é possível excluir esta turma pois ela ainda contém funcionários. Mova os funcionários para outra turma antes de excluir.', 'error');
            } else {
                 mostrarMensagem('Erro ao excluir turma: ' + error.message, 'error');
            }
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