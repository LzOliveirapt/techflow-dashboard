// ========== CONFIGURAÇÃO E CONSTANTES ==========
const CONFIG = {
    PAINEL_URL: 'dashboard.html',
    TECH_USERS_KEY: 'techflow_tech_users',
    MAX_ATTEMPTS: 3,
    LOCKOUT_TIME: 30000, // 30 segundos
    REQUEST_DELAY: 800, // 800ms
};

// ========== ESTADO DA APLICAÇÃO ==========
let appState = {
    tentativas: 0,
    loginBloqueado: false,
    ultimaTentativa: null,
};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    try {
        // Inicializa usuários padrão
        initializeUsers();
        
        // Setup de event listeners
        setupEventListeners();
        
        // Verifica se já está autenticado
        checkExistingSession();
        
        console.log('✓ Sistema de login inicializado com sucesso.');
        console.log('ℹ Credenciais de teste: admin / admin');
    } catch (error) {
        console.error('✗ Erro ao inicializar aplicação:', error);
        showError('Erro ao inicializar. Por favor, recarregue a página.');
    }
}

// ========== USUÁRIOS PADRÃO ==========
function initializeUsers() {
    try {
        const defaultUsers = [
            {
                id: 'paulo',
                name: 'Paulo Barbosa',
                email: 'paulo@techflow.com',
                pass: '123456', // Em produção, usar hash!
                role: 'technician',
                createdAt: new Date().toISOString()
            },
            {
                id: 'luiz',
                name: 'Luiz Cunha',
                email: 'luiz@techflow.com',
                pass: '12345',
                role: 'technician',
                createdAt: new Date().toISOString()
            },
            {
                id: 'admin',
                name: 'Administrador',
                email: 'admin@techflow.com',
                pass: 'admin',
                role: 'admin',
                createdAt: new Date().toISOString()
            },
        ];
        
        localStorage.setItem(CONFIG.TECH_USERS_KEY, JSON.stringify(defaultUsers));
    } catch (error) {
        console.error('Erro ao inicializar usuários:', error);
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    const form = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Submit form
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    // Password toggle
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        togglePasswordBtn.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePasswordVisibility();
            }
        });
    }

    // Enter key no password input
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const form = document.getElementById('loginForm');
                if (form) form.dispatchEvent(new Event('submit'));
            }
        });
    }
}

// ========== TOGGLE PASSWORD VISIBILITY ==========
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePassword');

    if (!passwordInput || !toggleBtn) return;

    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    // Remove classes antigas e adiciona novas
    toggleBtn.classList.remove(isPassword ? 'bi-eye-fill' : 'bi-eye-slash-fill');
    toggleBtn.classList.add(isPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill');
}

// ========== VALIDAÇÃO ==========
function validateInput(username, password) {
    const errors = [];

    // Username validation
    if (!username || username.trim().length === 0) {
        errors.push('Utilizador é obrigatório.');
    } else if (username.length < 3) {
        errors.push('Utilizador deve ter no mínimo 3 caracteres.');
    } else if (!/^[a-z0-9_-]{3,}$/i.test(username)) {
        errors.push('Utilizador contém caracteres inválidos.');
    }

    // Password validation
    if (!password || password.length === 0) {
        errors.push('Palavra-passe é obrigatória.');
    } else if (password.length < 4) {
        errors.push('Palavra-passe deve ter no mínimo 4 caracteres.');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ========== SANITIZAÇÃO ==========
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.trim();
}

// ========== VERIFICAR SESSÃO EXISTENTE ==========
function checkExistingSession() {
    try {
        const currentTech = localStorage.getItem('currentTecnico');
        if (currentTech) {
            const techData = JSON.parse(currentTech);
            console.log(`✓ Sessão ativa encontrada para: ${techData.name}`);
            // Usuário já autenticado - poderia redirecionar automaticamente
        }
    } catch (error) {
        console.warn('Sessão inválida encontrada:', error);
        localStorage.removeItem('currentTecnico');
    }
}

// ========== HANDLE LOGIN ==========
async function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btn-login');
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    // Verifica se está bloqueado
    if (appState.loginBloqueado) {
        showError('Acesso bloqueado. Tente novamente em alguns segundos.');
        return;
    }

    // Validação de entrada
    const validation = validateInput(username, password);
    if (!validation.isValid) {
        showError(validation.errors.join(' '));
        return;
    }

    // Estado de carregamento
    setLoadingState(btnLogin, true);
    clearMessages();

    try {
        // Simula delay de requisição
        await delay(CONFIG.REQUEST_DELAY);

        // Busca usuários do localStorage
        const techUsers = getTechUsers();
        
        // Procura pelo usuário
        const auth = techUsers.find(t => 
            t.id === username && t.pass === password
        );

        if (auth) {
            // Login bem-sucedido
            handleLoginSuccess(auth);
        } else {
            // Login falhou
            handleLoginFailure();
        }
    } catch (error) {
        console.error('Erro durante login:', error);
        showError('Erro ao processar login. Tente novamente.');
        setLoadingState(btnLogin, false);
    }
}

