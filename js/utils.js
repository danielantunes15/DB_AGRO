// js/utils.js

/**
 * Exibe uma mensagem de alerta temporária na página.
 * @param {string} mensagem - A mensagem a ser exibida.
 * @param {string} [tipo='success'] - O tipo de mensagem ('success' ou 'error').
 */
function mostrarMensagem(mensagem, tipo = 'success') {
    // Busca o contêiner flutuante, se não existir, cria um
    let alertContainer = document.getElementById('alert-container-flutuante');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container-flutuante';
        // É importante que ele seja adicionado ao body para poder flutuar
        document.body.appendChild(alertContainer);
    }

    // Remove mensagens antigas para evitar acúmulo
    const mensagensAntigas = alertContainer.querySelectorAll('.alert-message');
    mensagensAntigas.forEach(msg => msg.remove());

    const mensagemDiv = document.createElement('div');
    mensagemDiv.className = `alert-message ${tipo === 'error' ? 'alert-error' : 'alert-success'}`;
    mensagemDiv.setAttribute('role', 'alert');
    mensagemDiv.innerHTML = `
        <div style="padding: 1rem; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
            <strong>${tipo === 'error' ? '⚠️ Erro:' : '✅ Sucesso:'} </strong> ${mensagem}
            <button onclick="this.closest('.alert-message').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: inherit; margin-left: 15px; line-height: 1;">&times;</button>
        </div>
    `;
    
    alertContainer.prepend(mensagemDiv); // Adiciona no topo da lista (ou do contêiner)

    setTimeout(() => {
        if (mensagemDiv.parentElement) {
            mensagemDiv.remove();
        }
    }, 5000);
}

/**
 * Testa a conexão com o cliente Supabase.
 * @returns {Promise<boolean>} Retorna true se a conexão for bem-sucedida.
 */
async function testarConexaoSupabase() {
    try {
        const { data, error } = await supabase
            .from('fazendas')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        console.log('✅ Conexão com Supabase estabelecida');
        return true;
    } catch (error) {
        throw new Error(`Falha na conexão: ${error.message}`);
    }
}

/**
 * Formata uma data no formato DD/MM/YYYY.
 * @param {string|Date} data - A string ou objeto Date a ser formatado.
 * @returns {string} A data formatada.
 */
function formatarData(data) {
    if (!data) return '';
    const datePart = String(data).split('T')[0];
    const parts = datePart.split('-');
    
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch (e) {
        return 'N/A';
    }
}