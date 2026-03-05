// ========== CONFIGURAÇÃO ==========
const CONFIG = {
    STORAGE_TICKETS: 'techflow_tickets_v1',
    STORAGE_INVENTORY: 'techflow_inventory_v1',
    STORAGE_TECH: 'currentTecnico',
    STORAGE_CHAT: 'techflow_chat_v1',
};

// ========== VERIFICAÇÃO DE AUTENTICAÇÃO ==========
(function checkAuth() {
    if (!localStorage.getItem(CONFIG.STORAGE_TECH)) {
        window.location.href = 'index.html'; 
    }
})();

// ========== VARIÁVEIS GLOBAIS ==========
const currentTech = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TECH)) || { name: "Técnico" };
let tickets = [];
let inventory = [];
let chats = {};
let selectedTicketId = null;
let editingStudentId = null; 
let ticketChartInstance = null; 
let currentSort = { column: 'date', direction: 'desc' };

// ========== INICIALIZAÇÃO ==========
function initApp() {
    loadData();
    setupEventListeners();
    renderDashboard();
}

function loadData() {
    try {
        tickets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TICKETS) || '[]');
        inventory = JSON.parse(localStorage.getItem(CONFIG.STORAGE_INVENTORY) || '[]');
        chats = JSON.parse(localStorage.getItem(CONFIG.STORAGE_CHAT) || '{}');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        tickets = [];
        inventory = [];
        chats = {};
    }
}

function saveData() {
    try {
        localStorage.setItem(CONFIG.STORAGE_TICKETS, JSON.stringify(tickets));
        localStorage.setItem(CONFIG.STORAGE_INVENTORY, JSON.stringify(inventory));
        localStorage.setItem(CONFIG.STORAGE_CHAT, JSON.stringify(chats));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
    }
}

// ========== SISTEMA DE NOTIFICAÇÕES (TOASTS) ==========
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

// ========== NAVEGAÇÃO ==========
function setupEventListeners() {
    document.querySelectorAll('#navMenu button').forEach(btn => {
        btn.addEventListener('click', () => handleNavigation(btn));
    });

    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
    document.getElementById('btnSendMessage')?.addEventListener('click', handleSendMessage);
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    });
    document.getElementById('btnAcceptTicket')?.addEventListener('click', handleAcceptTicket);

    document.getElementById('searchGlobal')?.addEventListener('input', () => {
        const activePage = document.querySelector('.page:not(.hide)').id;
        if (activePage === 'page-tickets') renderTicketsList();
        if (activePage === 'page-inventario') renderInventoryList();
    });
}

function handleNavigation(btn) {
    if (btn.id === 'toggleTheme') return;
    
    document.querySelectorAll('#navMenu button').forEach(b => {
        if (b.id !== 'toggleTheme') b.classList.remove('active');
    });
    btn.classList.add('active');

    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hide');
        p.style.animation = 'none';
        p.offsetHeight; 
        p.style.animation = null; 
    });

    const pageId = 'page-' + btn.dataset.page;
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hide');
        document.getElementById('viewTitle').textContent = btn.textContent.replace(/[📊🎫💬💻📈⚙️]/g, '').trim();

        if (btn.dataset.page === 'tickets') renderTicketsList();
        else if (btn.dataset.page === 'inventario') renderInventoryList();
        else if (btn.dataset.page === 'mensagens') renderTicketChatList();
        else if (btn.dataset.page === 'dashboard') renderDashboard();
        
        const searchInput = document.getElementById('searchGlobal');
        if (searchInput) searchInput.value = '';
    }
}

function handleLogout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem(CONFIG.STORAGE_TECH);
        window.location.href = 'index.html'; 
    }
}

// ========== DASHBOARD ==========
function renderDashboard() {
    loadData();
    updateWelcomeHeader(); 
    updateStats();
    renderRecentActivity();
    renderChart(); 
}

function updateWelcomeHeader() {
    const hour = new Date().getHours();
    let greeting = 'Boa noite';
    if (hour >= 5 && hour < 12) greeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) greeting = 'Boa tarde';

    const techName = currentTech.name.split(' ')[0]; 
    const greetingEl = document.getElementById('greetingText');
    if(greetingEl) greetingEl.textContent = `${greeting}, ${techName}! 👋`;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('pt-BR', dateOptions);
    const dateEl = document.getElementById('dateText');
    if(dateEl) dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

