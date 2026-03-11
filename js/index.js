(function() {
    'use strict';

    // CONFIGURATION & CONSTANTS

    const APP_VERSION = '2.0.0';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        GOALS: 'pesasmart_goals',
        TRANSACTIONS: 'pesasmart_transactions',
        PROGRESS: 'pesasmart_progress',
        PRODUCTS: 'pesasmart_products',
        MARKET: 'pesasmart_market',
        NOTIFICATIONS: 'pesasmart_notifications',
        CACHE_PREFIX: 'cache_'
    };

    // STATE MANAGEMENT

    const AppState = {
        user: null,
        profile: null,
        goals: [],
        transactions: [],
        progress: null,
        achievements: [],
        products: [],
        marketData: null,
        notifications: [],
        isLoggedIn: false,
        isLoading: false,
        lastSync: null,
        networkStatus: navigator.onLine,

        initialize() {
            this.checkSession();
            this.loadMarketData();
            this.setupNetworkListeners();
            this.listenForUpdates();
        },

        checkSession() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!session) {
                this.isLoggedIn = false;
                return false;
            }

            try {
                const sessionData = JSON.parse(session);
                if (sessionData.expires && sessionData.expires < Date.now()) {
                    localStorage.removeItem(STORAGE_KEYS.SESSION);
                    this.isLoggedIn = false;
                    return false;
                }

                this.user = sessionData;
                this.isLoggedIn = true;
                return true;

            } catch (e) {
                console.error('Session validation error:', e);
                this.isLoggedIn = false;
                return false;
            }
        },

        setupNetworkListeners() {
            window.addEventListener('online', () => {
                this.networkStatus = true;
                UI.showNotification('Network restored. Refreshing data...', 'success');
                this.loadAllData();
            });
            
            window.addEventListener('offline', () => {
                this.networkStatus = false;
                UI.showNotification('You are offline. Using cached data.', 'warning');
            });
        },

        listenForUpdates() {
            window.addEventListener('pesasmart-profile-update', (e) => {
                console.log('Received profile update:', e.detail);
                this.loadAllData();
            });

            window.addEventListener('pesasmart-goals-update', (e) => {
                console.log('Received goals update:', e.detail);
                this.loadGoals();
            });

            window.addEventListener('pesasmart-transactions-update', (e) => {
                console.log('Received transactions update:', e.detail);
                this.loadTransactions();
            });
        },

        async loadAllData() {
            if (!this.isLoggedIn) return;

            UI.showLoading('Loading your dashboard...');

            try {
                await Promise.all([
                    this.loadUserProfile(),
                    this.loadGoals(),
                    this.loadTransactions(),
                    this.loadProgress(),
                    this.loadProducts()
                ]);

                this.lastSync = Date.now();
                UI.hideLoading();
                return true;

            } catch (error) {
                console.error('Data loading error:', error);
                UI.showNotification('Failed to load some data. Using cached version.', 'warning');
                UI.hideLoading();
                return false;
            }
        },

        async loadUserProfile() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                let users = [];
                
                if (cached) {
                    const parsed = JSON.parse(cached);
                    users = Array.isArray(parsed) ? parsed : (parsed.users || []);
                }

                this.profile = users.find(u => u.id === this.user?.userId);
                return this.profile;
            } catch (error) {
                console.error('Failed to load user profile:', error);
                return null;
            }
        },

        async loadGoals() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                let goals = [];
                
                if (cached) {
                    const parsed = JSON.parse(cached);
                    goals = Array.isArray(parsed) ? parsed : (parsed.goals || []);
                }

                this.goals = goals.filter(g => g.userId === this.user?.userId);
                return this.goals;
            } catch (error) {
                console.error('Failed to load goals:', error);
                return [];
            }
        },

        async loadTransactions() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                let transactions = [];
                
                if (cached) {
                    const parsed = JSON.parse(cached);
                    transactions = Array.isArray(parsed) ? parsed : (parsed.transactions || []);
                }

                this.transactions = transactions.filter(t => t.userId === this.user?.userId);
                return this.transactions;
            } catch (error) {
                console.error('Failed to load transactions:', error);
                return [];
            }
        },

        async loadProgress() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                let progress = [];
                
                if (cached) {
                    const parsed = JSON.parse(cached);
                    progress = Array.isArray(parsed) ? parsed : (parsed.progress || []);
                }

                this.progress = progress.find(p => p.userId === this.user?.userId);
                return this.progress;
            } catch (error) {
                console.error('Failed to load progress:', error);
                return null;
            }
        },

        async loadProducts() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    this.products = Array.isArray(parsed) ? parsed : (parsed.products || []);
                    return this.products;
                }

                const response = await fetch('data/products.json');
                const data = await response.json();
                this.products = data.products || [];
                
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
                return this.products;
            } catch (error) {
                console.error('Failed to load products:', error);
                return [];
            }
        },

        async loadMarketData() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.MARKET);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    this.marketData = parsed;
                    return this.marketData;
                }

                const response = await fetch('data/market.json');
                const data = await response.json();
                this.marketData = data;
                
                localStorage.setItem(STORAGE_KEYS.MARKET, JSON.stringify(data));
                return this.marketData;
            } catch (error) {
                console.error('Failed to load market data:', error);
                return null;
            }
        },

        calculateTotalSaved() {
            return this.goals?.reduce((sum, g) => sum + (g.savedAmount || 0), 0) || 0;
        },

        calculateTotalInvested() {
            return this.transactions?.filter(t => t.type === 'investment')
                .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        },

        calculateActiveCovers() {
            return this.transactions?.filter(t => t.type === 'insurance').length || 0;
        },

        calculateCertificationProgress() {
            const completed = this.progress?.completedModules?.length || 0;
            const total = 8; // From courses.json
            return Math.round((completed / total) * 100);
        }
    };

    // UI COMPONENTS - FULLY RESPONSIVE

    const UI = {
        // LOADING STATES

        showLoading(message = 'Loading your dashboard...') {
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
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 transform transition-all scale-100">
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
                            <button class="flex-1 px-6 py-3 ${options.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${options.type === 'danger' ? 'focus:ring-red-500' : 'focus:ring-yellow-500'} min-h-[44px]" id="modal-confirm">
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
            if (!navbar) return;

            if (!AppState.isLoggedIn) {
                navbar.innerHTML = `
                    <a href="login.html" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px] inline-flex items-center">
                        Login
                    </a>
                    <button class="md:hidden text-gray-700 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px] min-w-[44px]" id="mobile-menu-button" aria-label="Menu">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                `;
                this.setupMobileMenu();
                return;
            }

            const userName = AppState.profile ? 
                `${AppState.profile.firstName || ''}`.trim() : 
                AppState.user?.name || 'User';

            navbar.innerHTML = `
                <div class="hidden md:flex items-center space-x-4">
                    <button class="relative text-gray-600 hover:text-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px] min-w-[44px]" id="notification-bell" aria-label="Notifications">
                        <i class="fas fa-bell text-xl"></i>
                        <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center notification-count">${this.getNotificationCount()}</span>
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
        },

        setupUserDropdown() {
            const menuButton = document.getElementById('user-menu-button');
            const dropdown = document.getElementById('user-dropdown');
            
            if (menuButton && dropdown) {
                menuButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('hidden');
                });

                // Close on click outside
                document.addEventListener('click', (e) => {
                    if (!menuButton.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.classList.add('hidden');
                    }
                });

                // Keyboard navigation
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

            if (!AppState.isLoggedIn) {
                mobileContainer.innerHTML = `
                    <div class="px-4 py-2 space-y-2">
                        <a href="index.html" class="block py-3 px-4 text-green-600 font-medium hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Home</a>
                        <a href="learn.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Learn</a>
                        <a href="practice.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Practice</a>
                        <a href="act.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Act</a>
                        <hr class="my-2">
                        <a href="login.html" class="block py-3 px-4 text-green-600 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Login</a>
                        <a href="register.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Register</a>
                    </div>
                `;
            } else {
                mobileContainer.innerHTML = `
                    <div class="px-4 py-2 space-y-2">
                        <a href="index.html" class="block py-3 px-4 text-green-600 font-medium hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Home</a>
                        <a href="learn.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Learn</a>
                        <a href="practice.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Practice</a>
                        <a href="act.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Act</a>
                        <hr class="my-2">
                        <a href="profile.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500" tabindex="0">Profile</a>
                        <button id="mobile-logout" class="w-full text-left py-3 px-4 text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500" tabindex="0">Logout</button>
                    </div>
                `;
            }

            menuButton.addEventListener('click', () => {
                mobileContainer.classList.toggle('hidden');
            });

            document.getElementById('mobile-logout')?.addEventListener('click', () => this.handleLogout());
        },

        getNotificationCount() {
            let count = 0;
            
            if (AppState.goals) {
                const now = new Date();
                const nearingGoals = AppState.goals.filter(goal => {
                    if (!goal.deadline || goal.status === 'completed') return false;
                    const deadline = new Date(goal.deadline);
                    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                    return daysLeft > 0 && daysLeft < 30;
                });
                count += nearingGoals.length;
            }
            
            if (AppState.progress?.kycStatus === 'pending') count += 1;
            
            return Math.min(count, 9);
        },

        showNotifications() {
            const notifications = [];

            // Goal notifications
            if (AppState.goals) {
                const now = new Date();
                AppState.goals.forEach(goal => {
                    if (goal.deadline && goal.status !== 'completed') {
                        const deadline = new Date(goal.deadline);
                        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                        
                        if (daysLeft > 0 && daysLeft < 30) {
                            notifications.push({
                                title: 'Goal Nearing Deadline',
                                message: `"${goal.name}" is due in ${daysLeft} days.`,
                                type: 'warning',
                                icon: 'fa-clock',
                                time: 'Now'
                            });
                        }
                    }
                });
            }

            // Market notifications
            if (AppState.marketData?.stocks) {
                const topGainer = AppState.marketData.stocks.sort((a, b) => b.changePercent - a.changePercent)[0];
                if (topGainer && topGainer.changePercent > 5) {
                    notifications.push({
                        title: 'Market Alert',
                        message: `${topGainer.name} is up ${topGainer.changePercent.toFixed(1)}%`,
                        type: 'info',
                        icon: 'fa-chart-line',
                        time: 'Now'
                    });
                }
            }

            if (notifications.length === 0) {
                notifications.push({
                    title: 'All Caught Up',
                    message: 'No new notifications',
                    type: 'info',
                    icon: 'fa-check-circle',
                    time: 'Now'
                });
            }

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">Notifications</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-notifications" aria-label="Close">
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
            
            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
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
                AppState.isLoggedIn = false;
                
                this.showNotification('Logged out successfully', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Logout error:', error);
                this.showNotification('Logout failed', 'error');
                this.hideLoading();
            }
        },

        // RENDER FUNCTIONS

        renderGuestView() {
            const heroCard = document.querySelector('.lg\\:w-1\\/2.relative .bg-white.rounded-2xl');
            if (heroCard) {
                heroCard.innerHTML = `
                    <div class="text-center py-8 px-4">
                        <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-circle text-green-600 text-5xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Welcome to PesaSmart!</h3>
                        <p class="text-gray-600 mb-6">Create an account to start your financial journey</p>
                        <div class="space-y-3 max-w-xs mx-auto">
                            <a href="register.html" class="block w-full bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]">
                                Create Free Account
                            </a>
                            <a href="login.html" class="block w-full border-2 border-green-500 text-green-600 py-3 px-4 rounded-lg font-semibold hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]">
                                Login
                            </a>
                        </div>
                    </div>
                `;
            }

            const goalsSection = document.querySelector('.py-16.bg-gray-50');
            if (goalsSection) goalsSection.style.display = 'none';
        },

        renderLoggedInView() {
            this.updateHeroSection();
            this.updateGoalsSection();
            this.renderMarketSummary();
            this.setupCharts();
        },

        updateHeroSection() {
            const heroCard = document.querySelector('.lg\\:w-1\\/2.relative .bg-white.rounded-2xl');
            if (!heroCard || !AppState.profile) return;

            const totalSaved = AppState.calculateTotalSaved();
            const totalInvested = AppState.calculateTotalInvested();
            const activeCovers = AppState.calculateActiveCovers();
            const progressPercent = AppState.calculateCertificationProgress();

            heroCard.innerHTML = `
                <div class="p-6">
                    <div class="flex items-center mb-6">
                        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-user-graduate text-green-600 text-2xl"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="font-bold text-lg truncate">Welcome back, ${AppState.profile.firstName || 'User'}!</h3>
                            <p class="text-gray-600 text-sm">Your financial journey continues</p>
                        </div>
                    </div>

                    <div class="mb-6">
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-700 text-sm">Financial Fitness Score</span>
                            <span class="font-bold text-green-600">${AppState.profile.financialScore || 4.2}/5</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">
                            ${progressPercent}% to PesaMaster Certification
                        </p>
                    </div>

                    <div class="grid grid-cols-3 gap-3 mb-6">
                        <div class="bg-green-50 rounded-lg p-3 text-center">
                            <div class="text-xl sm:text-2xl font-bold text-green-700 truncate">${this.formatCurrency(totalSaved)}</div>
                            <div class="text-xs sm:text-sm text-gray-600">Saved</div>
                        </div>
                        <div class="bg-green-50 rounded-lg p-3 text-center">
                            <div class="text-xl sm:text-2xl font-bold text-green-700 truncate">${this.formatCurrency(totalInvested)}</div>
                            <div class="text-xs sm:text-sm text-gray-600">Invested</div>
                        </div>
                        <div class="bg-green-50 rounded-lg p-3 text-center">
                            <div class="text-xl sm:text-2xl font-bold text-green-700">${activeCovers}</div>
                            <div class="text-xs sm:text-sm text-gray-600">Active Covers</div>
                        </div>
                    </div>

                    <a href="profile.html" class="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]">
                        View Full Dashboard
                    </a>
                </div>
            `;
        },

        updateGoalsSection() {
            const container = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2.gap-6');
            if (!container) return;

            if (!AppState.goals || AppState.goals.length === 0) {
                container.innerHTML = `
                    <div class="col-span-2 text-center py-12 bg-white rounded-xl px-4">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-bullseye text-gray-400 text-3xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">No Goals Yet</h3>
                        <p class="text-gray-600 mb-6">Create your first financial goal to start tracking progress</p>
                        <a href="profile.html#goals" class="inline-block bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]">
                            Create New Goal
                        </a>
                    </div>
                `;
                return;
            }

            container.innerHTML = AppState.goals.slice(0, 2).map(goal => this.renderGoalCard(goal)).join('');

            // Setup "Create New Goal" link
            const createLink = document.querySelector('a[href="#"].text-green-600');
            if (createLink) {
                createLink.href = 'profile.html#goals';
            }

            // Add click handlers for goal cards
            document.querySelectorAll('.goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    const goalId = card.dataset.id;
                    window.location.href = `profile.html#goal-${goalId}`;
                });

                // Keyboard support
                card.setAttribute('tabindex', '0');
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        window.location.href = `profile.html#goal-${card.dataset.id}`;
                    }
                });
            });
        },

        renderGoalCard(goal) {
            const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer goal-card focus:outline-none focus:ring-2 focus:ring-green-500" data-id="${goal.id}" tabindex="0" role="button">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center min-w-0 flex-1">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas ${this.getGoalIcon(goal.name)} text-green-600 text-xl"></i>
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-bold text-lg truncate">${goal.name}</h3>
                                <p class="text-gray-600 text-sm">Target: ${deadline.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ml-2">
                            ${percent}%
                        </span>
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600 truncate">${this.formatCurrency(goal.savedAmount)} saved</span>
                            <span class="font-semibold">${this.formatCurrency(goal.targetAmount)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div class="bg-green-500 h-3 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-clock mr-1"></i> ${daysLeft} days
                        </div>
                        <span class="text-green-600 hover:text-green-700 font-medium text-sm">View Details →</span>
                    </div>
                </div>
            `;
        },

        getGoalIcon(goalName) {
            const icons = {
                'Buy Land in Kiambu': 'fa-home',
                'University Fees': 'fa-graduation-cap',
                'Emergency Fund': 'fa-ambulance',
                'Business': 'fa-store',
                'Welding Machine': 'fa-tools',
                'Motorcycle': 'fa-motorcycle'
            };
            return icons[goalName] || 'fa-bullseye';
        },

        renderMarketSummary() {
            const quickActionsSection = document.querySelector('.py-16.bg-white');
            if (!quickActionsSection || !AppState.marketData) return;

            // Remove existing market summary if any
            const existing = document.getElementById('market-summary');
            if (existing) existing.remove();

            const marketDiv = document.createElement('div');
            marketDiv.id = 'market-summary';
            marketDiv.className = 'mt-12 px-4';
            
            const stocks = AppState.marketData.stocks || [];
            const topGainers = [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
            const topLosers = [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

            marketDiv.innerHTML = `
                <h3 class="text-2xl font-bold text-center text-gray-800 mb-6">Market Summary</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h4 class="font-bold text-lg mb-4 flex items-center">
                            <i class="fas fa-arrow-up text-green-500 mr-2"></i> Top Gainers
                        </h4>
                        <div class="space-y-3">
                            ${topGainers.map(stock => `
                                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition">
                                    <div class="min-w-0 flex-1">
                                        <span class="font-medium">${stock.symbol}</span>
                                        <span class="text-sm text-gray-600 ml-2 hidden sm:inline">${stock.name}</span>
                                    </div>
                                    <span class="text-green-600 font-semibold ml-2">+${stock.changePercent.toFixed(2)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-lg p-6">
                        <h4 class="font-bold text-lg mb-4 flex items-center">
                            <i class="fas fa-arrow-down text-red-500 mr-2"></i> Top Losers
                        </h4>
                        <div class="space-y-3">
                            ${topLosers.map(stock => `
                                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition">
                                    <div class="min-w-0 flex-1">
                                        <span class="font-medium">${stock.symbol}</span>
                                        <span class="text-sm text-gray-600 ml-2 hidden sm:inline">${stock.name}</span>
                                    </div>
                                    <span class="text-red-600 font-semibold ml-2">${stock.changePercent.toFixed(2)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            quickActionsSection.appendChild(marketDiv);
        },

        // GOOGLE CHARTS

        setupCharts() {
            google.charts.load('current', { packages: ['corechart', 'line'] });
            google.charts.setOnLoadCallback(() => this.drawCharts());
        },

        drawCharts() {
            this.drawPortfolioChart();
            this.drawGoalsChart();
        },

        drawPortfolioChart() {
            const container = document.getElementById('portfolio-chart');
            if (!container) return;

            if (!AppState.transactions || AppState.transactions.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No portfolio data yet</p>';
                return;
            }

            const history = this.generatePortfolioHistory();
            if (history.length < 2) return;

            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Date');
            data.addColumn('number', 'Value');

            history.forEach(entry => {
                data.addRow([entry.date, entry.value]);
            });

            const options = {
                title: 'Portfolio Performance (30 Days)',
                curveType: 'function',
                colors: ['#00B894'],
                hAxis: { 
                    slantedText: true,
                    slantedTextAngle: 45,
                    textStyle: { fontSize: 10 }
                },
                vAxis: { 
                    format: 'short',
                    textStyle: { fontSize: 10 }
                },
                chartArea: { 
                    width: '85%', 
                    height: '70%',
                    left: 50,
                    right: 20
                },
                legend: { position: 'none' },
                animation: { 
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                responsive: true,
                maintainAspectRatio: false
            };

            const chart = new google.visualization.LineChart(container);
            chart.draw(data, options);

            // Handle resize
            window.addEventListener('resize', () => {
                chart.draw(data, options);
            });
        },

        generatePortfolioHistory() {
            const sorted = [...AppState.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            let balance = 0;
            const history = [];
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Filter last 30 days
            const recentTransactions = sorted.filter(t => new Date(t.date) >= thirtyDaysAgo);

            recentTransactions.forEach(t => {
                if (t.type === 'investment' || t.type === 'dividend') balance += t.amount || 0;
                else if (t.type === 'withdrawal') balance -= t.amount || 0;

                history.push({
                    date: new Date(t.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
                    value: 1000000 + balance
                });
            });

            return history;
        },

        drawGoalsChart() {
            const container = document.getElementById('goals-chart');
            if (!container || !AppState.goals?.length) return;

            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Goal');
            data.addColumn('number', 'Progress');

            AppState.goals.slice(0, 5).forEach(goal => {
                const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
                data.addRow([goal.name, percent]);
            });

            const options = {
                title: 'Goal Progress',
                colors: ['#00B894'],
                hAxis: { 
                    slantedText: true,
                    slantedTextAngle: 45,
                    textStyle: { fontSize: 10 }
                },
                vAxis: { 
                    minValue: 0, 
                    maxValue: 100,
                    textStyle: { fontSize: 10 }
                },
                chartArea: { 
                    width: '70%', 
                    height: '70%',
                    left: 50,
                    right: 20
                },
                legend: { position: 'none' },
                animation: { 
                    startup: true,
                    duration: 1000
                },
                responsive: true,
                maintainAspectRatio: false
            };

            const chart = new google.visualization.ColumnChart(container);
            chart.draw(data, options);

            // Handle resize
            window.addEventListener('resize', () => {
                chart.draw(data, options);
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
            // Check authentication
            AppState.initialize();

            // Update navbar
            this.updateNavbar();

            if (AppState.isLoggedIn) {
                // Load all data
                await AppState.loadAllData();

                // Update UI
                this.renderLoggedInView();

                // Set up periodic refresh (every 5 minutes)
                setInterval(() => {
                    if (AppState.networkStatus) {
                        AppState.loadAllData();
                    }
                }, 300000);
            } else {
                // Show guest view
                this.renderGuestView();
            }

            // Setup 3-step journey links with touch-friendly sizing
            this.setupJourneyLinks();

            // Announce page for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = AppState.isLoggedIn ? 
                'Dashboard loaded. Welcome back!' : 
                'Welcome to PesaSmart. Please login or register to continue.';
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);

            console.log(' Dashboard initialized');
        },

        setupJourneyLinks() {
            document.querySelectorAll('a[href="learn.html"], a[href="practice.html"], a[href="act.html"]').forEach(link => {
                if (!AppState.isLoggedIn) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showNotification('Please login to access this feature', 'warning');
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 1500);
                    });
                }

                // Ensure minimum touch target size
                link.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            });
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
        .goal-card {
            transition: all 0.3s ease;
        }
        .goal-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .goal-card:focus-visible {
            outline: 2px solid #00B894;
            outline-offset: 2px;
        }
        @media (max-width: 640px) {
            .goal-card {
                padding: 1rem !important;
            }
            h1 {
                font-size: 1.875rem !important;
            }
            h2 {
                font-size: 1.5rem !important;
            }
            .text-4xl {
                font-size: 2rem !important;
            }
            button, a {
                min-height: 44px;
            }
        }
        @media (min-width: 641px) and (max-width: 768px) {
            .grid-cols-3 {
                gap: 0.75rem;
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