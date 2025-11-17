// js/db-faturas.js

// --- IMPORTANTE: COLOQUE AQUI AS CHAVES DO SEU PROJETO "DB SISTEMAS" ---
const DB_SISTEMAS_URL = 'https://hdmhxtatupfrkwbyusup.supabase.co';
const DB_SISTEMAS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbWh4dGF0dXBmcmt3Ynl1c3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDAzNDgsImV4cCI6MjA3ODYxNjM0OH0.t_2-hT-TtZI1PeGZDHoe-ApWYOT5eCFF2ki8CQa7f9k';
// --------------------------------------------------------------------

// --- IMPORTANTE 2: COLOQUE AQUI O ID (UUID) DO SEU CLIENTE "AGRO CANA" ---
const AGRO_CANA_CLIENT_ID = '54a74da2-8c93-4a67-b44f-910690b45a8d'; 
// --------------------------------------------------------------------


// Inicializa um cliente Supabase *separado*
const sbDbSistemas = supabase.createClient(DB_SISTEMAS_URL, DB_SISTEMAS_KEY);

document.addEventListener('DOMContentLoaded', function() {
    
    if (!AGRO_CANA_CLIENT_ID || AGRO_CANA_CLIENT_ID === '54a74da2-8c93-4a67-b44f-910690b45a8d') {
        mostrarMensagem('Erro de configuração: A página não está vinculada a um cliente.', 'error');
        return;
    }

    const faturasContainer = document.getElementById('faturas-container');

    async function loadFaturas() {
        try {
            const { data: sites, error } = await sbDbSistemas
                .from('sites')
                .select(`
                    id, name, url,
                    faturas (
                        id, descricao, valor,
                        data_vencimento, status_pagamento
                    )
                `)
                .eq('user_id', AGRO_CANA_CLIENT_ID) // <--- USA O ID FIXO
                .order('name'); 

            if (error) throw error;

            if (sites.length === 0) {
                faturasContainer.innerHTML = '<div class="card"><p>Nenhum sistema encontrado em sua conta do DB Sistemas.</p></div>';
                return;
            }

            faturasContainer.innerHTML = ''; 

            sites.forEach(site => {
                const siteCard = document.createElement('div');
                siteCard.className = 'card site-faturas-card';

                let faturasHtml = '';
                if (site.faturas.length === 0) {
                    faturasHtml = '<div class="fatura-item"><p>Nenhuma fatura encontrada para este sistema.</p></div>';
                } else {
                    site.faturas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
                    site.faturas.forEach(fatura => {
                        faturasHtml += renderFaturaItem(fatura);
                    });
                }

                siteCard.innerHTML = `
                    <h3>${site.name}</h3>
                    <div class="faturas-list">
                        ${faturasHtml}
                    </div>
                `;
                faturasContainer.appendChild(siteCard);
            });

        } catch (error) {
            console.error('Erro ao buscar faturas:', error);
            faturasContainer.innerHTML = '<div class="card"><p>Erro ao buscar suas faturas.</p></div>';
            mostrarMensagem('Erro ao buscar faturas: ' + error.message, 'error');
        }
    }

    function renderFaturaItem(fatura) {
        let statusText = '';
        let statusClass = '';
        let itemClass = '';

        const dataVencimento = new Date(fatura.data_vencimento + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        if (fatura.status_pagamento === 'pago') {
            statusText = 'Pago';
            statusClass = 'status-pago';
            itemClass = 'pago';
        } else if (dataVencimento < hoje) {
            statusText = 'ATRASADO';
            statusClass = 'status-atrasado';
            itemClass = 'atrasado';
        } else {
            statusText = 'Pendente';
            statusClass = 'status-pendente';
            itemClass = 'pendente';
        }

        const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor);

        return `
            <div class="fatura-item ${itemClass}">
                <div class="fatura-info">
                    <strong>${fatura.descricao}</strong>
                    <span>Vencimento: ${dataFormatada}</span>
                </div>
                <div class="fatura-valor">
                    <strong>${valorFormatado}</strong>
                </div>
                <div class="fatura-status ${statusClass}">
                    ${statusText.toUpperCase()}
                </div>
            </div>
        `;
    }

    loadFaturas();
});