function updateStats() {
    const pendentes = tickets.filter(t => t.status === 'Pendente').length;
    const andamento = tickets.filter(t => t.status === 'Em Andamento').length;
    const resolvidos = tickets.filter(t => t.status === 'Resolvido').length;
    
    if(document.getElementById('countOpen')) document.getElementById('countOpen').textContent = pendentes;
    if(document.getElementById('countPending')) document.getElementById('countPending').textContent = andamento;
    if(document.getElementById('countClosed')) document.getElementById('countClosed').textContent = resolvidos;
    if(document.getElementById('countStudents')) document.getElementById('countStudents').textContent = inventory.length;

    const total = pendentes + andamento + resolvidos;
    const rate = total === 0 ? 0 : Math.round((resolvidos / total) * 100);
    
    if(document.getElementById('resolutionRateText')) document.getElementById('resolutionRateText').textContent = `${rate}%`;
    if(document.getElementById('resolutionProgressBar')) document.getElementById('resolutionProgressBar').style.width = `${rate}%`;
}

function renderRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if(!container) return;
    
    if (tickets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #8b949e;">Nenhuma atividade</p>';
        return;
    }

    const recent = tickets.slice(-5).reverse();
    container.innerHTML = recent.map(t => `
        <div style="padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between;">
            <div>
                <strong>${sanitizeText(t.student) || 'Anônimo'}</strong> - ${sanitizeText(t.title)}<br>
                <small style="color: #8b949e;">${new Date(t.createdAt).toLocaleString()}</small>
            </div>
            <span style="background: rgba(59, 130, 246, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">${t.status}</span>
        </div>
    `).join('');
}

function renderChart() {
    const ctx = document.getElementById('ticketChart');
    if(!ctx) return;

    const pendentes = tickets.filter(t => t.status === 'Pendente').length;
    const andamento = tickets.filter(t => t.status === 'Em Andamento').length;
    const resolvidos = tickets.filter(t => t.status === 'Resolvido').length;

    if (ticketChartInstance) { ticketChartInstance.destroy(); }

    const hasData = pendentes > 0 || andamento > 0 || resolvidos > 0;
    const data = hasData ? [pendentes, andamento, resolvidos] : [1];
    const bgColors = hasData ? ['#f59e0b', '#3b82f6', '#10b981'] : ['rgba(255,255,255,0.05)'];
    const labels = hasData ? ['Pendentes', 'Em Andamento', 'Resolvidos'] : ['Sem dados'];

    ticketChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, font: { family: "'Inter', sans-serif" } } }
            }
        }
    });
}

// ========== TICKETS (COM ORDENAÇÃO E FILTROS) ==========
function renderTicketsList() {
    loadData();
    const container = document.getElementById('ticketList');
    if(!container) return;
    container.innerHTML = '';

    const searchTerm = document.getElementById('searchGlobal') ? document.getElementById('searchGlobal').value.toLowerCase() : '';

    let filtered = tickets.filter(t => {
        const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all';
        const prioFilter = document.getElementById('filterPriority') ? document.getElementById('filterPriority').value : 'all';
        
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchPrio = prioFilter === 'all' || (t.priority || 'Média') === prioFilter;
        
        const studentName = t.student ? t.student.toLowerCase() : '';
        const titleMatch = t.title ? t.title.toLowerCase() : '';
        const matchSearch = studentName.includes(searchTerm) || titleMatch.includes(searchTerm);

        return matchStatus && matchPrio && matchSearch;
    });

    filtered.sort((a, b) => {
        let valA, valB;
        if (currentSort.column === 'date') {
            valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime();
        } 
        else if (currentSort.column === 'status') {
            const statusWeight = { 'Pendente': 1, 'Em Andamento': 2, 'Resolvido': 3 };
            valA = statusWeight[a.status] || 0; valB = statusWeight[b.status] || 0;
        }
        else if (currentSort.column === 'priority') {
            const prioWeight = { 'Baixa': 1, 'Média': 2, 'Alta': 3, 'Crítica': 4 };
            valA = prioWeight[a.priority || 'Média'] || 0; valB = prioWeight[b.priority || 'Média'] || 0;
        }
        return currentSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum ticket encontrado</td></tr>';
        return;
    }

    filtered.forEach(t => {
        const tr = document.createElement('tr');
        const prioridade = t.priority || 'Média'; 
        const statusBg = t.status === 'Pendente' ? 'rgba(245, 158, 11, 0.2)' : t.status === 'Em Andamento' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)';
        const statusColor = t.status === 'Pendente' ? '#f59e0b' : t.status === 'Em Andamento' ? '#3b82f6' : '#10b981';
        
        tr.innerHTML = `
            <td>${sanitizeText(t.student) || 'Anônimo'}</td>
            <td>${sanitizeText(t.title)}</td>
            <td>${t.category || 'Geral'}</td>
            <td><span class="prio-badge prio-${prioridade}">${prioridade}</span></td>
            <td><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: bold;">${t.status}</span></td>
            <td>${t.assignedTech ? sanitizeText(t.assignedTech.name) : '—'}</td>
            <td>${new Date(t.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--accent);" onclick="openEditTicketModal('${t.id}')">✏️ Atualizar</button>
            </td>
        `;
        container.appendChild(tr);
    });
}

