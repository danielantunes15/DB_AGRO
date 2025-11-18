// js/main.js - VERSÃO MULTI-EMPRESA (Opção 2)
document.addEventListener('DOMContentLoaded', async function() {
    // A verificação de autenticação é feita pelo js/auth.js

    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');

    try {
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        // O 'requerAutenticacao' do auth.js já está rodando
        // Esperamos ele garantir que o perfil (com empresa_id) está carregado
        await window.sistemaAuth.carregarSessaoEPerfil();
        
        // Se chegou aqui, estamos logados e temos o empresa_id
        
        console.log('Iniciando conexão com Supabase...');
        await testarConexaoSupabase(); // testarConexaoSupabase será atualizado
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';

        await inicializarAplicacao();

    } catch (error) {
        // Se o carregarSessaoEPerfil falhar, o auth.js já vai redirecionar
        console.error('Erro na inicialização:', error);
        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.innerHTML = `
                <h2>Erro de Conexão</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn-primary">Tentar Novamente</button>
            `;
        }
    }

    // Função para inicializar a aplicação
    async function inicializarAplicacao() {
        const apontamentoForm = document.getElementById('apontamento-form');
        const apontamentoDiariaForm = document.getElementById('apontamento-diaria-form');
        const addFuncionarioBtn = document.getElementById('add-funcionario');
        const addFuncionarioDiariaBtn = document.getElementById('add-funcionario-diaria');
        const puxarFuncionariosTurmaBtn = document.getElementById('puxar-funcionarios-turma');
        const fazendaSelect = document.getElementById('fazenda');

        try {
            // Carregar dados iniciais (agora filtrados por empresa)
            await carregarFazendas();
            await carregarTurmas();
            await carregarTurmasDiaria();
            await carregarFuncionariosIniciais();
            await carregarFuncionariosDiariaIniciais();
            await carregarApontamentosRecentes();
            
            // Configurar event listeners
            const turmaSelect = document.getElementById('turma');
            if (turmaSelect) {
                turmaSelect.addEventListener('change', async function() {
                    const turmaId = this.value;
                    const funcionariosContainer = document.getElementById('funcionarios-container');
                    
                    if (funcionariosContainer) {
                        funcionariosContainer.innerHTML = ''; 
                        adicionarFuncionario(turmaId); 
                    }
                });
            }
            
            if (addFuncionarioBtn) {
                addFuncionarioBtn.addEventListener('click', () => adicionarFuncionario());
            }
            if (addFuncionarioDiariaBtn) {
                addFuncionarioDiariaBtn.addEventListener('click', adicionarFuncionarioDiaria);
            }
            if (puxarFuncionariosTurmaBtn) {
                puxarFuncionariosTurmaBtn.addEventListener('click', puxarFuncionariosDaTurma);
            }
            if (apontamentoForm) {
                apontamentoForm.addEventListener('submit', salvarApontamento);
            }
            if (apontamentoDiariaForm) {
                apontamentoDiariaForm.addEventListener('submit', salvarApontamentoDiaria);
            }
            if (fazendaSelect) {
                fazendaSelect.addEventListener('change', carregarTalhoes);
            }

            console.log('✅ Aplicação inicializada com sucesso!');

        } catch (error) {
            console.error('Erro na inicialização da aplicação:', error);
            throw error;
        }
    }

    // Função para carregar turmas
    async function carregarTurmas() {
        const turmaSelect = document.getElementById('turma');
        if (!turmaSelect) return;
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('nome');
                
            if (error) throw error;
            
            turmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
            data.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                turmaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            mostrarMensagem('Erro ao carregar turmas', 'error');
        }
    }

    // Função para carregar turmas para Diária
    async function carregarTurmasDiaria() {
        const turmaSelect = document.getElementById('turma-diaria');
        if (!turmaSelect) return;
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('nome');
                
            if (error) throw error;
            
            turmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
            data.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                turmaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar turmas para Diária:', error);
        }
    }

    // Função para adicionar campo de funcionário (Corte)
    function adicionarFuncionario(turmaId = null) {
        const funcionariosContainer = document.getElementById('funcionarios-container');
        if (!funcionariosContainer) return;
        
        if (turmaId === null || typeof turmaId === 'object') {
            const turmaSelect = document.getElementById('turma');
            turmaId = turmaSelect ? turmaSelect.value : null;
        }
        
        const funcionarioItem = document.createElement('div');
        funcionarioItem.className = 'funcionario-item';
        
        funcionarioItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Funcionário</label>
                    <select class="funcionario-select" required>
                        <option value="">Selecione o funcionário</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Metros Cortados</label>
                    <input type="number" class="metros-input" step="0.01" min="0" required>
                </div>
                <button type="button" class="btn-remove">×</button>
            </div>
        `;
        
        funcionariosContainer.appendChild(funcionarioItem);
        
        const removeBtn = funcionarioItem.querySelector('.btn-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                funcionarioItem.remove();
                if (funcionariosContainer.children.length === 1) {
                    const firstRemoveBtn = funcionariosContainer.querySelector('.funcionario-item .btn-remove');
                    if (firstRemoveBtn) firstRemoveBtn.style.display = 'none';
                }
            });
            
            if (funcionariosContainer.children.length > 1) {
                 removeBtn.style.display = 'inline-block';
                 const firstRemoveBtn = funcionariosContainer.querySelector('.funcionario-item .btn-remove');
                 if (firstRemoveBtn) firstRemoveBtn.style.display = 'inline-block';
            } else {
                 removeBtn.style.display = 'none'; 
            }
        }
        
        const selectElement = funcionarioItem.querySelector('.funcionario-select');
        if (selectElement) {
            carregarFuncionarios(selectElement, turmaId);
        }
    }
    
    // Função para adicionar campo de funcionário (Diária)
    function adicionarFuncionarioDiaria() {
        adicionarFuncionarioDiariaItem();
    }
    
    function adicionarFuncionarioDiariaItem(funcionarioId = null, allFuncionarios = null) {
        const funcionariosContainer = document.getElementById('funcionarios-diaria-container');
        if (!funcionariosContainer) return;
        
        const funcionarioItem = document.createElement('div');
        funcionarioItem.className = 'funcionario-item';
        
        funcionarioItem.innerHTML = `
            <div class="form-row">
                <div class="form-group" style="flex: 1;">
                    <label>Funcionário</label>
                    <select class="funcionario-select-diaria" required>
                        <option value="">Selecione o funcionário</option>
                    </select>
                </div>
                <button type="button" class="btn-remove">×</button>
            </div>
        `;
        
        if (funcionariosContainer.children.length === 0 || funcionarioId !== null) {
             funcionariosContainer.appendChild(funcionarioItem);
        } else if (funcionariosContainer.children.length > 0 && funcionariosContainer.firstElementChild.querySelector('.funcionario-select-diaria')?.value !== "") {
             funcionariosContainer.appendChild(funcionarioItem);
        } else if (funcionariosContainer.children.length > 0 && funcionariosContainer.firstElementChild.querySelector('.funcionario-select-diaria')?.value === "") {
             funcionarioItem.remove(); 
        }

        const removeBtn = funcionarioItem.querySelector('.btn-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                funcionarioItem.remove();
            });
            removeBtn.style.display = 'inline-block';
        }
        
        const selectElement = funcionarioItem.querySelector('.funcionario-select-diaria');
        if (selectElement) {
            if (allFuncionarios) {
                popularSelectFuncionario(selectElement, allFuncionarios, funcionarioId);
            } else {
                carregarFuncionariosDiaria(selectElement, funcionarioId);
            }
        }
    }

    async function carregarFuncionariosIniciais() {
        const primeiroSelect = document.querySelector('.funcionario-select');
        if (primeiroSelect) {
            const turmaId = document.getElementById('turma')?.value || null;
            await carregarFuncionarios(primeiroSelect, turmaId);
            
            const removeBtn = primeiroSelect.closest('.funcionario-item').querySelector('.btn-remove');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
    
    async function carregarFuncionariosDiariaIniciais() {
        const primeiroSelect = document.querySelector('.funcionario-select-diaria');
        if (primeiroSelect) {
            await carregarFuncionariosDiaria(primeiroSelect);
        }
    }
    
    async function buscarTodosFuncionarios(turmaId = null) {
        const empresaId = window.sistemaAuth.getEmpresaId();
        if (!empresaId) return [];

        try {
            let query = supabase
                .from('funcionarios')
                .select(`id, nome, codigo, turmas(nome)`) 
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('nome'); 

            if (turmaId) {
                query = query.eq('turma', turmaId);
            }
                
            const { data, error } = await query;
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar todos os funcionários:', error);
            return [];
        }
    }
    
    function popularSelectFuncionario(selectElement, funcionarios, funcionarioId = null) {
        selectElement.innerHTML = '<option value="">Selecione o funcionário</option>';
        
        funcionarios.forEach(funcionario => {
            const option = document.createElement('option');
            option.value = funcionario.id;
            
            const codigoTexto = funcionario.codigo ? ` (Cód: ${funcionario.codigo}` : ' (';
            const turmaTexto = funcionario.turmas?.nome ? ` - ${funcionario.turmas.nome})` : 'Sem turma)';
            
            option.textContent = `${funcionario.nome}${codigoTexto}${turmaTexto}`;
            
            if (funcionarioId === funcionario.id) {
                 option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    async function carregarFuncionarios(selectElement, turmaId = null) {
        if (!selectElement) return;
        
        try {
            const funcionarios = await buscarTodosFuncionarios(turmaId); 
            popularSelectFuncionario(selectElement, funcionarios);

        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            selectElement.innerHTML = '<option value="">Erro ao carregar funcionários</option>';
        }
    }
    
    async function carregarFuncionariosDiaria(selectElement) {
        if (!selectElement) return;
        
        try {
            const funcionarios = await buscarTodosFuncionarios(); 
            popularSelectFuncionario(selectElement, funcionarios);

        } catch (error) {
            console.error('Erro ao carregar funcionários para Diária:', error);
            selectElement.innerHTML = '<option value="">Erro ao carregar funcionários</option>';
        }
    }
    
    async function puxarFuncionariosDaTurma() {
        const turmaDiariaSelect = document.getElementById('turma-diaria');
        const funcionariosContainer = document.getElementById('funcionarios-diaria-container');
        
        const turmaId = turmaDiariaSelect?.value;
        
        if (!turmaId) {
            mostrarMensagem('Selecione uma turma primeiro.', 'error');
            return;
        }

        try {
            mostrarMensagem('Buscando funcionários da turma...', 'success');
            
            const funcionariosDaTurma = await buscarTodosFuncionarios(turmaId);
                
            if (!funcionariosDaTurma || funcionariosDaTurma.length === 0) {
                mostrarMensagem('Nenhum funcionário encontrado nesta turma.', 'error');
                funcionariosContainer.innerHTML = '';
                adicionarFuncionarioDiariaItem(); 
                return;
            }

            funcionariosContainer.innerHTML = '';
            
            const allFuncionarios = await buscarTodosFuncionarios();

            funcionariosDaTurma.forEach(funcionario => {
                adicionarFuncionarioDiariaItem(funcionario.id, allFuncionarios);
            });
            
            mostrarMensagem(`${funcionariosDaTurma.length} funcionários da turma adicionados.`, 'success');
            
        } catch (error) {
            console.error('Erro ao puxar funcionários da turma:', error);
            mostrarMensagem('Erro ao puxar funcionários da turma: ' + error.message, 'error');
        }
    }


    async function carregarFazendas() {
        const fazendaSelect = document.getElementById('fazenda');
        if (!fazendaSelect) return;
        const empresaId = window.sistemaAuth.getEmpresaId();

        try {
            const { data, error } = await supabase
                .from('fazendas')
                .select('id, nome')
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('nome');
                
            if (error) throw error;
            
            fazendaSelect.innerHTML = '<option value="">Selecione a fazenda</option>';
            data.forEach(fazenda => {
                const option = document.createElement('option');
                option.value = fazenda.id;
                option.textContent = fazenda.nome;
                option.dataset.nome = fazenda.nome; 
                fazendaSelect.appendChild(option);
            });

            console.log(`✅ ${data.length} fazendas carregadas`);

        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
            mostrarMensagem('Erro ao carregar fazendas', 'error');
        }
    }

    async function carregarTalhoes() {
        const fazendaSelect = document.getElementById('fazenda');
        const talhaoSelect = document.getElementById('talhao');
        if (!fazendaSelect || !talhaoSelect) return;
        
        const fazendaId = fazendaSelect.value;
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        if (!fazendaId) {
            talhaoSelect.innerHTML = '<option value="">Selecione o talhão</option>';
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('talhoes')
                .select('id, numero, area, espacamento, preco_tonelada, producao_estimada')
                .eq('fazenda_id', fazendaId)
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('numero');
                
            if (error) throw error;
            
            talhaoSelect.innerHTML = '<option value="">Selecione o talhão</option>';
            data.forEach(talhao => {
                const option = document.createElement('option');
                option.value = talhao.id;
                option.textContent = `Talhão ${talhao.numero} - ${talhao.area} ha`;
                option.dataset.espacamento = talhao.espacamento;
                option.dataset.precoTonelada = talhao.preco_tonelada;
                option.dataset.producaoEstimada = talhao.producao_estimada;
                talhaoSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar talhões:', error);
            mostrarMensagem('Erro ao carregar talhões', 'error');
        }
    }

    function calcularPrecoPorMetro(talhaoData) {
        if (!talhaoData) return 0;
        
        const precoPorMetro = (talhaoData.preco_tonelada * talhaoData.producao_estimada) / (10000 / talhaoData.espacamento / 5);
        return parseFloat(precoPorMetro.toFixed(4));
    }

    function mapearTurmaParaValorPermitido(turmaNome) {
        // Esta função provavelmente não é mais necessária se 'turma' for um ID, mas mantemos
        return turmaNome.toLowerCase().replace(/\s/g, ''); 
    }

    async function verificarConflitoApontamento(dataCorte, funcionarioIds, talhaoId = null) {
        const empresaId = window.sistemaAuth.getEmpresaId();
        try {
            const { data, error } = await supabase
                .from('cortes_funcionarios')
                .select(`
                    funcionario_id,
                    funcionarios(nome),
                    apontamentos(data_corte, talhao_id, fazenda_id)
                `)
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .in('funcionario_id', funcionarioIds);

            if (error) throw error;
            if (!data || data.length === 0) return []; 

            const nomesConflito = new Set();
            
            data.forEach(corte => {
                const apontamentoExistente = corte.apontamentos;
                
                if (apontamentoExistente?.data_corte === dataCorte) {
                    
                    const isApontamentoExistenteDiaria = !apontamentoExistente.fazenda_id || !apontamentoExistente.talhao_id;
                    const isApontamentoAtualDiaria = talhaoId === null;
                    
                    if (isApontamentoAtualDiaria) {
                        nomesConflito.add(corte.funcionarios?.nome || `ID: ${corte.funcionario_id}`);
                        
                    } else if (isApontamentoExistenteDiaria) {
                        nomesConflito.add(corte.funcionarios?.nome || `ID: ${corte.funcionario_id}`);

                    } else {
                        if (apontamentoExistente.talhao_id === talhaoId) {
                            nomesConflito.add(corte.funcionarios?.nome || `ID: ${corte.funcionario_id}`);
                        }
                    }
                }
            });

            return [...nomesConflito];

        } catch (error) {
            console.error('Erro ao verificar conflito de apontamento:', error);
            throw new Error('Falha ao verificar conflitos no banco de dados.');
        }
    }


    // FUNÇÃO SALVAR APONTAMENTO - CORTE (Metragem)
    async function salvarApontamento(e) {
        e.preventDefault();
        
        // Pega o usuário e o ID da empresa da sessão
        const usuarioLogado = window.sistemaAuth.verificarAutenticacao();
        const usuarioId = usuarioLogado?.id;
        const empresaId = window.sistemaAuth.getEmpresaId(); // <-- NOVO

        if (!usuarioId || !empresaId) {
            mostrarMensagem('Erro: Sessão do usuário não encontrada. Faça login novamente.', 'error');
            return;
        }
        
        const apontamentoForm = document.getElementById('apontamento-form');
        const funcionariosContainer = document.getElementById('funcionarios-container');
        
        if (!apontamentoForm || !funcionariosContainer) return;
        
        const dataCorte = document.getElementById('data-corte')?.value;
        const turmaSelect = document.getElementById('turma');
        const turmaId = turmaSelect?.value;
        const fazendaSelect = document.getElementById('fazenda');
        const talhaoSelect = document.getElementById('talhao');
        const fazendaId = fazendaSelect?.value;
        const talhaoId = talhaoSelect?.value;
        
        if (!dataCorte || !turmaId || !fazendaId || !talhaoId) {
            mostrarMensagem('Preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        const funcionariosItens = document.querySelectorAll('#funcionarios-container .funcionario-item');
        const cortes = [];
        const funcionarioIds = []; 
        
        if (funcionariosItens.length === 0) {
            mostrarMensagem('Adicione pelo menos um funcionário.', 'error');
            return;
        }
        
        for (const item of funcionariosItens) {
            const funcionarioSelect = item.querySelector('.funcionario-select');
            const metrosInput = item.querySelector('.metros-input');
            
            if (!funcionarioSelect?.value || !metrosInput?.value) {
                mostrarMensagem('Preencha todos os campos de funcionário.', 'error');
                return;
            }
            
            const funcId = funcionarioSelect.value;
            
            if (funcionarioIds.includes(funcId)) {
                const funcionarioNome = funcionarioSelect.options[funcionarioSelect.selectedIndex].textContent.split('(')[0].trim() || `ID ${funcId}`;
                mostrarMensagem(`ERRO: O funcionário ${funcionarioNome} foi adicionado mais de uma vez neste formulário.`, 'error');
                return;
            }

            cortes.push({
                funcionario_id: funcId,
                metros: parseFloat(metrosInput.value)
            });
            funcionarioIds.push(funcId);
        }
        
        try {
            const conflitos = await verificarConflitoApontamento(dataCorte, funcionarioIds, talhaoId);
            
            if (conflitos.length > 0) {
                mostrarMensagem(`ERRO: Os seguintes funcionários já possuem um apontamento para a data ${formatarData(dataCorte)}. Isso ocorre porque: 1) Já existe um apontamento de DIÁRIA neste dia (Diária é exclusiva); OU 2) Já existe um apontamento de CORTE para este mesmo TALHÃO neste dia. Conflitos: ${conflitos.join(', ')}.`, 'error');
                return;
            }
        } catch (error) {
            mostrarMensagem('Falha na verificação de conflitos: ' + error.message, 'error');
            return;
        }

        try {
            const { data: talhaoData, error: talhaoError } = await supabase
                .from('talhoes')
                .select('espacamento, preco_tonelada, producao_estimada')
                .eq('id', talhaoId)
                .single(); // RLS já filtra por empresa
                
            if (talhaoError) throw talhaoError;
            
            const precoPorMetro = calcularPrecoPorMetro(talhaoData);
            
            // O nome da turma não é mais salvo, apenas o ID
            // const { data: turmaData, error: turmaError } = await supabase
            //     .from('turmas')
            //     .select('nome')
            //     .eq('id', turmaId)
            //     .single();
                
            // if (turmaError) {
            //     throw new Error('Turma selecionada não encontrada no banco de dados');
            // }
            // const turmaNomeOriginal = turmaData?.nome || 'Turma A';
            
            const dadosApontamento = {
                data_corte: dataCorte,
                turma_id: turmaId, // <-- SALVA O ID DA TURMA
                fazenda_id: fazendaId,
                talhao_id: talhaoId,
                preco_por_metro: precoPorMetro,
                usuario_id: usuarioId, // ID do usuário logado (vem do auth.users)
                empresa_id: empresaId // <-- ID DA EMPRESA
            };
            
            const { data: apontamento, error: apontamentoError } = await supabase
                .from('apontamentos')
                .insert(dadosApontamento)
                .select()
                .single();
                
            if (apontamentoError) {
                console.error('Erro ao salvar apontamento:', apontamentoError);
                throw apontamentoError;
            }
            
            const cortesComApontamentoId = cortes.map(corte => ({
                apontamento_id: apontamento.id,
                funcionario_id: corte.funcionario_id,
                metros: corte.metros,
                valor: parseFloat((corte.metros * precoPorMetro).toFixed(2)),
                empresa_id: empresaId // <-- ID DA EMPRESA
            }));
            
            const { error: cortesError } = await supabase
                .from('cortes_funcionarios')
                .insert(cortesComApontamentoId);
                
            if (cortesError) throw cortesError;
            
            mostrarMensagem('Apontamento de Corte salvo com sucesso!');
            
            document.getElementById('limpar-form-corte')?.click();
            
            await carregarFuncionariosIniciais();
            await carregarApontamentosRecentes();
            
        } catch (error) {
            console.error('Erro ao salvar apontamento de corte:', error);
            mostrarMensagem('Erro ao salvar apontamento de corte: ' + error.message, 'error');
        }
    }

    // FUNÇÃO SALVAR APONTAMENTO - DIÁRIA (Valor Fixo)
    async function salvarApontamentoDiaria(e) {
        e.preventDefault();

        const usuarioLogado = window.sistemaAuth.verificarAutenticacao();
        const usuarioId = usuarioLogado?.id;
        const empresaId = window.sistemaAuth.getEmpresaId(); 

        if (!usuarioId || !empresaId) {
            mostrarMensagem('Erro: Sessão do usuário não encontrada. Faça login novamente.', 'error');
            return;
        }

        const apontamentoDiariaForm = document.getElementById('apontamento-diaria-form');
        const funcionariosDiariaContainer = document.getElementById('funcionarios-diaria-container');
        
        if (!apontamentoDiariaForm || !funcionariosDiariaContainer) return;

        const dataDiaria = document.getElementById('data-diaria')?.value;
        const turmaDiariaSelect = document.getElementById('turma-diaria');
        const turmaId = turmaDiariaSelect?.value;
        const valorDiaria = document.getElementById('valor-diaria')?.value;

        if (!dataDiaria || !turmaId || !valorDiaria || parseFloat(valorDiaria) <= 0) {
            mostrarMensagem('Preencha a data, a turma e o valor da diária.', 'error');
            return;
        }

        const funcionariosDiariaItens = document.querySelectorAll('#funcionarios-diaria-container .funcionario-item');
        let funcionariosDiariaIds = [];
        
        if (funcionariosDiariaItens.length === 0) {
            mostrarMensagem('Adicione pelo menos um funcionário.', 'error');
            return;
        }

        for (const item of funcionariosDiariaItens) {
            const funcionarioSelect = item.querySelector('.funcionario-select-diaria');
            if (funcionarioSelect?.value) {
                const funcId = funcionarioSelect.value;
                
                if (funcionariosDiariaIds.includes(funcId)) {
                    const funcionarioNome = funcionarioSelect.options[funcionarioSelect.selectedIndex].textContent.split('(')[0].trim() || `ID ${funcId}`;
                    mostrarMensagem(`ERRO: O funcionário ${funcionarioNome} foi adicionado mais de uma vez neste formulário.`, 'error');
                    return;
                }
                funcionariosDiariaIds.push(funcId);
            }
        }
        
        if (funcionariosDiariaIds.length === 0) {
            mostrarMensagem('Selecione pelo menos um funcionário válido.', 'error');
            return;
        }

        try {
            const conflitos = await verificarConflitoApontamento(dataDiaria, funcionariosDiariaIds, null);
            
            if (conflitos.length > 0) {
                mostrarMensagem(`ERRO: Os seguintes funcionários já possuem um apontamento para a data ${formatarData(dataDiaria)}. Um apontamento de DIÁRIA é exclusivo por dia e não pode ser lançado se já houver outro apontamento (corte ou diária). Conflitos: ${conflitos.join(', ')}.`, 'error');
                return;
            }
        } catch (error) {
            mostrarMensagem('Falha na verificação de conflitos: ' + error.message, 'error');
            return;
        }

        try {
            const dadosApontamento = {
                data_corte: dataDiaria,
                turma_id: turmaId, // <-- SALVA O ID DA TURMA
                fazenda_id: null,
                talhao_id: null,
                preco_por_metro: 0, 
                usuario_id: usuarioId, 
                empresa_id: empresaId // <-- ID DA EMPRESA
            };

            const { data: apontamento, error: apontamentoError } = await supabase
                .from('apontamentos')
                .insert(dadosApontamento)
                .select()
                .single();
                
            if (apontamentoError) {
                    console.error('Erro ao salvar apontamento diária:', apontamentoError);
                    throw apontamentoError;
            }

            const valorFixo = parseFloat(valorDiaria);
            const cortesComApontamentoId = funcionariosDiariaIds.map(funcionarioId => ({
                apontamento_id: apontamento.id,
                funcionario_id: funcionarioId,
                metros: 0.01, 
                valor: parseFloat(valorFixo.toFixed(2)),
                empresa_id: empresaId // <-- ID DA EMPRESA
            }));
            
            const { error: cortesError } = await supabase
                .from('cortes_funcionarios')
                .insert(cortesComApontamentoId);
                
            if (cortesError) throw cortesError;
            
            mostrarMensagem('Apontamento na Diária salvo com sucesso!');
            
            document.getElementById('limpar-form-diaria')?.click();

            await carregarFuncionariosDiariaIniciais();
            await carregarApontamentosRecentes();

        } catch (error) {
            console.error('Erro ao salvar apontamento diária:', error);
            mostrarMensagem('Erro ao salvar apontamento diária: ' + error.message, 'error');
        }
    }

    // Função para carregar apontamentos recentes
    async function carregarApontamentosRecentes() {
        const apontamentosList = document.getElementById('apontamentos-list');
        if (!apontamentosList) return;
        const empresaId = window.sistemaAuth.getEmpresaId();
        
        try {
            const { data, error } = await supabase
                .from('apontamentos')
                .select(`
                    id,
                    data_corte,
                    turmas(nome), 
                    fazendas(nome),
                    talhoes(numero),
                    cortes_funcionarios(
                        metros,
                        valor
                    )
                `)
                .eq('empresa_id', empresaId) // <-- FILTRO DE EMPRESA
                .order('data_corte', { ascending: false })
                .order('id', { ascending: false }) 
                .limit(5);

            if (error) throw error;
            
            if (!data || data.length === 0) {
                apontamentosList.innerHTML = '<p>Nenhum apontamento encontrado.</p>';
                return;
            }
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Turma</th>
                            <th>Fazenda</th>
                            <th>Talhão</th>
                            <th>Total Funcionários</th>
                            <th>Total Metros (m)</th>
                            <th>Total Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach(apontamento => {
                const dataFormatada = formatarData(apontamento.data_corte);
                
                let totalMetros = 0;
                let totalValor = 0;
                let numFuncionarios = 0;

                if (apontamento.cortes_funcionarios && apontamento.cortes_funcionarios.length > 0) {
                    numFuncionarios = apontamento.cortes_funcionarios.length;
                    apontamento.cortes_funcionarios.forEach(corte => {
                        if (corte.metros && corte.metros > 0.01) { 
                             totalMetros += corte.metros;
                        }
                        totalValor += corte.valor || 0;
                    });
                }
                
                const isDiaria = !apontamento.fazendas?.nome || totalMetros === 0;
                const tipoApontamento = isDiaria ? 'Diária' : 'Corte';
                const metrosExibicao = totalMetros > 0 ? totalMetros.toFixed(2) : 'N/A';
                
                // Agora lemos o nome da turma da tabela relacionada 'turmas'
                const nomeTurmaExibicao = apontamento.turmas?.nome || 'N/A';
                
                html += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${tipoApontamento}</td>
                        <td>${nomeTurmaExibicao}</td>
                        <td>${apontamento.fazendas?.nome || 'N/A (Diária)'}</td>
                        <td>${apontamento.talhoes?.numero || 'N/A (Diária)'}</td>
                        <td>${numFuncionarios}</td>
                        <td>${metrosExibicao}</td>
                        <td>R$ ${totalValor.toFixed(2)}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            apontamentosList.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar apontamentos:', error);
            apontamentosList.innerHTML = '<p>Erro ao carregar apontamentos: ' + error.message + '</p>';
        }
    }
});