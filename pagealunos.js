const CONFIG = {
    STORAGE_TICKETS: 'techflow_tickets_v1',
    STORAGE_INVENTORY: 'techflow_inventory_v1',
    STORAGE_SESSION: 'currentAluno',
    STORAGE_CHAT: 'techflow_chat_v1',
    STORAGE_THEME: 'techflow_theme' // NOVO: Guarda o tema
};

// SIMULAÇÃO DE LOGIN BÁSICA
if (!localStorage.getItem(CONFIG.STORAGE_SESSION)) {
    const mockStudent = { id: "ALU-001", name: "Luiz Cunha", turma: "4DP" };
    localStorage.setItem(CONFIG.STORAGE_SESSION, JSON.stringify(mockStudent));
}

const currentUser = JSON.parse(localStorage.getItem(CONFIG.STORAGE_SESSION));
let tempImageBase64 = null;
let currentFilter = 'Todos';
let selectedChatTicketId = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Aplica o tema salvo no navegador
    
    document.getElementById('alunoInfo').textContent = `${currentUser.name} • ${currentUser.turma}`;
    document.getElementById('fName').value = currentUser.name;
    document.getElementById('fClass').value = currentUser.turma;

    loadInventoryEquipment();
    setupEvents();
    renderTickets();
    checkChatAccess();
});

// LÓGICA DO TEMA (CLARO/ESCURO)
function initTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_THEME) || 'dark';
    document.getElementById('themeSelect').value = savedTheme;
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.remove('theme-light');
    }
}

// PUXAR EQUIPAMENTOS DO INVENTÁRIO
function loadInventoryEquipment() {
    const equipSelect = document.getElementById('tEquipment');
    try {
        const invData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_INVENTORY) || '[]');
        const myDevices = invData.filter(item => 
            (item.name && item.name.toLowerCase() === currentUser.name.toLowerCase()) || 
            (item.studentId === currentUser.id)
        );

        equipSelect.innerHTML = '<option value="" disabled selected>-- Selecione o equipamento --</option>';

        myDevices.forEach(dev => {
            const opt = document.createElement('option');
            opt.value = `S/N: ${dev.serial}`;
            opt.textContent = `💻 Meu PC (S/N: ${dev.serial})`;
            equipSelect.appendChild(opt);
        });

        const otherOpt = document.createElement('option');
        otherOpt.value = 'Outro / Não Listado';
        otherOpt.textContent = '🔌 Outro equipamento / Problema na sala';
        equipSelect.appendChild(otherOpt);

    } catch (e) {
        console.error("Erro ao carregar inventário", e);
    }
}

// EVENTOS GERAIS DA PÁGINA
function setupEvents() {
    // Configurações e Tema
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        const selected = e.target.value;
        localStorage.setItem(CONFIG.STORAGE_THEME, selected);
        applyTheme(selected);
    });

    // Contador
    document.getElementById('tDesc').addEventListener('input', function() {
        document.getElementById('charCounter').textContent = `${this.value.length}/300`;
    });

    // Upload
    const fileInput = document.getElementById('tPhoto');
    const fileNameSpan = document.getElementById('fileName');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) {
            fileNameSpan.textContent = "Nenhum ficheiro selecionado";
            document.getElementById('photoPreviewContainer').style.display = 'none';
            tempImageBase64 = null;
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast("O arquivo é muito grande. Máximo 2MB.", "error");
            this.value = "";
            return;
        }

        fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            tempImageBase64 = event.target.result;
            document.getElementById('detailPhoto').src = tempImageBase64;
            document.getElementById('photoPreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // Submissão
    document.getElementById('createStudentTicket').addEventListener('click', handleCreateTicket);

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderTickets();
        });
    });

    // Modais
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('detailModal').classList.add('hidden');
    });

    document.getElementById('btnSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
    });

    document.getElementById('closeSettingsModal').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });

    document.getElementById('btnClearLocal').addEventListener('click', () => {
        if(confirm("Apagar todos os dados locais?")){
            localStorage.clear();
            window.location.reload();
        }
    });

    document.getElementById('logoutStudent').addEventListener('click', () => {
        if(confirm("Sair do portal?")) {
            localStorage.removeItem(CONFIG.STORAGE_SESSION);
            window.location.reload();
        }
    });

    // Chat Events
    document.getElementById('btnChat').addEventListener('click', () => {
        document.getElementById('mainContainer').classList.add('hide');
        document.getElementById('chatView').classList.remove('hide');
        renderChatTicketList();
    });

    document.getElementById('btnBackChat').addEventListener('click', () => {
        document.getElementById('chatView').classList.add('hide');
        document.getElementById('mainContainer').classList.remove('hide');
        selectedChatTicketId = null;
    });

    document.getElementById('btnSendMessageStudent').addEventListener('click', handleSendChatMessage);
    document.getElementById('messageInputStudent').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleSendChatMessage();
    });
}

