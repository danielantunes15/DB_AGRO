// js/fazendas.js
// Configuração e inicialização para cadastro de fazendas
document.addEventListener('DOMContentLoaded', async function() {
    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const fazendaForm = document.getElementById('fazenda-form');
    const talhaoForm = document.getElementById('talhao-form');
    const fazendaTalhaoSelect = document.getElementById('fazenda-talhao');
    const fazendasList = document.getElementById('fazendas-list');

    // Variáveis para controle de edição
    let fazendaEditandoId = null;
    let talhaoEditandoId = null;

    try {
        // Mostrar loading
        loadingElement.style.display = 'block';
        contentElement.style.display = 'none';
        errorElement.style.display = 'none';

        // NOVO: Carregar sessão e perfil antes de tudo
        await window.sistemaAuth.carregarSessaoEPerfil();
        await testarConexaoSupabase(); // testarConexaoSupabase é do utils.js
        
        // Esconder loading e mostrar conteúdo
        loadingElement.style.display = 'none';
        contentElement.style.display = 'block';

        // Carregar dados iniciais
        await carregarFazendasParaSelect();
        await carregarFazendasETalhoes();
        
        // Configurar event listeners
        fazendaForm.addEventListener('submit', salvarFazenda);
        talhaoForm.addEventListener('submit', salvarTalhao);

        // Adicionar botões de cancelar
        adicionarBotoesCancelar();

        console.log('Módulo de fazendas inicializado com sucesso!');

    } catch (error) {
        console.error('Erro na inicialização:', error);
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
    }

    function limparFormularioFazenda() {
        fazendaForm.reset();
        fazendaEditandoId = null;
        document.querySelector('#fazenda-form button[type="submit"]').textContent = 'Salvar Fazenda';
    }

    function limparFormularioTalhao() {
        talhaoForm.reset();
        document.getElementById('preco-tonelada').value = '10.00';
        document.getElementById('producao-estimada').value = '100.00';
        talhaoEditandoId = null;
        document.querySelector('#talhao-form button[type="submit"]').textContent = 'Salvar Talhão';
    }

    // Função para calcular preço por metro
    function calcularPrecoPorMetro(talhaoData) {
        // Fórmula: (preco_tonelada * producao_estimada) / (10000 / espacamento / 5)
        const precoPorMetro = (talhaoData.preco_tonelada * talhaoData.producao_estimada) / (10000 / talhaoData.espacamento / 5);
        // CORREÇÃO: Garante 4 casas decimais estritas no cálculo do preço por metro
        return parseFloat(precoPorMetro.toFixed(4)); 
    }

    // Função para atualizar apontamentos quando alterar dados do talhão
    async function atualizarApontamentosDoTalhao(talhaoId) {
        try {
            // Buscar dados atualizados do talhão
            const { data: talhao, error: talhaoError } = await supabase
                .from('talhoes')
                .select('espacamento, preco_tonelada, producao_estimada')
                .eq('id', talhaoId)
                .single(); // RLS já filtra por empresa
                
            if (talhaoError) throw talhaoError;
            
            // Calcular novo preço por metro (usando a função corrigida)
            const novoPrecoPorMetro = calcularPrecoPorMetro(talhao);
            
            // Buscar todos os apontamentos deste talhão
            const { data: apontamentos, error: apontamentosError } = await supabase
                .from('apontamentos')
                .select('id, preco_por_metro')
                .eq('talhao_id', talhaoId);
                
            if (apontamentosError) throw apontamentosError;
            
            if (apontamentos && apontamentos.length > 0) {
                let apontamentosAtualizados = 0;
                let cortesAtualizados = 0;
                
                // Atualizar preço por metro nos apontamentos
                for (const apontamento of apontamentos) {
                    // Atualizar apontamento principal com o novo Preço/m
                    const { error: updateApontamentoError } = await supabase
                        .from('apontamentos')
                        // Novo preço por metro, garantido com 4 casas
                        .update({ preco_por_metro: novoPrecoPorMetro }) 
                        .eq('id', apontamento.id);
                        
                    if (updateApontamentoError) throw updateApontamentoError;
                    apontamentosAtualizados++;
                    
                    // Buscar cortes deste apontamento
                    const { data: cortes, error: cortesError } = await supabase
                        .from('cortes_funcionarios')
                        .select('id, metros')
                        .eq('apontamento_id', apontamento.id);
                        
                    if (cortesError) throw cortesError;
                    
                    // Atualizar valor dos cortes
                    for (const corte of cortes) {
                        const novoValor = corte.metros * novoPrecoPorMetro;
                        // Arredondar o valor total para 2 casas decimais (R$)
                        const valorArredondado = parseFloat(novoValor.toFixed(2));
                        
                        const { error: updateCorteError } = await supabase
                            .from('cortes_funcionarios')
                            .update({ valor: valorArredondado })
                            .eq('id', corte.id);
                            
                        if (updateCorteError) throw updateCorteError;
                        cortesAtualizados++;
                    }
                }
                
                console.log(`✅ Atualizados ${apontamentosAtualizados} apontamentos e ${cortesAtualizados} cortes do talhão ${talhaoId}`);
                return { apontamentosAtualizados, cortesAtualizados };
            }
            
            return { apontamentosAtualizados: 0, cortesAtualizados: 0 };
            
        } catch (error) {
            console.error('Erro ao atualizar apontamentos do talhão:', error);
            throw error;
        }
    }

    // Função para salvar fazenda
    async function salvarFazenda(e) {
        e.preventDefault();
        
        const empresaId = window.sistemaAuth.getEmpresaId(); // <--- NOVO
        const nomeFazenda = document.getElementById('nome-fazenda').value.trim();
        const proprietario = document.getElementById('proprietario-fazenda').value.trim(); // <--- NOVO
        const telefone = document.getElementById('telefone-fazenda').value.trim(); // <--- NOVO
        
        if (!nomeFazenda) {
            mostrarMensagem('Informe o nome da fazenda.', 'error');
            return;
        }
        
        try {
            let result;
            
            if (fazendaEditandoId) {
                // Editar fazenda existente
                const { data, error } = await supabase
                    .from('fazendas')
                    .update({ 
                        nome: nomeFazenda,
                        proprietario: proprietario, 
                        telefone: telefone
                    })
                    .eq('id', fazendaEditandoId)
                    .select()
                    .single();
                    
                if (error) throw error;
                result = data;
                mostrarMensagem('Fazenda atualizada com sucesso!');
            } else {
                // Criar nova fazenda
                const { data, error } = await supabase
                    .from('fazendas')
                    .insert([{ 
                        nome: nomeFazenda,
                        proprietario: proprietario, 
                        telefone: telefone,
                        empresa_id: empresaId // <--- ADICIONAR ID DA EMPRESA
                    }])
                    .select()
                    .single();
                    
                if (error) throw error;
                result = data;
                mostrarMensagem('Fazenda salva com sucesso!');
            }
            
            limparFormularioFazenda();
            await carregarFazendasParaSelect();
            await carregarFazendasETalhoes();
            
        } catch (error) {
            console.error('Erro ao salvar fazenda:', error);
            mostrarMensagem('Erro ao salvar fazenda: ' + error.message, 'error');
        }
    }

    // Função para salvar talhão
    async function salvarTalhao(e) {
        e.preventDefault();
        
        const empresaId = window.sistemaAuth.getEmpresaId(); // <--- NOVO
        const fazendaId = fazendaTalhaoSelect.value;
        const numeroTalhao = document.getElementById('numero-talhao').value;
        const areaTalhao = document.getElementById('area-talhao').value;
        const espacamentoTalhao = document.getElementById('espacamento-talhao').value;
        const precoTonelada = document.getElementById('preco-tonelada').value;
        const producaoEstimada = document.getElementById('producao-estimada').value;
        
        if (!fazendaId || !numeroTalhao || !areaTalhao || !espacamentoTalhao || !precoTonelada || !producaoEstimada) {
            mostrarMensagem('Preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        try {
            let result;
            let atualizandoTalhaoExistente = false;
            
            const dadosTalhao = {
                fazenda_id: fazendaId,
                numero: parseInt(numeroTalhao),
                area: parseFloat(areaTalhao),
                espacamento: parseFloat(espacamentoTalhao),
                preco_tonelada: parseFloat(precoTonelada),
                producao_estimada: parseFloat(producaoEstimada)
            };

            if (talhaoEditandoId) {
                // Editar talhão existente
                atualizandoTalhaoExistente = true;
                const { data, error } = await supabase
                    .from('talhoes')
                    .update(dadosTalhao)
                    .eq('id', talhaoEditandoId)
                    .select()
                    .single();
                    
                if (error) throw error;
                result = data;
                mostrarMensagem('Talhão atualizado com sucesso!');
                
                // ATUALIZAR APONTAMENTOS EXISTENTES DESTE TALHÃO
                try {
                    const { apontamentosAtualizados, cortesAtualizados } = await atualizarApontamentosDoTalhao(talhaoEditandoId);
                    if (apontamentosAtualizados > 0) {
                        mostrarMensagem(`Talhão atualizado! ${apontamentosAtualizados} apontamentos e ${cortesAtualizados} cortes foram atualizados com os novos valores.`, 'success');
                    }
                } catch (updateError) {
                    console.error('Aviso: Não foi possível atualizar apontamentos existentes:', updateError);
                    mostrarMensagem('Talhão atualizado, mas houve um aviso ao atualizar apontamentos existentes.', 'error');
                }
                
            } else {
                // Criar novo talhão
                const dadosParaInsert = {
                    ...dadosTalhao,
                    empresa_id: empresaId // <--- ADICIONAR ID DA EMPRESA
                };
                
                const { data, error } = await supabase
                    .from('talhoes')
                    .insert([dadosParaInsert])
                    .select()
                    .single();
                    
                if (error) throw error;
                result = data;
                mostrarMensagem('Talhão salvo com sucesso!');
            }
            
            limparFormularioTalhao();
            await carregarFazendasETalhoes();
            
        } catch (error) {
            console.error('Erro ao salvar talhão:', error);
            mostrarMensagem('Erro ao salvar talhão: ' + error.message, 'error');
        }
    }

    // Função para carregar fazendas no select
    async function carregarFazendasParaSelect() {
        const empresaId = window.sistemaAuth.getEmpresaId(); // <--- NOVO
        try {
            const { data, error } = await supabase
                .from('fazendas')
                .select('id, nome')
                .eq('empresa_id', empresaId) // <--- FILTRO POR EMPRESA
                .order('nome');
                
            if (error) throw error;
            
            fazendaTalhaoSelect.innerHTML = '<option value="">Selecione a fazenda</option>';
            data.forEach(fazenda => {
                const option = document.createElement('option');
                option.value = fazenda.id;
                option.textContent = fazenda.nome;
                fazendaTalhaoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
            mostrarMensagem('Erro ao carregar fazendas', 'error');
        }
    }

    // Função para carregar fazendas e talhões
    async function carregarFazendasETalhoes() {
        const empresaId = window.sistemaAuth.getEmpresaId(); // <--- NOVO
        try {
            const { data, error } = await supabase
                .from('fazendas')
                .select(`
                    id,
                    nome,
                    proprietario,
                    telefone,
                    talhoes(
                        id,
                        numero,
                        area,
                        espacamento,
                        preco_tonelada,
                        producao_estimada
                    )
                `)
                .eq('empresa_id', empresaId) // <--- FILTRO POR EMPRESA
                .order('nome');
                
            if (error) throw error;
            
            if (data.length === 0) {
                fazendasList.innerHTML = '<p>Nenhuma fazenda cadastrada.</p>';
                return;
            }
            
            let html = '';
            
            data.forEach(fazenda => {
                // CÓDIGO CORRIGIDO PARA MELHORAR O VISUAL E USAR CLASSES CSS
                html += `
                    <div class="fazenda-item">
                        <div class="fazenda-header">
                            <h3 class="fazenda-title">${fazenda.nome}</h3>
                            <div class="fazenda-actions">
                                <button class="btn btn-secondary btn-sm" onclick="editarFazenda('${fazenda.id}')">Editar</button>
                                <button class="btn btn-danger btn-sm" onclick="excluirFazenda('${fazenda.id}')">Excluir Tudo</button>
                            </div>
                        </div>
                        <p style="margin-bottom: 0.5rem; color: var(--text-light); font-size: 0.9rem;">
                            Proprietário: ${fazenda.proprietario || 'N/A'} | Contato: ${fazenda.telefone || 'N/A'}
                        </p>
                `;
                
                if (!fazenda.talhoes || fazenda.talhoes.length === 0) {
                    html += '<p class="no-talhoes">Nenhum talhão cadastrado.</p>';
                } else {
                    html += `
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Talhão</th>
                                    <th>Área (ha)</th>
                                    <th>Espaçamento (m)</th>
                                    <th>Preço/T (R$)</th>
                                    <th>Produção (t/ha)</th>
                                    <th>Preço/m (R$)</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    fazenda.talhoes.forEach(talhao => {
                        const precoPorMetro = calcularPrecoPorMetro(talhao);
                        html += `
                            <tr>
                                <td>${talhao.numero}</td>
                                <td>${talhao.area}</td>
                                <td>${talhao.espacamento}</td>
                                <td>R$ ${talhao.preco_tonelada.toFixed(2)}</td>
                                <td>${talhao.producao_estimada.toFixed(2)}</td>
                                <td><span class="preco-metro">R$ ${precoPorMetro.toFixed(4)}</span></td>
                                <td>
                                    <button class="btn btn-secondary btn-sm" onclick="editarTalhao('${talhao.id}')">Editar</button>
                                    <button class="btn btn-danger btn-sm" onclick="excluirTalhao('${talhao.id}')">Excluir</button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += '</tbody></table>';
                }
                
                html += `</div>`;
            });
            
            fazendasList.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar fazendas:', error);
            fazendasList.innerHTML = '<p>Erro ao carregar fazendas.</p>';
        }
    }

    function adicionarBotoesCancelar() {
        // Botão de cancelar para fazenda
        const btnCancelarFazenda = document.createElement('button');
        btnCancelarFazenda.type = 'button';
        btnCancelarFazenda.className = 'btn btn-secondary';
        btnCancelarFazenda.textContent = 'Cancelar Edição';
        btnCancelarFazenda.style.marginLeft = '10px';
        btnCancelarFazenda.onclick = limparFormularioFazenda;
        
        const formActionsFazenda = fazendaForm.querySelector('.form-actions');
        formActionsFazenda.appendChild(btnCancelarFazenda);

        // Botão de cancelar para talhão
        const btnCancelarTalhao = document.createElement('button');
        btnCancelarTalhao.type = 'button';
        btnCancelarTalhao.className = 'btn btn-secondary';
        btnCancelarTalhao.textContent = 'Cancelar Edição';
        btnCancelarTalhao.style.marginLeft = '10px';
        btnCancelarTalhao.onclick = limparFormularioTalhao;
        
        const formActionsTalhao = talhaoForm.querySelector('.form-actions');
        formActionsTalhao.appendChild(btnCancelarTalhao);
    }

    // Funções globais para ações
    window.editarFazenda = async function(fazendaId) {
        try {
            const { data, error } = await supabase
                .from('fazendas')
                .select('*')
                .eq('id', fazendaId)
                .single();
                
            if (error) throw error;
            
            // Preencher formulário com dados da fazenda
            document.getElementById('nome-fazenda').value = data.nome;
            document.getElementById('proprietario-fazenda').value = data.proprietario || ''; 
            document.getElementById('telefone-fazenda').value = data.telefone || ''; 
            
            // Atualizar estado para edição
            fazendaEditandoId = fazendaId;
            document.querySelector('#fazenda-form button[type="submit"]').textContent = 'Atualizar Fazenda';
            
            // Rolar até o formulário
            document.getElementById('fazenda-form').scrollIntoView({ behavior: 'smooth' });
            
            mostrarMensagem('Editando fazenda. Preencha os dados e clique em "Atualizar Fazenda".', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar fazenda para edição:', error);
            mostrarMensagem('Erro ao carregar dados da fazenda: ' + error.message, 'error');
        }
    };

    window.excluirFazenda = async function(fazendaId) {
        if (!confirm('Tem certeza que deseja excluir esta fazenda? TODOS OS TALHÕES associados também serão excluídos!')) {
            return;
        }
        
        try {
            // Primeiro excluir os talhões associados
            const { error: errorTalhoes } = await supabase
                .from('talhoes')
                .delete()
                .eq('fazenda_id', fazendaId);
                
            if (errorTalhoes) throw errorTalhoes;
            
            // Depois excluir a fazenda
            const { error } = await supabase
                .from('fazendas')
                .delete()
                .eq('id', fazendaId);
                
            if (error) throw error;
            
            mostrarMensagem('Fazenda e talhões associados excluídos com sucesso!');
            await carregarFazendasParaSelect();
            await carregarFazendasETalhoes();
            
        } catch (error) {
            console.error('Erro ao excluir fazenda:', error);
            mostrarMensagem('Erro ao excluir fazenda: ' + error.message, 'error');
        }
    };

    window.editarTalhao = async function(talhaoId) {
        try {
            const { data, error } = await supabase
                .from('talhoes')
                .select('*')
                .eq('id', talhaoId)
                .single();
                
            if (error) throw error;
            
            // Preencher formulário com dados do talhão
            document.getElementById('fazenda-talhao').value = data.fazenda_id;
            document.getElementById('numero-talhao').value = data.numero;
            document.getElementById('area-talhao').value = data.area;
            document.getElementById('espacamento-talhao').value = data.espacamento;
            document.getElementById('preco-tonelada').value = data.preco_tonelada;
            document.getElementById('producao-estimada').value = data.producao_estimada;
            
            // Atualizar estado para edição
            talhaoEditandoId = talhaoId;
            document.querySelector('#talhao-form button[type="submit"]').textContent = 'Atualizar Talhão';
            
            // Rolar até o formulário
            document.getElementById('talhao-form').scrollIntoView({ behavior: 'smooth' });
            
            mostrarMensagem('Editando talhão. Preencha os dados e clique em "Atualizar Talhão".', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar talhão para edição:', error);
            mostrarMensagem('Erro ao carregar dados do talhão: ' + error.message, 'error');
        }
    };
    
    window.excluirTalhao = async function(talhaoId) {
        if (!confirm('Tem certeza que deseja excluir este talhão?')) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('talhoes')
                .delete()
                .eq('id', talhaoId);
                
            if (error) throw error;
            
            mostrarMensagem('Talhão excluído com sucesso!');
            await carregarFazendasETalhoes();
            
        } catch (error) {
            console.error('Erro ao excluir talhão:', error);
            mostrarMensagem('Erro ao excluir talhão: ' + error.message, 'error');
        }
    };
});