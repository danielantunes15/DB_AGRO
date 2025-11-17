// js/relatorios-completos.js - VERSÃO CORRIGIDA (COM 4 CASAS DECIMAIS NO PREÇO/M, CORREÇÃO DIÁRIA, QUEBRA DE PÁGINA POR FUNCIONÁRIO e PÁGINA SEPARADA PARA RESUMO GERAL)

document.addEventListener('DOMContentLoaded', async function() {
    // ... (restante do código inicial: elementos DOM, variáveis, try/catch) ...
    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const tipoRelatorioSelect = document.getElementById('tipo-relatorio');
    const funcionarioFiltro = document.getElementById('funcionario-filtro');
    const turmaFiltro = document.getElementById('turma-filtro');
    const fazendaFiltro = document.getElementById('fazenda-filtro');
    const funcionarioGroup = document.getElementById('funcionario-group');
    const turmaGroup = document.getElementById('turma-group');
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    const ordenacaoSelect = document.getElementById('ordenacao');
    const agruparPorDataCheck = document.getElementById('agrupar-por-data');
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');
    const relatorioContainer = document.getElementById('relatorio-container');
    const semDados = document.getElementById('sem-dados');
    const imprimirBtn = document.getElementById('imprimir-relatorio');
    const exportarPdfBtn = document.getElementById('exportar-pdf');
    const exportarExcelBtn = document.getElementById('exportar-excel');

    // Variáveis para armazenar dados
    let funcionarios = [];
    let turmas = [];
    let fazendas = [];
    let dadosRelatorio = [];

    try {
        // Configurar interface inicial
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';
        if (relatorioContainer) relatorioContainer.style.display = 'none';
        if (semDados) semDados.style.display = 'none';

        // Testar conexão
        await testarConexaoSupabase();

        // Mostrar conteúdo principal
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';

        // Configurar datas padrão (últimos 30 dias)
        configurarDatasPadrao();

        // Carregar dados para os filtros
        await carregarDadosParaFiltros();

        // Configurar event listeners
        configurarEventListeners();

        console.log('✅ Sistema de relatórios completos inicializado com sucesso!');

    } catch (error) {
        console.error('Erro na inicialização:', error);
        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'block';
    }


    // ... (funções configurarDatasPadrao, carregarDadosParaFiltros, carregarFuncionariosParaFiltro, carregarTurmasParaFiltro, carregarFazendasParaFiltro, configurarEventListeners, gerarRelatorio, ordenarDados, exibirRelatorio, calcularEstatisticas, preencherTabelaDetalhes, agruparEOrdenarPorFuncionario, adicionarLinhaCabecalhoFuncionario, adicionarLinhaTotalFuncionario, adicionarLinhaCabecalhoData, adicionarLinhaSubtotalData) ...

    // Função para configurar datas padrão
    function configurarDatasPadrao() {
        if (!dataInicio || !dataFim) return;

        const hoje = new Date();
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(hoje.getDate() - 30);

        dataInicio.value = trintaDiasAtras.toISOString().split('T')[0];
        dataFim.value = hoje.toISOString().split('T')[0];
    }

    // Função para carregar dados para os filtros
    async function carregarDadosParaFiltros() {
        await Promise.all([
            carregarFuncionariosParaFiltro(),
            carregarTurmasParaFiltro(),
            carregarFazendasParaFiltro()
        ]);
    }

    // Função para carregar funcionários
    async function carregarFuncionariosParaFiltro() {
        if (!funcionarioFiltro) return;

        try {
            const { data, error } = await supabase
                .from('funcionarios')
                .select(`
                    id,
                    nome,
                    turmas(nome)
                `)
                .order('nome');

            if (error) throw error;

            funcionarios = data || [];

            funcionarioFiltro.innerHTML = '<option value="">Selecione o funcionário</option><option value="todos">Todos os Funcionários</option>';
            funcionarios.forEach(funcionario => {
                const option = document.createElement('option');
                option.value = funcionario.id;
                option.textContent = `${funcionario.nome} - ${funcionario.turmas?.nome || 'Sem turma'}`;
                funcionarioFiltro.appendChild(option);
            });

            console.log(`✅ ${funcionarios.length} funcionários carregados`);

        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            mostrarMensagem('Erro ao carregar lista de funcionários', 'error');
        }
    }

    // Função para carregar turmas
    async function carregarTurmasParaFiltro() {
        if (!turmaFiltro) return;

        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            turmas = data || [];

            turmaFiltro.innerHTML = '<option value="">Selecione a turma</option><option value="todos">Todas as Turmas</option>';
            turmas.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                turmaFiltro.appendChild(option);
            });

            console.log(`✅ ${turmas.length} turmas carregadas`);

        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            mostrarMensagem('Erro ao carregar lista de turmas', 'error');
        }
    }

    // Função para carregar fazendas
    async function carregarFazendasParaFiltro() {
        if (!fazendaFiltro) return;

        try {
            const { data, error } = await supabase
                .from('fazendas')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            fazendas = data || [];

            fazendaFiltro.innerHTML = '<option value="">Todas as Fazendas</option><option value="todos">Todas as Fazendas</option>';
            fazendas.forEach(fazenda => {
                const option = document.createElement('option');
                option.value = fazenda.id;
                option.textContent = fazenda.nome;
                fazendaFiltro.appendChild(option);
            });

            console.log(`✅ ${fazendas.length} fazendas carregadas`);

        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
            mostrarMensagem('Erro ao carregar lista de fazendas', 'error');
        }
    }

    // Função para configurar event listeners
    function configurarEventListeners() {
        // Controle de exibição dos grupos de filtro
        if (tipoRelatorioSelect) {
            tipoRelatorioSelect.addEventListener('change', function() {
                const tipo = this.value;
                if (tipo === 'funcionario') {
                    funcionarioGroup.style.display = 'block';
                    turmaGroup.style.display = 'none';
                } else if (tipo === 'turma') {
                    funcionarioGroup.style.display = 'none';
                    turmaGroup.style.display = 'block';
                } else {
                    funcionarioGroup.style.display = 'none';
                    turmaGroup.style.display = 'none';
                }
            });
        }

        if (gerarRelatorioBtn) {
            gerarRelatorioBtn.addEventListener('click', gerarRelatorio);
        }

        if (limparFiltrosBtn) {
            limparFiltrosBtn.addEventListener('click', limparFiltros);
        }

        if (imprimirBtn) {
            imprimirBtn.addEventListener('click', imprimirRelatorio);
        }

        if (exportarPdfBtn) {
            exportarPdfBtn.addEventListener('click', exportarPDFProfissional);
        }

        if (exportarExcelBtn) {
            exportarExcelBtn.addEventListener('click', exportarExcel);
        }
    }

    //
    // --- INÍCIO DA FUNÇÃO CORRIGIDA ---
    //
    // Função principal para gerar relatório
    async function gerarRelatorio() {
        const tipoRelatorio = tipoRelatorioSelect.value;
        const funcionarioId = funcionarioFiltro.value;
        const turmaId = turmaFiltro.value;
        const fazendaId = fazendaFiltro.value;
        const dataInicioValue = dataInicio.value;
        const dataFimValue = dataFim.value;
        const ordenacao = ordenacaoSelect.value;
        const agruparPorData = agruparPorDataCheck.checked;

        // Validações
        if (!dataInicioValue || !dataFimValue) {
            mostrarMensagem('Preencha as datas de início e fim!', 'error');
            return;
        }

        if (new Date(dataInicioValue) > new Date(dataFimValue)) {
            mostrarMensagem('A data de início não pode ser maior que a data de fim!', 'error');
            return;
        }

        // Validar período máximo (365 dias)
        const diffTime = Math.abs(new Date(dataFimValue) - new Date(dataInicioValue));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 365) {
            mostrarMensagem('O período máximo permitido é de 365 dias', 'error');
            return;
        }

        try {
            mostrarMensagem('Gerando relatório... Aguarde', 'success');

            // --- INÍCIO DA CORREÇÃO ---
            // A consulta foi invertida. Agora começa de 'apontamentos'
            // para aplicar os filtros de data corretamente.
            
            let query = supabase
                .from('apontamentos')
                .select(`
                    id,
                    data_corte,
                    turma,
                    preco_por_metro,
                    fazenda_id,
                    fazendas(nome),
                    talhoes(numero),
                    cortes_funcionarios!inner( 
                        id,
                        metros,
                        valor,
                        funcionario_id,
                        funcionarios( 
                            id,
                            nome,
                            turmas(id, nome)
                        )
                    )
                `)
                // Aplica filtros de data DIRETAMENTE na tabela 'apontamentos'
                .gte('data_corte', dataInicioValue)
                .lte('data_corte', dataFimValue);

            // Aplicar filtro de Fazenda (na tabela 'apontamentos')
            if (fazendaId && fazendaId !== 'todos') {
                query = query.eq('fazenda_id', fazendaId);
            }

            // Aplicar filtros de funcionário/turma (nas tabelas relacionadas)
            if (tipoRelatorio === 'funcionario' && funcionarioId && funcionarioId !== 'todos') {
                query = query.eq('cortes_funcionarios.funcionario_id', funcionarioId);
            } else if (tipoRelatorio === 'turma' && turmaId && turmaId !== 'todos') {
                // CORREÇÃO: Filtrar pela ID da turma na tabela 'funcionarios'
                query = query.eq('cortes_funcionarios.funcionarios.turma', turmaId);
            }

            const { data: apontamentos, error } = await query;
            // --- FIM DA CORREÇÃO DA QUERY ---

            if (error) throw error;

            // --- NOVO PASSO: ACHATAR OS DADOS ---
            // O restante do script espera uma lista "plana" de cortes,
            // mas a nova query retorna uma lista de apontamentos (com cortes aninhados).
            // Precisamos "achatar" o resultado para a estrutura antiga.
            
            dadosRelatorio = [];
            if (apontamentos) {
                apontamentos.forEach(apontamento => {
                    // Pega os dados do apontamento (sem a lista de cortes)
                    const apontamentoData = { ...apontamento };
                    delete apontamentoData.cortes_funcionarios;

                    // Para cada corte, cria o objeto plano que o script espera
                    apontamento.cortes_funcionarios.forEach(corte => {
                        dadosRelatorio.push({
                            ...corte, // Contém id, metros, valor
                            funcionarios: corte.funcionarios, // Adiciona os dados do funcionário
                            apontamentos: apontamentoData // Adiciona os dados do apontamento pai
                        });
                    });
                });
            }
            // --- FIM DO PASSO DE ACHATAR ---

            // Ordenar dados
            ordenarDados(dadosRelatorio, ordenacao);

            // Exibir relatório
            if (dadosRelatorio.length > 0) {
                // Passa o fazendaId para a função exibirRelatorio
                exibirRelatorio(tipoRelatorio, funcionarioId, turmaId, fazendaId, dataInicioValue, dataFimValue, diffDays, agruparPorData);
                relatorioContainer.style.display = 'block';
                semDados.style.display = 'none';
                mostrarMensagem(`Relatório gerado com ${dadosRelatorio.length} registros de produção`);
            } else {
                relatorioContainer.style.display = 'none';
                semDados.style.display = 'block';
                mostrarMensagem('Nenhum registro encontrado para os filtros selecionados', 'error');
            }

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            mostrarMensagem('Erro ao gerar relatório: ' + error.message, 'error');
        }
    }
    //
    // --- FIM DA FUNÇÃO CORRIGIDA ---
    //


    // Função para ordenar dados
    function ordenarDados(dados, ordenacao) {
        switch (ordenacao) {
            case 'data_asc':
                dados.sort((a, b) => {
                    const dataA = a.apontamentos?.data_corte ? new Date(a.apontamentos.data_corte) : 0;
                    const dataB = b.apontamentos?.data_corte ? new Date(b.apontamentos.data_corte) : 0;
                    return dataA - dataB;
                });
                break;
            case 'data_desc':
                dados.sort((a, b) => {
                    const dataA = a.apontamentos?.data_corte ? new Date(a.apontamentos.data_corte) : 0;
                    const dataB = b.apontamentos?.data_corte ? new Date(b.apontamentos.data_corte) : 0;
                    return dataB - dataA;
                });
                break;
            case 'valor_asc':
                // CORREÇÃO: Ordena pelo valor correto (calculado ou salvo)
                dados.sort((a, b) => {
                    const metrosA = a.metros || 0;
                    const precoMetroA = a.apontamentos?.preco_por_metro || 0;
                    const isDiariaA = metrosA === 0.01 && precoMetroA === 0;
                    const valorA = isDiariaA ? (a.valor || 0) : (metrosA * precoMetroA);

                    const metrosB = b.metros || 0;
                    const precoMetroB = b.apontamentos?.preco_por_metro || 0;
                    const isDiariaB = metrosB === 0.01 && precoMetroB === 0;
                    const valorB = isDiariaB ? (b.valor || 0) : (metrosB * precoMetroB);

                    return valorA - valorB;
                });
                break;
            case 'valor_desc':
                // CORREÇÃO: Ordena pelo valor correto (calculado ou salvo)
                dados.sort((a, b) => {
                    const metrosA = a.metros || 0;
                    const precoMetroA = a.apontamentos?.preco_por_metro || 0;
                    const isDiariaA = metrosA === 0.01 && precoMetroA === 0;
                    const valorA = isDiariaA ? (a.valor || 0) : (metrosA * precoMetroA);

                    const metrosB = b.metros || 0;
                    const precoMetroB = b.apontamentos?.preco_por_metro || 0;
                    const isDiariaB = metrosB === 0.01 && precoMetroB === 0;
                    const valorB = isDiariaB ? (b.valor || 0) : (metrosB * precoMetroB);

                    return valorB - valorA;
                });
                break;
        }
    }

    // Função para exibir relatório na interface
    function exibirRelatorio(tipoRelatorio, funcionarioId, turmaId, fazendaId, dataInicio, dataFim, diasPeriodo, agruparPorData) {
        // Configurar informações do relatório
        let tipoTexto = '';
        if (tipoRelatorio === 'funcionario') {
            if (funcionarioId === 'todos') {
                tipoTexto = 'Todos os Funcionários';
            } else {
                const funcionario = funcionarios.find(f => f.id === funcionarioId);
                tipoTexto = funcionario ? `Funcionário: ${funcionario.nome}` : 'Por Funcionário';
            }
        } else if (tipoRelatorio === 'turma') {
            if (turmaId === 'todos') {
                tipoTexto = 'Todas as Turmas';
            } else {
                const turma = turmas.find(t => t.id === turmaId);
                tipoTexto = turma ? `Turma: ${turma.nome}` : 'Por Turma';
            }
        } else {
            tipoTexto = 'Relatório Geral';
        }

        // Adiciona Fazenda no cabeçalho do relatório se filtrado por uma fazenda específica
        if (fazendaId && fazendaId !== 'todos') {
            const fazenda = fazendas.find(f => f.id === fazendaId);
            if (fazenda) {
                tipoTexto += (tipoTexto === 'Relatório Geral' ? '' : ' | ') + `Fazenda: ${fazenda.nome}`;
            }
        }

        document.getElementById('relatorio-tipo').textContent = tipoTexto;
        document.getElementById('relatorio-periodo').textContent = `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
        document.getElementById('relatorio-emissao').textContent = formatarData(new Date());
        document.getElementById('relatorio-registros').textContent = dadosRelatorio.length;

        // Calcular totais e estatísticas (JÁ CORRIGIDO)
        const estatisticas = calcularEstatisticas(dadosRelatorio);

        // Atualizar cartões de resumo
        document.getElementById('total-dias').textContent = estatisticas.diasTrabalhados;
        document.getElementById('total-funcionarios').textContent = estatisticas.totalFuncionarios;
        document.getElementById('total-metros').textContent = estatisticas.totalMetros.toFixed(2);
        document.getElementById('total-valor').textContent = `R$ ${estatisticas.totalValor.toFixed(2)}`;

        // Preencher tabela de detalhes (JÁ CORRIGIDO)
        preencherTabelaDetalhes(dadosRelatorio, agruparPorData);
    }

    // Função para calcular estatísticas (CORRIGIDA PARA DIÁRIA)
    // Garante que o valor total use o valor salvo para diárias
    function calcularEstatisticas(dados) {
        let totalMetros = 0;
        let totalValor = 0;
        const diasTrabalhados = new Set();
        const funcionariosUnicos = new Set();

        dados.forEach(item => {
            const apontamento = item.apontamentos;
            if (!apontamento) return;

            const metros = item.metros || 0;
            const precoPorMetro = apontamento.preco_por_metro || 0;
            const isDiaria = metros === 0.01 && precoPorMetro === 0; // <<< CORREÇÃO: Identifica diária
            const valorCorreto = isDiaria ? (item.valor || 0) : (metros * precoPorMetro); // <<< CORREÇÃO: Usa valor salvo se for diária

            // Só soma metros se não for diária (metros > 0.01)
            if (!isDiaria) {
                totalMetros += metros;
            }
            totalValor += valorCorreto; // Usa o valor correto (calculado ou salvo)
            diasTrabalhados.add(apontamento.data_corte);
            funcionariosUnicos.add(item.funcionarios?.id);
        });

        return {
            totalMetros,
            totalValor,
            diasTrabalhados: diasTrabalhados.size,
            totalFuncionarios: funcionariosUnicos.size
        };
    }

    // Função para preencher tabela de detalhes (CORRIGIDA PARA DIÁRIA)
    // Garante que o valor exibido e somado use o valor salvo para diárias
    function preencherTabelaDetalhes(dados, agruparPorData) {
        const tbody = document.getElementById('detalhes-producao');
        if (!tbody) return;

        tbody.innerHTML = '';

        const tipoRelatorio = tipoRelatorioSelect.value;

        // Agrupar e ordenar por Funcionário (se for geral ou turma) e Data
        let dadosAgrupados = dados;
        if (tipoRelatorio === 'geral' || tipoRelatorio === 'turma') {
            dadosAgrupados = agruparEOrdenarPorFuncionario(dados);
        }

        let dataAtual = '';
        let funcionarioAtual = '';
        let subtotalData = { metros: 0, valor: 0 };
        let totalFuncionario = { metros: 0, valor: 0 };

        dadosAgrupados.forEach((item, index) => {
            const apontamento = item.apontamentos;
            const funcionario = item.funcionarios;

            if (!apontamento || !funcionario) return;

            const dataCorte = apontamento.data_corte;
            const dataFormatada = formatarData(dataCorte);
            const nomeFuncionario = funcionario.nome || 'N/A';

            const metros = item.metros || 0;
            const precoPorMetro = apontamento?.preco_por_metro || 0;
            const isDiaria = metros === 0.01 && precoPorMetro === 0; // <<< CORREÇÃO: Identifica diária
            const valorCorreto = isDiaria ? (item.valor || 0) : (metros * precoPorMetro); // <<< CORREÇÃO: Usa valor salvo se for diária
            const metrosExibicao = isDiaria ? 'DIÁRIA' : metros.toFixed(2); // <<< CORREÇÃO: Exibe "DIÁRIA" nos metros
            const precoMetroExibicao = isDiaria ? 'N/A' : `R$ ${precoPorMetro.toFixed(4)}`; // <<< CORREÇÃO: Exibe "N/A" no preço/m

            // --- INÍCIO: Agrupamento/Totalização por Funcionário (para 'geral' e 'turma') ---
            if ((tipoRelatorio === 'geral' || tipoRelatorio === 'turma') && funcionarioAtual !== funcionario.id) {
                if (funcionarioAtual !== '') {
                    // Adicionar TOTAL do Funcionário Anterior
                    adicionarLinhaTotalFuncionario(tbody, totalFuncionario, funcionarioAtual);
                    // Reinicia a data após o total do funcionário, para que o próximo funcione corretamente
                    dataAtual = '';
                }

                // Reiniciar totais
                funcionarioAtual = funcionario.id;
                subtotalData = { metros: 0, valor: 0 };
                totalFuncionario = { metros: 0, valor: 0 };

                // Adicionar CABEÇALHO do NOVO Funcionário
                adicionarLinhaCabecalhoFuncionario(tbody, nomeFuncionario, funcionario.turmas?.nome || 'Sem turma');
            }
            // --- FIM: Agrupamento/Totalização por Funcionário ---

            // --- INÍCIO: Agrupamento/Totalização por Data ---
            if (agruparPorData && dataAtual !== dataCorte) {
                if (dataAtual !== '') {
                    // Adicionar subtotal da data anterior
                    adicionarLinhaSubtotalData(tbody, subtotalData, dataAtual);
                }

                // Reiniciar subtotal para nova data
                dataAtual = dataCorte;
                subtotalData = { metros: 0, valor: 0 };

                // Adicionar cabeçalho da nova data
                adicionarLinhaCabecalhoData(tbody, dataFormatada);
            }
            // --- FIM: Agrupamento/Totalização por Data ---

            // Linha de Detalhe
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${nomeFuncionario}</td>
                <td>${funcionario.turmas?.nome || 'Sem turma'}</td>
                <td>${apontamento.fazendas?.nome || 'N/A (Diária)'}</td>
                <td>${apontamento.talhoes?.numero || 'N/A (Diária)'}</td>
                <td>${precoMetroExibicao}</td>
                <td>${metrosExibicao}</td>
                <td>R$ ${valorCorreto.toFixed(2)}</td>
            `; // <<< CORREÇÃO: Usa valores corrigidos
            tbody.appendChild(tr);

            // Acumular totais
            if (agruparPorData) {
                // Só soma metros se não for diária
                if (!isDiaria) {
                    subtotalData.metros += metros;
                }
                subtotalData.valor += valorCorreto; // Soma o valor correto
            }
            if (tipoRelatorio === 'geral' || tipoRelatorio === 'turma') {
                // Só soma metros se não for diária
                 if (!isDiaria) {
                    totalFuncionario.metros += metros;
                }
                totalFuncionario.valor += valorCorreto; // Soma o valor correto
            }
        });

        // Adicionar subtotal final (da última data)
        if (agruparPorData && dataAtual !== '') {
            adicionarLinhaSubtotalData(tbody, subtotalData, dataAtual);
        }

        // Adicionar total do último funcionário (se for agrupado)
        if ((tipoRelatorio === 'geral' || tipoRelatorio === 'turma') && funcionarioAtual !== '') {
            adicionarLinhaTotalFuncionario(tbody, totalFuncionario, funcionarioAtual);
        }

        // Adicionar linha de totais gerais (Já usa a função 'calcularEstatisticas' corrigida)
        const estatisticas = calcularEstatisticas(dados);
        const trTotal = document.createElement('tr');
        trTotal.className = 'total-row';
        trTotal.innerHTML = `
            <td colspan="6" style="text-align: right;">TOTAL GERAL</td>
            <td>${estatisticas.totalMetros.toFixed(2)}</td>
            <td>R$ ${estatisticas.totalValor.toFixed(2)}</td>
        `;
        tbody.appendChild(trTotal);
    }


    // NOVO: Função para agrupar e ordenar por Funcionário (necessário para o detalhamento individual)
    function agruparEOrdenarPorFuncionario(dados) {
        // 1. Criar uma cópia dos dados
        const dadosCopia = [...dados];

        // 2. Ordenar por Nome do Funcionário e depois pela data de corte (se necessário)
        dadosCopia.sort((a, b) => {
            const nomeA = a.funcionarios?.nome || 'ZZZ';
            const nomeB = b.funcionarios?.nome || 'ZZZ';

            if (nomeA < nomeB) return -1;
            if (nomeA > nomeB) return 1;

            // Ordenação secundária por data
            const dataA = a.apontamentos?.data_corte ? new Date(a.apontamentos.data_corte) : 0;
            const dataB = b.apontamentos?.data_corte ? new Date(b.apontamentos.data_corte) : 0;
            return dataB - dataA; // Data mais recente primeiro
        });

        return dadosCopia;
    }

    // NOVO: Funções auxiliares para adicionar linhas
    function adicionarLinhaCabecalhoFuncionario(tbody, nome, turma) {
         const trHeader = document.createElement('tr');
         trHeader.className = 'group-header';
         trHeader.innerHTML = `
             <td colspan="8" style="background: #1e3a23; color: white; text-align: center; font-size: 1.2rem; padding: 10px;">
                 👤 FUNCIONÁRIO: ${nome} (Turma: ${turma})
             </td>
         `;
         tbody.appendChild(trHeader);
    }

    function adicionarLinhaTotalFuncionario(tbody, totais, funcionarioId) {
        const funcionario = funcionarios.find(f => f.id === funcionarioId);
        const nome = funcionario?.nome || 'Total do Funcionário';

        const trTotal = document.createElement('tr');
        trTotal.style.cssText = 'font-weight: bold; background: #c3e6cb; color: #155724;';
        // <<< CORREÇÃO: Mostra 'N/A' se não houver metros
        const metrosTotal = totais.metros > 0 ? totais.metros.toFixed(2) : 'N/A';
        trTotal.innerHTML = `
            <td colspan="6" style="text-align: right;">TOTAL DE ${nome.toUpperCase()}</td>
            <td>${metrosTotal}</td>
            <td>R$ ${totais.valor.toFixed(2)}</td>
        `;
        tbody.appendChild(trTotal);
    }

    function adicionarLinhaCabecalhoData(tbody, dataFormatada) {
         const trHeader = document.createElement('tr');
         trHeader.className = 'group-header';
         trHeader.innerHTML = `
             <td colspan="8" style="background: #2c5530; color: white; text-align: center; font-size: 1.1rem;">
                 📅 ${dataFormatada}
             </td>
         `;
         tbody.appendChild(trHeader);
    }

    function adicionarLinhaSubtotalData(tbody, totais, dataCorte) {
         const trSubtotal = document.createElement('tr');
         trSubtotal.className = 'group-header';
         // <<< CORREÇÃO: Mostra 'N/A' nos metros do subtotal se só houver diárias
         const metrosSubtotal = totais.metros > 0 ? totais.metros.toFixed(2) : 'N/A';
         trSubtotal.innerHTML = `
             <td colspan="6" style="text-align: right; background: #e9ecef;">Subtotal ${formatarData(dataCorte)}</td>
             <td style="background: #e9ecef;">${metrosSubtotal}</td>
             <td style="background: #e9ecef;">R$ ${totais.valor.toFixed(2)}</td>
         `;
         tbody.appendChild(trSubtotal);
    }


    // FUNÇÃO PDF (CORRIGIDA PARA DIÁRIA e QUEBRA DE PÁGINA)
    // Garante que o PDF use o valor salvo para diárias e quebre página por funcionário
    async function exportarPDFProfissional() {
        if (dadosRelatorio.length === 0) {
            mostrarMensagem('Gere o relatório primeiro ou não há dados para exportar.', 'error');
            return;
        }

        try {
            mostrarMensagem('Gerando PDF profissional...', 'success');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4'); // Configuração A4

            const tipoRelatorio = tipoRelatorioSelect.value;
            const nomeRelatorio = document.getElementById('relatorio-tipo').textContent;
            const dataInicioValue = dataInicio.value;
            const dataFimValue = dataFim.value;

            // Usa a função já corrigida
            const estatisticasGerais = calcularEstatisticas(dadosRelatorio);

            // 1. Preparar dados para loop (agrupa por funcionário se for geral/turma)
            let dadosPorFuncionario = {};
            let isIndividualReport = (tipoRelatorio === 'funcionario' && funcionarioFiltro.value !== 'todos');

            // Agrupa sempre se não for individual, para garantir a ordem e quebra de página
             if (!isIndividualReport) {
                 const dadosOrdenados = agruparEOrdenarPorFuncionario(dadosRelatorio);
                 dadosOrdenados.forEach(item => {
                     const funcId = item.funcionarios?.id;
                     if (funcId) {
                         if (!dadosPorFuncionario[funcId]) {
                             dadosPorFuncionario[funcId] = { nome: item.funcionarios?.nome || 'N/A', dados: [] };
                         }
                         dadosPorFuncionario[funcId].dados.push(item);
                     } else {
                         // Trata caso funcionário seja nulo (pouco provável, mas seguro)
                          if (!dadosPorFuncionario['sem_funcionario']) {
                             dadosPorFuncionario['sem_funcionario'] = { nome: 'Sem Funcionário', dados: [] };
                         }
                         dadosPorFuncionario['sem_funcionario'].dados.push(item);
                     }
                 });
            } else {
                 // Relatório Funcionário Individual
                dadosPorFuncionario[funcionarioFiltro.value] = { nome: funcionarios.find(f => f.id === funcionarioFiltro.value)?.nome || 'Funcionário', dados: dadosRelatorio };
            }

            // Ordena os funcionários pelo nome para impressão
            const funcionarioIdsOrdenados = Object.keys(dadosPorFuncionario).sort((a, b) => {
                 if (a === 'sem_funcionario') return 1; // Coloca 'sem funcionário' no final
                 if (b === 'sem_funcionario') return -1;
                 return dadosPorFuncionario[a].nome.localeCompare(dadosPorFuncionario[b].nome);
            });


            let totalPaginas = 0; // Contagem global de páginas para o rodapé

            // Função para desenhar o cabeçalho base da página
            const drawBaseHeader = (doc) => {
                const pageWidth = doc.internal.pageSize.getWidth();
                doc.setFillColor(44, 85, 48); // Verde escuro
                doc.rect(0, 0, pageWidth, 25, 'F'); // Altura reduzida do cabeçalho
                doc.setFontSize(14); // Fonte ligeiramente menor
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text('AGRO CANA FORTE', pageWidth / 2, 10, { align: 'center' }); // Ajuste Y
                doc.setFontSize(10); // Fonte menor para subtítulo
                doc.text('ESPELHO DE PRODUÇÃO - CORTE DE CANA', pageWidth / 2, 17, { align: 'center' }); // Ajuste Y
            };

            // Função para adicionar rodapé
            const addFooter = (doc, pageNum, totalPages) => {
                const pageHeight = doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.getWidth();
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Página ${pageNum} de ${totalPages} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            };

            // --- CÁLCULO PRÉVIO DO NÚMERO TOTAL DE PÁGINAS ---
            // Simula a geração para contar as páginas totais ANTES de gerar o PDF final
            const dummyDoc = new jsPDF('p', 'mm', 'a4');
            let currentPageCount = 0; // Renomeado para evitar conflito com variável global
            let lastPageNumber = 0;

            for (let i = 0; i < funcionarioIdsOrdenados.length; i++) {
                 if (i > 0) {
                     dummyDoc.addPage();
                 }
                 const funcId = funcionarioIdsOrdenados[i];
                 const dadosFunc = dadosPorFuncionario[funcId].dados;
                 // Simula AutoTable para pegar a contagem de páginas que ela usaria
                 dummyDoc.autoTable({
                    startY: 95 + 40, // Simula posição inicial da tabela
                    head: [[' ']], // Cabeçalho mínimo
                    body: dadosFunc.map(() => [' ']), // Corpo com número correto de linhas
                    margin: { top: 15, left: 15, right: 15, bottom: 15 }, // Margens simuladas
                    didDrawPage: function(data) {
                        lastPageNumber = data.pageNumber; // Guarda o número da última página desenhada
                    }
                 });
                 currentPageCount = lastPageNumber; // Atualiza a contagem total com o número da última página
            }
             // Adiciona a página do resumo geral se necessário E se for relatório consolidado
            if (!isIndividualReport && dadosRelatorio.length > 0) {
                dummyDoc.addPage();
                currentPageCount++;
            }
            const totalPagesCalculated = currentPageCount > 0 ? currentPageCount : 1; // Garante pelo menos 1 página
            // --- FIM DO CÁLCULO PRÉVIO ---

            // 2. Iterar sobre cada funcionário (ou o grupo único)
            let paginaAtualGlobal = 1; // Reinicia contagem para o PDF real
            for (let i = 0; i < funcionarioIdsOrdenados.length; i++) {
                const funcId = funcionarioIdsOrdenados[i];
                // const dadosFuncionario = dadosPorFuncionario[funcId]; // Objeto com nome e dados
                const dadosFuncionario = dadosPorFuncionario[funcId].dados; // Apenas os dados
                const nomeFuncionarioAtual = dadosPorFuncionario[funcId].nome; // Pega o nome


                // Usa a função já corrigida
                const estatisticasFuncionario = calcularEstatisticas(dadosFuncionario);

                // Adiciona uma nova página ANTES de começar a desenhar o próximo funcionário (exceto para o primeiro)
                if (i > 0) {
                    doc.addPage();
                    paginaAtualGlobal++; // Incrementa contador global real
                }

                // --- 2.1. Desenhar o Cabeçalho (Página Atual) ---
                drawBaseHeader(doc);

                let yPosition = 35; // Começa mais cedo após reduzir cabeçalho

                // --- 2.2. Informações Específicas do Relatório/Funcionário ---
                 doc.setFontSize(11); // Tamanho um pouco maior para o título do bloco
                 doc.setTextColor(0, 0, 0);
                 doc.setFont('helvetica', 'bold');

                let funcHeader = 'RELATÓRIO CONSOLIDADO';
                 if (!isIndividualReport && funcId !== 'sem_funcionario') {
                    // Relatório Individual por Funcionário (dentro do loop do Geral/Turma)
                     funcHeader = `RELATÓRIO INDIVIDUAL - ${nomeFuncionarioAtual}`; // Usa o nome pego do objeto
                 } else if (isIndividualReport) {
                     funcHeader = `RELATÓRIO INDIVIDUAL - ${nomeFuncionarioAtual}`; // Usa o nome pego do objeto
                 } else if (funcId === 'sem_funcionario') {
                     funcHeader = 'REGISTROS SEM FUNCIONÁRIO ASSOCIADO';
                 } else { // Caso Geral/Turma 'todos'
                     funcHeader = nomeRelatorio;
                 }

                doc.text(funcHeader, 15, yPosition); // Alinha à esquerda
                yPosition += 6;

                doc.setFontSize(9); // Fonte menor para detalhes
                doc.setFont('helvetica', 'normal');
                doc.text(`Período: ${formatarData(dataInicioValue)} a ${formatarData(dataFimValue)}`, 15, yPosition);
                doc.text(`Data de Emissão: ${formatarData(new Date())}`, doc.internal.pageSize.getWidth() - 15, yPosition, { align: 'right' });
                yPosition += 5;
                doc.text(`Total de Registros (Deste): ${dadosFuncionario.length}`, 15, yPosition);
                yPosition += 8; // Aumenta espaço antes do resumo


                // --- 2.3. Resumo Estatístico (Deste Funcionário / Deste Relatório) ---
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('RESUMO DA PRODUÇÃO', 15, yPosition);
                yPosition += 5; // Espaço antes dos itens

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                const resumo = [
                    `Dias Trabalhados: ${estatisticasFuncionario.diasTrabalhados}`,
                    // <<< CORREÇÃO: Mostra 'N/A' se não houver metros (só diárias)
                    `Metros Cortados: ${estatisticasFuncionario.totalMetros > 0 ? estatisticasFuncionario.totalMetros.toFixed(2) + ' m' : 'N/A'}`,
                    `Valor Total: R$ ${estatisticasFuncionario.totalValor.toFixed(2)}`
                ];

                // Adiciona info de funcionários APENAS se for relatório GERAL ou TURMA "TODOS"
                if (!isIndividualReport && (funcionarioFiltro.value === 'todos' || turmaFiltro.value === 'todos')) {
                     resumo.unshift(`Funcionários Envolvidos: ${estatisticasFuncionario.totalFuncionarios}`);
                }

                resumo.forEach((item, index) => {
                    doc.text(item, 15, yPosition + (index * 5)); // Espaçamento menor entre linhas
                });

                // --- 2.4. Tabela de Detalhes ---
                yPosition += (resumo.length * 5) + 5; // Ajuste para começar a tabela após o resumo
                const headers = [['Data', 'Funcionário', 'Turma', 'Fazenda', 'Talhão', 'Preço/m (R$)', 'Metros (m)', 'Valor (R$)']];
                const tableData = [];

                dadosFuncionario.forEach(item => {
                    const apontamento = item.apontamentos;
                    const funcionario = item.funcionarios;

                    if (!apontamento || !funcionario) return;

                    const metros = item.metros || 0;
                    const precoPorMetro = apontamento?.preco_por_metro || 0;
                    const isDiaria = metros === 0.01 && precoPorMetro === 0; // <<< CORREÇÃO: Identifica diária
                    const valorCorreto = isDiaria ? (item.valor || 0) : (metros * precoPorMetro); // <<< CORREÇÃO: Usa valor salvo se for diária
                    const metrosExibicao = isDiaria ? 'DIÁRIA' : metros.toFixed(2); // <<< CORREÇÃO: Exibe "DIÁRIA" nos metros
                    const precoMetroExibicao = isDiaria ? 'N/A' : `R$ ${precoPorMetro.toFixed(4)}`; // <<< CORREÇÃO: Exibe "N/A" no preço/m

                    tableData.push([
                        formatarData(apontamento.data_corte),
                        funcionario.nome || 'N/A',
                        funcionario.turmas?.nome || 'Sem turma',
                        apontamento.fazendas?.nome || 'N/A (Diária)',
                        apontamento.talhoes?.numero || 'N/A (Diária)',
                        precoMetroExibicao, // <<< CORREÇÃO
                        metrosExibicao, // <<< CORREÇÃO
                        `R$ ${valorCorreto.toFixed(2)}` // <<< CORREÇÃO: Usa valor correto
                    ]);
                });

                // Adicionar Totais do Funcionário/Grupo (Já usa 'estatisticasFuncionario' corrigido)
                // <<< CORREÇÃO: Mostra 'N/A' se não houver metros
                const metrosTotalFuncionario = estatisticasFuncionario.totalMetros > 0 ? estatisticasFuncionario.totalMetros.toFixed(2) : 'N/A';
                tableData.push([
                    { content: 'TOTAL DE PRODUÇÃO', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'right' } }, // Cinza claro
                    { content: metrosTotalFuncionario, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
                    { content: `R$ ${estatisticasFuncionario.totalValor.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
                ]);

                // Salva a página atual ANTES de gerar a tabela
                const paginaAntesTabela = paginaAtualGlobal;

                // Gera a tabela
                doc.autoTable({
                    startY: yPosition,
                    head: headers,
                    body: tableData,
                    theme: 'grid', // Usa tema com grid para melhor visualização
                    margin: { top: 5, left: 15, right: 15, bottom: 15 }, // Ajusta margens
                    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' }, // Fonte e padding menores
                    headStyles: { fillColor: [44, 85, 48], textColor: 255, fontStyle: 'bold', fontSize: 8 }, // Cabeçalho um pouco maior
                    footStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' }, // Estilo do rodapé da tabela
                    columnStyles: { // Ajuste de largura das colunas (aproximado)
                        0: { cellWidth: 15 }, // Data
                        1: { cellWidth: 45 }, // Funcionário
                        2: { cellWidth: 20 }, // Turma
                        3: { cellWidth: 25 }, // Fazenda
                        4: { cellWidth: 12 }, // Talhão
                        5: { cellWidth: 18 }, // Preço/m
                        6: { cellWidth: 15 }, // Metros
                        7: { cellWidth: 20 }  // Valor
                    },

                    didDrawPage: function(data) {
                        // Se autotable criou nova página a partir da página inicial deste funcionário
                        if (data.pageNumber > paginaAntesTabela) {
                            drawBaseHeader(doc); // Redesenha cabeçalho base
                        }
                        // Atualiza a página global atual SEMPRE que uma página é desenhada
                        paginaAtualGlobal = data.pageNumber;
                         // Adiciona rodapé usando a contagem total pré-calculada
                         addFooter(doc, data.pageNumber, totalPagesCalculated);
                    }
                });
            } // Fim do loop de funcionários

            // 3. Adiciona o TOTAL GERAL em uma nova página se for um relatório consolidado
            if (!isIndividualReport && dadosRelatorio.length > 0) {

                // <<< CORREÇÃO - FORÇAR PÁGINA PARA RESUMO GERAL >>>
                doc.addPage();
                paginaAtualGlobal++;
                drawBaseHeader(doc); // Desenha o cabeçalho na nova página


                 let yStartTotal = 35; // Começa após o cabeçalho base

                 doc.setFontSize(12); // Tamanho maior para o título do resumo
                 doc.setTextColor(44, 85, 48);
                 doc.setFont('helvetica', 'bold');
                 doc.text('RESUMO GERAL DO PERÍODO', 15, yStartTotal);

                 yStartTotal += 10;

                 // Usa 'estatisticasGerais' (já corrigido)
                 // <<< CORREÇÃO: Mostra 'N/A' se não houver metros
                 const metrosTotalGeral = estatisticasGerais.totalMetros > 0 ? estatisticasGerais.totalMetros.toFixed(2) : 'N/A';
                 const summaryData = [
                     ['Itens', 'Valor'],
                     ['Total de Dias Trabalhados', estatisticasGerais.diasTrabalhados.toString()],
                     ['Total de Funcionários Envolvidos', estatisticasGerais.totalFuncionarios.toString()],
                     ['Total de Metros Cortados (m)', metrosTotalGeral],
                     ['VALOR TOTAL GERAL (R$)', `R$ ${estatisticasGerais.totalValor.toFixed(2)}`],
                 ];

                 doc.autoTable({
                     startY: yStartTotal,
                     head: [summaryData[0]],
                     body: summaryData.slice(1, summaryData.length - 1), // Corpo sem o total
                     foot: [[summaryData[summaryData.length - 1][0], summaryData[summaryData.length - 1][1]]], // Total no rodapé da tabela
                     theme: 'striped', // Tema listrado
                     margin: { top: 5, left: 15, right: 15, bottom: 15 },
                     styles: { fontSize: 9, cellPadding: 2 }, // Fonte e padding
                     headStyles: { fillColor: [44, 85, 48], textColor: 255, fontStyle: 'bold' },
                     footStyles: { fillColor: [44, 85, 48], textColor: 255, fontStyle: 'bold', fontSize: 10 }, // Rodapé destacado
                     alternateRowStyles: { fillColor: [245, 245, 245] }, // Cinza mais claro para alternar
                     didDrawPage: function(data) { // Adiciona rodapé na página do resumo geral
                          addFooter(doc, paginaAtualGlobal, totalPagesCalculated);
                     }
                 });
            }


            // Salvar PDF
            const fileName = `relatorio_producao_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            mostrarMensagem('PDF gerado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            mostrarMensagem('Erro ao gerar PDF: ' + error.message, 'error');
        }
    }


    // FUNÇÃO EXCEL (CORRIGIDA PARA DIÁRIA)
    // Garante que o Excel use o valor salvo para diárias
    function exportarExcel() {
        if (dadosRelatorio.length === 0) {
            mostrarMensagem('Gere o relatório primeiro ou não há dados para exportar.', 'error');
            return;
        }

        try {
            mostrarMensagem('Preparando exportação para Excel...', 'success');

            // Define os dados a serem exportados, garantindo que o relatório "Geral" seja agrupado por funcionário
            const dadosParaExportacao = (tipoRelatorioSelect.value === 'geral' || tipoRelatorioSelect.value === 'turma')
                                        ? agruparEOrdenarPorFuncionario(dadosRelatorio)
                                        : dadosRelatorio;

            const headers = [
                "Data",
                "Funcionario",
                "Turma",
                "Fazenda",
                "Talhao",
                "Preco/m (R$)",
                "Metros (m)",
                "Valor (R$)"
            ].join(';');

            const csvData = dadosParaExportacao.map(item => {
                const apontamento = item.apontamentos;
                const funcionario = item.funcionarios;

                const data = formatarData(apontamento?.data_corte);
                const nomeFuncionario = funcionario?.nome || 'N/A';
                const nomeTurma = funcionario?.turmas?.nome || 'Sem turma';
                const nomeFazenda = apontamento?.fazendas?.nome || 'N/A (Diária)'; // <<< CORREÇÃO
                const numTalhao = apontamento?.talhoes?.numero || 'N/A (Diária)'; // <<< CORREÇÃO

                const metros = item.metros || 0;
                const precoPorMetro = apontamento?.preco_por_metro || 0;
                const isDiaria = metros === 0.01 && precoPorMetro === 0; // <<< CORREÇÃO: Identifica diária
                const valorCorreto = isDiaria ? (item.valor || 0) : (metros * precoPorMetro); // <<< CORREÇÃO: Usa valor salvo se for diária
                const metrosExibicao = isDiaria ? 'DIARIA' : metros.toFixed(2).replace('.', ','); // <<< CORREÇÃO: Exibe "DIARIA"
                const precoMetroExibicao = isDiaria ? 'N/A' : precoPorMetro.toFixed(4).replace('.', ','); // <<< CORREÇÃO: Exibe "N/A"

                // Formata para o padrão CSV brasileiro (vírgula como decimal)
                const valorStr = valorCorreto.toFixed(2).replace('.', ',') || '0,00'; // <<< CORREÇÃO: Usa valor correto

                return [
                    data,
                    `"${nomeFuncionario}"`, // Coloca entre aspas para evitar problemas com vírgulas no nome
                    `"${nomeTurma}"`,
                    `"${nomeFazenda}"`,
                    numTalhao, // Número não precisa de aspas
                    precoMetroExibicao, // <<< CORREÇÃO
                    metrosExibicao, // <<< CORREÇÃO
                    valorStr // <<< CORREÇÃO
                ].join(';');
            }).join('\n');

            const csvContent = headers + '\n' + csvData;

            // Cria o Blob e o link para download
            const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" }); // Adiciona BOM para UTF-8
            const url = URL.createObjectURL(blob);
            const fileName = `relatorio_producao_${new Date().toISOString().split('T')[0]}.csv`;

            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            mostrarMensagem('Exportação para Excel concluída!', 'success');

        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            mostrarMensagem('Erro ao exportar para Excel: ' + error.message, 'error');
        }
    }


    // Função para imprimir relatório
    function imprimirRelatorio() {
        window.print();
    }

    // Função para limpar filtros
    function limparFiltros() {
        tipoRelatorioSelect.value = 'funcionario';
        funcionarioFiltro.value = '';
        turmaFiltro.value = '';
        fazendaFiltro.value = '';
        configurarDatasPadrao();
        ordenacaoSelect.value = 'data_desc';
        agruparPorDataCheck.checked = true;

        funcionarioGroup.style.display = 'block';
        turmaGroup.style.display = 'none';

        relatorioContainer.style.display = 'none';
        semDados.style.display = 'block';

        mostrarMensagem('Filtros limpos com sucesso!');
    }

    // Configurar botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();

            if (window.sistemaAuth && typeof window.sistemaAuth.fazerLogout === 'function') {
                window.sistemaAuth.fazerLogout();
            } else {
                localStorage.removeItem('usuarioLogado');
                window.location.href = 'login.html';
            }
        });
    }

    // Funções utilitárias (podem ser movidas para utils.js se necessário)
    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            // Assume que a data vem como 'YYYY-MM-DD'
            const parts = dataString.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            // Tenta formatar se vier em outro formato
            return new Date(dataString).toLocaleDateString('pt-BR');
        } catch (e) {
            return 'Data inválida';
        }
    }

    function mostrarMensagem(mensagem, tipo = 'success') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        // Remove mensagens antigas para evitar acúmulo
        const mensagensAntigas = alertContainer.querySelectorAll('.alert-message');
        mensagensAntigas.forEach(msg => msg.remove());


        const alertDiv = document.createElement('div');
        // Usando as classes de alerta definidas no CSS global (style.css)
        alertDiv.className = `alert-message ${tipo === 'error' ? 'alert-error' : 'alert-success'}`;

        alertDiv.innerHTML = `
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; font-size: 1.2rem; cursor: pointer; color: inherit; margin-left: 15px;">&times;</button>
        `;

        alertContainer.prepend(alertDiv); // Adiciona no início

        // Remove a mensagem após 5 segundos, mas apenas se o usuário não a fechou
        setTimeout(() => {
            if (alertDiv.parentElement) {
                 alertDiv.remove();
            }
        }, 5000);
    }


    async function testarConexaoSupabase() {
        try {
            const { error } = await supabase.from('turmas').select('id').limit(1);
            if (error) throw error;
            console.log('✅ Conexão com Supabase estabelecida');
            return true;
        } catch (error) {
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

});