(function() {
    'use strict';

    // CONFIGURATION & CONSTANTS

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        GOALS: 'pesasmart_goals',
        TRANSACTIONS: 'pesasmart_transactions',
        PROGRESS: 'pesasmart_progress',
        PRODUCTS: 'pesasmart_products',
        INSURANCE: 'pesasmart_insurance',
        CART: 'pesasmart_cart'
    };

    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // STATE MANAGEMENT

    const AppState = {
        user: null,
        profile: null,
        products: [],
        insurance: [],
        goals: [],
        transactions: [],
        progress: null,
        cart: [],
        currentFilter: 'all',
        isLoading: false,
        networkStatus: navigator.onLine,

        async initialize() {
            this.user = this.getCurrentUser();
            if (!this.user) {
                window.location.href = 'login.html?redirect=act.html';
                return false;
            }

            await this.loadProducts();
            await this.loadInsurance();
            await this.loadGoals();
            await this.loadTransactions();
            await this.loadProgress();
            await this.loadCart();
            this.setupNetworkListeners();
            this.listenForUpdates();
            return true;
        },

        getCurrentUser() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!session) return null;

            try {
                return JSON.parse(session);
            } catch {
                return null;
            }
        },

        setupNetworkListeners() {
            window.addEventListener('online', () => {
                this.networkStatus = true;
                UI.showNotification('Network restored. Syncing data...', 'success');
                this.syncData();
            });
            
            window.addEventListener('offline', () => {
                this.networkStatus = false;
                UI.showNotification('You are offline. Using cached data.', 'warning');
            });
        },

        listenForUpdates() {
            window.addEventListener('pesasmart-goals-update', (e) => {
                console.log('Goals update received:', e.detail);
                this.loadGoals();
            });

            window.addEventListener('pesasmart-transaction-update', (e) => {
                console.log('Transaction update received:', e.detail);
                this.loadTransactions();
            });
        },

        async syncData() {
            if (this.networkStatus) {
                // Could sync with server here
            }
        },

        async loadProducts() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
                if (cached) {
                    const data = JSON.parse(cached);
                    if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                        this.products = data.products || [];
                        return;
                    }
                }

                const response = await fetch('data/products.json');
                const data = await response.json();
                this.products = data.products || [];
                
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify({
                    products: this.products,
                    _timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Failed to load products:', error);
                this.products = this.getDefaultProducts();
            }
        },

        getDefaultProducts() {
            return [
                {
                    id: "PRD001",
                    name: "Safaricom PLC",
                    symbol: "SCOM",
                    category: "stock",
                    price: 14.50,
                    minInvestment: 100,
                    expectedReturn: { min: 8, max: 12 },
                    risk: "medium",
                    sector: "Telecommunications",
                    description: "Kenya's largest telecommunications company"
                },
                {
                    id: "PRD002",
                    name: "Equity Bank",
                    symbol: "EQTY",
                    category: "stock",
                    price: 38.20,
                    minInvestment: 100,
                    expectedReturn: { min: 7, max: 10 },
                    risk: "medium",
                    sector: "Banking",
                    description: "Leading financial services provider"
                },
                {
                    id: "PRD003",
                    name: "Treasury Bond",
                    symbol: "TB01",
                    category: "bond",
                    price: 100.00,
                    minInvestment: 500,
                    expectedReturn: { fixed: 12.5 },
                    risk: "low",
                    issuer: "Central Bank of Kenya",
                    description: "Government of Kenya infrastructure bond"
                }
            ];
        },

        async loadInsurance() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.INSURANCE);
                if (cached) {
                    const data = JSON.parse(cached);
                    if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                        this.insurance = data.products || [];
                        return;
                    }
                }

                const response = await fetch('data/insurance.json');
                const data = await response.json();
                this.insurance = data.products || [];
                
                localStorage.setItem(STORAGE_KEYS.INSURANCE, JSON.stringify({
                    products: this.insurance,
                    _timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Failed to load insurance:', error);
                this.insurance = [];
            }
        },

        async loadGoals() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                if (cached) {
                    const data = JSON.parse(cached);
                    const goals = Array.isArray(data) ? data : (data.goals || []);
                    this.goals = goals.filter(g => g.userId === this.user.userId);
                    return;
                }

                const response = await fetch('data/goals.json');
                const data = await response.json();
                const allGoals = data.goals || [];
                this.goals = allGoals.filter(g => g.userId === this.user.userId);
                
                localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify({
                    goals: allGoals,
                    _timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Failed to load goals:', error);
                this.goals = [];
            }
        },

        async loadTransactions() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                if (cached) {
                    const data = JSON.parse(cached);
                    const transactions = Array.isArray(data) ? data : (data.transactions || []);
                    this.transactions = transactions.filter(t => t.userId === this.user.userId);
                    return;
                }

                const response = await fetch('data/transactions.json');
                const data = await response.json();
                const allTransactions = data.transactions || [];
                this.transactions = allTransactions.filter(t => t.userId === this.user.userId);
                
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify({
                    transactions: allTransactions,
                    _timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Failed to load transactions:', error);
                this.transactions = [];
            }
        },

        async loadProgress() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                if (cached) {
                    const data = JSON.parse(cached);
                    const progress = Array.isArray(data) ? data : (data.progress || []);
                    this.progress = progress.find(p => p.userId === this.user.userId) || null;
                    return;
                }

                const response = await fetch('data/progress.json');
                const data = await response.json();
                const allProgress = data.progress || [];
                this.progress = allProgress.find(p => p.userId === this.user.userId) || null;
                
                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify({
                    progress: allProgress,
                    _timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Failed to load progress:', error);
                this.progress = null;
            }
        },

        async loadCart() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.CART);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.cart = data[this.user.userId] || [];
                }
            } catch (error) {
                console.error('Failed to load cart:', error);
                this.cart = [];
            }
        },

        async saveCart() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.CART);
                const carts = cached ? JSON.parse(cached) : {};
                carts[this.user.userId] = this.cart;
                localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(carts));
            } catch (error) {
                console.error('Failed to save cart:', error);
            }
        },

        async saveTransaction(transaction) {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                let data = cached ? JSON.parse(cached) : { transactions: [] };
                let transactions = Array.isArray(data) ? data : (data.transactions || []);
                
                transactions.push(transaction);
                
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify({
                    transactions: transactions,
                    _timestamp: Date.now()
                }));
                
                this.transactions.push(transaction);
                
                // Notify other pages
                window.dispatchEvent(new CustomEvent('pesasmart-transaction-update', {
                    detail: { transaction, userId: this.user.userId }
                }));
                
                return true;
            } catch (error) {
                console.error('Failed to save transaction:', error);
                return false;
            }
        },

        async updateGoalProgress(goalId, amount) {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                if (!cached) return false;

                const data = JSON.parse(cached);
                let goals = Array.isArray(data) ? data : (data.goals || []);
                
                const goalIndex = goals.findIndex(g => g.id === goalId);
                if (goalIndex >= 0) {
                    goals[goalIndex].savedAmount = (goals[goalIndex].savedAmount || 0) + amount;
                    
                    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify({
                        goals: goals,
                        _timestamp: Date.now()
                    }));
                    
                    // Update local goals array
                    const localGoal = this.goals.find(g => g.id === goalId);
                    if (localGoal) localGoal.savedAmount += amount;
                    
                    // Notify other pages
                    window.dispatchEvent(new CustomEvent('pesasmart-goals-update', {
                        detail: { goalId, amount, userId: this.user.userId }
                    }));
                    
                    return true;
                }
            } catch (error) {
                console.error('Failed to update goal:', error);
            }
            return false;
        },

        addToCart(item) {
            this.cart.push(item);
            this.saveCart();
        },

        removeFromCart(itemId) {
            this.cart = this.cart.filter(item => item.id !== itemId);
            this.saveCart();
        },

        clearCart() {
            this.cart = [];
            this.saveCart();
        },

        calculateInvestmentReadiness() {
            return Math.min(85, 60 + (this.progress?.completedModules?.length * 5 || 0));
        },

        calculateInsuranceKnowledge() {
            const insurancePurchases = this.transactions.filter(t => t.type === 'insurance').length;
            return Math.min(70, 40 + (insurancePurchases * 10));
        },

        calculateLoanUnderstanding() {
            return Math.min(90, 70 + (this.progress?.completedModules?.length * 2 || 0));
        },

        isBronzeCompleted() {
            return this.progress?.completedModules?.includes('MOD003') || false;
        }
    };

    // UI COMPONENTS - FULLY RESPONSIVE

    const UI = {
        // LOADING STATES

        showLoading(message = 'Loading marketplace...') {
            AppState.isLoading = true;
            
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
                <div class="bg-white rounded-xl p-6 text-center shadow-2xl max-w-sm mx-4">
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
                    <button class="ml-4 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-lg p-1" onclick="this.closest('[role=alert]').remove()">
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

        // CONFIRMATION MODAL

        confirmAction(options) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
                modal.setAttribute('aria-labelledby', 'confirm-title');
                modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                        <div class="text-center mb-6">
                            <div class="w-20 h-20 ${options.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas ${options.type === 'danger' ? 'fa-exclamation-triangle text-red-600' : 'fa-question-circle text-yellow-600'} text-3xl"></i>
                            </div>
                            <h3 id="confirm-title" class="text-xl font-bold text-gray-800 mb-2">${options.title}</h3>
                            <p class="text-gray-600">${options.message}</p>
                        </div>
                        
                        <div class="flex flex-col sm:flex-row gap-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" id="modal-cancel">
                                ${options.cancelText || 'Cancel'}
                            </button>
                            <button class="flex-1 px-6 py-3 ${options.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]" id="modal-confirm">
                                ${options.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                document.getElementById('modal-cancel').addEventListener('click', () => {
                    modal.remove();
                    resolve(false);
                });

                document.getElementById('modal-confirm').addEventListener('click', () => {
                    modal.remove();
                    resolve(true);
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                        resolve(false);
                    }
                });
            });
        },

        // NAVBAR MANAGEMENT

        updateNavbar() {
            const navbar = document.querySelector('nav .flex.items-center.space-x-4');
            if (!navbar || !AppState.user) return;

            const userName = AppState.user?.name || 'User';

            navbar.innerHTML = `
                <div class="hidden md:flex items-center space-x-4">
                    <button class="relative text-gray-600 hover:text-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px] min-w-[44px]" id="notification-bell" aria-label="Notifications">
                        <i class="fas fa-bell text-xl"></i>
                        <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center notification-count">${this.getNotificationCount()}</span>
                    </button>
                    <button class="relative text-gray-600 hover:text-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px] min-w-[44px]" id="cart-button" aria-label="Shopping Cart">
                        <i class="fas fa-shopping-cart text-xl"></i>
                        <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center cart-count">${AppState.cart.length}</span>
                    </button>
                    <div class="relative" id="user-menu-container">
                        <button class="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px]" id="user-menu-button">
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-green-600"></i>
                            </div>
                            <span class="font-medium hidden lg:inline">${userName}</span>
                            <i class="fas fa-chevron-down text-xs ml-1"></i>
                        </button>
                        
                        <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden z-50" id="user-dropdown">
                            <a href="profile.html" class="block px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-600 transition focus:outline-none focus:bg-green-50" tabindex="0">My Profile</a>
                            <a href="profile.html#goals" class="block px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-600 transition focus:outline-none focus:bg-green-50" tabindex="0">My Goals</a>
                            <hr class="my-2 border-gray-200">
                            <button class="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition focus:outline-none focus:bg-red-50" id="logout-button">Logout</button>
                        </div>
                    </div>
                </div>
                
                <button class="md:hidden text-gray-700 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px] min-w-[44px]" id="mobile-menu-button" aria-label="Menu">
                    <i class="fas fa-bars text-2xl"></i>
                </button>
            `;

            this.setupUserDropdown();
            this.setupMobileMenu();
            
            document.getElementById('logout-button')?.addEventListener('click', () => this.handleLogout());
            document.getElementById('notification-bell')?.addEventListener('click', () => this.showNotifications());
            document.getElementById('cart-button')?.addEventListener('click', () => this.showCart());
        },

        setupUserDropdown() {
            const menuButton = document.getElementById('user-menu-button');
            const dropdown = document.getElementById('user-dropdown');
            
            if (menuButton && dropdown) {
                menuButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('hidden');
                });

                document.addEventListener('click', (e) => {
                    if (!menuButton.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.classList.add('hidden');
                    }
                });

                const links = dropdown.querySelectorAll('a, button');
                links.forEach((link, index) => {
                    link.addEventListener('keydown', (e) => {
                        if (e.key === 'Tab') {
                            if (e.shiftKey && index === 0) {
                                e.preventDefault();
                                menuButton.focus();
                            } else if (!e.shiftKey && index === links.length - 1) {
                                e.preventDefault();
                                menuButton.focus();
                            }
                        }
                    });
                });
            }
        },

        setupMobileMenu() {
            const menuButton = document.getElementById('mobile-menu-button');
            let mobileContainer = document.getElementById('mobile-menu-container');
            
            if (!mobileContainer) {
                mobileContainer = document.createElement('div');
                mobileContainer.id = 'mobile-menu-container';
                mobileContainer.className = 'hidden md:hidden bg-white border-t mt-2';
                document.querySelector('nav .container').appendChild(mobileContainer);
            }

            if (!menuButton) return;

            mobileContainer.innerHTML = `
                <div class="px-4 py-2 space-y-2">
                    <a href="index.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Home</a>
                    <a href="learn.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Learn</a>
                    <a href="practice.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Practice</a>
                    <a href="act.html" class="block py-3 px-4 text-green-600 font-medium hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Act</a>
                    <hr class="my-2">
                    <a href="profile.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Profile</a>
                    <button id="mobile-logout" class="w-full text-left py-3 px-4 text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500">Logout</button>
                </div>
            `;

            menuButton.addEventListener('click', () => {
                mobileContainer.classList.toggle('hidden');
            });

            document.getElementById('mobile-logout')?.addEventListener('click', () => this.handleLogout());
        },

        getNotificationCount() {
            let count = 0;
            if (AppState.goals?.some(g => this.isGoalNearing(g))) count++;
            if (AppState.cart.length > 0) count++;
            return Math.min(count, 9);
        },

        isGoalNearing(goal) {
            if (!goal.deadline || goal.status === 'completed') return false;
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft < 30;
        },

        showNotifications() {
            const notifications = [];

            if (AppState.goals) {
                AppState.goals.forEach(goal => {
                    if (this.isGoalNearing(goal)) {
                        notifications.push({
                            title: 'Goal Nearing',
                            message: `"${goal.name}" is due soon. Consider investing to reach your target.`,
                            type: 'warning',
                            icon: 'fa-clock',
                            time: 'Now'
                        });
                    }
                });
            }

            if (AppState.cart.length > 0) {
                notifications.push({
                    title: 'Items in Cart',
                    message: `You have ${AppState.cart.length} item${AppState.cart.length > 1 ? 's' : ''} in your cart.`,
                    type: 'info',
                    icon: 'fa-shopping-cart',
                    time: 'Now'
                });
            }

            if (notifications.length === 0) {
                notifications.push({
                    title: 'Welcome to Marketplace',
                    message: 'Explore investment opportunities tailored for you.',
                    type: 'info',
                    icon: 'fa-info-circle',
                    time: 'Now'
                });
            }

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">Notifications</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-notifications">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${notifications.map(n => `
                            <div class="p-4 ${n.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'} rounded-lg animate-fade-in">
                                <div class="flex items-start">
                                    <div class="w-10 h-10 ${n.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                        <i class="fas ${n.icon} ${n.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}"></i>
                                    </div>
                                    <div class="flex-1">
                                        <h4 class="font-semibold">${n.title}</h4>
                                        <p class="text-sm text-gray-600">${n.message}</p>
                                        <p class="text-xs text-gray-500 mt-1">${n.time}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.getElementById('close-notifications').addEventListener('click', () => modal.remove());
        },

        showCart() {
            if (AppState.cart.length === 0) {
                this.showNotification('Your cart is empty', 'info');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            
            let total = 0;
            const cartItems = AppState.cart.map(item => {
                total += item.amount || item.premium || 0;
                return `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-gray-800 truncate">${item.name}</h4>
                            <p class="text-sm text-gray-600">${item.type === 'investment' ? 'Investment' : 'Insurance'}</p>
                        </div>
                        <div class="text-right ml-2">
                            <p class="font-semibold text-green-600">${this.formatCurrency(item.amount || item.premium || 0)}</p>
                            <button class="text-red-600 hover:text-red-700 text-sm remove-from-cart" data-id="${item.id}">Remove</button>
                        </div>
                    </div>
                `;
            }).join('');

            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Your Cart (${AppState.cart.length})</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-modal">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3 mb-6 max-h-64 overflow-y-auto">
                        ${cartItems}
                    </div>
                    
                    <div class="border-t pt-4 mb-6">
                        <div class="flex justify-between items-center">
                            <span class="font-bold">Total:</span>
                            <span class="text-2xl font-bold text-green-600">${this.formatCurrency(total)}</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" id="clear-cart">
                            Clear Cart
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="checkout">
                            Checkout
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            
            document.querySelectorAll('.remove-from-cart').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    AppState.removeFromCart(id);
                    this.showNotification('Item removed from cart', 'info');
                    modal.remove();
                    this.updateNavbar();
                });
            });

            document.getElementById('clear-cart').addEventListener('click', () => {
                AppState.clearCart();
                this.showNotification('Cart cleared', 'info');
                modal.remove();
                this.updateNavbar();
            });

            document.getElementById('checkout').addEventListener('click', () => {
                this.processCheckout();
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        async processCheckout() {
            this.showLoading('Processing your order...');

            try {
                for (const item of AppState.cart) {
                    if (item.type === 'investment') {
                        await this.processInvestment(item, item.amount);
                    } else if (item.type === 'insurance') {
                        await this.processInsurancePurchase(item);
                    }
                }

                AppState.clearCart();
                this.updateNavbar();
                this.showNotification('Order completed successfully!', 'success');

            } catch (error) {
                console.error('Checkout error:', error);
                this.showNotification('Checkout failed. Please try again.', 'error');
            } finally {
                this.hideLoading();
            }
        },

        async handleLogout() {
            const confirmed = await this.confirmAction({
                title: 'Log Out',
                message: 'Are you sure you want to log out? Your cart will be saved.',
                confirmText: 'Log Out',
                type: 'warning'
            });

            if (!confirmed) return;

            this.showLoading('Logging out...');

            try {
                await AppState.saveCart();
                localStorage.removeItem(STORAGE_KEYS.SESSION);
                
                this.showNotification('Logged out successfully', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

            } catch (error) {
                console.error('Logout error:', error);
                this.showNotification('Logout failed', 'error');
                this.hideLoading();
            }
        },

        // FILTER SYSTEM

        setupFilters() {
            const filterBtns = document.querySelectorAll('.flex.flex-wrap.gap-2 button');
            
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => {
                        b.classList.remove('bg-green-500', 'text-white');
                        b.classList.add('bg-gray-200', 'text-gray-800');
                    });
                    btn.classList.remove('bg-gray-200', 'text-gray-800');
                    btn.classList.add('bg-green-500', 'text-white');
                    
                    AppState.currentFilter = btn.textContent.trim().toLowerCase();
                    this.renderProducts();
                });

                // Touch optimization
                btn.classList.add('min-h-[44px]', 'px-4', 'py-2');
            });
        },

        // PRODUCT RENDERING

        renderProducts() {
            this.renderInvestments();
            this.renderInsurance();
            this.renderLoans();
            this.updateActionProgress();
            this.setupSavingsTools();
        },

        renderInvestments() {
            const container = document.querySelector('.space-y-4');
            if (!container) return;

            const investmentProducts = AppState.products.filter(p => 
                ['stock', 'bond', 'mutual_fund'].includes(p.category)
            );

            if (investmentProducts.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No investment products available</p>';
                return;
            }

            container.innerHTML = investmentProducts.map(product => this.renderInvestmentCard(product)).join('');

            document.querySelectorAll('.invest-btn, .add-to-cart-btn').forEach(btn => {
                if (btn.classList.contains('invest-btn')) {
                    btn.addEventListener('click', () => {
                        const productId = btn.dataset.productId;
                        const product = investmentProducts.find(p => p.id === productId);
                        if (product) this.openInvestmentModal(product);
                    });
                } else {
                    btn.addEventListener('click', () => {
                        const productId = btn.dataset.productId;
                        const product = investmentProducts.find(p => p.id === productId);
                        if (product) {
                            const cartItem = {
                                id: product.id + Date.now(),
                                type: 'investment',
                                name: product.name,
                                amount: product.minInvestment,
                                productId: product.id
                            };
                            AppState.addToCart(cartItem);
                            this.showNotification('Added to cart', 'success');
                            this.updateNavbar();
                        }
                    });
                }
            });

            const browseLink = document.querySelector('.mt-6.text-center a');
            if (browseLink) {
                browseLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAllInvestmentsModal(investmentProducts);
                });
            }
        },

        renderInvestmentCard(product) {
            const icon = product.category === 'bond' ? 'fa-landmark' : 
                        product.category === 'mutual_fund' ? 'fa-chart-pie' : 'fa-chart-line';
            
            const bgColor = product.category === 'bond' ? 'bg-green-100' :
                           product.category === 'mutual_fund' ? 'bg-purple-100' : 'bg-blue-100';
            
            const textColor = product.category === 'bond' ? 'text-green-600' :
                             product.category === 'mutual_fund' ? 'text-purple-600' : 'text-blue-600';

            const expectedReturn = product.expectedReturn?.min && product.expectedReturn?.max ?
                `${product.expectedReturn.min}-${product.expectedReturn.max}%` :
                product.expectedReturn?.fixed ? `${product.expectedReturn.fixed}%` : 'Variable';

            const sharesForMin = (product.minInvestment / product.price).toFixed(1);

            return `
                <div class="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition product-card" data-product-id="${product.id}">
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between mb-3">
                        <div class="flex items-center mb-2 sm:mb-0">
                            <div class="w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas ${icon} ${textColor} text-xl"></i>
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-semibold text-gray-800 truncate">${product.name}</h3>
                                <p class="text-gray-600 text-sm">${product.symbol || ''} • Ksh ${product.price.toFixed(2)}</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto">
                            ${expectedReturn}
                        </span>
                    </div>
                    
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description || ''}</p>
                    
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <p class="text-gray-700 font-medium">Min: ${this.formatCurrency(product.minInvestment)}</p>
                            <p class="text-gray-500 text-xs">${sharesForMin} shares for min</p>
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto">
                            <button class="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] invest-btn" data-product-id="${product.id}">
                                Invest
                            </button>
                            <button class="flex-1 sm:flex-none border border-green-500 text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] add-to-cart-btn" data-product-id="${product.id}">
                                <i class="fas fa-cart-plus"></i>
                                <span class="hidden sm:inline ml-1">Cart</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        renderInsurance() {
            const container = document.querySelectorAll('.space-y-4')[1];
            if (!container) return;

            // Fix color classes
            document.querySelectorAll('.bg-success-100').forEach(el => {
                el.classList.remove('bg-success-100');
                el.classList.add('bg-green-100');
            });

            if (!AppState.insurance || AppState.insurance.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No insurance products available</p>';
                return;
            }

            container.innerHTML = AppState.insurance.map(product => this.renderInsuranceCard(product)).join('');

            document.querySelectorAll('.insurance-btn, .add-to-cart-btn').forEach(btn => {
                if (btn.classList.contains('insurance-btn')) {
                    btn.addEventListener('click', () => {
                        const productId = btn.dataset.productId;
                        const product = AppState.insurance.find(p => p.id === productId);
                        if (product) this.openInsuranceModal(product);
                    });
                } else {
                    btn.addEventListener('click', () => {
                        const productId = btn.dataset.productId;
                        const product = AppState.insurance.find(p => p.id === productId);
                        if (product) {
                            const cartItem = {
                                id: product.id + Date.now(),
                                type: 'insurance',
                                name: product.name,
                                premium: product.premium,
                                productId: product.id
                            };
                            AppState.addToCart(cartItem);
                            this.showNotification('Added to cart', 'success');
                            this.updateNavbar();
                        }
                    });
                }
            });

            const compareLink = document.querySelectorAll('.mt-6.text-center a')[1];
            if (compareLink) {
                compareLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showInsuranceComparison();
                });
            }
        },

        renderInsuranceCard(product) {
            const icons = {
                'INS001': 'fa-cloud-rain',
                'INS002': 'fa-motorcycle',
                'INS003': 'fa-heartbeat',
                'INS004': 'fa-mobile-alt'
            };
            
            const colors = {
                'INS001': ['bg-cyan-100', 'text-cyan-600'],
                'INS002': ['bg-orange-100', 'text-orange-600'],
                'INS003': ['bg-pink-100', 'text-pink-600'],
                'INS004': ['bg-purple-100', 'text-purple-600']
            };

            const icon = icons[product.id] || 'fa-shield-alt';
            const colorSet = colors[product.id] || ['bg-green-100', 'text-green-600'];

            return `
                <div class="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition insurance-card" data-product-id="${product.id}">
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between mb-3">
                        <div class="flex items-center mb-2 sm:mb-0">
                            <div class="w-12 h-12 ${colorSet[0]} rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas ${icon} ${colorSet[1]} text-xl"></i>
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-semibold text-gray-800 truncate">${product.name}</h3>
                                <p class="text-gray-600 text-sm">${product.category}</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto">
                            Ksh ${product.premium}/mo
                        </span>
                    </div>
                    
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description}</p>
                    
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <p class="text-gray-700 font-medium">Cover: ${this.formatCurrency(product.coverage || 0)}</p>
                            <p class="text-gray-500 text-xs">${product.trigger?.type || 'Traditional'}</p>
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto">
                            <button class="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] insurance-btn" data-product-id="${product.id}">
                                Get Covered
                            </button>
                            <button class="flex-1 sm:flex-none border border-green-500 text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] add-to-cart-btn" data-product-id="${product.id}">
                                <i class="fas fa-cart-plus"></i>
                                <span class="hidden sm:inline ml-1">Cart</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        renderLoans() {
            const container = document.querySelector('.space-y-4.mb-6');
            if (!container) return;

            const bronzeCompleted = AppState.isBronzeCompleted();

            container.innerHTML = `
                <div class="border border-green-200 rounded-xl p-4 bg-green-50 hover:shadow-lg transition loan-card" data-loan-type="graduate">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                        <h3 class="font-semibold text-gray-800 mb-1 sm:mb-0">PesaSmart Graduate Rate</h3>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            8% interest
                        </span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3">Special rate for completing Bronze learning path</p>
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <p class="text-gray-700 font-medium">Up to Ksh 20,000</p>
                            <p class="text-gray-500 text-xs">${bronzeCompleted ? 'Eligible ✓' : 'Complete Bronze path to unlock'}</p>
                        </div>
                        <button class="w-full sm:w-auto px-4 py-2 ${bronzeCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 cursor-not-allowed'} text-white rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] loan-apply-btn" data-loan="graduate" ${bronzeCompleted ? '' : 'disabled'}>
                            Apply Now
                        </button>
                    </div>
                </div>

                <div class="border border-green-200 rounded-xl p-4 bg-green-50 hover:shadow-lg transition loan-card" data-loan-type="school">
                    <h3 class="font-semibold text-gray-800 mb-2">School Fees Advance</h3>
                    <p class="text-gray-600 text-sm mb-3">Bridge financing for education expenses</p>
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <p class="text-gray-700 font-medium">Up to Ksh 50,000</p>
                            <p class="text-gray-500 text-xs">Repay over 6 months</p>
                        </div>
                        <button class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] loan-details-btn" data-loan="school">
                            Details
                        </button>
                    </div>
                </div>

                <div class="border border-green-200 rounded-xl p-4 bg-green-50 hover:shadow-lg transition loan-card" data-loan-type="business">
                    <h3 class="font-semibold text-gray-800 mb-2">Business Inventory Loan</h3>
                    <p class="text-gray-600 text-sm mb-3">For small retailers</p>
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <p class="text-gray-700 font-medium">Up to Ksh 30,000</p>
                            <p class="text-gray-500 text-xs">Daily repayment option</p>
                        </div>
                        <button class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] loan-details-btn" data-loan="business">
                            Details
                        </button>
                    </div>
                </div>
            `;

            document.querySelectorAll('.loan-apply-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', () => this.openLoanApplicationModal('graduate'));
            });

            document.querySelectorAll('.loan-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const type = e.target.dataset.loan;
                    this.showLoanDetails(type);
                });
            });

            const checkRatesBtn = document.querySelector('.text-center .bg-green-500');
            if (checkRatesBtn) {
                checkRatesBtn.addEventListener('click', () => this.showLoanRates());
                checkRatesBtn.classList.add('min-h-[44px]');
            }
        },

        showLoanDetails(type) {
            const details = {
                school: {
                    title: 'School Fees Advance',
                    amount: 'Up to Ksh 50,000',
                    term: '6 months',
                    rate: '12% APR',
                    fees: 'Processing fee: Ksh 200',
                    requirements: ['Valid student ID', 'School admission letter', 'Parent/guardian ID']
                },
                business: {
                    title: 'Business Inventory Loan',
                    amount: 'Up to Ksh 30,000',
                    term: '3-12 months',
                    rate: '15% APR',
                    fees: 'Processing fee: Ksh 150',
                    requirements: ['Business registration', '3 months M-Pesa statements', 'ID card']
                }
            };

            const detail = details[type];
            if (!detail) return;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">${detail.title}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <p class="text-xs text-gray-600">Loan Amount</p>
                                <p class="font-bold text-lg">${detail.amount}</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <p class="text-xs text-gray-600">Term</p>
                                <p class="font-bold text-lg">${detail.term}</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <p class="text-xs text-gray-600">Interest Rate</p>
                                <p class="font-bold text-lg">${detail.rate}</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <p class="text-xs text-gray-600">Fees</p>
                                <p class="font-bold text-lg">${detail.fees}</p>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-bold mb-2">Requirements</h4>
                            <ul class="space-y-2">
                                ${detail.requirements.map(r => `
                                    <li class="text-sm flex items-start">
                                        <i class="fas fa-check-circle text-green-500 mt-1 mr-2 flex-shrink-0"></i>
                                        <span>${r}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" onclick="this.closest('.fixed').remove(); UI.openLoanApplicationModal('${type}')">
                            Apply Now
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        openLoanApplicationModal(type) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            
            const maxAmount = type === 'graduate' ? 20000 : (type === 'school' ? 50000 : 30000);
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Loan Application</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-modal">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Loan Amount (Ksh)</label>
                        <input type="number" id="loan-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                               value="${maxAmount}" min="1000" max="${maxAmount}" step="1000">
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Loan Term (Months)</label>
                        <select id="loan-term" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="3">3 months</option>
                            <option value="6" selected>6 months</option>
                            <option value="12">12 months</option>
                        </select>
                    </div>
                    
                    <div class="bg-green-50 rounded-lg p-4 mb-6">
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-700">Monthly Payment:</span>
                            <span class="font-bold text-green-600" id="monthly-payment">Ksh 0</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-700">Total Interest:</span>
                            <span class="font-bold text-orange-600" id="total-interest">Ksh 0</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-700">Total Repayment:</span>
                            <span class="font-bold text-green-600" id="total-repayment">Ksh 0</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" id="cancel-loan">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="submit-loan">
                            Submit Application
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const amountInput = document.getElementById('loan-amount');
            const termSelect = document.getElementById('loan-term');
            
            const updateCalculations = () => {
                const amount = parseFloat(amountInput.value) || 0;
                const months = parseInt(termSelect.value) || 6;
                const rate = type === 'graduate' ? 0.08 : (type === 'school' ? 0.12 : 0.15);
                
                const monthlyRate = rate / 12;
                const monthlyPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                                       (Math.pow(1 + monthlyRate, months) - 1);
                const totalRepayment = monthlyPayment * months;
                const totalInterest = totalRepayment - amount;
                
                document.getElementById('monthly-payment').textContent = this.formatCurrency(monthlyPayment);
                document.getElementById('total-interest').textContent = this.formatCurrency(totalInterest);
                document.getElementById('total-repayment').textContent = this.formatCurrency(totalRepayment);
            };

            amountInput.addEventListener('input', updateCalculations);
            termSelect.addEventListener('change', updateCalculations);
            updateCalculations();

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            document.getElementById('cancel-loan').addEventListener('click', () => modal.remove());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('submit-loan').addEventListener('click', async () => {
                const amount = parseFloat(amountInput.value);
                const months = parseInt(termSelect.value);
                
                const transaction = {
                    id: 'TXN' + Date.now(),
                    userId: AppState.user.userId,
                    type: 'loan',
                    amount: amount,
                    term: months,
                    status: 'pending',
                    date: new Date().toISOString(),
                    notes: `${type} loan application`
                };
                
                await AppState.saveTransaction(transaction);
                this.showNotification('Loan application submitted successfully!', 'success');
                modal.remove();
            });
        },

        showLoanRates() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Your Personalized Rates</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="p-4 bg-green-50 rounded-lg">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-bold">PesaSmart Graduate</h4>
                                <span class="text-green-600 font-bold">8% APR</span>
                            </div>
                            <p class="text-sm text-gray-600">Based on your completed Bronze path</p>
                        </div>
                        
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-bold">Standard Personal Loan</h4>
                                <span class="text-gray-800 font-bold">12% APR</span>
                            </div>
                            <p class="text-sm text-gray-600">Complete more modules to unlock better rates</p>
                        </div>
                        
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-bold">Business Loan</h4>
                                <span class="text-gray-800 font-bold">15% APR</span>
                            </div>
                            <p class="text-sm text-gray-600">Available for registered businesses</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        // ACTION PROGRESS

        updateActionProgress() {
            const investmentBar = document.querySelector('.bg-green-500.h-2.rounded-full');
            const insuranceBar = document.querySelector('.bg-success-500.h-2.rounded-full');
            const loanBar = document.querySelectorAll('.bg-green-500.h-2.rounded-full')[1];

            const investmentReadiness = AppState.calculateInvestmentReadiness();
            const insuranceKnowledge = AppState.calculateInsuranceKnowledge();
            const loanUnderstanding = AppState.calculateLoanUnderstanding();

            if (investmentBar) {
                investmentBar.style.width = investmentReadiness + '%';
                const percentEl = investmentBar.parentElement.previousElementSibling.querySelector('.font-semibold');
                if (percentEl) percentEl.textContent = investmentReadiness + '%';
            }

            if (insuranceBar) {
                insuranceBar.style.width = insuranceKnowledge + '%';
                const percentEl = insuranceBar.parentElement.previousElementSibling.querySelector('.font-semibold');
                if (percentEl) percentEl.textContent = insuranceKnowledge + '%';
                
                // Fix color
                insuranceBar.classList.remove('bg-success-500');
                insuranceBar.classList.add('bg-green-500');
            }

            if (loanBar) {
                loanBar.style.width = loanUnderstanding + '%';
                const percentEl = loanBar.parentElement.previousElementSibling.querySelector('.font-semibold');
                if (percentEl) percentEl.textContent = loanUnderstanding + '%';
            }

            const goToModuleBtn = document.querySelector('.text-green-600.hover\\:text-green-700.text-sm.font-medium.mt-2');
            if (goToModuleBtn) {
                goToModuleBtn.addEventListener('click', () => {
                    window.location.href = 'learn.html?module=MOD004';
                });
                goToModuleBtn.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }

            const downloadPlanBtn = document.querySelector('.border-2.border-green-500');
            if (downloadPlanBtn) {
                downloadPlanBtn.addEventListener('click', () => this.downloadActionPlan());
                downloadPlanBtn.classList.add('min-h-[44px]');
            }
        },

        downloadActionPlan() {
            const plan = {
                user: AppState.user?.name || 'User',
                generatedAt: new Date().toISOString(),
                investmentReadiness: AppState.calculateInvestmentReadiness(),
                insuranceKnowledge: AppState.calculateInsuranceKnowledge(),
                loanUnderstanding: AppState.calculateLoanUnderstanding(),
                recommendedActions: [
                    AppState.isBronzeCompleted() ? 
                        'Consider applying for PesaSmart Graduate Loan' : 
                        'Complete Bronze learning path for better loan rates',
                    AppState.transactions.filter(t => t.type === 'insurance').length === 0 ? 
                        'Start with rainfall insurance for Ksh 200/month' : 
                        'Increase insurance coverage',
                    'Set up automatic savings with M-Pesa round-ups',
                    'Review your investment portfolio monthly'
                ]
            };

            const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pesasmart-action-plan-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showNotification('Action plan downloaded!', 'success');
        },

        // INVESTMENT MODAL

        openInvestmentModal(product) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'invest-title');
            
            const sharesForMin = (product.minInvestment / product.price).toFixed(2);
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 id="invest-title" class="text-xl font-bold">Invest in ${product.name}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-modal">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="mb-6">
                        <div class="flex items-center mb-4">
                            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-chart-line text-blue-600 text-2xl"></i>
                            </div>
                            <div>
                                <p class="text-gray-600 text-sm">Current Price</p>
                                <p class="text-2xl font-bold text-green-600">${this.formatCurrency(product.price)}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            <div class="bg-gray-50 p-3 rounded-lg text-center">
                                <p class="text-xs text-gray-600">Min Investment</p>
                                <p class="font-bold">${this.formatCurrency(product.minInvestment)}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg text-center">
                                <p class="text-xs text-gray-600">Risk Level</p>
                                <p class="font-bold capitalize">${product.risk}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg text-center col-span-2 sm:col-span-1">
                                <p class="text-xs text-gray-600">Expected Return</p>
                                <p class="font-bold">${this.formatReturn(product.expectedReturn)}</p>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 font-medium mb-2">Investment Amount (Ksh)</label>
                            <input type="number" id="invest-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                                   min="${product.minInvestment}" value="${product.minInvestment}" step="100">
                        </div>
                        
                        <div class="bg-green-50 rounded-lg p-4 mb-4">
                            <div class="flex justify-between mb-2">
                                <span class="text-gray-700">Shares to receive:</span>
                                <span class="font-bold" id="shares-to-receive">${sharesForMin}</span>
                            </div>
                            <div class="flex justify-between mb-2">
                                <span class="text-gray-700">Estimated annual return:</span>
                                <span class="font-bold text-green-600" id="estimated-return">${this.formatCurrency(product.minInvestment * (this.getReturnRate(product) / 100))}</span>
                            </div>
                        </div>
                        
                        ${AppState.goals.length > 0 ? `
                            <div class="mb-4">
                                <label class="block text-gray-700 font-medium mb-2">Link to Goal (Optional)</label>
                                <select id="link-goal" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                    <option value="">-- Select a goal --</option>
                                    ${AppState.goals.map(g => `<option value="${g.id}">${g.name} (${this.formatCurrency(g.savedAmount)}/${this.formatCurrency(g.targetAmount)})</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}
                        
                        <div class="flex space-x-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" id="add-to-cart">
                                Add to Cart
                            </button>
                            <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="buy-now">
                                Buy Now
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const amountInput = document.getElementById('invest-amount');
            const sharesSpan = document.getElementById('shares-to-receive');
            const returnSpan = document.getElementById('estimated-return');

            amountInput.addEventListener('input', () => {
                const amount = parseFloat(amountInput.value) || product.minInvestment;
                sharesSpan.textContent = (amount / product.price).toFixed(2);
                returnSpan.textContent = this.formatCurrency(amount * (this.getReturnRate(product) / 100));
            });

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            
            document.getElementById('add-to-cart').addEventListener('click', () => {
                const amount = parseFloat(amountInput.value) || product.minInvestment;
                const cartItem = {
                    id: product.id + Date.now(),
                    type: 'investment',
                    name: product.name,
                    amount: amount,
                    productId: product.id,
                    price: product.price,
                    shares: amount / product.price
                };
                AppState.addToCart(cartItem);
                this.showNotification('Added to cart', 'success');
                this.updateNavbar();
                modal.remove();
            });

            document.getElementById('buy-now').addEventListener('click', async () => {
                const amount = parseFloat(amountInput.value) || product.minInvestment;
                const goalId = document.getElementById('link-goal')?.value;
                
                if (amount < product.minInvestment) {
                    this.showNotification(`Minimum investment is ${this.formatCurrency(product.minInvestment)}`, 'error');
                    return;
                }

                await this.processInvestment(product, amount, goalId);
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        getReturnRate(product) {
            if (product.expectedReturn?.min && product.expectedReturn?.max) {
                return (product.expectedReturn.min + product.expectedReturn.max) / 2;
            }
            return product.expectedReturn?.fixed || product.expectedReturn?.variable || 8;
        },

        formatReturn(expectedReturn) {
            if (expectedReturn?.min && expectedReturn?.max) {
                return `${expectedReturn.min}-${expectedReturn.max}%`;
            }
            if (expectedReturn?.fixed) {
                return `${expectedReturn.fixed}%`;
            }
            return 'Variable';
        },

        async processInvestment(product, amount, goalId) {
            this.showLoading('Processing your investment...');

            try {
                const transaction = {
                    id: 'TXN' + Date.now(),
                    userId: AppState.user.userId,
                    type: 'investment',
                    productId: product.id,
                    productName: product.name,
                    amount: amount,
                    shares: amount / product.price,
                    price: product.price,
                    status: 'completed',
                    date: new Date().toISOString(),
                    notes: `Investment in ${product.name}`
                };

                const saved = await AppState.saveTransaction(transaction);
                
                if (saved && goalId) {
                    await AppState.updateGoalProgress(goalId, amount);
                }

                this.showNotification(`Successfully invested ${this.formatCurrency(amount)} in ${product.name}!`, 'success');
                this.updateActionProgress();

            } catch (error) {
                console.error('Investment error:', error);
                this.showNotification('Investment failed. Please try again.', 'error');
            } finally {
                this.hideLoading();
            }
        },

        // INSURANCE MODAL

        openInsuranceModal(product) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Get ${product.name}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-modal">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="mb-6">
                        <div class="flex items-center mb-4">
                            <div class="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-shield-alt text-cyan-600 text-2xl"></i>
                            </div>
                            <div>
                                <p class="text-gray-600 text-sm">Monthly Premium</p>
                                <p class="text-2xl font-bold text-green-600">${this.formatCurrency(product.premium)}</p>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 class="font-bold mb-2">Coverage Details</h4>
                            <p class="text-gray-600 mb-2">${product.description}</p>
                            <div class="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                    <p class="text-xs text-gray-600">Coverage</p>
                                    <p class="font-bold">${this.formatCurrency(product.coverage || 0)}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-600">Duration</p>
                                    <p class="font-bold">${product.duration || '30 days'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-green-50 rounded-lg p-4 mb-4">
                            <h4 class="font-bold mb-2">Features</h4>
                            <ul class="space-y-2">
                                ${(product.features || []).map(f => `
                                    <li class="text-sm flex items-start">
                                        <i class="fas fa-check-circle text-green-500 mt-1 mr-2 flex-shrink-0"></i>
                                        <span>${f}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" id="add-to-cart">
                            Add to Cart
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="buy-now">
                            Buy Now
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            
            document.getElementById('add-to-cart').addEventListener('click', () => {
                const cartItem = {
                    id: product.id + Date.now(),
                    type: 'insurance',
                    name: product.name,
                    premium: product.premium,
                    productId: product.id
                };
                AppState.addToCart(cartItem);
                this.showNotification('Added to cart', 'success');
                this.updateNavbar();
                modal.remove();
            });

            document.getElementById('buy-now').addEventListener('click', async () => {
                await this.processInsurancePurchase(product);
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        async processInsurancePurchase(product) {
            this.showLoading('Processing your purchase...');

            try {
                const transaction = {
                    id: 'TXN' + Date.now(),
                    userId: AppState.user.userId,
                    type: 'insurance',
                    productId: product.id,
                    productName: product.name,
                    amount: product.premium,
                    status: 'completed',
                    date: new Date().toISOString(),
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: `${product.name} policy`
                };

                await AppState.saveTransaction(transaction);
                this.showNotification(`Successfully purchased ${product.name}!`, 'success');
                this.updateActionProgress();

            } catch (error) {
                console.error('Insurance purchase error:', error);
                this.showNotification('Purchase failed. Please try again.', 'error');
            } finally {
                this.hideLoading();
            }
        },

        // INSURANCE COMPARISON

        showInsuranceComparison() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-4xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">Insurance Comparison</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-modal">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[600px]">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="py-3 px-4 text-left">Product</th>
                                    <th class="py-3 px-4 text-left">Premium</th>
                                    <th class="py-3 px-4 text-left">Coverage</th>
                                    <th class="py-3 px-4 text-left">Type</th>
                                    <th class="py-3 px-4 text-left">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${AppState.insurance.map(p => `
                                    <tr class="border-b hover:bg-gray-50 transition">
                                        <td class="py-3 px-4 font-medium">${p.name}</td>
                                        <td class="py-3 px-4">${this.formatCurrency(p.premium)}/mo</td>
                                        <td class="py-3 px-4">${this.formatCurrency(p.coverage || 0)}</td>
                                        <td class="py-3 px-4 capitalize">${p.category}</td>
                                        <td class="py-3 px-4">
                                            <button class="text-green-600 hover:text-green-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-3 py-2 min-h-[44px] compare-select" data-id="${p.id}">
                                                Select
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            
            document.querySelectorAll('.compare-select').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const product = AppState.insurance.find(p => p.id === id);
                    if (product) {
                        modal.remove();
                        this.openInsuranceModal(product);
                    }
                });
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        // ALL INVESTMENTS MODAL

        showAllInvestmentsModal(products) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-4xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">All Investment Options (${products.length})</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-modal">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${products.map(p => {
                            const icon = p.category === 'bond' ? 'fa-landmark' : 
                                        p.category === 'mutual_fund' ? 'fa-chart-pie' : 'fa-chart-line';
                            const bgColor = p.category === 'bond' ? 'bg-green-100' :
                                           p.category === 'mutual_fund' ? 'bg-purple-100' : 'bg-blue-100';
                            
                            return `
                                <div class="border rounded-xl p-4 hover:shadow-lg transition cursor-pointer all-product-card focus:outline-none focus:ring-2 focus:ring-green-500" 
                                     data-id="${p.id}" tabindex="0" role="button">
                                    <div class="flex items-center mb-2">
                                        <div class="w-12 h-12 ${bgColor} rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                            <i class="fas ${icon} text-gray-600 text-xl"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <h4 class="font-bold truncate">${p.name}</h4>
                                            <p class="text-xs text-gray-600">${p.symbol || ''}</p>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-2 line-clamp-2">${p.description || ''}</p>
                                    <div class="flex justify-between items-center">
                                        <span class="font-bold text-green-600">${this.formatCurrency(p.price)}</span>
                                        <span class="text-xs ${p.risk === 'low' ? 'text-green-600' : p.risk === 'medium' ? 'text-yellow-600' : 'text-red-600'} capitalize">${p.risk} risk</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            
            document.querySelectorAll('.all-product-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    const product = products.find(p => p.id === id);
                    if (product) {
                        modal.remove();
                        this.openInvestmentModal(product);
                    }
                });

                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const id = card.dataset.id;
                        const product = products.find(p => p.id === id);
                        if (product) {
                            modal.remove();
                            this.openInvestmentModal(product);
                        }
                    }
                });
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        // SAVINGS TOOLS

        setupSavingsTools() {
            const goalBasedBtn = document.querySelector('.bg-blue-50');
            const roundupBtn = document.querySelector('.bg-green-50');
            const chamaBtn = document.querySelector('.bg-purple-50');
            const setupBtn = document.querySelector('.bg-gray-800');

            if (goalBasedBtn) {
                goalBasedBtn.addEventListener('click', () => {
                    window.location.href = 'profile.html#goals';
                });
                goalBasedBtn.classList.add('cursor-pointer', 'min-h-[44px]');
            }

            if (roundupBtn) {
                roundupBtn.addEventListener('click', () => {
                    this.showRoundUpSetup();
                });
                roundupBtn.classList.add('cursor-pointer', 'min-h-[44px]');
            }

            if (chamaBtn) {
                chamaBtn.addEventListener('click', () => {
                    this.showNotification('Chama management tools coming soon!', 'info');
                });
                chamaBtn.classList.add('cursor-pointer', 'min-h-[44px]');
            }

            if (setupBtn) {
                setupBtn.addEventListener('click', () => {
                    window.location.href = 'profile.html#goals';
                });
                setupBtn.classList.add('min-h-[44px]');
            }
        },

        showRoundUpSetup() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">M-Pesa Round-Up Automator</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">Save automatically by rounding up your M-Pesa transactions to the nearest Ksh 10, 50, or 100.</p>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Round up to nearest:</label>
                        <select id="round-up-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="10">Ksh 10</option>
                            <option value="50" selected>Ksh 50</option>
                            <option value="100">Ksh 100</option>
                        </select>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Target Goal (Optional)</label>
                        <select id="round-up-goal" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="">-- No specific goal --</option>
                            ${AppState.goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="bg-green-50 rounded-lg p-4 mb-4">
                        <p class="text-sm text-gray-700">Based on your average 50 transactions per month, you could save approximately:</p>
                        <p class="text-2xl font-bold text-green-600 text-center mt-2">Ksh 2,500/month</p>
                    </div>
                    
                    <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="enable-roundup">
                        Enable Round-Up Savings
                    </button>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('enable-roundup').addEventListener('click', () => {
                const amount = document.getElementById('round-up-amount').value;
                const goalId = document.getElementById('round-up-goal').value;
                
                localStorage.setItem(`roundup_${AppState.user.userId}`, JSON.stringify({
                    enabled: true,
                    amount: parseInt(amount),
                    goalId: goalId,
                    createdAt: new Date().toISOString()
                }));
                
                this.showNotification(`Round-up savings enabled! Saving to nearest Ksh ${amount}`, 'success');
                modal.remove();
            });
        },

        // UTILITY FUNCTIONS

        formatCurrency(amount) {
            return 'Ksh ' + amount.toLocaleString('en-KE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        },

        // INITIALIZATION

        async initialize() {
            this.showLoading();

            const success = await AppState.initialize();
            if (!success) {
                this.hideLoading();
                return;
            }

            this.updateNavbar();
            this.setupFilters();
            this.renderProducts();

            this.hideLoading();

            // Announce for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = 'Marketplace loaded. You can browse investment and insurance products.';
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);

            console.log('Marketplace initialized');
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
        .product-card, .insurance-card, .loan-card {
            transition: all 0.2s ease;
        }
        .product-card:hover, .insurance-card:hover, .loan-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .product-card:focus-visible, .insurance-card:focus-visible, .loan-card:focus-visible,
        .all-product-card:focus-visible {
            outline: 2px solid #00B894;
            outline-offset: 2px;
        }
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        @media (max-width: 640px) {
            h1 {
                font-size: 1.875rem !important;
            }
            h2 {
                font-size: 1.5rem !important;
            }
            .text-3xl {
                font-size: 1.875rem !important;
            }
            button, a, [role="button"], .product-card, .insurance-card, .loan-card {
                min-height: 44px;
            }
            input, select {
                font-size: 16px !important;
            }
            .p-6 {
                padding: 1rem !important;
            }
        }
        @media (max-width: 768px) {
            .grid-cols-3 {
                gap: 0.5rem;
            }
            .text-2xl {
                font-size: 1.25rem !important;
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

    UI.initialize();

})();