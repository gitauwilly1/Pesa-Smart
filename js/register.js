(function() {
    'use strict';

    //==============================================================================
    // CONFIGURATION
    //==============================================================================

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        GOALS: 'pesasmart_goals',
        PROGRESS: 'pesasmart_progress',
        INVITES: 'pesasmart_invites_used'
    };

    const INVITE_CODES = {
        'ANNE2024': { bonus: 100, used: false },
        'FRIEND123': { bonus: 100, used: false },
        'WELCOME50': { bonus: 50, used: false },
        'SAVE100': { bonus: 100, used: false },
        'LEARNER25': { bonus: 25, used: false }
    };

    //==============================================================================
    // STATE MANAGEMENT
    //==============================================================================

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
        isLoading: false,

        initialize() {
            console.log(' AppState initializing...');
            this.checkExistingSession();
            this.loadInviteCodes();
        },

        checkExistingSession() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (session) {
                try {
                    const sessionData = JSON.parse(session);
                    if (sessionData.expires && sessionData.expires > Date.now()) {
                        console.log(' Existing session found, redirecting to index');
                        window.location.href = 'index.html';
                    }
                } catch (e) {
                    console.warn('Failed to parse session:', e);
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
                    });
                }
                console.log(' Invite codes loaded');
            } catch (e) {
                console.warn('Failed to load invite codes:', e);
            }
        }
    };

    //==============================================================================
    // UI COMPONENTS
    //==============================================================================

    const UI = {
        showLoading() {
            console.log(' Showing loading state');
            AppState.isLoading = true;
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...';
            }
        },

        hideLoading() {
            console.log(' Hiding loading state');
            AppState.isLoading = false;
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Finish';
            }
        },

        showNotification(message, type = 'info', duration = 3000) {
            console.log(` Notification [${type}]: ${message}`);
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

        showStep(step) {
            console.log(` Showing step ${step}`);
            const stepRadio = document.getElementById(`step-${step}`);
            if (stepRadio) {
                stepRadio.checked = true;
                AppState.currentStep = step;
                console.log(` Step ${step} displayed`);
            } else {
                console.error(` Step radio for step ${step} not found`);
            }
        },

        setupPasswordToggles() {
            console.log('🔑 Setting up password toggles');
            document.querySelectorAll('.relative button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const input = btn.previousElementSibling;
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    const icon = btn.querySelector('i');
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                });
            });
        },

        setupProfileButtons() {
            console.log('Setting up profile buttons');
            const profileBtns = document.querySelectorAll('.profile-btn');
            console.log(`Found ${profileBtns.length} profile buttons`);
            
            profileBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    profileBtns.forEach(b => {
                        b.classList.remove('border-green-500', 'bg-green-50');
                        b.classList.add('border-gray-300');
                    });
                    
                    this.classList.remove('border-gray-300');
                    this.classList.add('border-green-500', 'bg-green-50');
                    
                    const occupationText = this.querySelector('p')?.textContent?.trim() || '';
                    AppState.formData.occupation = occupationText;
                    console.log(' Occupation selected:', occupationText);
                    
                    UI.clearFieldError('occupation-group');
                });
            });
        },

        setupIncomeSelect() {
            console.log('Setting up income select');
            const incomeSelect = document.querySelector('select');
            if (incomeSelect) {
                incomeSelect.addEventListener('change', () => {
                    const selectedOption = incomeSelect.options[incomeSelect.selectedIndex];
                    AppState.formData.incomeRange = selectedOption ? selectedOption.text : '';
                    console.log(' Income selected:', AppState.formData.incomeRange);
                    UI.clearFieldError('income-group');
                });
            }
        },

        setupGoalCheckboxes() {
            console.log('Setting up goal checkboxes');
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
                        
                        console.log(' Goals selected:', AppState.formData.goals);
                        
                        if (AppState.formData.goals.length > 0) {
                            UI.clearFieldError('goals-group');
                        }
                    });
                }
            });
        },

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

        setupRealTimeValidation() {
            console.log(' Setting up real-time validation');
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('phone');
            const passwordInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirmPassword');

            if (emailInput) {
                emailInput.addEventListener('input', () => {
                    const isValid = UI.validateEmail(emailInput.value);
                    UI.updateFieldValidation(emailInput, isValid);
                    if (isValid) {
                        UI.showFieldValid(emailInput, 'Valid email');
                    } else if (emailInput.value.length > 0) {
                        UI.showFieldError(emailInput, 'Please enter a valid email');
                    }
                });
            }

            if (phoneInput) {
                phoneInput.addEventListener('input', () => {
                    let value = phoneInput.value.replace(/\D/g, '');
                    if (value.length > 9) value = value.slice(0, 9);
                    phoneInput.value = value;
                    
                    const isValid = UI.validatePhone(value);
                    UI.updateFieldValidation(phoneInput, isValid);
                    if (isValid) {
                        UI.showFieldValid(phoneInput, 'Valid Kenyan number');
                    } else if (value.length > 0) {
                        UI.showFieldError(phoneInput, 'Enter 9 digits after +254');
                    }
                });
            }

            if (passwordInput) {
                passwordInput.addEventListener('input', () => {
                    UI.updatePasswordStrength(passwordInput.value);
                    if (confirmInput?.value) {
                        UI.checkPasswordMatch();
                    }
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
                UI.updateFieldValidation(confirmInput, true);
                UI.showFieldValid(confirmInput, 'Passwords match');
            } else {
                UI.updateFieldValidation(confirmInput, false);
                UI.showFieldError(confirmInput, 'Passwords do not match');
            }
        },

        updateFieldValidation(input, isValid) {
            if (isValid) {
                input.classList.remove('border-red-500');
                input.classList.add('border-green-500');
            } else {
                input.classList.remove('border-green-500');
                input.classList.add('border-red-500');
            }
        },

        showFieldValid(input, message) {
            const container = input.closest('.mb-6');
            if (!container) return;
            
            let msgEl = container.querySelector('.field-feedback.valid');
            
            if (!msgEl) {
                const errorEl = container.querySelector('.field-feedback.error');
                if (errorEl) errorEl.remove();
                
                msgEl = document.createElement('p');
                msgEl.className = 'field-feedback valid text-green-600 text-sm mt-1';
                container.appendChild(msgEl);
            }
            msgEl.innerHTML = `<i class="fas fa-check-circle mr-1"></i>${message}`;
        },

        showFieldError(input, message) {
            const container = input.closest('.mb-6');
            if (!container) return;
            
            let errorEl = container.querySelector('.field-feedback.error');
            
            if (!errorEl) {
                const validEl = container.querySelector('.field-feedback.valid');
                if (validEl) validEl.remove();
                
                errorEl = document.createElement('p');
                errorEl.className = 'field-feedback error text-red-600 text-sm mt-1';
                container.appendChild(errorEl);
            }
            errorEl.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i>${message}`;
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
                length: password.length >= 8,
                letter: /[a-zA-Z]/.test(password),
                number: /\d/.test(password),
                special: /[!@#$%^&*]/.test(password)
            };
            
            const valid = checks.length && checks.letter && checks.number;
            
            let strength = 'weak';
            if (valid && checks.special) {
                strength = 'strong';
            } else if (valid) {
                strength = 'medium';
            }
            
            return { valid, strength, checks };
        },

        updatePasswordStrength(password) {
            const result = UI.validatePassword(password);
            const container = document.getElementById('password').closest('.mb-6');
            if (!container) return;
            
            const existing = container.querySelector('.password-strength');
            if (existing) existing.remove();
            
            if (password.length === 0) return;
            
            const strengthDiv = document.createElement('div');
            strengthDiv.className = 'password-strength mt-3';
            
            let strengthText = '';
            let strengthColor = '';
            
            if (result.strength === 'weak') {
                strengthText = 'Weak';
                strengthColor = 'text-red-600';
            } else if (result.strength === 'medium') {
                strengthText = 'Medium';
                strengthColor = 'text-yellow-600';
            } else {
                strengthText = 'Strong';
                strengthColor = 'text-green-600';
            }
            
            strengthDiv.innerHTML = `
                <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium">Password Strength</span>
                    <span class="text-sm font-medium ${strengthColor}">${strengthText}</span>
                </div>
                <div class="w-full h-2 bg-gray-200 rounded-full">
                    <div class="h-2 rounded-full ${result.strength === 'weak' ? 'w-1/3 bg-red-500' : result.strength === 'medium' ? 'w-2/3 bg-yellow-500' : 'w-full bg-green-500'}"></div>
                </div>
                <ul class="grid grid-cols-2 gap-1 mt-2 text-xs">
                    <li class="${result.checks.length ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.length ? 'fa-check-circle' : 'fa-circle'} mr-1"></i> 8+ characters
                    </li>
                    <li class="${result.checks.letter ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.letter ? 'fa-check-circle' : 'fa-circle'} mr-1"></i> Has letters
                    </li>
                    <li class="${result.checks.number ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.number ? 'fa-check-circle' : 'fa-circle'} mr-1"></i> Has numbers
                    </li>
                    <li class="${result.checks.special ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fas ${result.checks.special ? 'fa-check-circle' : 'fa-circle'} mr-1"></i> Has special chars
                    </li>
                </ul>
            `;
            
            container.appendChild(strengthDiv);
        },

        validateStep1() {
            console.log('🔍 Validating step 1');
            const firstName = document.getElementById('firstName');
            const lastName = document.getElementById('lastName');
            const email = document.getElementById('email');
            const phone = document.getElementById('phone');
            const password = document.getElementById('password');
            const confirm = document.getElementById('confirmPassword');
            
            let isValid = true;
            
            if (!firstName.value.trim()) {
                UI.showFieldError(firstName, 'Please enter your first name');
                isValid = false;
            } else {
                AppState.formData.firstName = firstName.value.trim();
                UI.clearFieldError(firstName.id);
            }
            
            if (!lastName.value.trim()) {
                UI.showFieldError(lastName, 'Please enter your last name');
                isValid = false;
            } else {
                AppState.formData.lastName = lastName.value.trim();
                UI.clearFieldError(lastName.id);
            }
            
            if (!UI.validateEmail(email.value)) {
                UI.showFieldError(email, 'Please enter a valid email');
                isValid = false;
            } else {
                AppState.formData.email = email.value.trim().toLowerCase();
                UI.clearFieldError(email.id);
            }
            
            if (!UI.validatePhone(phone.value)) {
                UI.showFieldError(phone, 'Please enter a valid Kenyan phone number');
                isValid = false;
            } else {
                AppState.formData.phone = UI.formatPhone(phone.value);
                UI.clearFieldError(phone.id);
            }
            
            const passwordCheck = UI.validatePassword(password.value);
            if (!passwordCheck.valid) {
                UI.showFieldError(password, 'Password must be 8+ chars with letters and numbers');
                isValid = false;
            } else {
                AppState.formData.password = password.value;
                UI.clearFieldError(password.id);
            }
            
            if (password.value !== confirm.value) {
                UI.showFieldError(confirm, 'Passwords do not match');
                isValid = false;
            } else if (confirm.value) {
                UI.clearFieldError(confirm.id);
            }
            
            console.log(' Step 1 validation result:', isValid, 'Form data:', AppState.formData);
            return isValid;
        },

        validateStep2() {
            console.log('🔍 Validating step 2');
            let isValid = true;
            
            if (!AppState.formData.occupation) {
                const container = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-3.gap-3');
                if (container) {
                    let errorEl = container.parentNode.querySelector('.field-feedback.error');
                    if (!errorEl) {
                        errorEl = document.createElement('p');
                        errorEl.className = 'field-feedback error text-red-600 text-sm mt-1';
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
            
            const incomeSelect = document.querySelector('select');
            if (!incomeSelect || !incomeSelect.value) {
                if (incomeSelect) {
                    UI.showFieldError(incomeSelect, 'Please select your income range');
                }
                isValid = false;
            } else {
                const selectedOption = incomeSelect.options[incomeSelect.selectedIndex];
                AppState.formData.incomeRange = selectedOption.text;
                UI.clearFieldError('income-group');
            }
            
            const goals = document.querySelectorAll('input[type="checkbox"]:checked');
            if (goals.length === 0) {
                const container = document.querySelector('.space-y-2')?.parentNode;
                if (container) {
                    let errorEl = container.querySelector('.field-feedback.error');
                    if (!errorEl) {
                        errorEl = document.createElement('p');
                        errorEl.className = 'field-feedback error text-red-600 text-sm mt-1';
                        container.appendChild(errorEl);
                    }
                    errorEl.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Please select at least one goal';
                }
                isValid = false;
            } else {
                const errorEl = document.querySelector('.space-y-2')?.parentNode?.querySelector('.field-feedback.error');
                if (errorEl) errorEl.remove();
            }
            
            console.log(' Step 2 validation result:', isValid, 'Form data:', AppState.formData);
            return isValid;
        },

        validateStep3() {
            console.log('🔍 Validating step 3');
            const terms = document.getElementById('terms');
            if (!terms.checked) {
                const container = terms.closest('.mb-6');
                if (container) {
                    let errorEl = container.querySelector('.field-feedback.error');
                    if (!errorEl) {
                        errorEl = document.createElement('p');
                        errorEl.className = 'field-feedback error text-red-600 text-sm mt-1';
                        container.appendChild(errorEl);
                    }
                    errorEl.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>You must agree to the Terms & Conditions';
                }
                console.log(' Terms not checked');
                return false;
            } else {
                AppState.formData.terms = true;
                const container = terms.closest('.mb-6');
                if (container) {
                    const errorEl = container.querySelector('.field-feedback.error');
                    if (errorEl) errorEl.remove();
                }
                console.log(' Terms accepted');
                return true;
            }
        },

        setupStepNavigation() {
            console.log(' Setting up step navigation');
            
            const nextToStep2 = document.querySelector('label[for="step-2"]');
            if (nextToStep2) {
                nextToStep2.addEventListener('click', (e) => {
                    console.log(' Attempting to go to step 2');
                    if (!UI.validateStep1()) {
                        e.preventDefault();
                        UI.showNotification('Please fix the errors in Step 1', 'error');
                    }
                });
            }

            const nextToStep3 = document.querySelector('label[for="step-3"]');
            if (nextToStep3) {
                nextToStep3.addEventListener('click', (e) => {
                    console.log(' Attempting to go to step 3');
                    if (!UI.validateStep2()) {
                        e.preventDefault();
                        UI.showNotification('Please complete your financial profile', 'error');
                    }
                });
            }
        },

        setupInviteCodeValidation() {
            console.log(' Setting up invite code validation');
            const inviteInput = document.getElementById('inviteCode');
            if (!inviteInput) return;

            let timeout;
            inviteInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const code = inviteInput.value.trim().toUpperCase();
                    if (code.length > 3) {
                        const isValid = INVITE_CODES[code] && !INVITE_CODES[code].used;
                        const messageDiv = document.getElementById('inviteMessage') || UI.createInviteMessage();
                        
                        if (isValid) {
                            messageDiv.className = 'text-green-600 text-sm mt-1';
                            messageDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Valid invite code! You\'ll get Ksh ' + INVITE_CODES[code].bonus + ' bonus';
                            AppState.formData.inviteCode = code;
                            console.log(' Valid invite code:', code);
                        } else if (INVITE_CODES[code]?.used) {
                            messageDiv.className = 'text-red-600 text-sm mt-1';
                            messageDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>This invite code has already been used';
                        } else if (code.length > 0) {
                            messageDiv.className = 'text-red-600 text-sm mt-1';
                            messageDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>Invalid invite code';
                        }
                    }
                }, 500);
            });
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
            let score = 1;
            if (AppState.formData.occupation) score++;
            if (AppState.formData.incomeRange) score++;
            score += Math.min(AppState.formData.goals.length, 2);
            return Math.min(score, 5);
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
            if (INVITE_CODES[upperCode] && !INVITE_CODES[upperCode].used) {
                INVITE_CODES[upperCode].used = true;
                
                const usedCodes = {};
                Object.keys(INVITE_CODES).forEach(k => {
                    if (INVITE_CODES[k].used) usedCodes[k] = true;
                });
                localStorage.setItem(STORAGE_KEYS.INVITES, JSON.stringify(usedCodes));
                console.log(' Invite code processed:', upperCode);
                return { bonus: INVITE_CODES[upperCode].bonus };
            }
            return { bonus: 0 };
        },

        async loadUsers() {
            console.log(' Loading users...');
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                if (cached) {
                    console.log(' Users loaded from cache');
                    return JSON.parse(cached);
                }
                
                console.log('📡 Fetching users from JSON file...');
                const response = await fetch('data/users.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const users = data.users || [];
                console.log(` Loaded ${users.length} users from JSON`);
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                return users;
            } catch (error) {
                console.error(' Failed to load users:', error);
                return [];
            }
        },

        async saveUsers(users) {
            console.log(' Saving users...');
            try {
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                console.log(' Users saved successfully');
                return true;
            } catch (error) {
                console.error(' Failed to save users:', error);
                return false;
            }
        },

        async saveProgress(progress) {
            console.log(' Saving progress...');
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                let progressList = cached ? JSON.parse(cached) : [];
                progressList.push(progress);
                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList));
                console.log(' Progress saved successfully');
                return true;
            } catch (error) {
                console.error(' Failed to save progress:', error);
                return false;
            }
        },

        async saveGoals(goal) {
            console.log(' Saving goal...');
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                let goalsList = cached ? JSON.parse(cached) : [];
                goalsList.push(goal);
                localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goalsList));
                console.log(' Goal saved successfully');
                return true;
            } catch (error) {
                console.error(' Failed to save goal:', error);
                return false;
            }
        },

        createSession(user) {
            console.log(' Creating session for user:', user.id);
            const sessionData = {
                userId: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                expires: Date.now() + 24 * 60 * 60 * 1000
            };
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
            console.log(' Session created');
        },

        async handleSubmit(event) {
            event.preventDefault();
            console.log(' Form submission started');
            console.log(' Current form data:', AppState.formData);

            if (!UI.validateStep1() || !UI.validateStep2() || !UI.validateStep3()) {
                console.log(' Validation failed');
                UI.showNotification('Please complete all steps correctly', 'error');
                return;
            }

            UI.showLoading();

            try {
                // Get invite code if any
                const inviteInput = document.getElementById('inviteCode');
                if (inviteInput?.value) {
                    AppState.formData.inviteCode = inviteInput.value.trim().toUpperCase();
                }

                // Load existing users
                console.log(' Step 1: Loading existing users');
                const users = await UI.loadUsers();
                console.log(` Found ${users.length} existing users`);

                // Check for duplicate email
                if (users.some(u => u.email === AppState.formData.email)) {
                    console.log(' Email already exists:', AppState.formData.email);
                    UI.showFieldError(document.getElementById('email'), 'This email is already registered');
                    UI.showNotification('Email already exists', 'error');
                    UI.hideLoading();
                    return;
                }

                // Generate user ID
                const userId = UI.generateUserId(users);
                console.log(' Generated user ID:', userId);

                // Process invite code
                console.log(' Processing invite code:', AppState.formData.invateCode);
                const inviteResult = await UI.processInviteCode(AppState.formData.inviteCode, userId);
                console.log(' Invite result:', inviteResult);

                // Create user object
                const newUser = {
                    id: userId,
                    firstName: AppState.formData.firstName,
                    lastName: AppState.formData.lastName,
                    email: AppState.formData.email,
                    phone: AppState.formData.phone,
                    password: UI.hashPassword(AppState.formData.password),
                    profile: {
                        occupation: AppState.formData.occupation.toLowerCase().replace(/\s+/g, ''),
                        incomeRange: AppState.formData.incomeRange,
                        dateOfBirth: '',
                        county: '',
                        constituency: '',
                        gender: ''
                    },
                    goals: AppState.formData.goals,
                    financialScore: UI.calculateFinancialScore(),
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

                console.log('New user object:', newUser);

                // Save user
                users.push(newUser);
                const userSaved = await UI.saveUsers(users);
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
                const progressSaved = await UI.saveProgress(newProgress);
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
                const goalSaved = await UI.saveGoals(defaultGoal);
                if (!goalSaved) throw new Error('Failed to save goal');

                // Create session
                UI.createSession(newUser);

                // Show success message
                if (inviteResult.bonus > 0) {
                    UI.showNotification(`🎉 Welcome! You've received Ksh ${inviteResult.bonus} bonus!`, 'success');
                } else {
                    UI.showNotification('Account created successfully!', 'success');
                }

                console.log('Registration complete! Redirecting...');

                // Redirect to home page
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } catch (error) {
                console.error('Registration error:', error);
                console.error('Error details:', error.message);
                UI.showNotification('Registration failed. Please try again.', 'error');
                UI.hideLoading();
            }
        },

        handleUrlParams() {
            console.log('🔗 Checking URL parameters');
            const urlParams = new URLSearchParams(window.location.search);
            
            const email = urlParams.get('email');
            if (email) {
                document.getElementById('email').value = email;
                console.log('Email pre-filled from URL:', email);
            }
            
            const phone = urlParams.get('phone');
            if (phone) {
                document.getElementById('phone').value = phone.replace(/[^0-9]/g, '');
                console.log('Phone pre-filled from URL:', phone);
            }
            
            const invite = urlParams.get('invite') || urlParams.get('ref');
            if (invite) {
                const inviteInput = document.getElementById('inviteCode');
                if (inviteInput) {
                    inviteInput.value = invite;
                    setTimeout(() => {
                        const event = new Event('input', { bubbles: true });
                        inviteInput.dispatchEvent(event);
                    }, 500);
                    console.log('Invite code pre-filled from URL:', invite);
                }
            }
        }
    };

    //==============================================================================
    // INITIALIZATION
    //==============================================================================

    function initialize() {
        console.log('🚀 Register page initializing...');
        AppState.initialize();

        UI.setupPasswordToggles();
        UI.setupProfileButtons();
        UI.setupIncomeSelect();
        UI.setupGoalCheckboxes();
        UI.setupRealTimeValidation();
        UI.setupStepNavigation();
        UI.setupInviteCodeValidation();
        UI.handleUrlParams();

        // Bind methods to maintain 'this' context
        UI.checkPasswordMatch = UI.checkPasswordMatch.bind(UI);

        // Handle form submission
        document.getElementById('registrationForm').addEventListener('submit', (e) => UI.handleSubmit(e));

        console.log(' Register page initialized');

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
            .field-feedback i {
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    document.addEventListener('DOMContentLoaded', initialize);

})();