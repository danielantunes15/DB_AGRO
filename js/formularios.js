document.addEventListener('DOMContentLoaded', async () => {
    // Autenticação
    if (!window.sistemaAuth || !window.sistemaAuth.requerAutenticacao()) return;

    // Elementos do DOM
    const turmaSelect = document.getElementById('turma-select');
    const gerarPreviewBtn = document.getElementById('gerar-preview-btn');
    const gerarBrancoBtn = document.getElementById('gerar-branco-btn');
    
    // Botão de Imprimir foi alterado para Gerar PDF
    const gerarPdfBtn = document.getElementById('gerar-pdf-btn'); 
    
    const previewContainer = document.getElementById('preview-container');
    const errorElement = document.getElementById('error-message');
    
    // NOVO: Capturar o botão de Excel
    const exportarExcelBtn = document.getElementById('exportar-excel-btn');
    
    // Carrega as turmas no select
    async function carregarTurmas() {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            turmaSelect.innerHTML = '<option value="">Selecione uma turma</option>';
            data.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                turmaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            errorElement.style.display = 'block';
            mostrarMensagem('Falha ao carregar a lista de turmas.', 'error');
        }
    }

    // Gera a pré-visualização do formulário POR TURMA
    async function gerarPreviewPorTurma() {
        const turmaId = turmaSelect.value;
        const turmaNome = turmaSelect.options[turmaSelect.selectedIndex].text;
        
        if (!turmaId) {
            mostrarMensagem('Por favor, selecione a turma.', 'error');
            return;
        }

        try {
            const { data: funcionarios, error } = await supabase
                .from('funcionarios')
                .select('nome, codigo')
                .eq('turma', turmaId)
                .order('nome'); // ALTERADO: Ordena APENAS por nome (ordem alfabética)

            if (error) throw error;

            // Preenche o cabeçalho
            document.getElementById('preview-turma').textContent = turmaNome;
            
            const tbody = document.getElementById('funcionarios-tbody');
            tbody.innerHTML = '';
            
            // Adiciona funcionários da turma
            funcionarios.forEach(func => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${func.codigo || ''}</td> <td>${func.nome}</td>           <td></td><td></td><td></td><td></td><td></td> `;
                tbody.appendChild(tr);
            });
            
            // Adiciona 5 linhas em branco extras para anotações (Total de 7 colunas)
            for (let i = 0; i < 5; i++) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td></td><td></td><td></td><td></td><td></td><td></td><td></td> `;
                tbody.appendChild(tr);
            }

            // Exibe o formulário
            previewContainer.style.display = 'block';
            
            // Exibe o botão de Gerar PDF
            if (gerarPdfBtn) gerarPdfBtn.style.display = 'inline-block';
            
            // Exibe o botão de Excel
            if (exportarExcelBtn) exportarExcelBtn.style.display = 'inline-block';
            
            mostrarMensagem('Formulário da turma gerado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao gerar preview:', error);
            mostrarMensagem('Erro ao buscar funcionários: ' + error.message, 'error');
        }
    }

    // Gera um formulário EM BRANCO
    function gerarFormularioEmBranco() {
        // Limpa o campo de turma
        document.getElementById('preview-turma').textContent = "__________________";

        const tbody = document.getElementById('funcionarios-tbody');
        tbody.innerHTML = '';
            
        // --- ALTERAÇÃO: Reduzido de 45 para 35 linhas para tentar caber ---
        for (let i = 0; i < 35; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td> `;
            tbody.appendChild(tr);
        }

        // Exibe o formulário
        previewContainer.style.display = 'block';
        
        // Exibe o botão de Gerar PDF
        if (gerarPdfBtn) gerarPdfBtn.style.display = 'inline-block';
        
        // Exibe o botão de Excel
        if (exportarExcelBtn) exportarExcelBtn.style.display = 'inline-block';
        
        mostrarMensagem('Formulário em branco (35 linhas) gerado com sucesso!', 'success');
    }

    //
    // --- FUNÇÃO DE GERAR PDF ATUALIZADA ---
    //
    function gerarPDFFormulario() {
        try {
            mostrarMensagem('Gerando PDF...', 'success');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4'); // Retrato, milímetros, A4

            const turmaNome = document.getElementById('preview-turma').textContent.trim();
            const dataAtual = new Date().toLocaleDateString('pt-BR');
            
            // --- Cabeçalho (similar ao relatorios-completos.js) ---
            doc.setFillColor(44, 119, 68); // Verde (var(--primary-color))
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, 'F');
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('AGRO CANA FORTE', doc.internal.pageSize.getWidth() / 2, 8, { align: 'center' });
            doc.setFontSize(11);
            doc.text('FORMULÁRIO DE APONTAMENTO DE PRODUÇÃO', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

            let yPosition = 30; // Posição Y inicial abaixo do cabeçalho

            // --- Informações (Info-Fields) ---
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('FAZENDA:', 15, yPosition);
            doc.text('TALHÃO:', 105, yPosition); // Metade da página
            doc.setFont('helvetica', 'normal');
            doc.text('_________________________', 35, yPosition);
            doc.text('_________________________', 125, yPosition);
            
            yPosition += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('DATA:', 15, yPosition);
            doc.text('TURMA:', 105, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text('_________________________', 35, yPosition);
            doc.text(turmaNome.includes('____') ? '_________________________' : turmaNome, 125, yPosition);

            yPosition += 10; // Espaço antes da tabela

            // --- Tabela ---
            const tableHead = document.querySelector('.form-sheet table thead');
            const tableBody = document.getElementById('funcionarios-tbody');

            const head = [];
            tableHead.querySelectorAll('th').forEach(th => head.push(th.textContent.trim()));

            const body = [];
            tableBody.querySelectorAll('tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach(td => row.push(td.textContent.trim()));
                body.push(row);
            });

            // Cria manualmente a linha do rodapé com o colSpan
            const footRow = [
                { content: 'TOTAIS', colSpan: 2, styles: { halign: 'left' } },
                // As outras células da linha do rodapé são omitidas
                // pois o colspan=2 já cobre as duas primeiras colunas.
            ];


            doc.autoTable({
                startY: yPosition,
                head: [head],
                body: body,
                foot: [footRow], // <-- USA A LINHA DE RODAPÉ CORRIGIDA
                theme: 'grid',
                // Define margens de 15mm em cada lado
                margin: { left: 15, right: 15 }, 
                headStyles: { 
                    fillColor: [233, 236, 239], // #e9ecef
                    textColor: [0, 0, 0], 
                    fontStyle: 'bold',
                    halign: 'center',
                    lineColor: [51, 51, 51],
                    lineWidth: 0.1,
                    fontSize: 9, 
                    cellPadding: 2 
                },
                footStyles: {
                    fillColor: [233, 236, 239], // #e9ecef
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineColor: [51, 51, 51],
                    lineWidth: 0.1,
                    fontSize: 9, 
                    cellPadding: 2 
                },
                
                // --- INÍCIO DA CORREÇÃO (NEGRITO E MAIOR) ---
                styles: {
                    fontSize: 9, // <-- AUMENTADO de 8.5
                    fontStyle: 'bold', // <-- ADICIONADO NEGRITO
                    cellPadding: 2, 
                    lineColor: [51, 51, 51], // #333
                    lineWidth: 0.1,
                    overflow: 'linebreak'
                },
                // --- FIM DA CORREÇÃO ---
                
                columnStyles: {
                    // Área útil = 210mm (A4) - 15mm (margem esq) - 15mm (margem dir) = 180mm
                    0: { cellWidth: 12 }, // Cód.
                    1: { cellWidth: 60 }, // Funcionário
                    2: { cellWidth: 18 }, // Metros
                    3: { cellWidth: 25 }, // Preço/Metro
                    4: { cellWidth: 20 }, // Toneladas
                    5: { cellWidth: 18 }, // Folgas
                    6: { cellWidth: 27 }  // Valor Total
                    // Total: 12 + 60 + 18 + 25 + 20 + 18 + 27 = 180mm
                },
                
                // Adiciona rodapé em todas as páginas
                didDrawPage: function(data) {
                    // Rodapé da Página
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(
                        `Página ${data.pageNumber} - Gerado em ${dataAtual}`,
                        doc.internal.pageSize.getWidth() / 2,
                        doc.internal.pageSize.getHeight() - 7, // Mais perto da borda
                        { align: 'center' }
                    );
                }
            });

            // --- Assinatura (após a tabela) ---
            let finalY = doc.autoTable.previous.finalY;
            
            // Verifica se a assinatura cabe na página atual, se não, adiciona uma nova
            if (finalY > (doc.internal.pageSize.getHeight() - 25)) { 
                doc.addPage();
                finalY = 20; // Começa no topo da nova página
            } else {
                finalY += 15; // Adiciona espaço
            }

            doc.setFontSize(10); 
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text('Assinatura do Responsável:', 15, finalY);
            doc.text('________________________________________', 15, finalY + 6);


            // --- Salvar ---
            const fileName = `Formulario_${turmaNome.includes('____') ? 'Em_Branco' : turmaNome}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            mostrarMensagem('PDF gerado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            mostrarMensagem('Erro ao gerar PDF: ' + error.message, 'error');
        }
    }


    function exportarFormularioExcel() {
        const previewContainer = document.getElementById('preview-container');
        if (!previewContainer || previewContainer.style.display === 'none') {
            mostrarMensagem('Gere um formulário primeiro para poder exportar.', 'error');
            return;
        }

        const turmaNome = document.getElementById('preview-turma').textContent.trim();
        const dataAtual = new Date().toISOString().split('T')[0];
        const fileName = `Formulario_Apontamento_${turmaNome || 'Em_Branco'}_${dataAtual}.csv`;

        let csvContent = "\uFEFF"; // BOM (Byte Order Mark) para garantir UTF-8 no Excel

        // 1. Cabeçalho do Formulário (informações)
        csvContent += "AGRO CANA FORTE\n";
        csvContent += "FORMULÁRIO DE APONTAMENTO DE PRODUÇÃO\n\n";
        
        // Usamos ponto e vírgula (;) como delimitador, comum no Excel em português
        csvContent += `FAZENDA:; \n`;
        csvContent += `TALHÃO:; \n`;
        csvContent += `DATA:; \n`;
        // Coloca a turma na segunda coluna
        csvContent += `TURMA:;${turmaNome}\n\n`;

        // 2. Cabeçalho da Tabela (Thead)
        const tableHead = document.querySelector('.form-sheet table thead tr');
        let headers = [];
        tableHead.querySelectorAll('th').forEach(th => {
            // Coloca o texto entre aspas para tratar espaços ou caracteres especiais
            headers.push(`"${th.textContent.trim()}"`);
        });
        csvContent += headers.join(';') + '\n';

        // 3. Corpo da Tabela (Tbody)
        const tableBody = document.getElementById('funcionarios-tbody');
        tableBody.querySelectorAll('tr').forEach(tr => {
            let rowData = [];
            tr.querySelectorAll('td').forEach(td => {
                rowData.push(`"${td.textContent.trim()}"`);
            });
            csvContent += rowData.join(';') + '\n';
        });

        // 4. Rodapé da Tabela (Tfoot)
        const tableFoot = document.querySelector('.form-sheet table tfoot tr');
        let footerData = [];
        tableFoot.querySelectorAll('td').forEach(td => {
            footerData.push(`"${td.textContent.trim()}"`);
        });
        csvContent += footerData.join(';') + '\n\n';
        
        // 5. Assinatura
        csvContent += "Assinatura do Responsável:;\n";

        // 6. Criação e Download do Blob (Arquivo CSV)
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) { // Verifica se o navegador suporta download
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                mostrarMensagem('Exportação para Excel (CSV) iniciada!', 'success');
            } else {
                mostrarMensagem('Seu navegador não suporta o download automático.', 'error');
            }
        } catch (error) {
            console.error('Erro ao exportar Excel (CSV):', error);
            mostrarMensagem('Ocorreu um erro ao tentar gerar o arquivo Excel.', 'error');
        }
    }

    // Event Listeners
    gerarPreviewBtn.addEventListener('click', gerarPreviewPorTurma);
    gerarBrancoBtn.addEventListener('click', gerarFormularioEmBranco);
    
    // Listener atualizado para o botão de PDF
    if (gerarPdfBtn) {
        gerarPdfBtn.addEventListener('click', gerarPDFFormulario);
    }
    
    // Adiciona o listener para o botão de Excel
    if (exportarExcelBtn) {
        exportarExcelBtn.addEventListener('click', exportarFormularioExcel);
    }

    // Inicialização
    await carregarTurmas();
});