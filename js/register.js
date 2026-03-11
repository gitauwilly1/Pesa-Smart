(function() {
    'use strict';

    // CONFIGURATION & CONSTANTS

    const APP_VERSION = '2.0.0';
    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        GOALS: 'pesasmart_goals',
        PROGRESS: 'pesasmart_progress',
        INVITES: 'pesasmart_invites_used',
        FORM_DRAFT: 'pesasmart_registration_draft'
    };

    const INVITE_CODES = {
        'ANNE2024': { bonus: 100, used: false, expires: null },
        'FRIEND123': { bonus: 100, used: false, expires: null },
        'WELCOME50': { bonus: 50, used: false, expires: null },
        'SAVE100': { bonus: 100, used: false, expires: null },
        'LEARNER25': { bonus: 25, used: false, expires: null },
        'PESASMART': { bonus: 200, used: false, expires: '2026-12-31' }
    };

    const VALIDATION_RULES = {
        nameMinLength: 2,
        nameMaxLength: 50,
        passwordMinLength: 8,
        phoneMinLength: 9,
        phoneMaxLength: 12
    };

    // STATE MANAGEMENT WITH PERSISTENCE

    const AppState = {
        currentStep: 1,
        formData: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            inviteCode: '',
            password: '',
            occupation: '',
            incomeRange: '',
            goals: [],
            terms: false
        },
        validationState: {
            step1: { isValid: false, touched: {} },
            step2: { isValid: false, touched: {} },
            step3: { isValid: false, touched: {} }
        },
        isLoading: false,
        networkStatus: navigator.onLine,
        retryCount: 0,
        maxRetries: 3,

        initialize() {
            this.loadDraft();
            this.checkExistingSession();
            this.loadInviteCodes();
            this.setupNetworkListeners();
        },

        loadDraft() {
            try {
                const draft = localStorage.getItem(STORAGE_KEYS.FORM_DRAFT);
                if (draft) {
                    const parsed = JSON.parse(draft);
                    if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) { // 1 hour expiry
                        Object.assign(this.formData, parsed.data);
                        console.log(' Draft loaded');
                    } else {
                        localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT);
                    }
                }
            } catch (e) {
                console.warn('Failed to load draft:', e);
            }
        },

        saveDraft() {
            try {
                localStorage.setItem(STORAGE_KEYS.FORM_DRAFT, JSON.stringify({
                    data: this.formData,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('Failed to save draft:', e);
            }
        },

        clearDraft() {
            localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT);
        },

        checkExistingSession() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (session) {
                try {
                    const sessionData = JSON.parse(session);
                    if (sessionData.expires && sessionData.expires > Date.now()) {
                        window.location.href = 'index.html';
                    }
                } catch (e) {
                    localStorage.removeItem(STORAGE_KEYS.SESSION);
                }
            }
        },

        loadInviteCodes() {
            try {
                const used = localStorage.getItem(STORAGE_KEYS.INVITES);
                if (used) {
                    const usedCodes = JSON.parse(used);
                    Object.keys(INVITE_CODES).forEach(code => {
                        if (usedCodes[code]) {
                            INVITE_CODES[code].used = true;
                        }
                        // Check expiration
                        if (INVITE_CODES[code].expires && new Date(INVITE_CODES[code].expires) < new Date()) {
                            INVITE_CODES[code].expired = true;
                        }
                    });
                }
            } catch (e) {
                console.warn('Failed to load invite codes:', e);
            }
        },

        setupNetworkListeners() {
            window.addEventListener('online', () => {
                this.networkStatus = true;
                UI.showNotification('Network restored', 'success');
            });
            window.addEventListener('offline', () => {
                this.networkStatus = false;
                UI.showNotification('You are offline. Changes will be saved locally.', 'warning');
            });
        }
    };

    // UI COMPONENTS - FULLY RESPONSIVE

    const UI = {
        // LOADING STATES

        showLoading(message = 'Creating your account...') {
            AppState.isLoading = true;
            
            // Disable all interactive elements
            document.querySelectorAll('button, input, select, a').forEach(el => {
                if (!el.classList.contains('no-disable')) {
                    el.setAttribute('disabled', 'true');
                    el.style.opacity = '0.7';
                    el.style.cursor = 'not-allowed';
                }
            });

            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>${message}</span>
                `;
            }

            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.remove('hidden');
                loader.querySelector('p').textContent = message;
                return;
            }

            const newLoader = document.createElement('div');
            newLoader.id = 'global-loader';
            newLoader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            newLoader.setAttribute('role', 'alert');
            newLoader.setAttribute('aria-live', 'polite');
            newLoader.innerHTML = `
                <div class="bg-white rounded-xl p-6 text-center shadow-2xl max-w-sm mx-4 transform transition-all scale-100">
                    <svg class="animate-spin h-12 w-12 text-green-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-gray-700 font-medium">${message}</p>
                </div>
            `;
            document.body.appendChild(newLoader);
        },

        hideLoading() {
            AppState.isLoading = false;
            
            // Re-enable all interactive elements
            document.querySelectorAll('button, input, select, a').forEach(el => {
                if (!el.classList.contains('no-disable')) {
                    el.removeAttribute('disabled');
                    el.style.opacity = '';
                    el.style.cursor = '';
                }
            });

            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Finish';
            }

            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.add('animate-fade-out');
                setTimeout(() => loader.remove(), 300);
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
                    <button class="ml-4 text-white hover:text-gray-200 transition-colors" onclick="this.closest('[role=alert]').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            document.body.appendChild(toast);

            // Trigger reflow for animation
            toast.offsetHeight;

            setTimeout(() => {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        // STEP MANAGEMENT

        showStep(step) {
            const stepRadio = document.getElementById(`step-${step}`);
            if (!stepRadio) return;

            // Update radio button
            stepRadio.checked = true;
            
            // Update step indicators
            document.querySelectorAll('.step-indicator').forEach((el, index) => {
                const stepNum = index + 1;
                if (stepNum < step) {
                    el.classList.add('completed');
                    el.classList.remove('active', 'pending');
                } else if (stepNum === step) {
                    el.classList.add('active');
                    el.classList.remove('completed', 'pending');
                } else {
                    el.classList.add('pending');
                    el.classList.remove('active', 'completed');
                }
            });

            // Scroll to top of form
            document.querySelector('.max-w-2xl.mx-auto').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            AppState.currentStep = step;
            
            // Save current progress
            this.updateFormDataFromStep(step);
            AppState.saveDraft();
        },

        // FORM VALIDATION & FEEDBACK

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        validatePhone(phone) {
            const cleaned = phone.replace(/\D/g, '');
            const patterns = [
                /^07\d{8}$/,
                /^7\d{8}$/,
                /^2547\d{8}$/,
                /^\+2547\d{8}$/
            ];
            return patterns.some(pattern => pattern.test(cleaned));
        },

        formatPhone(phone) {
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.startsWith('07')) return '+254' + cleaned.slice(1);
            if (cleaned.startsWith('7')) return '+254' + cleaned;
            if (cleaned.startsWith('254')) return '+' + cleaned;
            if (cleaned.startsWith('+254')) return cleaned;
            return '+254' + cleaned;
        },

        validatePassword(password) {
            const checks = {
                length: password.length >= VALIDATION_RULES.passwordMinLength,
                letter: /[a-zA-Z]/.test(password),
                number: /\d/.test(password),
                special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
            };
            
            const valid = checks.length && checks.letter && checks.number;
            
            let strength = 'weak';
            if (valid && checks.special && password.length >= 10) {
                strength = 'strong';
            } else if (valid) {
                strength = 'medium';
            }
            
            return { valid, strength, checks };
        },

        updatePasswordStrength(password) {
            const result = this.validatePassword(password);
            const container = document.getElementById('password').closest('.mb-6');
            if (!container) return;
            
            const existing = container.querySelector('.password-strength');
            if (existing) existing.remove();
            
            if (password.length === 0) return;
            
            const strengthDiv = document.createElement('div');
            strengthDiv.className = 'password-strength mt-3 animate-fade-in';
            strengthDiv.setAttribute('role', 'status');
            strengthDiv.setAttribute('aria-live', 'polite');
            
            const strengthConfig = {
                weak: { text: 'Weak', color: 'text-red-600', barColor: 'bg-red-500', width: 'w-1/3' },
                medium: { text: 'Medium', color: 'text-yellow-600', barColor: 'bg-yellow-500', width: 'w-2/3' },
                strong: { text: 'Strong', color: 'text-green-600', barColor: 'bg-green-500', width: 'w-full' }
            };

            const config = strengthConfig[result.strength];
            
            strengthDiv.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-medium text-gray-700">Password Strength</span>
                    <span class="text-sm font-medium ${config.color}">${config.text}</span>
                </div>
                <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-2 rounded-full transition-all duration-500 ease-out ${config.barColor}" 
                         style="width: ${result.strength === 'weak' ? '33' : result.strength === 'medium' ? '66' : '100'}%"></div>
                </div>
                <ul class="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3 text-sm">
                    <li class="flex items-center ${result.checks.length ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.length ? 'fa-check-circle' : 'fa-circle'} mr-2 text-xs"></i>
                        <span>At least 8 characters</span>
                    </li>
                    <li class="flex items-center ${result.checks.letter ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.letter ? 'fa-check-circle' : 'fa-circle'} mr-2 text-xs"></i>
                        <span>Contains letters</span>
                    </li>
                    <li class="flex items-center ${result.checks.number ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.number ? 'fa-check-circle' : 'fa-circle'} mr-2 text-xs"></i>
                        <span>Contains numbers</span>
                    </li>
                    <li class="flex items-center ${result.checks.special ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.special ? 'fa-check-circle' : 'fa-circle'} mr-2 text-xs"></i>
                        <span>Contains special characters</span>
                    </li>
                </ul>
            `;
            
            container.appendChild(strengthDiv);
        },

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
            if (fieldId === 'occupation-group') {
                const container = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-3.gap-3')?.parentNode;
                if (container) {
                    const errorEl = container.querySelector('.field-feedback.error');
                    if (errorEl) errorEl.remove();
                }
            } else if (fieldId === 'income-group') {
                const incomeSelect = document.querySelector('select');
                if (incomeSelect) {
                    incomeSelect.classList.remove('border-red-500');
                    const container = incomeSelect.closest('.mb-6');
                    if (container) {
                        const errorEl = container.querySelector('.field-feedback.error');
                        if (errorEl) errorEl.remove();
                    }
                }
            } else if (fieldId === 'goals-group') {
                const container = document.querySelector('.space-y-2')?.parentNode;
                if (container) {
                    const errorEl = container.querySelector('.field-feedback.error');
                    if (errorEl) errorEl.remove();
                }
            } else {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.classList.remove('border-red-500');
                    const container = field.closest('.mb-6');
                    if (container) {
                        const errorEl = container.querySelector('.field-feedback.error');
                        if (errorEl) errorEl.remove();
                    }
                }
            }
        },

        // STEP 1 VALIDATION

        validateStep1() {
            const firstName = document.getElementById('firstName');
            const lastName = document.getElementById('lastName');
            const email = document.getElementById('email');
            const phone = document.getElementById('phone');
            const password = document.getElementById('password');
            const confirm = document.getElementById('confirmPassword');
            
            let isValid = true;
            
            // First name validation
            if (!firstName.value.trim()) {
                this.updateFieldValidation(firstName, false, 'Please enter your first name');
                isValid = false;
            } else if (firstName.value.trim().length < 2) {
                this.updateFieldValidation(firstName, false, 'First name must be at least 2 characters');
                isValid = false;
            } else {
                AppState.formData.firstName = firstName.value.trim();
                this.updateFieldValidation(firstName, true, 'Valid');
            }
            
            // Last name validation
            if (!lastName.value.trim()) {
                this.updateFieldValidation(lastName, false, 'Please enter your last name');
                isValid = false;
            } else if (lastName.value.trim().length < 2) {
                this.updateFieldValidation(lastName, false, 'Last name must be at least 2 characters');
                isValid = false;
            } else {
                AppState.formData.lastName = lastName.value.trim();
                this.updateFieldValidation(lastName, true, 'Valid');
            }
            
            // Email validation
            if (!this.validateEmail(email.value)) {
                this.updateFieldValidation(email, false, 'Please enter a valid email address');
                isValid = false;
            } else {
                AppState.formData.email = email.value.trim().toLowerCase();
                this.updateFieldValidation(email, true, 'Valid email');
            }
            
            // Phone validation
            if (!this.validatePhone(phone.value)) {
                this.updateFieldValidation(phone, false, 'Please enter a valid Kenyan phone number');
                isValid = false;
            } else {
                AppState.formData.phone = this.formatPhone(phone.value);
                this.updateFieldValidation(phone, true, 'Valid Kenyan number');
            }
            
            // Password validation
            const passwordCheck = this.validatePassword(password.value);
            if (!passwordCheck.valid) {
                this.updateFieldValidation(password, false, 'Password must be at least 8 characters with letters and numbers');
                isValid = false;
            } else {
                AppState.formData.password = password.value;
                this.updateFieldValidation(password, true, 'Valid password');
            }
            
            // Confirm password validation
            if (password.value !== confirm.value) {
                this.updateFieldValidation(confirm, false, 'Passwords do not match');
                isValid = false;
            } else if (confirm.value) {
                this.updateFieldValidation(confirm, true, 'Passwords match');
            }
            
            AppState.validationState.step1.isValid = isValid;
            return isValid;
        },

        // STEP 2 VALIDATION

        validateStep2() {
            let isValid = true;
            
            // Occupation validation
            if (!AppState.formData.occupation) {
                const container = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-3.gap-3');
                if (container) {
                    let errorEl = container.parentNode.querySelector('.field-feedback.error');
                    if (!errorEl) {
                        errorEl = document.createElement('p');
                        errorEl.className = 'field-feedback error text-red-600 text-sm mt-1 animate-fade-in';
                        errorEl.setAttribute('data-field', 'occupation-group');
                        container.parentNode.appendChild(errorEl);
                    }
                    errorEl.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Please select your occupation';
                }
                isValid = false;
            } else {
                const errorEl = document.querySelector('[data-field="occupation-group"]');
                if (errorEl) errorEl.remove();
            }
            
            // Income range validation
            const incomeSelect = document.querySelector('select');
            if (!incomeSelect || !incomeSelect.value) {
                if (incomeSelect) {
                    this.updateFieldValidation(incomeSelect, false, 'Please select your income range');
                }
                isValid = false;
            } else {
                const selectedOption = incomeSelect.options[incomeSelect.selectedIndex];
                AppState.formData.incomeRange = selectedOption.text;
                this.updateFieldValidation(incomeSelect, true, 'Selected');
            }
            
            // Goals validation
            const goals = document.querySelectorAll('input[type="checkbox"]:checked');
            if (goals.length === 0) {
                const container = document.querySelector('.space-y-2')?.parentNode;
                if (container) {
                    let errorEl = container.querySelector('.field-feedback.error');
                    if (!errorEl) {
                        errorEl = document.createElement('p');
                        errorEl.className = 'field-feedback error text-red-600 text-sm mt-1 animate-fade-in';
                        container.appendChild(errorEl);
                    }
                    errorEl.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Please select at least one financial goal';
                }
                isValid = false;
            } else {
                AppState.formData.goals = Array.from(goals).map(cb => this.getGoalText(cb.id));
                const errorEl = document.querySelector('.space-y-2')?.parentNode?.querySelector('.field-feedback.error');
                if (errorEl) errorEl.remove();
            }
            
            AppState.validationState.step2.isValid = isValid;
            return isValid;
        },

        // STEP 3 VALIDATION

        validateStep3() {
            const terms = document.getElementById('terms');
            if (!terms.checked) {
                const container = terms.closest('.mb-6');
                if (container) {
                    let errorEl = container.querySelector('.field-feedback.error');
                    if (!errorEl) {
                        errorEl = document.createElement('p');
                        errorEl.className = 'field-feedback error text-red-600 text-sm mt-1 animate-fade-in';
                        container.appendChild(errorEl);
                    }
                    errorEl.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>You must agree to the Terms & Conditions';
                }
                return false;
            } else {
                AppState.formData.terms = true;
                const container = terms.closest('.mb-6');
                if (container) {
                    const errorEl = container.querySelector('.field-feedback.error');
                    if (errorEl) errorEl.remove();
                }
                return true;
            }
        },

        // UTILITY FUNCTIONS

        getGoalText(checkboxId) {
            const map = {
                'goal1': 'Emergency fund',
                'goal2': 'Learn to invest',
                'goal3': 'Insurance coverage',
                'goal4': 'School fees',
                'goal5': 'Business'
            };
            return map[checkboxId] || '';
        },

        updateFormDataFromStep(step) {
            if (step === 1) {
                const firstName = document.getElementById('firstName');
                const lastName = document.getElementById('lastName');
                const email = document.getElementById('email');
                const phone = document.getElementById('phone');
                
                if (firstName) AppState.formData.firstName = firstName.value.trim();
                if (lastName) AppState.formData.lastName = lastName.value.trim();
                if (email) AppState.formData.email = email.value.trim();
                if (phone) AppState.formData.phone = phone.value.trim();
            }
        },

        // EVENT HANDLERS SETUP

        setupPasswordToggles() {
            document.querySelectorAll('.relative button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const input = btn.previousElementSibling;
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    const icon = btn.querySelector('i');
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                    
                    // Announce for screen readers
                    btn.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
                });

                // Add keyboard support
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
            });
        },

        setupProfileButtons() {
            const profileBtns = document.querySelectorAll('.profile-btn');
            
            profileBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    profileBtns.forEach(b => {
                        b.classList.remove('border-green-500', 'bg-green-50', 'ring-2', 'ring-green-200');
                        b.classList.add('border-gray-300');
                        b.setAttribute('aria-selected', 'false');
                    });
                    
                    this.classList.remove('border-gray-300');
                    this.classList.add('border-green-500', 'bg-green-50', 'ring-2', 'ring-green-200');
                    this.setAttribute('aria-selected', 'true');
                    
                    const occupationText = this.querySelector('p')?.textContent?.trim() || '';
                    AppState.formData.occupation = occupationText;
                    
                    UI.clearFieldError('occupation-group');
                    AppState.saveDraft();
                });

                // Add keyboard navigation
                btn.setAttribute('tabindex', '0');
                btn.setAttribute('role', 'button');
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
            });
        },

        setupIncomeSelect() {
            const incomeSelect = document.querySelector('select');
            if (incomeSelect) {
                incomeSelect.addEventListener('change', () => {
                    const selectedOption = incomeSelect.options[incomeSelect.selectedIndex];
                    AppState.formData.incomeRange = selectedOption ? selectedOption.text : '';
                    UI.clearFieldError('income-group');
                    AppState.saveDraft();
                });
            }
        },

        setupGoalCheckboxes() {
            const goalCheckboxes = [
                document.getElementById('goal1'),
                document.getElementById('goal2'),
                document.getElementById('goal3'),
                document.getElementById('goal4'),
                document.getElementById('goal5')
            ];

            goalCheckboxes.forEach(checkbox => {
                if (checkbox) {
                    checkbox.addEventListener('change', () => {
                        AppState.formData.goals = goalCheckboxes
                            .filter(cb => cb && cb.checked)
                            .map(cb => UI.getGoalText(cb.id));
                        
                        if (AppState.formData.goals.length > 0) {
                            UI.clearFieldError('goals-group');
                        }
                        AppState.saveDraft();
                    });
                }
            });
        },

        setupRealTimeValidation() {
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('phone');
            const passwordInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirmPassword');

            if (emailInput) {
                emailInput.addEventListener('input', () => {
                    const isValid = UI.validateEmail(emailInput.value);
                    if (isValid) {
                        UI.updateFieldValidation(emailInput, true, 'Valid email');
                    } else if (emailInput.value.length > 0) {
                        UI.updateFieldValidation(emailInput, false, 'Please enter a valid email');
                    } else {
                        UI.updateFieldValidation(emailInput, false, '');
                    }
                    AppState.saveDraft();
                });
            }

            if (phoneInput) {
                phoneInput.addEventListener('input', () => {
                    let value = phoneInput.value.replace(/\D/g, '');
                    if (value.length > 9) value = value.slice(0, 9);
                    phoneInput.value = value;
                    
                    const isValid = UI.validatePhone(value);
                    if (isValid) {
                        UI.updateFieldValidation(phoneInput, true, 'Valid Kenyan number');
                    } else if (value.length > 0) {
                        UI.updateFieldValidation(phoneInput, false, 'Enter 9 digits after +254');
                    } else {
                        UI.updateFieldValidation(phoneInput, false, '');
                    }
                    AppState.saveDraft();
                });
            }

            if (passwordInput) {
                passwordInput.addEventListener('input', () => {
                    UI.updatePasswordStrength(passwordInput.value);
                    if (confirmInput?.value) {
                        UI.checkPasswordMatch();
                    }
                    AppState.saveDraft();
                });
            }

            if (confirmInput) {
                confirmInput.addEventListener('input', UI.checkPasswordMatch.bind(UI));
            }
        },

        checkPasswordMatch() {
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const confirmInput = document.getElementById('confirmPassword');
            
            if (confirm.length === 0) return;
            
            if (password === confirm) {
                UI.updateFieldValidation(confirmInput, true, 'Passwords match');
            } else {
                UI.updateFieldValidation(confirmInput, false, 'Passwords do not match');
            }
        },

        setupStepNavigation() {
            const nextToStep2 = document.querySelector('label[for="step-2"]');
            if (nextToStep2) {
                nextToStep2.addEventListener('click', (e) => {
                    if (!UI.validateStep1()) {
                        e.preventDefault();
                        UI.showNotification('Please fix the errors in Step 1', 'error');
                        
                        // Scroll to first error
                        const firstError = document.querySelector('.border-red-500');
                        if (firstError) {
                            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        UI.showStep(2);
                    }
                });
            }

            const nextToStep3 = document.querySelector('label[for="step-3"]');
            if (nextToStep3) {
                nextToStep3.addEventListener('click', (e) => {
                    if (!UI.validateStep2()) {
                        e.preventDefault();
                        UI.showNotification('Please complete your financial profile', 'error');
                        
                        // Scroll to error area
                        const errorArea = document.querySelector('[data-field="occupation-group"]') || 
                                         document.querySelector('.border-red-500');
                        if (errorArea) {
                            errorArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        UI.showStep(3);
                    }
                });
            }

            // Back buttons
            const backToStep1 = document.querySelector('label[for="step-1"]');
            if (backToStep1) {
                backToStep1.addEventListener('click', () => {
                    UI.updateFormDataFromStep(2);
                    UI.showStep(1);
                });
            }

            const backToStep2 = document.querySelector('label[for="step-2"].border');
            if (backToStep2) {
                backToStep2.addEventListener('click', () => {
                    UI.updateFormDataFromStep(3);
                    UI.showStep(2);
                });
            }
        },

        setupInviteCodeValidation() {
            const inviteInput = document.getElementById('inviteCode');
            if (!inviteInput) return;

            let timeout;
            inviteInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const code = inviteInput.value.trim().toUpperCase();
                    if (code.length > 3) {
                        const inviteInfo = INVITE_CODES[code];
                        const isValid = inviteInfo && !inviteInfo.used && !inviteInfo.expired;
                        
                        const messageDiv = document.getElementById('inviteMessage') || UI.createInviteMessage();
                        
                        if (isValid) {
                            messageDiv.className = 'text-green-600 text-sm mt-1 animate-fade-in';
                            messageDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Valid invite code! You\'ll get Ksh ' + inviteInfo.bonus + ' bonus';
                            AppState.formData.inviteCode = code;
                        } else if (inviteInfo?.used) {
                            messageDiv.className = 'text-red-600 text-sm mt-1 animate-fade-in';
                            messageDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>This invite code has already been used';
                        } else if (inviteInfo?.expired) {
                            messageDiv.className = 'text-red-600 text-sm mt-1 animate-fade-in';
                            messageDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>This invite code has expired';
                        } else if (code.length > 0) {
                            messageDiv.className = 'text-red-600 text-sm mt-1 animate-fade-in';
                            messageDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Invalid invite code';
                        }
                    }
                }, 500);
            });

            // Check URL parameter on load
            const urlParams = new URLSearchParams(window.location.search);
            const inviteParam = urlParams.get('invite') || urlParams.get('ref');
            if (inviteParam) {
                inviteInput.value = inviteParam;
                setTimeout(() => {
                    const event = new Event('input', { bubbles: true });
                    inviteInput.dispatchEvent(event);
                }, 500);
            }
        },

        createInviteMessage() {
            const container = document.getElementById('inviteCode').closest('.mb-6');
            const div = document.createElement('div');
            div.id = 'inviteMessage';
            div.className = 'text-sm mt-1';
            container.appendChild(div);
            return div;
        },

        calculateFinancialScore() {
            let score = 1; // Base score for attempting registration
            if (AppState.formData.occupation) score++;
            if (AppState.formData.incomeRange) score++;
            score += Math.min(AppState.formData.goals.length, 2); // Max 2 points from goals
            return Math.min(score, 5); // Cap at 5
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
                if (AppState.retryCount < AppState.maxRetries) {
                    AppState.retryCount++;
                    return this.loadUsers();
                }
                return [];
            }
        },

        async saveUsers(users) {
            try {
                const usersArray = Array.isArray(users) ? users : [];
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersArray));
                
                // Trigger sync with other pages
                window.dispatchEvent(new CustomEvent('pesasmart-users-updated', {
                    detail: { timestamp: Date.now() }
                }));
                
                return true;
            } catch (error) {
                console.error('Failed to save users:', error);
                return false;
            }
        },

        async saveProgress(progress) {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                let progressList = cached ? JSON.parse(cached) : [];
                if (!Array.isArray(progressList)) progressList = [];
                progressList.push(progress);
                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList));
                return true;
            } catch (error) {
                console.error('Failed to save progress:', error);
                return false;
            }
        },

        async saveGoals(goal) {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                let goalsList = cached ? JSON.parse(cached) : [];
                if (!Array.isArray(goalsList)) goalsList = [];
                goalsList.push(goal);
                localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goalsList));
                return true;
            } catch (error) {
                console.error('Failed to save goals:', error);
                return false;
            }
        },

        generateUserId(users) {
            let maxNum = 0;
            users.forEach(user => {
                const match = user.id?.match(/USR(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            });
            const nextNum = maxNum + 1;
            return 'USR' + nextNum.toString().padStart(3, '0');
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

        async processInviteCode(code, userId) {
            if (!code) return { bonus: 0 };
            
            const upperCode = code.toUpperCase();
            if (INVITE_CODES[upperCode] && !INVITE_CODES[upperCode].used && !INVITE_CODES[upperCode].expired) {
                INVITE_CODES[upperCode].used = true;
                
                const usedCodes = {};
                Object.keys(INVITE_CODES).forEach(k => {
                    if (INVITE_CODES[k].used) usedCodes[k] = true;
                });
                localStorage.setItem(STORAGE_KEYS.INVITES, JSON.stringify(usedCodes));
                
                return { bonus: INVITE_CODES[upperCode].bonus };
            }
            return { bonus: 0 };
        },

        createSession(user) {
            const sessionData = {
                userId: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                expires: Date.now() + 24 * 60 * 60 * 1000,
                createdAt: Date.now()
            };
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
            
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

            if (!this.validateStep1() || !this.validateStep2() || !this.validateStep3()) {
                this.showNotification('Please complete all steps correctly', 'error');
                return;
            }

            this.showLoading('Creating your account...');

            try {
                // Get invite code if any
                const inviteInput = document.getElementById('inviteCode');
                if (inviteInput?.value) {
                    AppState.formData.inviteCode = inviteInput.value.trim().toUpperCase();
                }

                // Load existing users
                const users = await this.loadUsers();
                const usersArray = Array.isArray(users) ? users : [];

                // Check for duplicate email
                if (usersArray.some(u => u && u.email === AppState.formData.email)) {
                    this.updateFieldValidation(document.getElementById('email'), false, 'This email is already registered');
                    this.showNotification('Email already exists', 'error');
                    this.hideLoading();
                    return;
                }

                // Generate user ID
                const userId = this.generateUserId(usersArray);

                // Process invite code
                const inviteResult = await this.processInviteCode(AppState.formData.inviteCode, userId);

                // Create user object
                const newUser = {
                    id: userId,
                    firstName: AppState.formData.firstName,
                    lastName: AppState.formData.lastName,
                    email: AppState.formData.email,
                    phone: AppState.formData.phone,
                    password: this.hashPassword(AppState.formData.password),
                    profile: {
                        occupation: AppState.formData.occupation.toLowerCase().replace(/\s+/g, ''),
                        incomeRange: AppState.formData.incomeRange,
                        dateOfBirth: '',
                        county: '',
                        constituency: '',
                        gender: ''
                    },
                    goals: AppState.formData.goals,
                    financialScore: this.calculateFinancialScore(),
                    preferences: {
                        language: 'en',
                        notifications: true
                    },
                    kycStatus: 'pending',
                    createdAt: new Date().toISOString(),
                    lastLogin: null
                };

                if (inviteResult.bonus > 0) {
                    newUser.inviteBonus = inviteResult.bonus;
                    newUser.inviteCodeUsed = AppState.formData.inviteCode;
                }

                // Save user
                usersArray.push(newUser);
                const userSaved = await this.saveUsers(usersArray);
                if (!userSaved) throw new Error('Failed to save user');

                // Create progress entry
                const newProgress = {
                    userId: userId,
                    completedModules: [],
                    inProgress: {},
                    earnedBadges: [],
                    certificates: [],
                    lastActive: new Date().toISOString(),
                    totalLearningHours: 0,
                    currentStreak: 1,
                    longestStreak: 1
                };
                const progressSaved = await this.saveProgress(newProgress);
                if (!progressSaved) throw new Error('Failed to save progress');

                // Create default goal
                const defaultGoal = {
                    id: 'GL' + Date.now(),
                    userId: userId,
                    name: 'Emergency Fund',
                    targetAmount: 30000,
                    savedAmount: inviteResult.bonus || 0,
                    deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    category: 'savings',
                    priority: 'high',
                    status: 'active',
                    createdAt: new Date().toISOString()
                };
                const goalSaved = await this.saveGoals(defaultGoal);
                if (!goalSaved) throw new Error('Failed to save goal');

                // Create session
                this.createSession(newUser);

                // Clear draft
                AppState.clearDraft();

                // Show success message
                if (inviteResult.bonus > 0) {
                    this.showNotification(`🎉 Welcome! You've received Ksh ${inviteResult.bonus} bonus!`, 'success', 5000);
                } else {
                    this.showNotification('Account created successfully!', 'success', 3000);
                }

                // Redirect to home page
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } catch (error) {
                console.error('Registration error:', error);
                this.showNotification('Registration failed. Please try again.', 'error');
                this.hideLoading();
            }
        },

        // INITIALIZATION

        initialize() {
            // Load saved draft
            if (AppState.formData.firstName) {
                document.getElementById('firstName').value = AppState.formData.firstName;
                document.getElementById('lastName').value = AppState.formData.lastName;
                document.getElementById('email').value = AppState.formData.email;
                document.getElementById('phone').value = AppState.formData.phone;
            }

            // Setup all interactive elements
            this.setupPasswordToggles();
            this.setupProfileButtons();
            this.setupIncomeSelect();
            this.setupGoalCheckboxes();
            this.setupRealTimeValidation();
            this.setupStepNavigation();
            this.setupInviteCodeValidation();

            // Handle form submission
            document.getElementById('registrationForm').addEventListener('submit', (e) => this.handleSubmit(e));

            // Handle keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modals = document.querySelectorAll('.fixed.inset-0');
                    modals.forEach(modal => modal.remove());
                }
            });

            // Announce page for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = 'Registration form loaded. Step 1 of 3.';
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);

            console.log(' Registration page initialized with full responsiveness');
        }
    };

    // START APPLICATION

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
        .loader {
            border-top-color: #00B894;
            animation: spin 1s linear infinite;
        }
        .profile-btn {
            transition: all 0.2s ease-in-out;
            cursor: pointer;
        }
        .profile-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .profile-btn:active {
            transform: translateY(0);
        }
        .profile-btn[aria-selected="true"] {
            transform: scale(1.02);
        }
        .password-strength {
            transition: all 0.3s ease;
        }
        .field-feedback {
            transition: all 0.2s ease;
        }
        input:focus, select:focus, button:focus {
            outline: 2px solid #00B894;
            outline-offset: 2px;
        }
        @media (max-width: 640px) {
            .profile-btn {
                padding: 0.75rem !important;
            }
            .profile-btn i {
                font-size: 1.25rem !important;
            }
            .profile-btn p {
                font-size: 0.75rem !important;
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

    // Initialize the application
    AppState.initialize();
    UI.initialize();

})();