// ========== GET TECH USERS ==========
function getTechUsers() {
    try {
        const users = localStorage.getItem(CONFIG.TECH_USERS_KEY);
        return users ? JSON.parse(users) : [];
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        return [];
    }
}

// ========== LOGIN SUCESSO ==========
function handleLoginSuccess(auth) {
    const btnLogin = document.getElementById('btn-login');

    // Salva dados de sessão
    const sessionData = {
        id: auth.id,
        name: sanitizeInput(auth.name),
        email: sanitizeInput(auth.email),
        role: auth.role,
        loginAt: new Date().toISOString(),
        sessionId: generateSessionId()
    };

    try {
        localStorage.setItem('currentTecnico', JSON.stringify(sessionData));
        
        // Feedback visual
        showSuccess(`Bem-vindo, ${sessionData.name}! Redirecionando...`);
        setLoadingState(btnLogin, false);
        
        // Delay antes de redirecionar
        setTimeout(() => {
            window.location.href = CONFIG.PAINEL_URL;
        }, 1000);

    } catch (error) {
        console.error('Erro ao salvar sessão:', error);
        showError('Erro ao salvar dados. Tente novamente.');
        setLoadingState(btnLogin, false);
    }
}

// ========== LOGIN FALHA ==========
function handleLoginFailure() {
    const btnLogin = document.getElementById('btn-login');
    
    appState.tentativas++;
    appState.ultimaTentativa = Date.now();

    const tentativasRestantes = CONFIG.MAX_ATTEMPTS - appState.tentativas;

    if (tentativasRestantes <= 0) {
        blockLogin();
    } else {
        showError(
            `Credenciais incorretas. Tentativas restantes: ${tentativasRestantes}.`
        );
        resetForm();
    }

    setLoadingState(btnLogin, false);
}

// ========== BLOQUEAR LOGIN ==========
function blockLogin() {
    appState.loginBloqueado = true;
    
    const btnLogin = document.getElementById('btn-login');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Desabilita inputs
    [usernameInput, passwordInput, btnLogin].forEach(el => {
        el.disabled = true;
    });

    showError(
        `Acesso bloqueado por ${CONFIG.LOCKOUT_TIME / 1000} segundos. ` +
        `Tentativas máximas atingidas.`
    );

    // Desbloqueio automático
    const unlockTimer = setTimeout(() => {
        appState.loginBloqueado = false;
        appState.tentativas = 0;
        
        [usernameInput, passwordInput, btnLogin].forEach(el => {
            el.disabled = false;
        });

        clearMessages();
        resetForm();
        
        console.log('✓ Login desbloqueado');
    }, CONFIG.LOCKOUT_TIME);

    // Armazena timer para possível cancelamento
    window.loginBlockTimer = unlockTimer;
}

// ========== RESET FORM ==========
function resetForm() {
    const form = document.getElementById('loginForm');
    const btnLogin = document.getElementById('btn-login');
    const passwordInput = document.getElementById('password');

    if (form) form.reset();
    if (passwordInput) passwordInput.type = 'password';
    
    const toggleBtn = document.getElementById('togglePassword');
    if (toggleBtn) {
        toggleBtn.classList.remove('bi-eye-slash-fill');
        toggleBtn.classList.add('bi-eye-fill');
    }

    setLoadingState(btnLogin, false);
}

// ========== SET LOADING STATE ==========
function setLoadingState(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// ========== MOSTRAR ERRO ==========
function showError(message) {
    const errorEl = document.getElementById('error-msg');
    if (!errorEl) return;

    errorEl.textContent = sanitizeInput(message);
    errorEl.classList.add('show');
    errorEl.setAttribute('aria-live', 'assertive');

    console.warn('⚠ Erro:', message);
}

// ========== MOSTRAR SUCESSO ==========
function showSuccess(message) {
    const successEl = document.getElementById('success-msg');
    if (!successEl) return;

    successEl.textContent = sanitizeInput(message);
    successEl.classList.add('show');
    successEl.setAttribute('aria-live', 'polite');

    console.log('✓ Sucesso:', message);
}

// ========== LIMPAR MENSAGENS ==========
function clearMessages() {
    const errorEl = document.getElementById('error-msg');
    const successEl = document.getElementById('success-msg');

    if (errorEl) {
        errorEl.classList.remove('show');
        errorEl.textContent = '';
    }

    if (successEl) {
        successEl.classList.remove('show');
        successEl.textContent = '';
    }
}

// ========== UTILITÁRIOS ==========
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ========== ERROR BOUNDARY ==========
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showError('Erro inesperado. Por favor, recarregue a página.');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showError('Erro no servidor. Por favor, tente novamente.');
});

// ========== DEBUG MODE ==========
if (window.location.search.includes('debug=true')) {
    console.log('=== DEBUG MODE ATIVADO ===');
    console.log('Usuários disponíveis:', getTechUsers());
}