(function() {
    'use strict';

    //==============================================================================
    // CONFIGURATION
    //==============================================================================

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        REMEMBER_EMAIL: 'pesasmart_remember_email',
        REMEMBER_TOKEN: 'pesasmart_remember_token',
        LOGIN_ATTEMPTS: 'pesasmart_login_attempts'
    };

    const SESSION_DURATION = {
        DEFAULT: 24 * 60 * 60 * 1000, // 24 hours
        REMEMBER_ME: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

    //==============================================================================
    // STATE MANAGEMENT
    //==============================================================================

    const AppState = {
        loginAttempts: 0,
        lockoutUntil: null,
        isLoading: false,

        initialize() {
            this.loadLoginAttempts();
            this.checkExistingSession();
        },

        loadLoginAttempts() {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
                if (data) {
                    const parsed = JSON.parse(data);
                    this.loginAttempts = parsed.attempts || 0;
                    this.lockoutUntil = parsed.lockoutUntil || null;
                }
            } catch (e) {
                console.warn('Failed to load login attempts:', e);
            }
        },

        saveLoginAttempts() {
            try {
                localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify({
                    attempts: this.loginAttempts,
                    lockoutUntil: this.lockoutUntil
                }));
            } catch (e) {
                console.warn('Failed to save login attempts:', e);
            }
        },

        incrementLoginAttempts() {
            this.loginAttempts++;
            if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                this.lockoutUntil = Date.now() + LOCKOUT_DURATION;
            }
            this.saveLoginAttempts();
        },

        resetLoginAttempts() {
            this.loginAttempts = 0;
            this.lockoutUntil = null;
            localStorage.removeItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
        },

        isLockedOut() {
            if (this.lockoutUntil && Date.now() < this.lockoutUntil) return true;
            if (this.lockoutUntil && Date.now() >= this.lockoutUntil) {
                this.resetLoginAttempts();
            }
            return false;
        },

        getLockoutTimeRemaining() {
            if (!this.lockoutUntil) return 0;
            return Math.max(0, this.lockoutUntil - Date.now());
        },

        checkExistingSession() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!session) return false;

            try {
                const sessionData = JSON.parse(session);
                if (sessionData.expires && sessionData.expires > Date.now()) {
                    const returnUrl = this.getReturnUrl();
                    window.location.href = returnUrl || 'index.html';
                    return true;
                }
                localStorage.removeItem(STORAGE_KEYS.SESSION);
            } catch (e) {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
            }
            return false;
        },

        getReturnUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            
            const allowedUrls = ['index.html', 'profile.html', 'learn.html', 'practice.html', 'act.html'];
            if (redirect && allowedUrls.includes(redirect)) {
                return redirect;
            }
            return null;
        }
    };

    //==============================================================================
    // UI COMPONENTS
    //==============================================================================

    const UI = {
        showLoading() {
            AppState.isLoading = true;
            const loginBtn = document.querySelector('button[type="submit"]');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
            }
        },

        hideLoading() {
            AppState.isLoading = false;
            const loginBtn = document.querySelector('button[type="submit"]');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'Log In';
            }
        },

        showNotification(message, type = 'info', duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
            } text-white font-medium`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('animate-slide-out');
                setTimeout(() => toast.remove(), 500);
            }, duration);
        },

        showFieldError(fieldId, message) {
            const field = document.getElementById(fieldId);
            if (!field) return;

            field.classList.add('border-red-500');
            
            const container = field.closest('.mb-6');
            if (!container) return;

            let errorEl = container.querySelector('.field-error');
            if (!errorEl) {
                errorEl = document.createElement('p');
                errorEl.className = 'field-error text-red-600 text-sm mt-1';
                container.appendChild(errorEl);
            }
            errorEl.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i>${message}`;
        },

        clearFieldError(fieldId) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.remove('border-red-500');
                const container = field.closest('.mb-6');
                if (container) {
                    const errorEl = container.querySelector('.field-error');
                    if (errorEl) errorEl.remove();
                }
            }
        },

        setupPasswordToggle() {
            const toggleBtn = document.querySelector('.relative button');
            const passwordInput = document.getElementById('password');
            
            if (toggleBtn && passwordInput) {
                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    
                    const icon = toggleBtn.querySelector('i');
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                });
            }
        },

        setupRealTimeValidation() {
            const emailInput = document.getElementById('email');
            
            if (emailInput) {
                emailInput.addEventListener('input', () => {
                    if (emailInput.value.length > 0) {
                        const isValid = this.validateEmail(emailInput.value);
                        if (isValid) {
                            emailInput.classList.remove('border-red-500');
                            emailInput.classList.add('border-green-500');
                        } else {
                            emailInput.classList.remove('border-green-500');
                            emailInput.classList.add('border-red-500');
                        }
                    } else {
                        emailInput.classList.remove('border-green-500', 'border-red-500');
                    }
                });
            }
        },

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        loadRememberedEmail() {
            const rememberedEmail = localStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL);
            const rememberCheckbox = document.getElementById('remember');
            
            if (rememberedEmail && rememberCheckbox) {
                document.getElementById('email').value = rememberedEmail;
                rememberCheckbox.checked = true;
            }
        },

        handleUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            
            const email = urlParams.get('email');
            if (email) {
                document.getElementById('email').value = email;
            }
            
            if (urlParams.get('registered') === 'success') {
                this.showNotification('Registration successful! Please login.', 'success');
            }
            
            if (urlParams.get('expired') === 'true') {
                this.showNotification('Your session has expired. Please login again.', 'warning');
            }
            
            if (urlParams.get('logout') === 'success') {
                this.showNotification('You have been logged out successfully.', 'info');
            }
        },

        showLockoutMessage(remainingMinutes) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 animate-fade-in">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-lock text-red-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">Account Locked</h3>
                        <p class="text-gray-600">Too many failed login attempts. Please try again in ${remainingMinutes} minutes.</p>
                    </div>
                    <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition" onclick="this.closest('.fixed').remove()">
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        },

        setupForgotPassword() {
            const forgotLink = document.querySelector('a[href="#"]');
            if (forgotLink) {
                forgotLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showForgotPasswordModal();
                });
            }
        },

        showForgotPasswordModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 animate-fade-in">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Reset Password</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">Enter your email address and we'll send you instructions to reset your password.</p>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Email Address</label>
                        <input type="email" id="reset-email" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
                               placeholder="Enter your email" value="${document.getElementById('email').value}">
                    </div>
                    
                    <div class="flex space-x-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="cancel-reset">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="send-reset">
                            Send Reset Link
                        </button>
                    </div>
                    
                    <div id="reset-message" class="mt-4 text-sm hidden"></div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeModal = () => modal.remove();
            
            document.getElementById('close-modal').addEventListener('click', closeModal);
            document.getElementById('cancel-reset').addEventListener('click', closeModal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            document.getElementById('send-reset').addEventListener('click', async () => {
                const resetEmail = document.getElementById('reset-email').value;
                const messageDiv = document.getElementById('reset-message');
                const sendBtn = document.getElementById('send-reset');
                
                if (!this.validateEmail(resetEmail)) {
                    messageDiv.className = 'mt-4 text-sm text-red-600';
                    messageDiv.textContent = 'Please enter a valid email address.';
                    messageDiv.classList.remove('hidden');
                    return;
                }

                sendBtn.disabled = true;
                sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
                messageDiv.classList.add('hidden');

                setTimeout(() => {
                    messageDiv.className = 'mt-4 text-sm text-green-600';
                    messageDiv.textContent = '✅ Password reset instructions sent to your email.';
                    messageDiv.classList.remove('hidden');
                    
                    setTimeout(closeModal, 2000);
                }, 1500);
            });
        },

        setupGoogleLogin() {
            const googleBtn = document.querySelector('.border-2.border-green-500');
            if (googleBtn) {
                googleBtn.addEventListener('click', () => this.handleGoogleLogin());
            }
        },

        async handleGoogleLogin() {
            const googleBtn = document.querySelector('.border-2.border-green-500');
            const originalText = googleBtn.innerHTML;
            
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Connecting...';

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const googleUser = {
                    id: 'USR_GOOGLE_' + Date.now(),
                    firstName: 'Google',
                    lastName: 'User',
                    email: 'google.user@gmail.com',
                    password: this.hashPassword('demo-password')
                };

                const users = await this.loadUsers();
                let existingUser = users.find(u => u.email === googleUser.email);

                if (!existingUser) {
                    const newUser = {
                        id: 'USR' + Math.floor(100 + Math.random() * 900),
                        firstName: googleUser.firstName,
                        lastName: googleUser.lastName,
                        email: googleUser.email,
                        phone: '',
                        password: googleUser.password,
                        profile: { occupation: '', incomeRange: '' },
                        goals: [],
                        financialScore: 2,
                        preferences: { language: 'en', notifications: true },
                        kycStatus: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    
                    users.push(newUser);
                    await this.saveUsers(users);
                    existingUser = newUser;
                }

                this.createSession(existingUser, true);
                this.showNotification('Google login successful!', 'success');
                
                setTimeout(() => {
                    window.location.href = AppState.getReturnUrl() || 'index.html';
                }, 1500);

            } catch (error) {
                console.error('Google login error:', error);
                this.showNotification('Google login failed. Please try again.', 'error');
                googleBtn.disabled = false;
                googleBtn.innerHTML = originalText;
            }
        },

        // UPDATED: Consistent user loading function
        async loadUsers() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Handle both array and object with users property
                    if (Array.isArray(parsed)) {
                        return parsed;
                    } else if (parsed && parsed.users && Array.isArray(parsed.users)) {
                        return parsed.users;
                    }
                    return [];
                }
                
                const response = await fetch('data/users.json');
                const data = await response.json();
                
                // Handle both array and {users: [...]} formats
                let users = [];
                if (Array.isArray(data)) {
                    users = data;
                } else if (data && data.users && Array.isArray(data.users)) {
                    users = data.users;
                }
                
                // Cache as array for consistency
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                return users;
            } catch (error) {
                console.error('Failed to load users:', error);
                return [];
            }
        },

        // NEW: Consistent user saving function
        async saveUsers(users) {
            try {
                const usersArray = Array.isArray(users) ? users : [];
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersArray));
                return true;
            } catch (error) {
                console.error('Failed to save users:', error);
                return false;
            }
        },

        hashPassword(password) {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(16);
        },

        createSession(user, rememberMe = false) {
            const sessionDuration = rememberMe ? SESSION_DURATION.REMEMBER_ME : SESSION_DURATION.DEFAULT;
            
            const sessionData = {
                userId: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                expires: Date.now() + sessionDuration,
                createdAt: Date.now()
            };
            
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
            
            if (rememberMe) {
                localStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, user.email);
            } else {
                localStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
            }
        },

        async handleSubmit(event) {
            event.preventDefault();

            if (AppState.isLockedOut()) {
                const remaining = Math.ceil(AppState.getLockoutTimeRemaining() / (60 * 1000));
                this.showLockoutMessage(remaining);
                return;
            }

            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember').checked;

            let isValid = true;

            if (!email) {
                this.showFieldError('email', 'Please enter your email');
                isValid = false;
            } else if (!this.validateEmail(email)) {
                this.showFieldError('email', 'Please enter a valid email');
                isValid = false;
            } else {
                this.clearFieldError('email');
            }

            if (!password) {
                this.showFieldError('password', 'Please enter your password');
                isValid = false;
            } else {
                this.clearFieldError('password');
            }

            if (!isValid) return;

            this.showLoading();

            try {
                const users = await this.loadUsers();
                const user = users.find(u => u.email?.toLowerCase() === email);

                if (!user) {
                    this.showFieldError('email', 'No account found with this email');
                    AppState.incrementLoginAttempts();
                    this.showNotification('Email not registered', 'error');
                    this.hideLoading();
                    return;
                }

                if (user.password !== this.hashPassword(password)) {
                    this.showFieldError('password', 'Incorrect password');
                    AppState.incrementLoginAttempts();
                    this.showNotification('Invalid password', 'error');
                    this.hideLoading();
                    return;
                }

                AppState.resetLoginAttempts();
                this.createSession(user, rememberMe);
                
                this.showNotification(`Welcome back, ${user.firstName}!`, 'success');
                
                setTimeout(() => {
                    window.location.href = AppState.getReturnUrl() || 'index.html';
                }, 1500);

            } catch (error) {
                console.error('Login error:', error);
                this.showNotification('Login failed. Please try again.', 'error');
                this.hideLoading();
            }
        }
    };

    //==============================================================================
    // INITIALIZATION
    //==============================================================================

    function initialize() {
        AppState.initialize();

        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => UI.handleSubmit(e));
        }

        UI.setupPasswordToggle();
        UI.setupRealTimeValidation();
        UI.setupForgotPassword();
        UI.setupGoogleLogin();
        UI.loadRememberedEmail();
        UI.handleUrlParams();

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            @keyframes slideOut {
                from { transform: translateX(0); }
                to { transform: translateX(100%); }
            }
            .animate-fade-in {
                animation: fadeIn 0.3s ease-out;
            }
            .animate-slide-in {
                animation: slideIn 0.3s ease-out;
            }
            .animate-slide-out {
                animation: slideOut 0.3s ease-out;
            }
            .loader {
                border-top-color: #00B894;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    document.addEventListener('DOMContentLoaded', initialize);

})();