(function() {
    'use strict';

    // CONFIGURATION

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        GOALS: 'pesasmart_goals',
        TRANSACTIONS: 'pesasmart_transactions',
        PROGRESS: 'pesasmart_progress',
        PRODUCTS: 'pesasmart_products',
        INSURANCE: 'pesasmart_insurance'
    };

    // STATE MANAGEMENT

    const AppState = {
        user: null,
        profile: null,
        products: [],
        insurance: [],
        goals: [],
        transactions: [],
        progress: null,
        currentFilter: 'all',
        isLoading: false,

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

        async loadProducts() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.products = data.products || [];
                    return;
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
                    sector: "Telecommunications"
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
                    sector: "Banking"
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
                    issuer: "Central Bank of Kenya"
                }
            ];
        },

        async loadInsurance() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.INSURANCE);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.insurance = data.products || [];
                    return;
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

            // UPDATED: Consistent goal loading
            async loadGoals() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.goals = data.goals?.filter(g => g.userId === this.user.userId) || [];
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
                    this.transactions = data.transactions?.filter(t => t.userId === this.user.userId) || [];
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
                    this.progress = data.progress?.find(p => p.userId === this.user.userId) || null;
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

        async saveTransaction(transaction) {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                const data = cached ? JSON.parse(cached) : { transactions: [] };
                
                data.transactions.push(transaction);
                data._timestamp = Date.now();
                
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data));
                this.transactions.push(transaction);
                
                // Notify profile and index pages
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
                const goalIndex = data.goals.findIndex(g => g.id === goalId);
                
                if (goalIndex >= 0) {
                    data.goals[goalIndex].savedAmount += amount;
                    data._timestamp = Date.now();
                    
                    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(data));
                    
                    // Update local goals array
                    const localGoal = this.goals.find(g => g.id === goalId);
                    if (localGoal) localGoal.savedAmount += amount;
                    
                    // Notify profile and index pages
                    window.dispatchEvent(new CustomEvent('pesasmart-goal-update', {
                        detail: { goalId, amount, userId: this.user.userId }
                    }));
                    
                    return true;
                }
            } catch (error) {
                console.error('Failed to update goal:', error);
            }
            return false;
        }
    };

    // UI COMPONENTS (Remains the same - no changes needed)

    const UI = {
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
            newLoader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            newLoader.innerHTML = `
                <div class="bg-white rounded-lg p-6 text-center">
                    <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 mx-auto"></div>
                    <p class="text-gray-700">${message}</p>
                </div>
            `;
            document.body.appendChild(newLoader);
        },

        hideLoading() {
            AppState.isLoading = false;
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 300);
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

        confirmAction(options) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 animate-fade-in">
                        <div class="text-center mb-6">
                            <div class="w-16 h-16 ${options.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas ${options.type === 'danger' ? 'fa-exclamation-triangle text-red-600' : 'fa-question-circle text-yellow-600'} text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">${options.title}</h3>
                            <p class="text-gray-600">${options.message}</p>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium" id="modal-cancel">
                                ${options.cancelText || 'Cancel'}
                            </button>
                            <button class="flex-1 px-6 py-3 ${options.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded-lg transition font-medium" id="modal-confirm">
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

        updateNavbar() {
            const navbar = document.querySelector('nav .flex.items-center.space-x-4');
            if (!navbar) return;

            const userName = AppState.user?.name || 'User';

            navbar.innerHTML = `
                <div class="hidden md:flex items-center space-x-4">
                    <div class="relative">
                        <i class="fas fa-bell text-gray-600 text-xl hover:text-green-600 cursor-pointer" id="notification-bell"></i>
                        <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center notification-count">${this.getNotificationCount()}</span>
                    </div>
                    <div class="relative" id="user-menu-container">
                        <button class="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition" id="user-menu-button">
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-green-600"></i>
                            </div>
                            <span class="font-medium">${userName}</span>
                            <i class="fas fa-chevron-down text-xs ml-1"></i>
                        </button>
                        
                        <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden z-50" id="user-dropdown">
                            <a href="profile.html" class="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600">
                                <i class="fas fa-user mr-2"></i> My Profile
                            </a>
                            <a href="profile.html#goals" class="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600">
                                <i class="fas fa-bullseye mr-2"></i> My Goals
                            </a>
                            <hr class="my-2 border-gray-200">
                            <button class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50" id="logout-button">
                                <i class="fas fa-sign-out-alt mr-2"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
                
                <button class="md:hidden text-gray-700 hover:text-green-600 focus:outline-none" id="mobile-menu-button">
                    <i class="fas fa-bars text-2xl"></i>
                </button>
            `;

            this.setupUserDropdown();
            this.setupMobileMenu();
            
            document.getElementById('logout-button')?.addEventListener('click', () => this.handleLogout());
            document.getElementById('notification-bell')?.addEventListener('click', () => this.showNotifications());
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
                    <a href="index.html" class="block py-2 text-gray-700 hover:text-green-600">
                        <i class="fas fa-home mr-2"></i>Home
                    </a>
                    <a href="learn.html" class="block py-2 text-gray-700 hover:text-green-600">
                        <i class="fas fa-book mr-2"></i>Learn
                    </a>
                    <a href="practice.html" class="block py-2 text-gray-700 hover:text-green-600">
                        <i class="fas fa-gamepad mr-2"></i>Practice
                    </a>
                    <a href="act.html" class="block py-2 text-green-600 font-medium">
                        <i class="fas fa-briefcase mr-2"></i>Act
                    </a>
                    <hr class="my-2">
                    <a href="profile.html" class="block py-2 text-gray-700 hover:text-green-600">
                        <i class="fas fa-user mr-2"></i>Profile
                    </a>
                    <button id="mobile-logout" class="w-full text-left py-2 text-red-600 hover:bg-red-50">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
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
            if (AppState.progress?.completedModules?.length < 3) count++;
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
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Notifications</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${notifications.map(n => `
                            <div class="p-4 ${n.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'} rounded-lg">
                                <div class="flex items-start">
                                    <div class="w-8 h-8 ${n.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mr-3">
                                        <i class="fas ${n.icon} ${n.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}"></i>
                                    </div>
                                    <div>
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
            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        },

        async handleLogout() {
            const confirmed = await this.confirmAction({
                title: 'Log Out',
                message: 'Are you sure you want to log out?',
                confirmText: 'Log Out',
                type: 'warning'
            });

            if (!confirmed) return;

            this.showLoading('Logging out...');

            try {
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
            });
        },

        renderProducts() {
            this.renderInvestments();
            this.renderInsurance();
            this.renderLoans();
            this.updateActionProgress();
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

            document.querySelectorAll('.invest-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.productId;
                    const product = investmentProducts.find(p => p.id === productId);
                    if (product) this.openInvestmentModal(product);
                });
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
                <div class="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition product-card" data-product-id="${product.id}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-3">
                                <i class="fas ${icon} ${textColor}"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">${product.name}</h3>
                                <p class="text-gray-600 text-sm">${product.symbol || ''} • Ksh ${product.price.toFixed(2)}</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                            ${expectedReturn}
                        </span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3">${product.description || ''}</p>
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-700 font-medium">Min: ${this.formatCurrency(product.minInvestment)}</p>
                            <p class="text-gray-500 text-xs">${sharesForMin} shares for min</p>
                        </div>
                        <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition invest-btn" data-product-id="${product.id}">
                            Invest
                        </button>
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

            document.querySelectorAll('.insurance-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.productId;
                    const product = AppState.insurance.find(p => p.id === productId);
                    if (product) this.openInsuranceModal(product);
                });
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
                'INS001': 'bg-cyan-100 text-cyan-600',
                'INS002': 'bg-orange-100 text-orange-600',
                'INS003': 'bg-pink-100 text-pink-600',
                'INS004': 'bg-purple-100 text-purple-600'
            };

            const icon = icons[product.id] || 'fa-shield-alt';
            const colorClass = colors[product.id] || 'bg-green-100 text-green-600';

            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition insurance-card" data-product-id="${product.id}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${colorClass.split(' ')[0]} rounded-lg flex items-center justify-center mr-3">
                                <i class="fas ${icon} ${colorClass.split(' ')[1]}"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">${product.name}</h3>
                                <p class="text-gray-600 text-sm">${product.category}</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                            Ksh ${product.premium}/mo
                        </span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3">${product.description}</p>
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-700 font-medium">Cover: ${this.formatCurrency(product.coverage || 0)}</p>
                            <p class="text-gray-500 text-xs">${product.trigger?.type || 'Traditional'}</p>
                        </div>
                        <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition insurance-btn" data-product-id="${product.id}">
                            Get Covered
                        </button>
                    </div>
                </div>
            `;
        },

        renderLoans() {
            const container = document.querySelector('.space-y-4.mb-6');
            if (!container) return;

            const bronzeCompleted = AppState.progress?.completedModules?.includes('MOD003') || false;

            container.innerHTML = `
                <div class="border border-green-200 rounded-lg p-4 bg-green-50 loan-card" data-loan-type="graduate">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="font-semibold text-gray-800">PesaSmart Graduate Rate</h3>
                        <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold">
                            8% interest
                        </span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3">Special rate for completing Bronze learning path</p>
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-700 font-medium">Up to Ksh 20,000</p>
                            <p class="text-gray-500 text-xs">${bronzeCompleted ? 'Eligible ✓' : 'Complete Bronze path to unlock'}</p>
                        </div>
                        <button class="${bronzeCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 cursor-not-allowed'} text-white px-4 py-2 rounded-lg text-sm font-medium transition loan-apply-btn" data-loan="graduate" ${bronzeCompleted ? '' : 'disabled'}>
                            Apply
                        </button>
                    </div>
                </div>

                <div class="border border-green-200 rounded-lg p-4 bg-green-50 loan-card" data-loan-type="school">
                    <h3 class="font-semibold text-gray-800 mb-2">School Fees Advance</h3>
                    <p class="text-gray-600 text-sm mb-3">Bridge financing for education expenses</p>
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-700 font-medium">Up to Ksh 50,000</p>
                            <p class="text-gray-500 text-xs">Repay over 6 months</p>
                        </div>
                        <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition loan-details-btn" data-loan="school">
                            Details
                        </button>
                    </div>
                </div>

                <div class="border border-green-200 rounded-lg p-4 bg-green-50 loan-card" data-loan-type="business">
                    <h3 class="font-semibold text-gray-800 mb-2">Business Inventory Loan</h3>
                    <p class="text-gray-600 text-sm mb-3">For small retailers</p>
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-700 font-medium">Up to Ksh 30,000</p>
                            <p class="text-gray-500 text-xs">Daily repayment option</p>
                        </div>
                        <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition loan-details-btn" data-loan="business">
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
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">${detail.title}</h3>
                        <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-gray-50 p-3 rounded-lg">
                                <p class="text-xs text-gray-600">Loan Amount</p>
                                <p class="font-bold">${detail.amount}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg">
                                <p class="text-xs text-gray-600">Term</p>
                                <p class="font-bold">${detail.term}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg">
                                <p class="text-xs text-gray-600">Interest Rate</p>
                                <p class="font-bold">${detail.rate}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg">
                                <p class="text-xs text-gray-600">Fees</p>
                                <p class="font-bold">${detail.fees}</p>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-bold mb-2">Requirements</h4>
                            <ul class="space-y-1">
                                ${detail.requirements.map(r => `
                                    <li class="text-sm flex items-center">
                                        <i class="fas fa-check-circle text-green-500 mr-2"></i>${r}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition" onclick="this.closest('.fixed').remove(); UI.openLoanApplicationModal('${type}')">
                            Apply Now
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        },

        openLoanApplicationModal(type) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            const maxAmount = type === 'graduate' ? 20000 : (type === 'school' ? 50000 : 30000);
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Loan Application</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Loan Amount (Ksh)</label>
                        <input type="number" id="loan-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" 
                               value="${maxAmount}" min="1000" max="${maxAmount}">
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Loan Term (Months)</label>
                        <select id="loan-term" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                            <option value="3">3 months</option>
                            <option value="6" selected>6 months</option>
                            <option value="12">12 months</option>
                        </select>
                    </div>
                    
                    <div class="bg-green-50 rounded-lg p-4 mb-6">
                        <div class="flex justify-between mb-2">
                            <span>Monthly Payment:</span>
                            <span class="font-bold" id="monthly-payment">Ksh 0</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span>Total Interest:</span>
                            <span class="font-bold text-orange-600" id="total-interest">Ksh 0</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Total Repayment:</span>
                            <span class="font-bold text-green-600" id="total-repayment">Ksh 0</span>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="cancel-loan">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="submit-loan">
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
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Your Personalized Rates</h3>
                        <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times"></i>
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

        updateActionProgress() {
            const investmentBar = document.querySelector('.bg-green-500.h-2.rounded-full');
            const insuranceBar = document.querySelector('.bg-success-500.h-2.rounded-full');
            const loanBar = document.querySelectorAll('.bg-green-500.h-2.rounded-full')[1];

            const investmentReadiness = Math.min(85, 60 + (AppState.progress?.completedModules?.length * 5 || 0));
            const insuranceKnowledge = Math.min(70, 40 + (AppState.transactions.filter(t => t.type === 'insurance').length * 10));
            const loanUnderstanding = Math.min(90, 70 + (AppState.progress?.completedModules?.length * 2 || 0));

            if (investmentBar) {
                investmentBar.style.width = investmentReadiness + '%';
                investmentBar.parentElement.previousElementSibling.querySelector('.font-semibold').textContent = investmentReadiness + '%';
            }

            if (insuranceBar) {
                insuranceBar.style.width = insuranceKnowledge + '%';
                insuranceBar.parentElement.previousElementSibling.querySelector('.font-semibold').textContent = insuranceKnowledge + '%';
            }

            if (loanBar) {
                loanBar.style.width = loanUnderstanding + '%';
                loanBar.parentElement.previousElementSibling.querySelector('.font-semibold').textContent = loanUnderstanding + '%';
            }

            const goToModuleBtn = document.querySelector('.text-green-600.hover\\:text-green-700.text-sm.font-medium.mt-2');
            if (goToModuleBtn) {
                goToModuleBtn.addEventListener('click', () => {
                    window.location.href = 'learn.html?module=MOD004';
                });
            }

            const downloadPlanBtn = document.querySelector('.border-2.border-green-500');
            if (downloadPlanBtn) {
                downloadPlanBtn.addEventListener('click', () => this.downloadActionPlan());
            }
        },

        downloadActionPlan() {
            const plan = {
                user: AppState.user?.name || 'User',
                generatedAt: new Date().toISOString(),
                investmentReadiness: Math.min(85, 60 + (AppState.progress?.completedModules?.length * 5 || 0)),
                insuranceKnowledge: Math.min(70, 40 + (AppState.transactions.filter(t => t.type === 'insurance').length * 10)),
                loanUnderstanding: Math.min(90, 70 + (AppState.progress?.completedModules?.length * 2 || 0)),
                recommendedActions: [
                    AppState.progress?.completedModules?.length < 3 ? 'Complete Bronze learning path for better loan rates' : 'Consider applying for PesaSmart Graduate Loan',
                    AppState.transactions.filter(t => t.type === 'insurance').length === 0 ? 'Start with rainfall insurance for Ksh 200/month' : 'Increase insurance coverage',
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

        openInvestmentModal(product) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Invest in ${product.name}</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-6">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <i class="fas fa-chart-line text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-gray-600 text-sm">Current Price</p>
                                <p class="text-2xl font-bold text-green-600">${this.formatCurrency(product.price)}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-2 mb-4">
                            <div class="bg-gray-50 p-3 rounded-lg text-center">
                                <p class="text-xs text-gray-600">Min Investment</p>
                                <p class="font-bold">${this.formatCurrency(product.minInvestment)}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg text-center">
                                <p class="text-xs text-gray-600">Risk Level</p>
                                <p class="font-bold capitalize">${product.risk}</p>
                            </div>
                            <div class="bg-gray-50 p-3 rounded-lg text-center">
                                <p class="text-xs text-gray-600">Expected Return</p>
                                <p class="font-bold">${this.formatReturn(product.expectedReturn)}</p>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 font-medium mb-2">Investment Amount (Ksh)</label>
                            <input type="number" id="invest-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" 
                                   min="${product.minInvestment}" value="${product.minInvestment}" step="100">
                        </div>
                        
                        <div class="bg-green-50 rounded-lg p-4 mb-4">
                            <div class="flex justify-between mb-2">
                                <span>Shares to receive:</span>
                                <span class="font-bold" id="shares-to-receive">${(product.minInvestment / product.price).toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between mb-2">
                                <span>Estimated annual return:</span>
                                <span class="font-bold text-green-600" id="estimated-return">${this.formatCurrency(product.minInvestment * (this.getReturnRate(product) / 100))}</span>
                            </div>
                        </div>
                        
                        ${AppState.goals.length > 0 ? `
                            <div class="mb-4">
                                <label class="block text-gray-700 font-medium mb-2">Link to Goal (Optional)</label>
                                <select id="link-goal" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                                    <option value="">-- Select a goal --</option>
                                    ${AppState.goals.map(g => `<option value="${g.id}">${g.name} (${this.formatCurrency(g.savedAmount)}/${this.formatCurrency(g.targetAmount)})</option>`).join('')}
                                </select>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex space-x-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="cancel-invest">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="confirm-invest">
                            Invest Now
                        </button>
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
            document.getElementById('cancel-invest').addEventListener('click', () => modal.remove());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('confirm-invest').addEventListener('click', async () => {
                const amount = parseFloat(amountInput.value);
                const goalId = document.getElementById('link-goal')?.value;
                
                if (amount < product.minInvestment) {
                    this.showNotification(`Minimum investment is ${this.formatCurrency(product.minInvestment)}`, 'error');
                    return;
                }

                await this.processInvestment(product, amount, goalId);
                modal.remove();
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
        },

        openInsuranceModal(product) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Get ${product.name}</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-6">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mr-3">
                                <i class="fas fa-shield-alt text-cyan-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-gray-600 text-sm">Monthly Premium</p>
                                <p class="text-2xl font-bold text-green-600">${this.formatCurrency(product.premium)}</p>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 class="font-bold mb-2">Coverage Details</h4>
                            <p class="text-gray-600 mb-2">${product.description}</p>
                            <div class="grid grid-cols-2 gap-2 mt-3">
                                <div class="text-sm">
                                    <span class="text-gray-600">Coverage:</span>
                                    <span class="font-bold ml-2">${this.formatCurrency(product.coverage || 0)}</span>
                                </div>
                                <div class="text-sm">
                                    <span class="text-gray-600">Duration:</span>
                                    <span class="font-bold ml-2">${product.duration || '30 days'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-green-50 rounded-lg p-4 mb-4">
                            <h4 class="font-bold mb-2">Features</h4>
                            <ul class="space-y-1">
                                ${(product.features || []).map(f => `
                                    <li class="text-sm flex items-center">
                                        <i class="fas fa-check-circle text-green-500 mr-2"></i>${f}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="cancel-insurance">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="confirm-insurance">
                            Purchase for ${this.formatCurrency(product.premium)}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            document.getElementById('cancel-insurance').addEventListener('click', () => modal.remove());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('confirm-insurance').addEventListener('click', async () => {
                await this.processInsurancePurchase(product);
                modal.remove();
            });
        },

        async processInsurancePurchase(product) {
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
        },

        showInsuranceComparison() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-3xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Insurance Comparison</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <table class="w-full">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="py-3 px-4 text-left">Product</th>
                                <th class="py-3 px-4 text-left">Premium</th>
                                <th class="py-3 px-4 text-left">Coverage</th>
                                <th class="py-3 px-4 text-left">Type</th>
                                <th class="py-3 px-4 text-left"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AppState.insurance.map(p => `
                                <tr class="border-b">
                                    <td class="py-3 px-4 font-medium">${p.name}</td>
                                    <td class="py-3 px-4">${this.formatCurrency(p.premium)}/mo</td>
                                    <td class="py-3 px-4">${this.formatCurrency(p.coverage || 0)}</td>
                                    <td class="py-3 px-4 capitalize">${p.category}</td>
                                    <td class="py-3 px-4">
                                        <button class="text-green-600 hover:text-green-700 text-sm font-medium compare-select" data-id="${p.id}">
                                            Select
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
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

        showAllInvestmentsModal(products) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-4xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">All Investment Options (${products.length})</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${products.map(p => `
                            <div class="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer all-product-card" data-id="${p.id}">
                                <div class="flex items-center mb-2">
                                    <div class="w-10 h-10 ${p.category === 'bond' ? 'bg-green-100' : p.category === 'mutual_fund' ? 'bg-purple-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mr-3">
                                        <i class="fas ${p.category === 'bond' ? 'fa-landmark' : p.category === 'mutual_fund' ? 'fa-chart-pie' : 'fa-chart-line'} text-gray-600"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold">${p.name}</h4>
                                        <p class="text-xs text-gray-600">${p.symbol || ''}</p>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-600 mb-2">${p.description || ''}</p>
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-green-600">${this.formatCurrency(p.price)}</span>
                                    <span class="text-xs ${p.risk === 'low' ? 'text-green-600' : p.risk === 'medium' ? 'text-yellow-600' : 'text-red-600'} capitalize">${p.risk} risk</span>
                                </div>
                            </div>
                        `).join('')}
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
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        formatCurrency(amount) {
            return 'Ksh ' + amount.toLocaleString('en-KE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        }
    };

    // INITIALIZATION

    async function initialize() {
        UI.showLoading();

        const success = await AppState.initialize();
        if (!success) {
            UI.hideLoading();
            return;
        }

        UI.updateNavbar();
        UI.setupFilters();
        UI.renderProducts();

        UI.hideLoading();
    }

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

    document.addEventListener('DOMContentLoaded', initialize);

})();