function sortTickets(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc'; 
    }
    renderTicketsList();
}

function openEditTicketModal(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    document.getElementById('editTicketId').value = ticket.id;
    document.getElementById('editTicketStatus').value = ticket.status || 'Pendente';
    
    const prioritySelect = document.getElementById('editTicketPriority');
    Array.from(prioritySelect.options).forEach(opt => {
        if(opt.value === (ticket.priority || 'Média')) opt.selected = true;
    });

    document.getElementById('editTicketModal').classList.remove('hide');
}

function closeEditTicketModal() {
    document.getElementById('editTicketModal').classList.add('hide');
}

function saveTicketEdit() {
    const id = document.getElementById('editTicketId').value;
    const status = document.getElementById('editTicketStatus').value;
    const priority = document.getElementById('editTicketPriority').value;

    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex !== -1) {
        tickets[ticketIndex].status = status;
        tickets[ticketIndex].priority = priority;
        
        saveData();
        renderTicketsList();
        renderDashboard(); 
        showToast(`Ticket atualizado! Prioridade: ${priority}`, 'success');
        closeEditTicketModal();
    }
}

// ========== CHAT COM INTEGRAÇÃO DE INVENTÁRIO ==========
function renderTicketChatList() {
    loadData();
    const container = document.getElementById('ticketChatList');
    if(!container) return;
    container.innerHTML = '';

    if (tickets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #8b949e; padding: 20px;">Nenhum ticket</p>';
        return;
    }

    tickets.forEach(ticket => {
        const item = document.createElement('div');
        item.className = 'ticket-chat-item';
        if (selectedTicketId === ticket.id) item.classList.add('active');

        item.innerHTML = `
            <div class="ticket-chat-item-title">${sanitizeText(ticket.student)}</div>
            <div class="ticket-chat-item-info">
                <span>${sanitizeText(ticket.title).substring(0, 20)}...</span>
                <span class="ticket-chat-item-status">${ticket.status}</span>
            </div>
        `;

        item.addEventListener('click', () => selectTicketChat(ticket.id));
        container.appendChild(item);
    });
}

function selectTicketChat(ticketId) {
    selectedTicketId = ticketId;
    renderTicketChatList();
    showTicketChat(ticketId);
}

