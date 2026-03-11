(function () {
    'use strict';

    //==============================================================================
    // CONFIGURATION
    //==============================================================================

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

    //==============================================================================
    // STATE MANAGEMENT
    //==============================================================================

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
        lastSync: null,

        update(key, value) {
            this[key] = value;
            this.lastSync = Date.now();
            this.persist();

            // Notify profile page of changes
            window.dispatchEvent(new CustomEvent('pesasmart-index-update', {
                detail: { key, value, timestamp: this.lastSync }
            }));
        },

        persist() {
            try {
                localStorage.setItem(STORAGE_KEYS.CACHE_PREFIX + 'index_state', JSON.stringify({
                    lastSync: this.lastSync,
                    userId: this.user?.userId
                }));
            } catch (e) {
                console.warn('Failed to persist state:', e);
            }
        }
    };

    //==============================================================================
    // AUTHENTICATION
    //==============================================================================

    const Auth = {
        checkSession() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!session) {
                AppState.isLoggedIn = false;
                return false;
            }

            try {
                const sessionData = JSON.parse(session);
                if (sessionData.expires && sessionData.expires < Date.now()) {
                    localStorage.removeItem(STORAGE_KEYS.SESSION);
                    AppState.isLoggedIn = false;
                    return false;
                }

                AppState.user = sessionData;
                AppState.isLoggedIn = true;
                return true;

            } catch (e) {
                console.error('Session validation error:', e);
                AppState.isLoggedIn = false;
                return false;
            }
        },

        async logout() {
            const confirmed = await UI.confirmAction({
                title: 'Log Out',
                message: 'Are you sure you want to log out?',
                confirmText: 'Log Out',
                type: 'warning'
            });

            if (!confirmed) return;

            UI.showLoading('Logging out...');

            try {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
                sessionStorage.clear();
                AppState.isLoggedIn = false;

                UI.showNotification('Logged out successfully', 'success');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Logout error:', error);
                UI.showNotification('Logout failed', 'error');
                UI.hideLoading();
            }
        }
    };

    //==============================================================================
    // DATA LAYER
    //==============================================================================

    const Data = {
        async loadAllData() {
            if (!AppState.isLoggedIn) return;

            UI.showLoading('Loading your dashboard...');

            try {
                const [users, goals, transactions, progress, products, market] = await Promise.all([
                    this.loadUsers(),
                    this.loadGoals(),
                    this.loadTransactions(),
                    this.loadProgress(),
                    this.loadProducts(),
                    this.loadMarketData()
                ]);

                AppState.profile = users.find(u => u.id === AppState.user.userId);
                AppState.goals = goals.filter(g => g.userId === AppState.user.userId);
                AppState.transactions = transactions.filter(t => t.userId === AppState.user.userId);
                AppState.progress = progress.find(p => p.userId === AppState.user.userId);
                AppState.products = products;
                AppState.marketData = market;

                await this.loadAchievements();

                UI.hideLoading();
                return true;

            } catch (error) {
                console.error('Data loading error:', error);
                UI.showNotification('Failed to load dashboard data', 'error');
                UI.hideLoading();
                return false;
            }
        },

        async loadUsers() {
            const cached = localStorage.getItem(STORAGE_KEYS.USERS);
            if (cached) {
                const data = JSON.parse(cached);
                if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                    return data.users || [];
                }
            }

            const response = await fetch('data/users.json');
            const data = await response.json();
            const users = data.users || [];

            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify({
                users,
                _timestamp: Date.now()
            }));

            return users;
        },

        async loadGoals() {
            const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
            if (cached) {
                const data = JSON.parse(cached);
                if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                    return data.goals || [];
                }
            }

            const response = await fetch('data/goals.json');
            const data = await response.json();
            const goals = data.goals || [];

            localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify({
                goals,
                _timestamp: Date.now()
            }));

            return goals;
        },

        async loadTransactions() {
            const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
            if (cached) {
                const data = JSON.parse(cached);
                if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                    return data.transactions || [];
                }
            }

            const response = await fetch('data/transactions.json');
            const data = await response.json();
            const transactions = data.transactions || [];

            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify({
                transactions,
                _timestamp: Date.now()
            }));

            return transactions;
        },

        async loadProgress() {
            const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            if (cached) {
                const data = JSON.parse(cached);
                if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                    return data.progress || [];
                }
            }

            const response = await fetch('data/progress.json');
            const data = await response.json();
            const progress = data.progress || [];

            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify({
                progress,
                _timestamp: Date.now()
            }));

            return progress;
        },

        async loadProducts() {
            const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
            if (cached) {
                const data = JSON.parse(cached);
                if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                    return data.products || [];
                }
            }

            const response = await fetch('data/products.json');
            const data = await response.json();
            const products = data.products || [];

            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify({
                products,
                _timestamp: Date.now()
            }));

            return products;
        },

        async loadMarketData() {
            const cached = localStorage.getItem(STORAGE_KEYS.MARKET);
            if (cached) {
                const data = JSON.parse(cached);
                if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                    return data;
                }
            }

            const response = await fetch('data/market.json');
            const data = await response.json();

            localStorage.setItem(STORAGE_KEYS.MARKET, JSON.stringify({
                ...data,
                _timestamp: Date.now()
            }));

            return data;
        },

        async loadAchievements() {
            if (!AppState.progress?.earnedBadges) {
                AppState.achievements = [];
                return;
            }

            try {
                const cached = localStorage.getItem('pesasmart_courses');
                let badges = {};

                if (cached) {
                    const courses = JSON.parse(cached);
                    badges = courses.badges || {};
                }

                AppState.achievements = AppState.progress.earnedBadges.map(badgeId => ({
                    id: badgeId,
                    ...badges[badgeId],
                    earnedAt: AppState.progress.lastActive
                }));

            } catch (error) {
                console.error('Failed to load achievements:', error);
                AppState.achievements = [];
            }
        },

        listenForProfileUpdates() {
            window.addEventListener('pesasmart-profile-update', (e) => {
                console.log('Received update from profile:', e.detail);

                if (e.detail.key === 'goals') {
                    this.loadGoals().then(() => {
                        AppState.goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '{"goals":[]}')
                            .goals.filter(g => g.userId === AppState.user.userId);
                        UI.updateAllSections();
                    });
                } else if (e.detail.key === 'profile') {
                    this.loadUsers().then(() => {
                        AppState.profile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '{"users":[]}')
                            .users.find(u => u.id === AppState.user.userId);
                        UI.updateAllSections();
                    });
                }
            });
        }
    };

    //==============================================================================
    // UI COMPONENTS
    //==============================================================================

    const UI = {
        showLoading(message = 'Loading...') {
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
                <div class="bg-white rounded-lg p-6 text-center shadow-2xl">
                    <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 mx-auto"></div>
                    <p class="text-gray-700 font-medium">${message}</p>
                </div>
            `;
            document.body.appendChild(newLoader);
        },

        hideLoading() {
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 300);
            }
        },

        showNotification(message, type = 'info', duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in ${type === 'success' ? 'bg-green-500' :
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

        renderGuestView() {
            const heroCard = document.querySelector('.lg\\:w-1\\/2.relative .bg-white.rounded-2xl');
            if (heroCard) {
                heroCard.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-user-circle text-6xl text-green-300 mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">Welcome to PesaSmart!</h3>
                        <p class="text-gray-600 mb-6">Create an account to start your financial journey</p>
                        <div class="space-y-3">
                            <a href="register.html" class="block bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition">
                                Create Free Account
                            </a>
                            <a href="login.html" class="block border border-green-500 text-green-600 py-3 rounded-lg font-semibold hover:bg-green-50 transition">
                                Login
                            </a>
                        </div>
                    </div>
                `;
            }

            const goalsSection = document.querySelector('.py-16.bg-gray-50');
            if (goalsSection) goalsSection.style.display = 'none';
        },

        updateNavbar() {
            const navbar = document.querySelector('nav .flex.items-center.space-x-4');
            if (!navbar) return;

            if (!AppState.isLoggedIn) {
                navbar.innerHTML = `
                    <a href="login.html" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition">
                        Login
                    </a>
                    <button class="md:hidden text-gray-700 hover:text-green-600 focus:outline-none" id="mobile-menu-button">
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

            document.getElementById('logout-button')?.addEventListener('click', () => Auth.logout());
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
            const mobileContainer = document.getElementById('mobile-menu-container');

            if (!mobileContainer) {
                const container = document.createElement('div');
                container.id = 'mobile-menu-container';
                container.className = 'hidden md:hidden bg-white border-t mt-2';
                document.querySelector('nav .container').appendChild(container);
            }

            const container = document.getElementById('mobile-menu-container');
            if (!menuButton || !container) return;

            if (!AppState.isLoggedIn) {
                container.innerHTML = `
                    <div class="px-4 py-2 space-y-2">
                        <a href="index.html" class="block py-2 text-green-600 font-medium">
                            <i class="fas fa-home mr-2"></i>Home
                        </a>
                        <a href="learn.html" class="block py-2 text-gray-700 hover:text-green-600">
                            <i class="fas fa-book mr-2"></i>Learn
                        </a>
                        <a href="practice.html" class="block py-2 text-gray-700 hover:text-green-600">
                            <i class="fas fa-gamepad mr-2"></i>Practice
                        </a>
                        <a href="act.html" class="block py-2 text-gray-700 hover:text-green-600">
                            <i class="fas fa-briefcase mr-2"></i>Act
                        </a>
                        <hr class="my-2">
                        <a href="login.html" class="block py-2 text-green-600">
                            <i class="fas fa-sign-in-alt mr-2"></i>Login
                        </a>
                        <a href="register.html" class="block py-2 text-gray-700 hover:text-green-600">
                            <i class="fas fa-user-plus mr-2"></i>Register
                        </a>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="px-4 py-2 space-y-2">
                        <a href="index.html" class="block py-2 text-green-600 font-medium">
                            <i class="fas fa-home mr-2"></i>Home
                        </a>
                        <a href="learn.html" class="block py-2 text-gray-700 hover:text-green-600">
                            <i class="fas fa-book mr-2"></i>Learn
                        </a>
                        <a href="practice.html" class="block py-2 text-gray-700 hover:text-green-600">
                            <i class="fas fa-gamepad mr-2"></i>Practice
                        </a>
                        <a href="act.html" class="block py-2 text-gray-700 hover:text-green-600">
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
            }

            menuButton.addEventListener('click', () => {
                container.classList.toggle('hidden');
            });

            document.getElementById('mobile-logout')?.addEventListener('click', () => Auth.logout());
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

            // Achievement notifications
            if (AppState.achievements?.length > 0) {
                notifications.push({
                    title: 'New Achievement',
                    message: `You've earned ${AppState.achievements.length} badges!`,
                    type: 'success',
                    icon: 'fa-trophy',
                    time: 'Today'
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
                        time: '1h ago'
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
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Notifications</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-notifications">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${notifications.map(n => `
                            <div class="p-4 ${n.type === 'warning' ? 'bg-yellow-50' : n.type === 'success' ? 'bg-green-50' : 'bg-blue-50'} rounded-lg">
                                <div class="flex items-start">
                                    <div class="w-8 h-8 ${n.type === 'warning' ? 'bg-yellow-100' : n.type === 'success' ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mr-3">
                                        <i class="fas ${n.icon} ${n.type === 'warning' ? 'text-yellow-600' : n.type === 'success' ? 'text-green-600' : 'text-blue-600'}"></i>
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

        updateHeroSection() {
            if (!AppState.isLoggedIn || !AppState.profile) return;

            const heroCard = document.querySelector('.lg\\:w-1\\/2.relative .bg-white.rounded-2xl');
            if (!heroCard) return;

            const totalModules = 8;
            const completed = AppState.progress?.completedModules?.length || 0;
            const progressPercent = Math.round((completed / totalModules) * 100);

            const totalSaved = AppState.goals?.reduce((sum, g) => sum + (g.savedAmount || 0), 0) || 0;
            const totalInvested = AppState.transactions?.filter(t => t.type === 'investment')
                .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
            const activeCovers = AppState.transactions?.filter(t => t.type === 'insurance').length || 0;

            heroCard.innerHTML = `
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                        <i class="fas fa-user-graduate text-green-600 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg">Welcome back, ${AppState.profile.firstName || 'User'}!</h3>
                        <p class="text-gray-600">Your financial journey continues</p>
                    </div>
                </div>

                <div class="mb-6">
                    <div class="flex justify-between mb-1">
                        <span class="text-gray-700">Financial Fitness Score</span>
                        <span class="font-bold text-green-600">${AppState.profile.financialScore || 4.2}/5</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-green-500 h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">
                        ${progressPercent}% to PesaMaster Certification
                    </p>
                </div>

                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="bg-green-50 rounded-lg p-3 text-center">
                        <div class="text-2xl font-bold text-green-700">${this.formatCurrency(totalSaved)}</div>
                        <div class="text-sm text-gray-600">Saved</div>
                    </div>
                    <div class="bg-green-50 rounded-lg p-3 text-center">
                        <div class="text-2xl font-bold text-green-700">${this.formatCurrency(totalInvested)}</div>
                        <div class="text-sm text-gray-600">Invested</div>
                    </div>
                    <div class="bg-green-50 rounded-lg p-3 text-center">
                        <div class="text-2xl font-bold text-green-700">${activeCovers}</div>
                        <div class="text-sm text-gray-600">Active Covers</div>
                    </div>
                </div>

                <a href="profile.html" class="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg transition">
                    View Full Dashboard
                </a>
            `;
        },

        updateGoalsSection() {
            const container = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2.gap-6');
            if (!container) return;

            if (!AppState.goals || AppState.goals.length === 0) {
                container.innerHTML = `
                    <div class="col-span-2 text-center py-12 bg-white rounded-xl">
                        <i class="fas fa-bullseye text-5xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-bold mb-2">No Goals Yet</h3>
                        <p class="text-gray-600 mb-6">Create your first financial goal to start tracking progress</p>
                        <a href="profile.html#goals" class="inline-block bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition">
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
            });
        },

        renderGoalCard(goal) {
            const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <div class="bg-white rounded-xl p-6 shadow-lg hover-card cursor-pointer goal-card" data-id="${goal.id}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas ${this.getGoalIcon(goal.name)} text-green-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg">${goal.name}</h3>
                                <p class="text-gray-600">Target: ${deadline.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            ${percent}%
                        </span>
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600">${this.formatCurrency(goal.savedAmount)} saved</span>
                            <span class="font-semibold">${this.formatCurrency(goal.targetAmount)} target</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-green-500 h-3 rounded-full" style="width: ${percent}%"></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-clock mr-1"></i> ${daysLeft} days remaining
                        </div>
                        <button class="text-green-600 hover:text-green-700 font-medium" onclick="event.stopPropagation(); window.location.href='profile.html#goal-${goal.id}'">
                            View Details
                        </button>
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

        formatCurrency(amount) {
            return 'Ksh ' + amount.toLocaleString('en-KE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        },

        updateAllSections() {
            this.updateHeroSection();
            this.updateGoalsSection();
        }
    };

    //==============================================================================
    // GOOGLE CHARTS
    //==============================================================================

    google.charts.load('current', { packages: ['corechart', 'line', 'bar'] });
    google.charts.setOnLoadCallback(() => {
        console.log('Google Charts loaded');
        if (AppState.isLoggedIn) {
            setTimeout(() => drawCharts(), 500);
        }
    });

    function drawCharts() {
        drawPortfolioChart();
        drawGoalsChart();
    }

    function drawPortfolioChart() {
        const container = document.getElementById('portfolio-chart');
        if (!container) return;

        if (!AppState.transactions || AppState.transactions.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No portfolio data yet</p>';
            return;
        }

        const history = generatePortfolioHistory();
        if (history.length < 2) return;

        const data = new google.visualization.DataTable();
        data.addColumn('string', 'Date');
        data.addColumn('number', 'Value');

        history.forEach(entry => {
            data.addRow([entry.date, entry.value]);
        });

        const options = {
            title: 'Portfolio Performance',
            curveType: 'function',
            colors: ['#00B894'],
            hAxis: { slantedText: true },
            vAxis: { format: 'short' },
            chartArea: { width: '85%', height: '70%' },
            animation: { duration: 1000 }
        };

        const chart = new google.visualization.LineChart(container);
        chart.draw(data, options);
    }

    function generatePortfolioHistory() {
        const sorted = [...AppState.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        let balance = 0;
        const history = [];

        sorted.forEach(t => {
            if (t.type === 'investment' || t.type === 'dividend') balance += t.amount || 0;
            else if (t.type === 'withdrawal') balance -= t.amount || 0;

            history.push({
                date: new Date(t.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
                value: 1000000 + balance
            });
        });

        return history.slice(-10);
    }

    function drawGoalsChart() {
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
            hAxis: { slantedText: true },
            vAxis: { minValue: 0, maxValue: 100 },
            chartArea: { width: '70%', height: '70%' },
            animation: { duration: 1000 }
        };

        const chart = new google.visualization.ColumnChart(container);
        chart.draw(data, options);
    }

    //==============================================================================
    // INITIALIZATION
    //==============================================================================

    async function initialize() {
        // Check authentication
        Auth.checkSession();

        // Update navbar
        UI.updateNavbar();

        if (AppState.isLoggedIn) {
            // Load all data
            await Data.loadAllData();

            // Update UI
            UI.updateAllSections();

            // Listen for profile updates
            Data.listenForProfileUpdates();
        } else {
            // Show guest view
            UI.renderGuestView();
        }

        // Setup 3-step journey links
        setupJourneyLinks();

        console.log('Dashboard initialized');
    }

    function setupJourneyLinks() {
        document.querySelectorAll('a[href="learn.html"], a[href="practice.html"], a[href="act.html"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (!AppState.isLoggedIn) {
                    e.preventDefault();
                    UI.showNotification('Please login to access this feature', 'warning');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
            });
        });
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
        .hover-card {
            transition: all 0.3s;
        }
        .hover-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
    `;
    document.head.appendChild(style);

    // Start when DOM is ready
    document.addEventListener('DOMContentLoaded', initialize);

})();