// CRIAÇÃO DO TICKET
function handleCreateTicket() {
    const equipment = document.getElementById('tEquipment').value;
    const category = document.getElementById('tCategory').value;
    const title = document.getElementById('tTitle').value.trim();
    const desc = document.getElementById('tDesc').value.trim();
    const impactRadio = document.querySelector('input[name="tImpact"]:checked');

    if (!equipment || !category || !title || !desc || !impactRadio) {
        showToast("Preencha todos os campos obrigatórios (*)", "error");
        return;
    }

    const priority = impactRadio.value;

    const newTicket = {
        id: `tkt-${Date.now()}`,
        student: currentUser.name,
        class: currentUser.turma,
        equipment: equipment,
        category: category,
        title: title,
        description: desc,
        priority: priority,
        status: 'Pendente',
        photo: tempImageBase64,
        createdAt: new Date().toISOString()
    };

    const tickets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TICKETS) || '[]');
    tickets.push(newTicket);
    localStorage.setItem(CONFIG.STORAGE_TICKETS, JSON.stringify(tickets));

    // Reset Form
    document.getElementById('tEquipment').value = "";
    document.getElementById('tCategory').value = "";
    document.getElementById('tTitle').value = "";
    document.getElementById('tDesc').value = "";
    document.getElementById('tPhoto').value = "";
    document.getElementById('fileName').textContent = "Nenhum ficheiro selecionado";
    document.getElementById('photoPreviewContainer').style.display = 'none';
    document.getElementById('charCounter').textContent = "0/300";
    impactRadio.checked = false;
    tempImageBase64 = null;

    showToast("✅ Ticket enviado com sucesso!", "success");
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="Todos"]').classList.add('active');
    currentFilter = 'Todos';
    renderTickets();
}

// RENDERIZAR LISTA E MODAL
function renderTickets() {
    const tickets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TICKETS) || '[]');
    let myTickets = tickets.filter(t => t.student === currentUser.name);

    if (currentFilter !== 'Todos') {
        myTickets = myTickets.filter(t => t.status === currentFilter);
    }

    myTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const container = document.getElementById('studentTicketList');
    container.innerHTML = '';

    if (myTickets.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px 0;">Nenhum ticket encontrado.</p>';
        return;
    }

    myTickets.forEach(t => {
        const card = document.createElement('div');
        card.className = 'card-ticket';
        const date = new Date(t.createdAt).toLocaleDateString('pt-BR');
        const statusClass = `status-${t.status.toLowerCase().replace(/\s+/g, '-')}`;

        card.innerHTML = `
            <div class="card-info">
                <small>${t.category} - ${t.equipment.split(' ')[0]}</small>
                <h4>${t.title}</h4>
                <span class="card-date">${date}</span>
            </div>
            <span class="status-dot ${statusClass}">${t.status}</span>
        `;
        card.addEventListener('click', () => showModal(t));
        container.appendChild(card);
    });
}

function showModal(ticket) {
    document.getElementById('detailTitle').textContent = ticket.title;
    document.getElementById('detailCategoryBadge').textContent = `📂 ${ticket.category}`;
    document.getElementById('detailDesc').textContent = ticket.description;
    document.getElementById('detailEquipment').textContent = ticket.equipment || "Não informado";

    const statusClass = `status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`;
    document.getElementById('detailStatus').className = `status-dot ${statusClass}`;
    document.getElementById('detailStatus').textContent = ticket.status;

    document.getElementById('detailPriority').textContent = ticket.priority || 'Média';
    document.getElementById('detailPriority').className = 'status-dot';
    if(ticket.priority === 'Alta') document.getElementById('detailPriority').classList.add('status-pendente');
    else document.getElementById('detailPriority').classList.add('status-em-andamento');

    document.getElementById('detailTech').textContent = ticket.assignedTech ? `👨‍💻 ${ticket.assignedTech.name}` : 'Aguardando atribuição';

    if (ticket.photo) {
        document.getElementById('detailPhotoModal').src = ticket.photo;
        document.getElementById('photoPreviewContainerModal').style.display = 'block';
    } else {
        document.getElementById('photoPreviewContainerModal').style.display = 'none';
    }

    const steps = [
        { status: 'Pendente', label: 'Na Fila' },
        { status: 'Em Andamento', label: 'Em Análise' },
        { status: 'Resolvido', label: 'Concluído' }
    ];
    
    let isPast = true;
    document.getElementById('ticketTimeline').innerHTML = steps.map(s => {
        let activeClass = '';
        if (s.status === ticket.status) { activeClass = 'active'; isPast = false; }
        else if (isPast) { activeClass = 'active'; }
        return `<div class="timeline-step ${activeClass}">${s.label}</div>`;
    }).join('');

    document.getElementById('detailModal').classList.remove('hidden');
}