function showTicketChat(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    document.getElementById('chatTitle').textContent = `${sanitizeText(ticket.student)} - ${sanitizeText(ticket.title)}`;
    document.getElementById('chatStatus').textContent = ticket.status;

    const btnAccept = document.getElementById('btnAcceptTicket');
    if (ticket.assignedTech) {
        btnAccept.textContent = `✓ Atribuído a ${sanitizeText(ticket.assignedTech.name)}`;
        btnAccept.disabled = true;
    } else {
        btnAccept.textContent = '✓ Aceitar Ticket';
        btnAccept.disabled = false;
    }

    const chatMessages = chats[ticketId]?.messages || [];
    renderMessages(chatMessages);

    // INTEGRAÇÃO: Buscar aluno no inventário e mostrar Painel Lateral
    const panel = document.getElementById('deviceInfoPanel');
    const studentInv = inventory.find(i => i.name.toLowerCase().trim() === ticket.student.toLowerCase().trim());
    
    if(studentInv) {
        const badge = getBadgeClass(studentInv.status);
        panel.innerHTML = `
            <h4 style="font-size: 0.95rem; color:#f8fafc; margin-bottom: 15px;">🔍 Dados do Equipamento</h4>
            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="font-size: 0.8rem; color:#94a3b8; margin-bottom:2px;">S/N (Série):</p>
                <p style="font-weight: bold; color:#f8fafc; margin-bottom:12px; font-family: monospace; font-size:1.1rem;">${studentInv.serial}</p>
                
                <p style="font-size: 0.8rem; color:#94a3b8; margin-bottom:2px;">Turma/Setor:</p>
                <p style="font-weight: bold; color:#f8fafc; margin-bottom:15px;">${studentInv.class || studentInv.turma}</p>
                
                <p style="font-size: 0.8rem; color:#94a3b8; margin-bottom:8px;">Status Físico:</p>
                <span class="badge ${badge}" style="display:inline-block; width:100%; text-align:center;">${studentInv.status}</span>
            </div>
        `;
    } else {
        panel.innerHTML = `
            <h4 style="font-size: 0.95rem; color:#f8fafc; margin-bottom: 15px;">🔍 Dados do Equipamento</h4>
            <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 12px; border: 1px dashed rgba(239, 68, 68, 0.3);">
                <p style="font-size: 0.85rem; color:#fca5a5; text-align:center;">Aluno não localizado no inventário.</p>
            </div>
        `;
    }

    document.getElementById('chatEmpty').classList.add('hide');
    document.getElementById('chatBox').classList.remove('hide');
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    container.innerHTML = '';

    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; margin: auto;">Nenhuma mensagem ainda</p>';
        return;
    }

    messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.type}`;

        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        messageEl.innerHTML = `
            <div>
                <div class="message-bubble">${sanitizeText(msg.text)}</div>
                <div class="message-meta">
                    <span class="message-author">${sanitizeText(msg.author)}</span>
                    <span>${time}</span>
                </div>
            </div>
        `;
        container.appendChild(messageEl);
    });
    container.scrollTop = container.scrollHeight;
}

async function handleSendMessage() {
    if (!selectedTicketId) return;

    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    try {
        if (!chats[selectedTicketId]) chats[selectedTicketId] = { messages: [] };

        const message = {
            id: `msg-${Date.now()}`,
            author: currentTech.name,
            type: 'tech',
            text: sanitizeText(text),
            timestamp: new Date().toISOString()
        };

        chats[selectedTicketId].messages.push(message);
        saveData();

        input.value = '';
        input.focus();

        renderMessages(chats[selectedTicketId].messages);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showToast('Erro ao enviar mensagem!', 'error');
    }
}

async function handleAcceptTicket() {
    if (!selectedTicketId) return;

    const ticket = tickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    if (ticket.assignedTech) {
        showToast(`Este ticket já foi atribuído a: ${ticket.assignedTech.name}`, 'error');
        return;
    }

    try {
        ticket.assignedTech = { id: currentTech.id, name: currentTech.name, assignedAt: new Date().toISOString() };
        ticket.status = 'Em Andamento';

        if (!chats[selectedTicketId]) chats[selectedTicketId] = { messages: [] };

        const message = {
            id: `msg-${Date.now()}`, author: currentTech.name, type: 'tech',
            text: '✓ Aceitei esse chamado e estou analisando.', timestamp: new Date().toISOString()
        };

        chats[selectedTicketId].messages.push(message);
        saveData();

        showTicketChat(selectedTicketId);
        renderTicketsList();
        renderDashboard();

        showToast('Ticket aceito com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao aceitar ticket:', error);
        showToast('Erro ao aceitar ticket!', 'error');
    }
}

// ========== INVENTÁRIO (STATUS, DEVOLUÇÃO E QR CODE) ==========

// Função auxiliar para cores dos novos status
function getBadgeClass(status) {
    if(status === 'Com o Aluno') return 'badge-success';
    if(status === 'Na TI (Manutenção)') return 'badge-warning';
    if(status === 'Disponível (Estoque)') return 'badge-info';
    if(status === 'Extraviado/Roubado') return 'badge-error';
    return 'badge-success'; // Padrão
}

function toggleReturnDate() {
    const status = document.getElementById('invStatus').value;
    const dateContainer = document.getElementById('returnDateContainer');
    const dateInput = document.getElementById('invReturnDate');
    
    if(status === 'Na TI (Manutenção)') {
        dateContainer.style.display = 'block';
    } else {
        dateContainer.style.display = 'none';
        dateInput.value = '';
    }
}

function toggleInventoryForm(forceClose = false) {
    const form = document.getElementById('invFormPanel');
    if (forceClose || form.style.display === 'block') {
        form.style.display = 'none';
        editingStudentId = null;
        
        document.querySelector('#invFormPanel h3').textContent = 'Registrar Inventário';
        document.getElementById('invName').value = '';
        document.getElementById('invStudentId').value = '';
        document.getElementById('invSerial').value = '';
        document.getElementById('invClass').value = '';
        document.getElementById('invStatus').value = '';
        document.getElementById('invReturnDate').value = '';
        toggleReturnDate(); // Reseta visibilidade da data
    } else {
        form.style.display = 'block';
    }
}

function renderInventoryList() {
    loadData();
    const container = document.getElementById('invList');
    if(!container) return;
    container.innerHTML = '';

    const searchTerm = document.getElementById('searchGlobal') ? document.getElementById('searchGlobal').value.toLowerCase() : '';

    const filtered = inventory.filter(item => {
        return (item.name && item.name.toLowerCase().includes(searchTerm)) || 
               (item.studentId && item.studentId.toLowerCase().includes(searchTerm)) ||
               (item.serial && item.serial.toLowerCase().includes(searchTerm)) ||
               (item.class && item.class.toLowerCase().includes(searchTerm));
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #8b949e;">Nenhum registro encontrado</p>';
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inventory-card';
        
        const initials = item.name ? item.name.substring(0, 2).toUpperCase() : '??';
        const badgeClass = getBadgeClass(item.status);
        
        let returnHtml = '';
        if (item.status === 'Na TI (Manutenção)' && item.returnDate) {
            const dateBR = item.returnDate.split('-').reverse().join('/');
            returnHtml = `<p style="font-size:0.75rem; color:#f59e0b; text-align:right; margin-top:5px;">Devolução: <strong>${dateBR}</strong></p>`;
        }

        div.innerHTML = `
            <div class="inv-card-header">
                <div class="inv-avatar">${initials}</div>
                <div>
                    <span class="badge ${badgeClass}">${item.status || 'Desconhecido'}</span>
                    ${returnHtml}
                </div>
            </div>
            <div class="inv-card-body">
                <h4>${sanitizeText(item.name)}</h4>
                <p><span>ID:</span> <strong>${item.studentId}</strong></p>
                <p><span>Turma:</span> <strong>${item.class || item.turma}</strong></p>
                <p><span>S/N:</span> <strong>${item.serial}</strong></p>
            </div>
            <div class="inv-card-actions">
                <button class="btn" onclick="editStudent('${item.id}')" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; flex: 1; padding: 8px; font-size:0.8rem;">Editar</button>
                <button class="btn" onclick="printLabel('${item.id}')" style="background: rgba(255, 255, 255, 0.1); color: #f8fafc; flex: 1; padding: 8px; font-size:0.8rem;">🖨️ Etiqueta</button>
                <button class="btn" onclick="deleteStudent('${item.id}')" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; flex: 1; padding: 8px; font-size:0.8rem;">Apagar</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function editStudent(id) {
    const student = inventory.find(i => i.id === id);
    if (!student) return;
    
    editingStudentId = id;
    
    document.getElementById('invName').value = student.name;
    document.getElementById('invStudentId').value = student.studentId;
    document.getElementById('invSerial').value = student.serial;
    document.getElementById('invClass').value = student.class || student.turma || '';
    
    const statusSelect = document.getElementById('invStatus');
    statusSelect.value = student.status;
    
    const dateInput = document.getElementById('invReturnDate');
    dateInput.value = student.returnDate || '';
    toggleReturnDate();
    
    document.querySelector('#invFormPanel h3').textContent = 'Editar Inventário';
    
    const form = document.getElementById('invFormPanel');
    if (form.style.display === 'none' || form.style.display === '') form.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveStudent() {
    const name = document.getElementById('invName').value.trim();
    const studentId = document.getElementById('invStudentId').value.trim();
    const serial = document.getElementById('invSerial').value.trim();
    const classVal = document.getElementById('invClass').value.trim();
    const status = document.getElementById('invStatus').value;
    const returnDate = document.getElementById('invReturnDate').value;

    if (!name || !studentId || !serial || !classVal || !status) {
        showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
    }

    if (editingStudentId) {
        const index = inventory.findIndex(i => i.id === editingStudentId);
        if (index !== -1) {
            inventory[index] = { ...inventory[index], name, studentId, serial, class: classVal, status, turma: classVal, returnDate };
        }
        showToast('Registro atualizado com sucesso!', 'success');
    } else {
        const newStudent = { id: `inv-${Date.now()}`, name, studentId, serial, class: classVal, status, turma: classVal, returnDate };
        inventory.push(newStudent);
        showToast('Registro salvo com sucesso!', 'success');
    }

    saveData();
    renderInventoryList();
    renderDashboard();
    toggleInventoryForm(true);
}

