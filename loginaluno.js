// ========== CONFIGURAÇÃO ========== 
const CONFIG = {
    STORAGE_TICKETS: 'techflow_tickets_v1',
    STORAGE_INVENTORY: 'techflow_inventory_v1',
    STORAGE_SESSION: 'techflow_aluno_session',
    PORTAL_PAGE: 'pagealunos.html',      // 🔧 CORRIGIDO: redireciona para portal de tickets
    LOGIN_PAGE: 'loginaluno.html',       // 🔧 CORRIGIDO: página de login do aluno
    REQUEST_DELAY: 800, // ms
};

// ========== ESTADO GLOBAL ==========
const appState = {
    isLoading: false,
    currentUser: null,
};

// ========== UTILITÁRIOS ==========
/**
 * Gera um ID único e seguro
 * @returns {string} ID único
 */
function generateSecureId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}

/**
 * Sanitiza string para evitar XSS
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeHTML(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Delay assíncrono
 * @param {number} ms - Milissegundos
 * @returns {Promise}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula uma requisição
 * @returns {Promise}
 */
async function simulateRequest() {
    await delay(CONFIG.REQUEST_DELAY);
}

// ========== STORAGE ==========
/**
 * Obtém tickets do localStorage
 * @returns {Array} Array de tickets
 */
function getTickets() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_TICKETS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Erro ao carregar tickets:', error);
        return [];
    }
}

/**
 * Salva tickets no localStorage
 * @param {Array} tickets - Array de tickets
 */
function saveTickets(tickets) {
    try {
        localStorage.setItem(CONFIG.STORAGE_TICKETS, JSON.stringify(tickets));
    } catch (error) {
        console.error('Erro ao salvar tickets:', error);
        throw new Error('Falha ao salvar dados');
    }
}

/**
 * Obtém inventário do localStorage
 * @returns {Array} Array de inventário
 */
function getInventory() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_INVENTORY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Erro ao carregar inventário:', error);
        return [];
    }
}

/**
 * Obtém sessão do localStorage
 * @returns {Object|null} Dados da sessão
 */
function getSession() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_SESSION);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        return null;
    }
}

/**
 * Salva sessão no localStorage
 * @param {Object} session - Dados da sessão
 */
function saveSession(session) {
    try {
        localStorage.setItem(CONFIG.STORAGE_SESSION, JSON.stringify(session));
    } catch (error) {
        console.error('Erro ao salvar sessão:', error);
        throw new Error('Falha ao salvar sessão');
    }
}

// ========== LOGIN ==========
const loginForm = document.getElementById('studentLoginForm');

if (loginForm) {
    loginForm.addEventListener('submit', handleStudentLogin);

    // Enter key
    document.querySelectorAll('#studentName, #studentNumber, #studentClass').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleStudentLogin(new Event('submit'));
            }
        });
    });
}

/**
 * Handler para login do aluno
 * @param {Event} e - Evento do formulário
 */
async function handleStudentLogin(e) {
    e.preventDefault();

    try {
        if (appState.isLoading) return;

        // Elementos do DOM
        const nameInput = document.getElementById('studentName');
        const numberInput = document.getElementById('studentNumber');
        const classInput = document.getElementById('studentClass');
        const errorEl = document.getElementById('studentLoginError');
        const successEl = document.getElementById('studentLoginSuccess');
        const submitBtn = document.getElementById('submitBtn');

        // Validação básica
        const validation = validateLoginForm(nameInput, numberInput, classInput);
        if (!validation.valid) {
            showError(errorEl, validation.error);
            return;
        }

        // Limpar erros anteriores
        clearMessages(errorEl, successEl);

        // Estado loading
        setLoading(submitBtn, true);
        appState.isLoading = true;

        // Simular requisição
        await simulateRequest();

        // Obter dados
        const inputName = sanitizeHTML(nameInput.value.trim());
        const inputNumber = sanitizeHTML(numberInput.value.trim().toLowerCase());
        const inputClass = sanitizeHTML(classInput.value.trim());

        // Validar contra inventário
        const inventory = getInventory();
        const studentInInventory = inventory.find(item =>
            sanitizeHTML(item.name).toLowerCase() === inputName.toLowerCase() &&
            (sanitizeHTML(item.id).toLowerCase() === inputNumber ||
                sanitizeHTML(item.serial).toLowerCase() === inputNumber)
        );

        // Validar
        const isValid = studentInInventory || isDefaultStudent(inputName, inputNumber);

        if (isValid) {
            // Preparar dados de sessão
            const sessionData = {
                id: studentInInventory ? sanitizeHTML(studentInInventory.id) : inputNumber,
                name: studentInInventory ? sanitizeHTML(studentInInventory.name) : inputName,
                turma: studentInInventory ? sanitizeHTML(studentInInventory.turma) : inputClass,
                loginAt: new Date().toISOString(),
                sessionId: generateSecureId()
            };

            // Salvar sessão
            saveSession(sessionData);

            // Sucesso
            showSuccess(successEl, 'Login realizado com sucesso!');
            
            // 🔧 CORRIGIDO: Redirecionar para portal de tickets após delay
            setTimeout(() => {
                window.location.href = CONFIG.PORTAL_PAGE;
            }, 1000);

        } else {
            // Erro de autenticação
            const card = document.querySelector('.login-card');
            card.classList.remove('shake');
            void card.offsetWidth; // Força reflow
            card.classList.add('shake');

            showError(errorEl, 'Acesso negado. Verifique seus dados.');
        }

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        showError(
            document.getElementById('studentLoginError'),
            'Erro ao processar login. Tente novamente.'
        );
    } finally {
        setLoading(document.getElementById('submitBtn'), false);
        appState.isLoading = false;
    }
}