// ========== LÓGICA DO CHAT ==========
function checkChatAccess() {
    const tickets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TICKETS) || '[]');
    const hasAssigned = tickets.some(t => t.student === currentUser.name && t.assignedTech);
    if (hasAssigned) {
        document.getElementById('btnChat').style.display = 'inline-flex';
    }
}

function renderChatTicketList() {
    const chats = JSON.parse(localStorage.getItem(CONFIG.STORAGE_CHAT) || '{}');
    const tickets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TICKETS) || '[]');
    const myActiveTickets = tickets.filter(t => t.student === currentUser.name && t.assignedTech);

    const list = document.getElementById('ticketChatListStudent');
    list.innerHTML = '';

    if (myActiveTickets.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-size:12px;">Nenhum chamado com técnico.</p>';
        return;
    }

    myActiveTickets.forEach(t => {
        const item = document.createElement('div');
        item.className = 'ticket-chat-item-student';
        
        item.innerHTML = `
            <div class="ticket-chat-item-title-student">${t.title.substring(0, 25)}</div>
            <div class="status-dot status-${t.status.toLowerCase().replace(/\s+/g, '-')}">${t.status}</div>
        `;
        item.addEventListener('click', () => selectTicketChat(t.id, chats));
        list.appendChild(item);
    });
}

function selectTicketChat(ticketId, chatsObj) {
    selectedChatTicketId = ticketId;
    const tickets = JSON.parse(localStorage.getItem(CONFIG.STORAGE_TICKETS) || '[]');
    const ticket = tickets.find(t => t.id === ticketId);
    
    document.getElementById('chatTitleStudent').textContent = ticket.title;
    document.getElementById('chatStatusStudent').textContent = ticket.status;
    document.getElementById('chatTechStudent').textContent = ticket.assignedTech.name;

    const chatData = chatsObj[ticketId] || { messages: [] };
    renderChatMessages(chatData.messages);

    document.getElementById('chatEmptyStudent').classList.add('hide');
    document.getElementById('chatBoxStudent').classList.remove('hide');
}

function renderChatMessages(messages) {
    const container = document.getElementById('messagesContainerStudent');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Sem mensagens. Diga olá!</p>';
        return;
    }

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message-student from-${msg.type}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        
        div.innerHTML = `
            <div class="message-bubble-student">${msg.text}</div>
            <div class="message-meta-student">
                <strong>${msg.author}</strong> • ${time}
            </div>
        `;
        container.appendChild(div);
    });
    
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function handleSendChatMessage() {
    if (!selectedChatTicketId) return;
    const input = document.getElementById('messageInputStudent');
    const text = input.value.trim();
    if(!text) return;

    const chatsObj = JSON.parse(localStorage.getItem(CONFIG.STORAGE_CHAT) || '{}');
    if (!chatsObj[selectedChatTicketId]) {
        chatsObj[selectedChatTicketId] = { messages: [] };
    }

    chatsObj[selectedChatTicketId].messages.push({
        id: `msg-${Date.now()}`,
        author: currentUser.name,
        type: 'student', 
        text: text,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem(CONFIG.STORAGE_CHAT, JSON.stringify(chatsObj));
    input.value = '';
    renderChatMessages(chatsObj[selectedChatTicketId].messages);
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);

}
// ========== ATUALIZAÇÃO EM TEMPO REAL (CROSS-TAB) ==========
// Fica "espiando" se o técnico atualizou o status ou mandou mensagem
window.addEventListener('storage', (e) => {
    
    // Se o técnico atualizou o status do ticket do aluno
    if (e.key === CONFIG.STORAGE_TICKETS) {
        renderTickets(); // Atualiza a lista e as cores de status na hora
        checkChatAccess(); // Se o técnico aceitou, libera o botão de chat na hora
    }
    
    // Se o técnico mandou uma mensagem no chat
    if (e.key === CONFIG.STORAGE_CHAT) {
        const chatViewOpen = !document.getElementById('chatView').classList.contains('hide');
        
        // Se o aluno estiver com o chat aberto, a mensagem aparece pipocando na tela
        if (chatViewOpen) {
            renderChatTicketList();
            if (selectedChatTicketId) {
                const chatsObj = JSON.parse(localStorage.getItem(CONFIG.STORAGE_CHAT) || '{}');
                renderChatMessages(chatsObj[selectedChatTicketId]?.messages || []);
            }
        } else {
            // Se ele estiver fora do chat, avisa que chegou mensagem
            showToast('💬 Nova mensagem da TI!', 'success');
        }
    }
});