function deleteStudent(studentId) {
    if (confirm('Tem certeza que deseja remover este registro permanentemente?')) {
        inventory = inventory.filter(i => i.id !== studentId);
        saveData();
        renderInventoryList();
        renderDashboard();
        showToast('Registro apagado!', 'info');
    }
}

// ========== IMPRESSÃO DE ETIQUETA QR CODE ==========
function printLabel(id) {
    const student = inventory.find(i => i.id === id);
    if (!student) return;

    // API Gratuita de QR Code baseada no Serial Number
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SN:${student.serial}`;
    
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div class="label-box">
            <h3>${sanitizeText(student.name)}</h3>
            <p>Turma: ${student.class || student.turma}</p>
            <p>S/N: ${student.serial}</p>
            <img src="${qrUrl}" alt="QR Code">
            <p style="font-size: 12px; font-weight: normal; margin-top:10px;">Suporte TI - TechFlow</p>
        </div>
    `;

    // Dispara a janela de impressão do navegador
    setTimeout(() => {
        window.print();
    }, 300); // pequeno delay pra garantir que o QR Code carregue
}


// ========== BACKUP E RESTAURAÇÃO DE DADOS ==========
function exportData() {
    loadData();
    const backupData = {
        tickets: tickets,
        inventory: inventory,
        chats: chats,
        exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `techflow_backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showToast('Backup exportado com sucesso!', 'success');
}

function importData() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Selecione um arquivo de backup (.json) primeiro.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.tickets && importedData.inventory) {
                if(confirm('Isso apagará os dados atuais e restaurará os dados do arquivo. Deseja continuar?')) {
                    tickets = importedData.tickets;
                    inventory = importedData.inventory;
                    chats = importedData.chats || {};
                    saveData();
                    
                    showToast('Dados restaurados com sucesso! Recarregando...', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                }
            } else {
                showToast('Arquivo de backup inválido ou corrompido.', 'error');
            }
        } catch (error) {
            showToast('Erro ao ler o arquivo. Verifique se é um .json válido.', 'error');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// ========== UTILITÁRIOS ==========
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== INICIALIZAR ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();

}
// ========== ATUALIZAÇÃO EM TEMPO REAL (DASHBOARD DA TI) ==========
window.addEventListener('storage', (e) => {
    
    if (e.key === CONFIG.STORAGE_TICKETS || e.key === CONFIG.STORAGE_INVENTORY || e.key === CONFIG.STORAGE_CHAT) {
        
        loadData(); // Puxa os dados atualizados do banco
        
        // Descobre qual aba o técnico está olhando agora
        let activePage = 'page-dashboard';
        const pageEl = document.querySelector('.page:not(.hide)');
        if(pageEl) activePage = pageEl.id;
        
        // Atualiza a tela de acordo com o que o técnico está visualizando
        if (e.key === CONFIG.STORAGE_TICKETS) {
            if (activePage === 'page-dashboard') renderDashboard();
            if (activePage === 'page-tickets') renderTicketsList();
            showToast('🔔 Novo chamado aberto por um aluno!', 'info');
        }
        
        if (e.key === CONFIG.STORAGE_INVENTORY && activePage === 'page-inventario') {
            renderInventoryList();
        }
        
        if (e.key === CONFIG.STORAGE_CHAT && activePage === 'page-mensagens') {
            renderTicketChatList();
            if (selectedTicketId) showTicketChat(selectedTicketId);
        }
    }
});
// ========== INJETAR DADOS PARA APRESENTAÇÃO ==========
function injectPresentationData() {
    if(!confirm("⚠️ ATENÇÃO: Isso vai apagar seus dados atuais e carregar um banco de dados fictício. Tem certeza?")) {
        return;
    }

    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    const anteontem = new Date(hoje); anteontem.setDate(anteontem.getDate() - 2);

    const techAtual = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TECH)) || { id: "tech-1", name: "Técnico Admin" };

    // 1. INVENTÁRIO FAKE
    const mockInventory = [
        { id: "inv-1", name: "Luiz Cunha", studentId: "ALU-001", serial: "HP-7777", class: "4DP", status: "Com o Aluno" },
        { id: "inv-2", name: "Maria Souza", studentId: "ALU-002", serial: "SAM-1122", class: "2B", status: "Na TI (Manutenção)", returnDate: hoje.toISOString().split('T')[0] },
        { id: "inv-3", name: "João Silva", studentId: "ALU-003", serial: "DELL-9988", class: "3A", status: "Disponível (Estoque)" },
        { id: "inv-4", name: "Ana Clara", studentId: "ALU-004", serial: "ACER-5544", class: "1C", status: "Com o Aluno" },
        { id: "inv-5", name: "Pedro Costa", studentId: "ALU-005", serial: "MAC-3322", class: "3A", status: "Com o Aluno" }
    ];

    // 2. TICKETS FAKE
    const mockTickets = [
        {
            id: "tkt-1", student: "Luiz Cunha", class: "4DP", equipment: "S/N: HP-7777",
            category: "Hardware", title: "O computador não liga", description: "Tentei ligar hoje de manhã e não dá sinal de vida.",
            priority: "Alta", status: "Pendente", createdAt: hoje.toISOString(), assignedTech: null
        },
        {
            id: "tkt-2", student: "Maria Souza", class: "2B", equipment: "S/N: SAM-1122",
            category: "Software", title: "Tablet travando muito", description: "Ao abrir o Teams, o tablet congela e reinicia.",
            priority: "Média", status: "Em Andamento", createdAt: ontem.toISOString(),
            assignedTech: { id: techAtual.id, name: techAtual.name }
        },
        {
            id: "tkt-3", student: "João Silva", class: "3A", equipment: "S/N: DELL-9988",
            category: "Internet", title: "Sem acesso ao Wi-Fi", description: "A rede Edu_Wifi diz senha incorreta.",
            priority: "Média", status: "Resolvido", createdAt: anteontem.toISOString(),
            assignedTech: { id: techAtual.id, name: techAtual.name }
        },
        {
            id: "tkt-4", student: "Ana Clara", class: "1C", equipment: "S/N: ACER-5544",
            category: "Hardware", title: "Teclado com letras falhando", description: "As teclas A, S e D não funcionam.",
            priority: "Baixa", status: "Pendente", createdAt: hoje.toISOString(), assignedTech: null
        }
    ];

    // 3. CHAT FAKE
    const mockChats = {
        "tkt-2": {
            messages: [
                { id: "msg-1", author: "Maria Souza", type: "student", text: "Oi, deixei o tablet aí ontem, já tem previsão?", timestamp: ontem.toISOString() },
                { id: "msg-2", author: techAtual.name, type: "tech", text: "Olá Maria! Estou terminando de formatar ele agora.", timestamp: hoje.toISOString() },
                { id: "msg-3", author: techAtual.name, type: "tech", text: "Pode passar no intervalo para retirar.", timestamp: hoje.toISOString() }
            ]
        },
        "tkt-3": {
            messages: [
                { id: "msg-4", author: techAtual.name, type: "tech", text: "João, resetei sua senha. Tenta logar de novo.", timestamp: anteontem.toISOString() },
                { id: "msg-5", author: "João Silva", type: "student", text: "Deu certo! Muito obrigado.", timestamp: anteontem.toISOString() }
            ]
        }
    };

    // INJETAR NO LOCALSTORAGE
    localStorage.setItem(CONFIG.STORAGE_INVENTORY, JSON.stringify(mockInventory));
    localStorage.setItem(CONFIG.STORAGE_TICKETS, JSON.stringify(mockTickets));
    localStorage.setItem(CONFIG.STORAGE_CHAT, JSON.stringify(mockChats));

    showToast("🚀 Banco de dados injetado com sucesso!", "success");
    
    // Recarregar a página para aplicar
    setTimeout(() => {
        window.location.reload();
    }, 1500);
}
// =====================================================================
// 🚀 BOTÃO MÁGICO DE INJETAR DADOS PARA APRESENTAÇÃO (GERADO VIA JS)
// =====================================================================
(function criarBotaoMagico() {
    // Cria o botão flutuante
    const btn = document.createElement('button');
    btn.innerHTML = '🚀 Criar Banco Teste';
    btn.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: #8b5cf6; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; z-index: 99999; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); transition: 0.3s;';
    
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';

    // Função que roda ao clicar
    btn.onclick = function() {
        if(!confirm("⚠️ Isso vai APAGAR os chamados atuais e criar um banco de dados cheio para sua apresentação. Confirma?")) return;

        const hoje = new Date();
        const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
        const anteontem = new Date(hoje); anteontem.setDate(anteontem.getDate() - 2);

        // 1. INVENTÁRIO FAKE
        const mockInventory = [
            { id: "inv-1", name: "Luiz Cunha", studentId: "ALU-001", serial: "HP-7777", class: "4DP", status: "Com o Aluno" },
            { id: "inv-2", name: "Maria Souza", studentId: "ALU-002", serial: "SAM-1122", class: "2B", status: "Na TI" },
            { id: "inv-3", name: "João Silva", studentId: "ALU-003", serial: "DELL-9988", class: "3A", status: "Disponível" },
            { id: "inv-4", name: "Ana Clara", studentId: "ALU-004", serial: "ACER-5544", class: "1C", status: "Com o Aluno" }
        ];

        // 2. TICKETS FAKE
        const mockTickets = [
            {
                id: "tkt-test-1", student: "Luiz Cunha", class: "4DP", equipment: "S/N: HP-7777",
                category: "Hardware", title: "O computador não liga de jeito nenhum", description: "Tentei ligar hoje de manhã e não dá sinal de vida.",
                priority: "Alta", status: "Pendente", createdAt: hoje.toISOString(), assignedTech: null
            },
            {
                id: "tkt-test-2", student: "Maria Souza", class: "2B", equipment: "S/N: SAM-1122",
                category: "Software", title: "Tablet travando muito", description: "Ao abrir o Teams, o tablet congela e reinicia sozinho.",
                priority: "Média", status: "Em Andamento", createdAt: ontem.toISOString(),
                assignedTech: { id: "tech-1", name: "Técnico Principal" }
            },
            {
                id: "tkt-test-3", student: "João Silva", class: "3A", equipment: "S/N: DELL-9988",
                category: "Internet", title: "Sem acesso ao Wi-Fi", description: "A rede Edu_Wifi diz senha incorreta toda hora.",
                priority: "Média", status: "Resolvido", createdAt: anteontem.toISOString(),
                assignedTech: { id: "tech-1", name: "Técnico Principal" }
            },
            {
                id: "tkt-test-4", student: "Ana Clara", class: "1C", equipment: "S/N: ACER-5544",
                category: "Hardware", title: "Teclado com letras falhando", description: "As teclas A, S e D pararam de funcionar.",
                priority: "Baixa", status: "Pendente", createdAt: hoje.toISOString(), assignedTech: null
            }
        ];

        // 3. CHAT FAKE
        const mockChats = {
            "tkt-test-2": {
                messages: [
                    { id: "m1", author: "Maria Souza", type: "student", text: "Oi, deixei o tablet aí ontem, já tem previsão?", timestamp: ontem.toISOString() },
                    { id: "m2", author: "Técnico Principal", type: "tech", text: "Olá Maria! Estou terminando de formatar ele agora.", timestamp: hoje.toISOString() },
                    { id: "m3", author: "Técnico Principal", type: "tech", text: "Pode passar no intervalo para retirar.", timestamp: hoje.toISOString() }
                ]
            }
        };

        // INJETA FORÇADAMENTE NO NAVEGADOR
        localStorage.setItem('techflow_inventory_v1', JSON.stringify(mockInventory));
        localStorage.setItem('techflow_tickets_v1', JSON.stringify(mockTickets));
        localStorage.setItem('techflow_chat_v1', JSON.stringify(mockChats));

        alert("✅ Banco de Dados de Teste criado com sucesso! A página vai recarregar.");
        window.location.reload();
    };

    // Adiciona o botão na tela
    document.body.appendChild(btn);
})();