/**
 * Valida formulário de login
 * @param {HTMLElement} nameInput - Input de nome
 * @param {HTMLElement} numberInput - Input de matrícula
 * @param {HTMLElement} classInput - Input de turma
 * @returns {Object} Resultado da validação
 */
function validateLoginForm(nameInput, numberInput, classInput) {
    const name = nameInput.value.trim();
    const number = numberInput.value.trim();
    const classVal = classInput.value.trim();

    if (!name || !number || !classVal) {
        return { valid: false, error: 'Por favor, preencha todos os campos.' };
    }

    if (name.length < 3) {
        return { valid: false, error: 'Nome deve ter no mínimo 3 caracteres.' };
    }

    if (number.length < 2) {
        return { valid: false, error: 'Matrícula deve ter no mínimo 2 caracteres.' };
    }

    if (classVal.length < 1) {
        return { valid: false, error: 'Por favor, digite sua turma.' };
    }

    return { valid: true };
}

/**
 * Verifica se é um aluno padrão (para testes)
 * @param {string} name - Nome do aluno
 * @param {string} number - Matrícula do aluno
 * @returns {boolean}
 */
function isDefaultStudent(name, number) {
    return name.toLowerCase() === 'luiz cunha' && number === 'a416032';
}

/**
 * Mostra mensagem de erro
 * @param {HTMLElement} errorEl - Elemento de erro
 * @param {string} message - Mensagem
 */
function showError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = sanitizeHTML(message);
    errorEl.classList.remove('hidden');
    errorEl.classList.add('show');
}

/**
 * Mostra mensagem de sucesso
 * @param {HTMLElement} successEl - Elemento de sucesso
 * @param {string} message - Mensagem
 */
function showSuccess(successEl, message) {
    if (!successEl) return;
    successEl.textContent = sanitizeHTML(message);
    successEl.classList.remove('hidden');
    successEl.classList.add('show');
}

/**
 * Limpa mensagens
 * @param {HTMLElement} errorEl - Elemento de erro
 * @param {HTMLElement} successEl - Elemento de sucesso
 */
function clearMessages(errorEl, successEl) {
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
        errorEl.classList.remove('show');
    }
    if (successEl) {
        successEl.textContent = '';
        successEl.classList.add('hidden');
        successEl.classList.remove('show');
    }
}

/**
 * Define estado de loading
 * @param {HTMLElement} button - Botão
 * @param {boolean} isLoading - Estado
 */
function setLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// ========== PROTEÇÃO DE ROTA (PORTAL) ==========
/**
 * Verifica autenticação no portal
 */
function checkPortalAuthentication() {
    try {
        const session = getSession();

        if (!session || !session.id || !session.name || !session.turma) {
            // Session inválida
            console.warn('Session inválida');
            localStorage.removeItem(CONFIG.STORAGE_SESSION);
            window.location.href = CONFIG.LOGIN_PAGE;
            return false;
        }

        appState.currentUser = session;
        return true;

    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem(CONFIG.STORAGE_SESSION);
        window.location.href = CONFIG.LOGIN_PAGE;
        return false;
    }
}

// ========== PORTAL FUNCTIONS ==========
/**
 * Renderiza lista de tickets
 */
