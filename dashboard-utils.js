// ========== CONFIGURAÇÃO E UTILITÁRIOS DO DASHBOARD ==========
const DASHBOARD_CONFIG = {
    STORAGE_TICKETS: 'techflow_tickets_v1',
    STORAGE_INVENTORY: 'techflow_inventory_v1',
    STORAGE_TECH: 'currentTecnico',
    STORAGE_CHAT: 'techflow_chat_v1',
};

function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => { toast.remove(); });
    }, 3500);
}

function getBadgeClass(status) {
    if (status === 'Com o Aluno') return 'badge-success';
    if (status === 'Na TI (Manutenção)') return 'badge-warning';
    if (status === 'Disponível (Estoque)') return 'badge-info';
    if (status === 'Extraviado/Roubado') return 'badge-error';
    return 'badge-success';
}
