(function() {
    'use strict';

    // CONFIGURATION & CONSTANTS

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

    // STATE MANAGEMENT

    const AppState = {
        loginAttempts: 0,
        lockoutUntil: null,
        isLoading: false,
        networkStatus: navigator.onLine,
        retryCount: 0,
        maxRetries: 3,

        initialize() {
            this.loadLoginAttempts();
            this.checkExistingSession();
            this.setupNetworkListeners();
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
            if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
                return true;
            }
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
        },

        setupNetworkListeners() {
            window.addEventListener('online', () => {
                this.networkStatus = true;
                UI.showNotification('Network restored', 'success');
            });
            window.addEventListener('offline', () => {
                this.networkStatus = false;
                UI.showNotification('You are offline. Please check your connection.', 'warning');
            });
        }
    };

    // UI COMPONENTS - FULLY RESPONSIVE

    const UI = {
        // LOADING STATES

        showLoading() {
            AppState.isLoading = true;
            
            // Disable all interactive elements
            document.querySelectorAll('button, input, a').forEach(el => {
                if (!el.classList.contains('no-disable')) {
                    el.setAttribute('disabled', 'true');
                    el.style.opacity = '0.7';
                    el.style.cursor = 'not-allowed';
                }
            });

            const loginBtn = document.querySelector('button[type="submit"]');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = `
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Logging in...</span>
                `;
            }
        },

        hideLoading() {
            AppState.isLoading = false;
            
            // Re-enable all interactive elements
            document.querySelectorAll('button, input, a').forEach(el => {
                if (!el.classList.contains('no-disable')) {
                    el.removeAttribute('disabled');
                    el.style.opacity = '';
                    el.style.cursor = '';
                }
            });

            const loginBtn = document.querySelector('button[type="submit"]');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'Log In';
            }
        },

        // NOTIFICATION SYSTEM

        showNotification(message, type = 'info', duration = 3000) {
            const colors = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                warning: 'bg-yellow-500',
                info: 'bg-blue-500'
            };

            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };

            const toast = document.createElement('div');
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.className = `fixed top-4 right-4 left-4 md:left-auto md:w-96 px-6 py-4 rounded-lg shadow-2xl z-50 transform transition-all duration-300 translate-x-0 ${colors[type]} text-white`;
            toast.innerHTML = `
                <div class="flex items-start">
                    <i class="fas ${icons[type]} text-xl mr-3 mt-0.5"></i>
                    <div class="flex-1">
                        <p class="font-medium">${message}</p>
                    </div>
                    <button class="ml-4 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white" onclick="this.closest('[role=alert]').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        // FIELD VALIDATION

        updateFieldValidation(input, isValid, message = '') {
            const container = input.closest('.mb-6');
            if (!container) return;

            // Update input border
            if (isValid) {
                input.classList.remove('border-red-500', 'border-gray-300');
                input.classList.add('border-green-500');
            } else {
                input.classList.remove('border-green-500', 'border-gray-300');
                input.classList.add('border-red-500');
            }

            // Update or remove feedback message
            let feedbackEl = container.querySelector('.field-feedback');
            
            if (message) {
                if (!feedbackEl) {
                    feedbackEl = document.createElement('p');
                    feedbackEl.className = 'field-feedback text-sm mt-1 animate-fade-in';
                    container.appendChild(feedbackEl);
                }
                feedbackEl.className = `field-feedback text-sm mt-1 animate-fade-in ${isValid ? 'text-green-600' : 'text-red-600'}`;
                feedbackEl.innerHTML = `<i class="fas ${isValid ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1"></i>${message}`;
            } else if (feedbackEl) {
                feedbackEl.remove();
            }
        },

        clearFieldError(fieldId) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.remove('border-red-500');
                const container = field.closest('.mb-6');
                if (container) {
                    const errorEl = container.querySelector('.field-feedback.error');
                    if (errorEl) errorEl.remove();
                }
            }
        },

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        // PASSWORD TOGGLE

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
                    
                    // Announce for screen readers
                    toggleBtn.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
                });

                // Add keyboard support
                toggleBtn.setAttribute('tabindex', '0');
                toggleBtn.setAttribute('role', 'button');
                toggleBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleBtn.click();
                    }
                });
            }
        },

        // REAL-TIME VALIDATION

        setupRealTimeValidation() {
            const emailInput = document.getElementById('email');
            
            if (emailInput) {
                emailInput.addEventListener('input', () => {
                    const isValid = this.validateEmail(emailInput.value);
                    if (isValid) {
                        this.updateFieldValidation(emailInput, true, 'Valid email');
                    } else if (emailInput.value.length > 0) {
                        this.updateFieldValidation(emailInput, false, 'Please enter a valid email');
                    } else {
                        this.updateFieldValidation(emailInput, false, '');
                    }
                });
            }
        },

        // FORM VALIDATION

        validateForm() {
            const email = document.getElementById('email');
            const password = document.getElementById('password');
            let isValid = true;
            
            // Email validation
            if (!email.value.trim()) {
                this.updateFieldValidation(email, false, 'Please enter your email');
                isValid = false;
            } else if (!this.validateEmail(email.value)) {
                this.updateFieldValidation(email, false, 'Please enter a valid email');
                isValid = false;
            } else {
                this.updateFieldValidation(email, true, 'Valid email');
            }
            
            // Password validation
            if (!password.value) {
                this.updateFieldValidation(password, false, 'Please enter your password');
                isValid = false;
            } else {
                this.updateFieldValidation(password, true, 'Valid');
            }
            
            return isValid;
        },

        // LOAD REMEMBERED EMAIL

        loadRememberedEmail() {
            const rememberedEmail = localStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL);
            const rememberCheckbox = document.getElementById('remember');
            
            if (rememberedEmail && rememberCheckbox) {
                document.getElementById('email').value = rememberedEmail;
                rememberCheckbox.checked = true;
                
                // Trigger validation
                const event = new Event('input', { bubbles: true });
                document.getElementById('email').dispatchEvent(event);
            }
        },

        // LOCKOUT MODAL

        showLockoutMessage(remainingMinutes) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'lockout-title');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 transform transition-all scale-100">
                    <div class="text-center mb-6">
                        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-lock text-red-600 text-3xl"></i>
                        </div>
                        <h3 id="lockout-title" class="text-xl font-bold text-gray-800 mb-2">Account Temporarily Locked</h3>
                        <p class="text-gray-600">Too many failed login attempts. Please try again in <span class="font-bold text-red-600">${remainingMinutes}</span> minutes.</p>
                    </div>
                    <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" onclick="this.closest('[role=dialog]').remove()">
                        OK
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
        },

        // FORGOT PASSWORD

        setupForgotPassword() {
            const forgotLink = document.querySelector('a[href="#"]');
            if (forgotLink) {
                forgotLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showForgotPasswordModal();
                });

                // Add keyboard support
                forgotLink.setAttribute('tabindex', '0');
                forgotLink.setAttribute('role', 'button');
                forgotLink.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.showForgotPasswordModal();
                    }
                });
            }
        },

        showForgotPasswordModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'reset-title');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 transform transition-all scale-100">
                    <div class="flex justify-between items-center mb-4">
                        <h3 id="reset-title" class="text-xl font-bold">Reset Password</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-1" id="close-modal" aria-label="Close">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">Enter your email address and we'll send you instructions to reset your password.</p>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2" for="reset-email">Email Address</label>
                        <input type="email" id="reset-email" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                               placeholder="Enter your email" value="${document.getElementById('email').value}">
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500" id="cancel-reset">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" id="send-reset">
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
                    messageDiv.className = 'mt-4 text-sm text-green-600 animate-fade-in';
                    messageDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Password reset instructions sent to your email.';
                    messageDiv.classList.remove('hidden');
                    
                    setTimeout(() => {
                        closeModal();
                    }, 2000);
                }, 1500);
            });
        },

        // GOOGLE LOGIN

        setupGoogleLogin() {
            const googleBtn = document.querySelector('.border-2.border-green-500');
            if (googleBtn) {
                googleBtn.addEventListener('click', () => this.handleGoogleLogin());
                
                // Add touch-friendly sizing
                googleBtn.classList.add('min-h-[44px]');
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

        // DATA PERSISTENCE

        async loadUsers() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    } else if (parsed && parsed.users && Array.isArray(parsed.users)) {
                        return parsed.users;
                    }
                    return [];
                }
                
                const response = await fetch('data/users.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                let users = [];
                if (Array.isArray(data)) {
                    users = data;
                } else if (data && data.users && Array.isArray(data.users)) {
                    users = data.users;
                }
                
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                return users;
            } catch (error) {
                console.error('Failed to load users:', error);
                return [];
            }
        },

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
            
            // Notify other pages
            window.dispatchEvent(new CustomEvent('pesasmart-session-created', {
                detail: sessionData
            }));
        },

        // FORM SUBMISSION

        async handleSubmit(event) {
            event.preventDefault();

            if (!AppState.networkStatus) {
                this.showNotification('You are offline. Please check your internet connection.', 'warning');
                return;
            }

            if (AppState.isLockedOut()) {
                const remaining = Math.ceil(AppState.getLockoutTimeRemaining() / (60 * 1000));
                this.showLockoutMessage(remaining);
                return;
            }

            if (!this.validateForm()) {
                return;
            }

            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember').checked;

            this.showLoading();

            try {
                const users = await this.loadUsers();
                const usersArray = Array.isArray(users) ? users : [];
                
                const user = usersArray.find(u => u && u.email === email);

                if (!user) {
                    this.updateFieldValidation(document.getElementById('email'), false, 'No account found with this email');
                    this.showNotification('Email not registered', 'error');
                    AppState.incrementLoginAttempts();
                    this.hideLoading();
                    return;
                }

                if (user.password !== this.hashPassword(password)) {
                    this.updateFieldValidation(document.getElementById('password'), false, 'Incorrect password');
                    this.showNotification('Invalid password', 'error');
                    AppState.incrementLoginAttempts();
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
        },

        // URL PARAMETERS

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

        // INITIALIZATION

        initialize() {
            // Load remembered email
            this.loadRememberedEmail();

            // Setup interactive elements
            this.setupPasswordToggle();
            this.setupRealTimeValidation();
            this.setupForgotPassword();
            this.setupGoogleLogin();

            // Handle form submission
            const form = document.querySelector('form');
            if (form) {
                form.addEventListener('submit', (e) => this.handleSubmit(e));
            }

            // Handle URL parameters
            this.handleUrlParams();

            // Announce page for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = 'Login page loaded. Please enter your credentials.';
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);

            console.log(' Login page initialized with full responsiveness');
        }
    };

    // ADD CSS ANIMATIONS

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
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        .field-feedback {
            transition: all 0.2s ease;
        }
        input:focus, select:focus, button:focus {
            outline: 2px solid #00B894;
            outline-offset: 2px;
        }
        @media (max-width: 640px) {
            button {
                min-height: 44px;
            }
            input, select {
                font-size: 16px !important; /* Prevents zoom on iOS */
            }
        }
        @media (prefers-reduced-motion: reduce) {
            *, ::before, ::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);

    // START APPLICATION

    AppState.initialize();
    UI.initialize();

})();