function renderPortalTickets() {
    try {
        if (!appState.currentUser) return;

        const tickets = getTickets();
        const myTickets = tickets.filter(t =>
            sanitizeHTML(t.studentID).toLowerCase() === sanitizeHTML(appState.currentUser.id).toLowerCase()
        );

        const container = document.getElementById('studentTicketList');
        if (!container) return;

        container.innerHTML = '';

        if (myTickets.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <p>📭 Nenhum ticket aberto</p>
                </div>
            `;
            return;
        }

        myTickets.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'card-ticket';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.style.cursor = 'pointer';

            const statusClass = `status-${sanitizeHTML(ticket.status).toLowerCase()}`;
            const date = new Date(ticket.createdAt).toLocaleDateString('pt-BR');

            card.innerHTML = `
                <div class="card-info">
                    <small style="color: var(--accent);">
                        ${sanitizeHTML(ticket.category || 'Geral').toUpperCase()}
                    </small>
                    <h4>${sanitizeHTML(ticket.title)}</h4>
                    <span class="card-date">${date}</span>
                </div>
                <span class="status-dot status-${statusClass}">
                    ${sanitizeHTML(ticket.status)}
                </span>
            `;

            card.addEventListener('click', () => showPortalModal(ticket));
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    showPortalModal(ticket);
                }
            });

            container.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao renderizar tickets:', error);
    }
}

/**
 * Mostra modal de detalhes
 * @param {Object} ticket - Ticket
 */
function showPortalModal(ticket) {
    try {
        const titleEl = document.getElementById('detailTitle');
        const descEl = document.getElementById('detailDesc');
        const statusEl = document.getElementById('detailStatus');
        const priorityEl = document.getElementById('detailPriority');
        const dateEl = document.getElementById('detailDate');
        const techEl = document.getElementById('detailTech');
        const modal = document.getElementById('detailModal');

        if (!titleEl || !modal) return;

        titleEl.textContent = sanitizeHTML(ticket.title);
        descEl.textContent = sanitizeHTML(ticket.description);
        dateEl.textContent = new Date(ticket.createdAt).toLocaleString('pt-BR');
        techEl.textContent = sanitizeHTML(ticket.technician || 'Aguardando designação...');

        if (statusEl) {
            statusEl.className = `status-dot status-${sanitizeHTML(ticket.status).toLowerCase()}`;
            statusEl.textContent = sanitizeHTML(ticket.status);
        }

        if (priorityEl) {
            priorityEl.className = `status-dot status-${sanitizeHTML(ticket.priority || 'pendente').toLowerCase()}`;
            priorityEl.textContent = sanitizeHTML(ticket.priority || 'Normal');
        }

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');

    } catch (error) {
        console.error('Erro ao abrir modal:', error);
    }
}

/**
 * Cria novo ticket
 */
function createPortalTicket() {
    try {
        if (!appState.currentUser) return;

        const titleEl = document.getElementById('tTitle');
        const descEl = document.getElementById('tDesc');
        const categoryEl = document.getElementById('tCategory');

        if (!titleEl || !descEl) return;

        const title = sanitizeHTML(titleEl.value.trim());
        const desc = sanitizeHTML(descEl.value.trim());
        const category = categoryEl ? sanitizeHTML(categoryEl.value) : 'Geral';

        if (!title || !desc) {
            alert('Por favor, preencha o título e a descrição!');
            return;
        }

        const newTicket = {
            id: `TK-${generateSecureId()}`,
            studentID: appState.currentUser.id,
            student: appState.currentUser.name,
            turma: appState.currentUser.turma,
            title,
            description: desc,
            category,
            status: 'Pendente',
            priority: 'Normal',
            comments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const tickets = getTickets();
        tickets.unshift(newTicket);
        saveTickets(tickets);

        // Reset
        titleEl.value = '';
        descEl.value = '';
        if (document.getElementById('charCounter')) {
            document.getElementById('charCounter').textContent = '0/300';
        }

        renderPortalTickets();
        alert('Ticket criado com sucesso!');

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        alert('Erro ao criar ticket!');
    }
}

/**
 * Fecha modal
 */
function closePortalModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Logout do aluno
 */
function handlePortalLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem(CONFIG.STORAGE_SESSION);
        // 🔧 CORRIGIDO: Redireciona para página de login do aluno
        window.location.href = CONFIG.LOGIN_PAGE;
    }
}

// ========== INICIALIZAÇÃO DO PORTAL ==========
if (window.location.pathname.includes(CONFIG.PORTAL_PAGE)) {
    document.addEventListener('DOMContentLoaded', function() {
        if (!checkPortalAuthentication()) return;

        // Setup portal
        const alunoInfoEl = document.getElementById('alunoInfo');
        if (alunoInfoEl) {
            alunoInfoEl.textContent = `${sanitizeHTML(appState.currentUser.name)} • ${sanitizeHTML(appState.currentUser.turma)}`;
        }

        // Event listeners
        const createBtn = document.getElementById('createStudentTicket');
        if (createBtn) {
            createBtn.addEventListener('click', createPortalTicket);
        }

        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', closePortalModal);
        }

        const logoutBtn = document.getElementById('logoutStudent');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handlePortalLogout);
        }

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closePortalModal();
            }
        });

        // Modal - Click outside
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closePortalModal();
                }
            });
        }

        // Renderizar
        renderPortalTickets();
    });
}

// ========== ERROR HANDLER ==========
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled rejection:', event.reason);
});