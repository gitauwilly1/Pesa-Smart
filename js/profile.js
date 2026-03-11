(function () {
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
        NOTIFICATIONS: 'pesasmart_notifications',
        THEME: 'pesasmart_theme'
    };

    // STATE MANAGEMENT

    const AppState = {
        user: null,
        profile: null,
        goals: [],
        transactions: [],
        progress: null,
        achievements: [],
        notifications: [],
        isLoading: false,
        networkStatus: navigator.onLine,
        activeSection: 'overview',

        async initialize() {
            this.user = this.getCurrentUser();
            if (!this.user) {
                window.location.href = 'login.html?redirect=profile.html';
                return false;
            }

            await this.loadUserData();
            await this.loadGoals();
            await this.loadTransactions();
            await this.loadProgress();
            await this.loadAchievements();
            await this.loadNotifications();
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
                UI.updateGoalsSection();
            });

            window.addEventListener('pesasmart-transaction-update', (e) => {
                console.log('Transaction update received:', e.detail);
                this.loadTransactions();
                UI.updateRecentActivity();
                UI.updateOverviewStats();
            });

            window.addEventListener('pesasmart-progress-update', (e) => {
                console.log('Progress update received:', e.detail);
                this.loadProgress();
                this.loadAchievements();
                UI.updateOverviewStats();
                UI.updateAchievementsSection();
            });
        },

        async syncData() {
            if (this.networkStatus) {
                // Could sync with server here
                this.saveAllToStorage();
            }
        },

        async loadUserData() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                if (cached) {
                    const data = JSON.parse(cached);
                    const users = Array.isArray(data) ? data : (data.users || []);
                    this.profile = users.find(u => u.id === this.user?.userId);
                }

                if (!this.profile) {
                    this.profile = this.createDefaultProfile();
                }
            } catch (error) {
                console.error('Failed to load user data:', error);
                this.profile = this.createDefaultProfile();
            }
        },

        createDefaultProfile() {
            return {
                id: this.user?.userId || 'USR001',
                firstName: 'User',
                lastName: '',
                email: this.user?.email || 'user@example.com',
                phone: '+254712345678',
                profile: {
                    occupation: 'Not specified',
                    incomeRange: 'Not specified',
                    dateOfBirth: '',
                    county: '',
                    constituency: '',
                    gender: ''
                },
                financialScore: 3.0,
                preferences: {
                    language: 'en',
                    notifications: true,
                    theme: 'light'
                },
                kycStatus: 'pending',
                createdAt: new Date().toISOString()
            };
        },

        async loadGoals() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                if (cached) {
                    const data = JSON.parse(cached);
                    const goals = Array.isArray(data) ? data : (data.goals || []);
                    this.goals = goals.filter(g => g.userId === this.user?.userId);
                }
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
                    this.transactions = transactions.filter(t => t.userId === this.user?.userId);
                }
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
                    this.progress = progress.find(p => p.userId === this.user?.userId) || null;
                }

                if (!this.progress) {
                    this.progress = this.createDefaultProgress();
                }
            } catch (error) {
                console.error('Failed to load progress:', error);
                this.progress = this.createDefaultProgress();
            }
        },

        createDefaultProgress() {
            return {
                userId: this.user?.userId,
                completedModules: [],
                inProgress: {},
                earnedBadges: [],
                certificates: [],
                lastActive: new Date().toISOString(),
                totalLearningHours: 0,
                currentStreak: 1,
                longestStreak: 1
            };
        },

        async loadAchievements() {
            this.achievements = this.progress?.earnedBadges?.map(badgeId => ({
                id: badgeId,
                name: this.getBadgeName(badgeId),
                description: this.getBadgeDescription(badgeId),
                icon: 'fa-trophy',
                earnedAt: this.progress.lastActive
            })) || [];
        },

        getBadgeName(badgeId) {
            const badges = {
                'BDG001': 'Budget Master',
                'BDG002': 'Debt Free Mindset',
                'BDG003': 'Savings Starter',
                'BDG004': 'Investment Novice',
                'BDG005': 'Inflation Fighter',
                'BDG006': 'Insurance Savvy'
            };
            return badges[badgeId] || badgeId;
        },

        getBadgeDescription(badgeId) {
            const descriptions = {
                'BDG001': 'Created your first budget',
                'BDG002': 'Understood debt management',
                'BDG003': 'Started your savings journey',
                'BDG004': 'Made your first investment',
                'BDG005': 'Learned to beat inflation',
                'BDG006': 'Understood insurance products'
            };
            return descriptions[badgeId] || 'Achievement unlocked';
        },

        async loadNotifications() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.notifications = data[this.user?.userId] || [];
                } else {
                    this.notifications = this.generateNotifications();
                    this.saveNotifications();
                }
            } catch (error) {
                console.error('Failed to load notifications:', error);
                this.notifications = [];
            }
        },

        generateNotifications() {
            const notifications = [];

            // Goal nearing deadline
            if (this.goals) {
                const now = new Date();
                this.goals.forEach(goal => {
                    if (goal.deadline && goal.status !== 'completed') {
                        const deadline = new Date(goal.deadline);
                        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

                        if (daysLeft > 0 && daysLeft < 30) {
                            notifications.push({
                                id: 'notif_' + Date.now() + Math.random(),
                                title: 'Goal Nearing Deadline',
                                message: `Your goal "${goal.name}" is due in ${daysLeft} days.`,
                                type: 'warning',
                                icon: 'fa-clock',
                                time: 'Now',
                                read: false,
                                date: new Date().toISOString()
                            });
                        }
                    }
                });
            }

            // KYC pending
            if (this.profile?.kycStatus === 'pending') {
                notifications.push({
                    id: 'notif_' + Date.now() + Math.random(),
                    title: 'Complete Your KYC',
                    message: 'Verify your identity to unlock all features.',
                    type: 'info',
                    icon: 'fa-id-card',
                    time: 'Today',
                    read: false,
                    date: new Date().toISOString()
                });
            }

            // Achievement notification
            if (this.achievements?.length > 0) {
                notifications.push({
                    id: 'notif_' + Date.now() + Math.random(),
                    title: 'New Achievement',
                    message: `You've earned ${this.achievements.length} badge${this.achievements.length > 1 ? 's' : ''}!`,
                    type: 'success',
                    icon: 'fa-trophy',
                    time: 'Today',
                    read: false,
                    date: new Date().toISOString()
                });
            }

            return notifications;
        },

        async saveNotifications() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
                const allNotifications = cached ? JSON.parse(cached) : {};
                allNotifications[this.user?.userId] = this.notifications;
                localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allNotifications));
            } catch (error) {
                console.error('Failed to save notifications:', error);
            }
        },

        markNotificationAsRead(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.saveNotifications();
            }
        },

        markAllNotificationsAsRead() {
            this.notifications.forEach(n => n.read = true);
            this.saveNotifications();
        },

        saveAllToStorage() {
            // Users
            const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
            const userIndex = users.findIndex(u => u.id === this.profile.id);
            if (userIndex >= 0) {
                users[userIndex] = this.profile;
            } else {
                users.push(this.profile);
            }
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

            // Goals
            const allGoals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '[]');
            const otherGoals = allGoals.filter(g => g.userId !== this.user?.userId);
            const updatedGoals = [...otherGoals, ...this.goals];
            localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));

            // Progress
            const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '[]');
            const otherProgress = allProgress.filter(p => p.userId !== this.user?.userId);
            const updatedProgress = [...otherProgress, this.progress];
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));
        },

        calculateTotalInvested() {
            return this.transactions?.filter(t => t.type === 'investment')
                .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        },

        calculateTotalSaved() {
            return this.goals?.reduce((sum, g) => sum + (g.savedAmount || 0), 0) || 0;
        },

        calculateTotalInsurance() {
            return this.transactions?.filter(t => t.type === 'insurance').length || 0;
        },

        calculateLearningHours() {
            return this.progress?.totalLearningHours || 0;
        },

        calculateModulesCompleted() {
            return this.progress?.completedModules?.length || 0;
        },

        calculatePortfolioPerformance() {
            const invested = this.calculateTotalInvested();
            if (invested === 0) return 0;

            // Simple calculation - in production would use current market values
            const currentValue = invested * 1.12; // Assume 12% growth
            return ((currentValue - invested) / invested) * 100;
        },

        getUnreadNotificationCount() {
            return this.notifications.filter(n => !n.read).length;
        }
    };

    // UI COMPONENTS - FULLY RESPONSIVE

    const UI = {
        // LOADING STATES

        showLoading(message = 'Loading profile...') {
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

            const userName = AppState.user?.name ||
                (AppState.profile ? `${AppState.profile.firstName || ''}`.trim() : 'User');

            navbar.innerHTML = `
                <div class="hidden md:flex items-center space-x-4">
                    <button class="relative text-gray-600 hover:text-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 min-h-[44px] min-w-[44px]" id="notification-bell" aria-label="Notifications">
                        <i class="fas fa-bell text-xl"></i>
                        <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center notification-count">${AppState.getUnreadNotificationCount()}</span>
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
                            <a href="profile.html" class="block px-4 py-3 text-green-600 bg-green-50 font-medium focus:outline-none focus:bg-green-100" tabindex="0">My Profile</a>
                            <a href="#settings" class="block px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-600 transition focus:outline-none focus:bg-green-50 settings-link" tabindex="0">Settings</a>
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

            const settingsLink = document.querySelector('.settings-link');
            if (settingsLink) {
                settingsLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('settings').scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
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
                    <a href="act.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Act</a>
                    <hr class="my-2">
                    <a href="profile.html" class="block py-3 px-4 text-green-600 font-medium hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Profile</a>
                    <button id="mobile-logout" class="w-full text-left py-3 px-4 text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500">Logout</button>
                </div>
            `;

            menuButton.addEventListener('click', () => {
                mobileContainer.classList.toggle('hidden');
            });

            document.getElementById('mobile-logout')?.addEventListener('click', () => this.handleLogout());
        },

        showNotifications() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'notifications-title');

            const unreadCount = AppState.getUnreadNotificationCount();

            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 id="notifications-title" class="text-xl font-bold">Notifications ${unreadCount > 0 ? `<span class="bg-green-500 text-white text-sm px-2 py-1 rounded-full ml-2">${unreadCount}</span>` : ''}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" id="close-notifications">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${AppState.notifications.length > 0 ? AppState.notifications.map(n => `
                            <div class="p-4 ${n.type === 'warning' ? 'bg-yellow-50' : n.type === 'success' ? 'bg-green-50' : 'bg-blue-50'} rounded-lg ${!n.read ? 'border-l-4 border-green-500' : ''} animate-fade-in">
                                <div class="flex items-start">
                                    <div class="w-10 h-10 ${n.type === 'warning' ? 'bg-yellow-100' : n.type === 'success' ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                        <i class="fas ${n.icon} ${n.type === 'warning' ? 'text-yellow-600' : n.type === 'success' ? 'text-green-600' : 'text-blue-600'}"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h4 class="font-semibold">${n.title}</h4>
                                                <p class="text-sm text-gray-600">${n.message}</p>
                                                <p class="text-xs text-gray-500 mt-1">${this.formatDate(n.date, 'relative')}</p>
                                            </div>
                                            ${!n.read ? `
                                                <button class="text-green-600 hover:text-green-700 text-sm mark-read" data-id="${n.id}" aria-label="Mark as read">
                                                    <i class="fas fa-check-circle"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-bell-slash text-4xl mb-2 text-gray-300"></i>
                                <p>No notifications</p>
                            </div>
                        `}
                    </div>
                    
                    ${AppState.notifications.length > 0 ? `
                        <button class="w-full mt-6 text-green-600 hover:text-green-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg py-2 min-h-[44px]" id="mark-all-read">
                            Mark all as read
                        </button>
                    ` : ''}
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-notifications').addEventListener('click', () => modal.remove());

            document.querySelectorAll('.mark-read').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    AppState.markNotificationAsRead(id);
                    this.updateNavbar();
                    modal.remove();
                    this.showNotifications(); // Refresh modal
                });
            });

            const markAllBtn = document.getElementById('mark-all-read');
            if (markAllBtn) {
                markAllBtn.addEventListener('click', () => {
                    AppState.markAllNotificationsAsRead();
                    this.updateNavbar();
                    modal.remove();
                    this.showNotification('All notifications marked as read', 'success');
                });
            }

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
                AppState.saveAllToStorage();
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

        // PROFILE HEADER

        updateProfileHeader() {
            const nameElement = document.querySelector('h1.text-2xl.font-bold.text-white');
            if (nameElement) {
                nameElement.textContent = `${AppState.profile.firstName || 'User'} ${AppState.profile.lastName || ''}`.trim();
            }

            const locationElement = document.querySelector('p.text-green-100');
            if (locationElement) {
                const occupation = AppState.profile.profile?.occupation || 'Student';
                const occupationDisplay = occupation.split(' ').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');

                locationElement.innerHTML = `
                    <i class="fas fa-map-marker-alt mr-1"></i> Nairobi, Kenya •
                    <span class="ml-2">
                        <i class="fas ${this.getOccupationIcon(occupation)} mr-1"></i> ${occupationDisplay}
                    </span>
                `;
            }

            const scoreElement = document.querySelector('.text-3xl.font-bold.text-white');
            if (scoreElement) {
                const score = AppState.profile.financialScore || 3.0;
                scoreElement.innerHTML = `${score}<span class="text-xl">/5</span>`;
            }

            this.updateStars();
        },

        getOccupationIcon(occupation) {
            const icons = {
                'student': 'fa-user-graduate',
                'employed': 'fa-briefcase',
                'business owner': 'fa-store',
                'farmer': 'fa-tractor',
                'jua kali artisan': 'fa-tools',
                'mama mboga': 'fa-leaf',
                'bodaboda': 'fa-motorcycle',
                'professional': 'fa-briefcase'
            };
            return icons[occupation.toLowerCase()] || 'fa-user';
        },

        updateStars() {
            const starsContainer = document.querySelector('.flex.items-center.justify-center.mt-1');
            if (!starsContainer) return;

            const score = AppState.profile.financialScore || 3.0;
            const fullStars = Math.floor(score);
            const hasHalf = score % 1 >= 0.5;

            starsContainer.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                if (i <= fullStars) {
                    star.className = 'fas fa-star text-yellow-300';
                } else if (i === fullStars + 1 && hasHalf) {
                    star.className = 'fas fa-star-half-alt text-yellow-300';
                } else {
                    star.className = 'far fa-star text-yellow-300';
                }
                starsContainer.appendChild(star);
            }
        },

        // SIDEBAR STATS

        updateSidebarStats() {
            const stats = document.querySelectorAll('.border-t .flex.justify-between .font-medium');
            if (stats.length >= 4) {
                // Member Since
                const memberDate = AppState.profile.createdAt ? new Date(AppState.profile.createdAt) : new Date();
                stats[0].textContent = memberDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });

                // Learning Hours
                stats[1].textContent = AppState.calculateLearningHours() + ' hrs';

                // Total Invested
                stats[2].textContent = this.formatCurrency(AppState.calculateTotalInvested());

                // Active Goals
                stats[3].textContent = AppState.goals?.filter(g => g.status === 'active').length || 0;
            }

            // Update invite code
            const inviteCode = document.querySelector('.font-mono.font-bold');
            if (inviteCode && AppState.profile) {
                const code = (AppState.profile.id || 'USR') + (AppState.profile.firstName?.substring(0, 2) || 'XX');
                inviteCode.textContent = code.toUpperCase();
            }

            // Setup share invite button
            const shareBtn = document.querySelector('.bg-gradient-to-br button');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => {
                    const code = document.querySelector('.font-mono.font-bold')?.textContent;
                    if (code) {
                        this.copyToClipboard(`Join me on PesaSmart using my invite code: ${code}`);
                    }
                });
                shareBtn.classList.add('min-h-[44px]');
            }
        },

        // OVERVIEW SECTION

        updateOverviewStats() {
            // Modules completed
            const modulesEl = document.querySelector('.bg-green-50.rounded-lg.p-4 .text-xl.font-bold');
            if (modulesEl && modulesEl.closest('.bg-green-50').querySelector('.fa-graduation-cap')) {
                const completed = AppState.calculateModulesCompleted();
                modulesEl.textContent = `${completed}/8`;
            }

            // Portfolio performance
            const portfolioEl = Array.from(document.querySelectorAll('.bg-green-50.rounded-lg.p-4 .text-xl.font-bold'))
                .find(el => el.textContent.includes('%'));
            if (portfolioEl) {
                const performance = AppState.calculatePortfolioPerformance();
                portfolioEl.textContent = performance >= 0 ? `+${performance.toFixed(1)}%` : `${performance.toFixed(1)}%`;
                portfolioEl.className = performance >= 0 ? 'text-xl font-bold text-green-600' : 'text-xl font-bold text-red-600';
            }

            // Insurance count
            const insuranceEl = Array.from(document.querySelectorAll('.bg-green-50.rounded-lg.p-4 .text-xl.font-bold'))
                .find(el => el.closest('.bg-green-50')?.querySelector('.fa-shield-alt'));
            if (insuranceEl) {
                insuranceEl.textContent = AppState.calculateTotalInsurance();
            }

            // Badges count
            const badgesEl = document.querySelector('.bg-purple-50 .text-xl.font-bold');
            if (badgesEl) {
                badgesEl.textContent = AppState.achievements.length || 0;
            }

            this.updateRecentActivity();
            this.setupExportReport();
        },

        updateRecentActivity() {
            const container = document.querySelector('#overview .space-y-3');
            if (!container) return;

            if (!AppState.transactions || AppState.transactions.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No recent activity</p>';
                return;
            }

            const recent = [...AppState.transactions]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3);

            container.innerHTML = recent.map(t => {
                const { icon, bgColor } = this.getTransactionStyle(t.type);
                const description = this.getTransactionDescription(t);

                return `
                    <div class="flex items-center p-3 bg-gray-50 rounded-lg hover:shadow-md transition cursor-pointer activity-item" 
                         data-id="${t.id}" tabindex="0" role="button">
                        <div class="w-10 h-10 ${bgColor} rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <i class="fas ${icon} text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-800 truncate">${description}</p>
                            <p class="text-gray-600 text-sm">${this.formatDate(t.date)}</p>
                        </div>
                        ${t.amount ? `<span class="font-medium text-gray-600 ml-2">${this.formatCurrency(t.amount)}</span>` : ''}
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.activity-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.showTransactionDetails(item.dataset.id);
                });

                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.showTransactionDetails(item.dataset.id);
                    }
                });
            });
        },

        getTransactionStyle(type) {
            const styles = {
                'investment': { icon: 'fa-chart-line', bgColor: 'bg-blue-500' },
                'dividend': { icon: 'fa-hand-holding-usd', bgColor: 'bg-green-500' },
                'insurance': { icon: 'fa-shield-alt', bgColor: 'bg-purple-500' },
                'savings': { icon: 'fa-piggy-bank', bgColor: 'bg-yellow-500' },
                'loan': { icon: 'fa-hand-holding-usd', bgColor: 'bg-orange-500' },
                'withdrawal': { icon: 'fa-money-bill-wave', bgColor: 'bg-red-500' }
            };
            return styles[type] || { icon: 'fa-exchange-alt', bgColor: 'bg-gray-500' };
        },

        getTransactionDescription(transaction) {
            if (transaction.notes) return transaction.notes;

            const descriptions = {
                'investment': `Invested in ${transaction.productName || 'Safaricom'}`,
                'dividend': `Dividend from ${transaction.productName || 'investment'}`,
                'insurance': `Paid ${transaction.productName || 'insurance'} premium`,
                'savings': `Added to ${transaction.goalName || 'savings goal'}`,
                'loan': `Loan payment`,
                'withdrawal': `Withdrawal`
            };
            return descriptions[transaction.type] || 'Transaction completed';
        },

        showTransactionDetails(transactionId) {
            const transaction = AppState.transactions.find(t => t.id === transactionId);
            if (!transaction) return;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Transaction Details</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Transaction ID:</span>
                            <span class="font-medium">${transaction.id}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Type:</span>
                            <span class="font-medium capitalize">${transaction.type}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Amount:</span>
                            <span class="font-bold text-green-600">${this.formatCurrency(transaction.amount)}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600">Date:</span>
                            <span class="font-medium">${this.formatDate(transaction.date, 'full')}</span>
                        </div>
                        ${transaction.productName ? `
                            <div class="flex justify-between py-2 border-b">
                                <span class="text-gray-600">Product:</span>
                                <span class="font-medium">${transaction.productName}</span>
                            </div>
                        ` : ''}
                        ${transaction.status ? `
                            <div class="flex justify-between py-2 border-b">
                                <span class="text-gray-600">Status:</span>
                                <span class="font-medium capitalize ${transaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">${transaction.status}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        setupExportReport() {
            const exportLink = document.querySelector('#overview a[href="#"]');
            if (!exportLink) return;

            exportLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportUserReport();
            });
            exportLink.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
        },

        exportUserReport() {
            const report = {
                user: {
                    name: `${AppState.profile.firstName} ${AppState.profile.lastName}`,
                    email: AppState.profile.email,
                    phone: AppState.profile.phone,
                    memberSince: AppState.profile.createdAt,
                    financialScore: AppState.profile.financialScore
                },
                goals: AppState.goals,
                transactions: AppState.transactions,
                progress: AppState.progress,
                achievements: AppState.achievements,
                generatedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pesasmart-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showNotification('Report exported successfully!', 'success');
        },

        // ACHIEVEMENTS SECTION

        updateAchievementsSection() {
            const container = document.querySelector('#achievements .grid');
            if (!container) return;

            if (AppState.achievements.length === 0) {
                container.innerHTML = `
                    <div class="col-span-3 text-center py-12">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trophy text-gray-400 text-3xl"></i>
                        </div>
                        <p class="text-gray-500">No achievements yet. Complete modules to earn badges!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = AppState.achievements.slice(0, 6).map(a => `
                <div class="border rounded-xl p-4 text-center hover:shadow-lg transition cursor-pointer achievement-card focus:outline-none focus:ring-2 focus:ring-green-500" 
                     data-id="${a.id}" tabindex="0" role="button">
                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                    </div>
                    <h4 class="font-bold text-gray-800 text-sm truncate">${a.name}</h4>
                    <p class="text-xs text-gray-600 mt-1 hidden sm:block">${a.description || 'Achievement unlocked'}</p>
                    <p class="text-xs text-green-600 mt-2">${this.formatDate(a.earnedAt, 'short')}</p>
                </div>
            `).join('');

            document.querySelectorAll('.achievement-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.showAchievementDetails(card.dataset.id);
                });

                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.showAchievementDetails(card.dataset.id);
                    }
                });
            });

            const viewAllLink = document.querySelector('#achievements .text-center a');
            if (viewAllLink) {
                viewAllLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAllAchievements();
                });
                viewAllLink.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }
        },

        showAchievementDetails(achievementId) {
            const achievement = AppState.achievements.find(a => a.id === achievementId);
            if (!achievement) return;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="text-center mb-6">
                        <div class="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trophy text-yellow-600 text-4xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${achievement.name}</h3>
                        <p class="text-gray-600">${achievement.description || 'Achievement unlocked'}</p>
                        <p class="text-sm text-gray-500 mt-2">Earned: ${this.formatDate(achievement.earnedAt, 'full')}</p>
                    </div>
                    <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                        Close
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        },

        showAllAchievements() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">All Achievements (${AppState.achievements.length})</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        ${AppState.achievements.map(a => `
                            <div class="border rounded-xl p-4 text-center">
                                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                                </div>
                                <h4 class="font-bold text-gray-800 text-sm truncate">${a.name}</h4>
                                <p class="text-xs text-gray-600 mt-1">${a.description || ''}</p>
                                <p class="text-xs text-green-600 mt-2">${this.formatDate(a.earnedAt, 'short')}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        // ACCOUNTS SECTION

        updateAccountsSection() {
            // Update M-Pesa number
            const mpesaNumber = document.querySelector('.bg-green-50 .text-gray-600.text-sm');
            if (mpesaNumber && AppState.profile?.phone) {
                mpesaNumber.textContent = AppState.profile.phone;
            }

            // Setup add account button
            const addAccountBtn = document.querySelector('#accounts .bg-green-500');
            if (addAccountBtn) {
                addAccountBtn.addEventListener('click', () => {
                    this.showAddAccountModal();
                });
                addAccountBtn.classList.add('min-h-[44px]');
            }

            // Setup CDS account button
            const cdsBtn = document.querySelector('.bg-blue-50 button');
            if (cdsBtn) {
                cdsBtn.addEventListener('click', () => {
                    this.showNotification('CDS account setup coming soon!', 'info');
                });
                cdsBtn.classList.add('min-h-[44px]');
            }

            // Setup connect bank button
            const bankBtn = document.querySelector('.bg-gray-50 .text-green-600');
            if (bankBtn) {
                bankBtn.addEventListener('click', () => {
                    this.showNotification('Bank connection coming soon!', 'info');
                });
                bankBtn.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }

            // Setup learn more link
            const learnMore = document.querySelector('#accounts .text-green-600.font-medium');
            if (learnMore) {
                learnMore.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNotification('Data privacy information coming soon', 'info');
                });
                learnMore.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }
        },

        showAddAccountModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Connect Account</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">Choose account type to connect</p>
                    
                    <div class="space-y-3">
                        <button class="w-full p-4 border rounded-xl hover:bg-gray-50 transition flex items-center focus:outline-none focus:ring-2 focus:ring-green-500" data-type="bank">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-university text-blue-600 text-xl"></i>
                            </div>
                            <div class="text-left">
                                <div class="font-medium">Bank Account</div>
                                <div class="text-sm text-gray-600">Connect your bank for easy transfers</div>
                            </div>
                        </button>
                        
                        <button class="w-full p-4 border rounded-xl hover:bg-gray-50 transition flex items-center focus:outline-none focus:ring-2 focus:ring-green-500" data-type="cds">
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-landmark text-green-600 text-xl"></i>
                            </div>
                            <div class="text-left">
                                <div class="font-medium">CDS Account</div>
                                <div class="text-sm text-gray-600">Connect your Central Depository account</div>
                            </div>
                        </button>
                        
                        <button class="w-full p-4 border rounded-xl hover:bg-gray-50 transition flex items-center focus:outline-none focus:ring-2 focus:ring-green-500" data-type="mpesa">
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fab fa-whatsapp text-green-600 text-xl"></i>
                            </div>
                            <div class="text-left">
                                <div class="font-medium">M-Pesa</div>
                                <div class="text-sm text-gray-600">Already connected: ${AppState.profile?.phone || '+254 XXX XXX XXX'}</div>
                            </div>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelectorAll('button[data-type]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    if (type === 'mpesa') {
                        this.showNotification('M-Pesa is already connected', 'info');
                    } else {
                        this.showNotification(`${type.toUpperCase()} account connection coming soon!`, 'info');
                    }
                    modal.remove();
                });
            });
        },

        // GOALS SECTION

        updateGoalsSection() {
            const container = document.querySelector('#goals .grid');
            if (!container) return;

            if (AppState.goals.length === 0) {
                container.innerHTML = '<p class="col-span-2 text-center py-8 text-gray-500">No goals yet. Create your first goal!</p>';
                return;
            }

            container.innerHTML = AppState.goals.slice(0, 2).map(goal => this.renderGoalCard(goal)).join('');

            document.querySelectorAll('.goal-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.showGoalDetails(card.dataset.id);
                });

                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.showGoalDetails(card.dataset.id);
                    }
                });
            });

            document.querySelectorAll('.add-to-goal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const goalId = btn.dataset.id;
                    const goal = AppState.goals.find(g => g.id === goalId);
                    if (goal) this.showAddToGoalModal(goal);
                });
            });

            document.querySelectorAll('.view-goal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const goalId = btn.dataset.id;
                    this.showGoalDetails(goalId);
                });
            });

            const newGoalLink = document.querySelector('#goals a[href="#"]');
            if (newGoalLink) {
                newGoalLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNewGoalModal();
                });
                newGoalLink.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }

            this.updateCompletedGoal();
        },

        renderGoalCard(goal) {
            const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <div class="border-2 border-green-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition cursor-pointer goal-card focus:outline-none focus:ring-2 focus:ring-green-500" 
                     data-id="${goal.id}" tabindex="0" role="button">
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
                        <div class="flex space-x-2">
                            <button class="text-green-600 hover:text-green-700 text-sm font-medium add-to-goal focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 min-h-[44px]" data-id="${goal.id}">
                                <i class="fas fa-plus-circle mr-1"></i>Add
                            </button>
                            <button class="text-green-600 hover:text-green-700 text-sm font-medium view-goal focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 min-h-[44px]" data-id="${goal.id}">
                                Details
                            </button>
                        </div>
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

        updateCompletedGoal() {
            const completedContainer = document.querySelector('#goals .mt-6.p-4.bg-gray-50.rounded-lg');
            if (!completedContainer) return;

            const completedGoals = AppState.goals.filter(g => g.status === 'completed');

            if (completedGoals.length === 0) {
                completedContainer.style.display = 'none';
                return;
            }

            const goal = completedGoals[0];
            completedContainer.style.display = 'block';
            completedContainer.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center min-w-0 flex-1">
                        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <i class="fas fa-check text-green-600"></i>
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-medium text-gray-800 truncate">${goal.name}</h4>
                            <p class="text-gray-600 text-sm">Achieved: ${this.formatDate(goal.completedDate || goal.deadline, 'short')}</p>
                        </div>
                    </div>
                    <span class="text-green-600 font-medium ml-2">${this.formatCurrency(goal.targetAmount)}</span>
                </div>
            `;
        },

        showGoalDetails(goalId) {
            const goal = AppState.goals.find(g => g.id === goalId);
            if (!goal) return;

            const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
            const remaining = goal.targetAmount - goal.savedAmount;
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'goal-details-title');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 id="goal-details-title" class="text-xl font-bold">${goal.name}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <span class="text-gray-600">Overall Progress</span>
                            <span class="font-bold text-2xl text-green-600">${percent}%</span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Saved</p>
                                <p class="text-xl font-bold">${this.formatCurrency(goal.savedAmount)}</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Target</p>
                                <p class="text-xl font-bold">${this.formatCurrency(goal.targetAmount)}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Remaining</p>
                                <p class="text-xl font-bold text-orange-600">${this.formatCurrency(remaining)}</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Days Left</p>
                                <p class="text-xl font-bold ${daysLeft < 30 ? 'text-red-600' : 'text-green-600'}">${daysLeft}</p>
                            </div>
                        </div>
                        
                        ${goal.autoSave ? `
                            <div class="p-4 bg-green-50 rounded-lg">
                                <p class="font-medium">Auto-Save Active</p>
                                <p class="text-sm text-gray-600">${this.formatCurrency(goal.autoSave.amount)} per ${goal.autoSave.frequency}</p>
                            </div>
                        ` : ''}
                        
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-medium mb-2">Contribution History</h4>
                            ${goal.contributions ? goal.contributions.slice(-3).map(c => `
                                <div class="flex justify-between text-sm py-1">
                                    <span>${this.formatDate(c.date)}</span>
                                    <span class="font-medium">${this.formatCurrency(c.amount)}</span>
                                    <span class="text-gray-500">${c.type}</span>
                                </div>
                            `).join('') : '<p class="text-sm text-gray-500">No contributions yet</p>'}
                        </div>
                        
                        <div class="flex flex-col sm:flex-row gap-3 mt-4">
                            <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="add-to-goal">
                                Add Money
                            </button>
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" id="edit-goal">
                                Edit Goal
                            </button>
                            <button class="flex-1 px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]" id="delete-goal">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('add-to-goal').addEventListener('click', () => {
                modal.remove();
                this.showAddToGoalModal(goal);
            });

            document.getElementById('edit-goal').addEventListener('click', () => {
                modal.remove();
                this.showEditGoalModal(goal);
            });

            document.getElementById('delete-goal').addEventListener('click', async () => {
                modal.remove();
                await this.deleteGoal(goal);
            });
        },

        showAddToGoalModal(goal) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Add to ${goal.name}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Amount (Ksh)</label>
                            <input type="number" id="add-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                                   min="100" step="100" value="1000">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Source</label>
                            <select id="add-source" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                <option value="mpesa">M-Pesa</option>
                                <option value="bank">Bank Account</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>
                        
                        <div class="bg-green-50 p-4 rounded-lg">
                            <p class="text-sm text-gray-600">Current progress: ${this.formatCurrency(goal.savedAmount)} of ${this.formatCurrency(goal.targetAmount)}</p>
                            <p class="text-sm text-gray-600 mt-1">After adding: <span id="after-amount">${this.formatCurrency(goal.savedAmount + 1000)}</span></p>
                        </div>
                        
                        <div class="flex flex-col sm:flex-row gap-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                                Cancel
                            </button>
                            <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="confirm-add">
                                Add Money
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const amountInput = document.getElementById('add-amount');
            const afterSpan = document.getElementById('after-amount');

            amountInput.addEventListener('input', () => {
                const amount = parseFloat(amountInput.value) || 0;
                afterSpan.textContent = this.formatCurrency(goal.savedAmount + amount);
            });

            document.getElementById('confirm-add').addEventListener('click', async () => {
                const amount = parseFloat(amountInput.value);
                const source = document.getElementById('add-source').value;

                if (amount < 100) {
                    this.showNotification('Minimum amount is Ksh 100', 'error');
                    return;
                }

                goal.savedAmount += amount;

                if (!goal.contributions) goal.contributions = [];
                goal.contributions.push({
                    date: new Date().toISOString(),
                    amount: amount,
                    type: source
                });

                await this.saveGoals();
                this.updateGoalsSection();
                this.updateOverviewStats();

                const transaction = {
                    id: 'TXN' + Date.now(),
                    userId: AppState.user.userId,
                    type: 'savings',
                    goalId: goal.id,
                    goalName: goal.name,
                    amount: amount,
                    source: source,
                    status: 'completed',
                    date: new Date().toISOString()
                };

                await this.saveTransaction(transaction);

                this.showNotification(`Added ${this.formatCurrency(amount)} to ${goal.name}`, 'success');
                modal.remove();
            });
        },

        showEditGoalModal(goal) {
            const deadline = new Date(goal.deadline).toISOString().split('T')[0];

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Edit Goal</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Goal Name</label>
                            <input type="text" id="edit-name" value="${goal.name}" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Amount (Ksh)</label>
                            <input type="number" id="edit-target" value="${goal.targetAmount}" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Date</label>
                            <input type="date" id="edit-deadline" value="${deadline}" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3 mt-6">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="save-edit">
                            Save Changes
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('save-edit').addEventListener('click', async () => {
                goal.name = document.getElementById('edit-name').value;
                goal.targetAmount = parseFloat(document.getElementById('edit-target').value);
                goal.deadline = new Date(document.getElementById('edit-deadline').value).toISOString();

                await this.saveGoals();
                this.updateGoalsSection();
                this.showNotification('Goal updated successfully', 'success');
                modal.remove();
            });
        },

        async deleteGoal(goal) {
            const confirmed = await this.confirmAction({
                title: 'Delete Goal',
                message: `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
                confirmText: 'Delete',
                type: 'danger'
            });

            if (confirmed) {
                AppState.goals = AppState.goals.filter(g => g.id !== goal.id);
                await this.saveGoals();
                this.updateGoalsSection();
                this.showNotification('Goal deleted', 'warning');
            }
        },

        showNewGoalModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Create New Goal</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Goal Name</label>
                            <input type="text" id="goal-name" placeholder="e.g., Buy a car" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Amount (Ksh)</label>
                            <input type="number" id="goal-amount" placeholder="50000" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Date</label>
                            <input type="date" id="goal-deadline" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Category</label>
                            <select id="goal-category" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                <option value="savings">Savings</option>
                                <option value="investment">Investment</option>
                                <option value="education">Education</option>
                                <option value="business">Business</option>
                                <option value="emergency">Emergency Fund</option>
                            </select>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="goal-auto-save" class="mr-2 w-4 h-4">
                            <label for="goal-auto-save" class="text-gray-700">Set up auto-save (Ksh 1,000/month)</label>
                        </div>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3 mt-6">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="create-goal-btn">
                            Create Goal
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('create-goal-btn').addEventListener('click', async () => {
                const goalData = {
                    id: 'GL' + Date.now(),
                    userId: AppState.user.userId,
                    name: document.getElementById('goal-name').value,
                    targetAmount: parseFloat(document.getElementById('goal-amount').value),
                    savedAmount: 0,
                    deadline: new Date(document.getElementById('goal-deadline').value).toISOString(),
                    category: document.getElementById('goal-category').value,
                    priority: 'medium',
                    status: 'active',
                    autoSave: document.getElementById('goal-auto-save').checked ? {
                        enabled: true,
                        amount: 1000,
                        frequency: 'monthly'
                    } : null,
                    contributions: [],
                    createdAt: new Date().toISOString()
                };

                if (!goalData.name || !goalData.targetAmount || !goalData.deadline) {
                    this.showNotification('Please fill all fields', 'error');
                    return;
                }

                AppState.goals.push(goalData);
                await this.saveGoals();
                this.updateGoalsSection();
                this.showNotification('Goal created successfully!', 'success');
                modal.remove();
            });
        },

        async saveGoals() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.GOALS);
                let allGoals = cached ? JSON.parse(cached) : [];
                const otherGoals = allGoals.filter(g => g.userId !== AppState.user.userId);
                const updatedGoals = [...otherGoals, ...AppState.goals];
                localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updatedGoals));

                window.dispatchEvent(new CustomEvent('pesasmart-goals-update', {
                    detail: { goals: AppState.goals }
                }));

                return true;
            } catch (error) {
                console.error('Failed to save goals:', error);
                return false;
            }
        },

        async saveTransaction(transaction) {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                let allTransactions = cached ? JSON.parse(cached) : [];
                allTransactions.push(transaction);
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));

                AppState.transactions.push(transaction);

                window.dispatchEvent(new CustomEvent('pesasmart-transaction-update', {
                    detail: { transaction }
                }));

                return true;
            } catch (error) {
                console.error('Failed to save transaction:', error);
                return false;
            }
        },

        // DOCUMENTS SECTION

        updateDocumentsSection() {
            const bronzeCert = document.querySelector('#documents .grid .text-gray-600.text-sm');
            if (bronzeCert && AppState.achievements.length > 0) {
                const bronzeAchievement = AppState.achievements.find(a => a.name === 'Budget Master');
                if (bronzeAchievement) {
                    bronzeCert.textContent = `Issued: ${this.formatDate(bronzeAchievement.earnedAt)}`;
                }
            }

            document.querySelectorAll('#documents a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = e.target.closest('a').textContent.trim();
                    const docName = e.target.closest('.border').querySelector('h3').textContent;

                    if (action === 'View') {
                        this.showDocumentPreview(docName);
                    } else if (action === 'Download') {
                        this.downloadDocument(docName);
                    } else if (action === 'Share') {
                        this.shareDocument(docName);
                    }
                });
                link.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            });

            const viewAllLink = document.querySelector('#documents .text-center a');
            if (viewAllLink) {
                viewAllLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAllDocuments();
                });
                viewAllLink.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }
        },

        showDocumentPreview(docName) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">${docName}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-12 text-center">
                        <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
                        <p class="text-gray-600 mb-4">Document preview</p>
                        <div class="flex flex-col sm:flex-row justify-center gap-3">
                            <button class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                <i class="fas fa-download mr-2"></i>Download
                            </button>
                            <button class="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]">
                                <i class="fas fa-print mr-2"></i>Print
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        downloadDocument(docName) {
            this.showNotification(`Downloading ${docName}...`, 'info');
            setTimeout(() => {
                this.showNotification('Document downloaded successfully!', 'success');
            }, 1500);
        },

        shareDocument(docName) {
            const text = `Check out my ${docName} from PesaSmart!`;
            if (navigator.share) {
                navigator.share({
                    title: docName,
                    text: text,
                    url: window.location.origin
                }).catch(() => {
                    this.copyToClipboard(text);
                });
            } else {
                this.copyToClipboard(text);
            }
        },

        showAllDocuments() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">All Documents</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="border rounded-xl p-4">
                            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <h4 class="font-bold">PesaSmart Bronze Certified</h4>
                                    <p class="text-sm text-gray-600">Issued: ${this.formatDate(AppState.progress?.lastActive || new Date())}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button class="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                        <i class="fas fa-eye mr-1"></i> View
                                    </button>
                                    <button class="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                        <i class="fas fa-download mr-1"></i> Download
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border rounded-xl p-4">
                            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <h4 class="font-bold">Investment Basics (CMA)</h4>
                                    <p class="text-sm text-gray-600">Issued: ${this.formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button class="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                        <i class="fas fa-eye mr-1"></i> View
                                    </button>
                                    <button class="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                        <i class="fas fa-download mr-1"></i> Download
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        ${AppState.achievements.filter(a => a.certificate).map(a => `
                            <div class="border rounded-xl p-4">
                                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                        <h4 class="font-bold">${a.name} Certificate</h4>
                                        <p class="text-sm text-gray-600">Issued: ${this.formatDate(a.earnedAt)}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button class="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                            <i class="fas fa-eye mr-1"></i> View
                                        </button>
                                        <button class="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg border border-green-600 hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]">
                                            <i class="fas fa-download mr-1"></i> Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        // SECURITY SECTION

        updateSecuritySection() {
            const twoFactorToggle = document.querySelector('.bg-green-50 input[type="checkbox"]');
            if (twoFactorToggle) {
                twoFactorToggle.addEventListener('change', function () {
                    const enabled = this.checked;
                    UI.showNotification(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, 'info');

                    if (enabled) {
                        UI.show2FASetup();
                    }
                });
            }

            const smsToggle = document.querySelector('.bg-blue-50 input[type="checkbox"]');
            if (smsToggle) {
                smsToggle.addEventListener('change', function () {
                    const enabled = this.checked;
                    UI.showNotification(`SMS notifications ${enabled ? 'enabled' : 'disabled'}`, 'info');
                });
            }

            const historyBtn = document.querySelector('.bg-purple-50 a[href="#"]');
            if (historyBtn) {
                historyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLoginHistory();
                });
                historyBtn.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }

            const downloadBtn = document.querySelector('.bg-red-50 a[href="#"]');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.downloadUserData();
                });
                downloadBtn.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }
        },

        show2FASetup() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Setup Two-Factor Authentication</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="text-center mb-6">
                        <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-qrcode text-green-600 text-4xl"></i>
                        </div>
                        <p class="text-gray-600">Scan this QR code with your authenticator app</p>
                    </div>
                    
                    <div class="bg-gray-100 p-4 rounded-lg text-center mb-4 font-mono">
                        ABCD EFGH IJKL MNOP
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Enter verification code</label>
                        <input type="text" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="000000">
                    </div>
                    
                    <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]">
                        Verify and Enable
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        },

        showLoginHistory() {
            const history = [
                { date: new Date(), device: 'Chrome on Windows', location: 'Nairobi, Kenya', ip: '192.168.1.1' },
                { date: new Date(Date.now() - 86400000), device: 'Safari on iPhone', location: 'Mombasa, Kenya', ip: '192.168.1.2' },
                { date: new Date(Date.now() - 172800000), device: 'Firefox on Mac', location: 'Kisumu, Kenya', ip: '192.168.1.3' }
            ];

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">Login History</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[600px]">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="py-3 px-4 text-left">Date & Time</th>
                                    <th class="py-3 px-4 text-left">Device</th>
                                    <th class="py-3 px-4 text-left">Location</th>
                                    <th class="py-3 px-4 text-left">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${history.map(entry => `
                                    <tr class="border-b">
                                        <td class="py-3 px-4">${this.formatDate(entry.date, 'full')}</td>
                                        <td class="py-3 px-4">${entry.device}</td>
                                        <td class="py-3 px-4">${entry.location}</td>
                                        <td class="py-3 px-4">${entry.ip}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        downloadUserData() {
            const userData = {
                profile: AppState.profile,
                goals: AppState.goals,
                transactions: AppState.transactions,
                progress: AppState.progress,
                achievements: AppState.achievements,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pesasmart-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showNotification('Your data has been downloaded', 'success');
        },

        // SETTINGS SECTION

        updateSettingsSection() {
            this.populateSettingsForm();

            const editBtn = document.querySelector('#settings .text-green-600');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showEditProfileModal();
                });
                editBtn.classList.add('min-h-[44px]', 'inline-flex', 'items-center');
            }

            this.setupNotificationToggles();

            const saveBtn = document.querySelector('#settings .flex.justify-end button');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveAllSettings();
                });
                saveBtn.classList.add('min-h-[44px]');
            }

            this.setupDangerZone();
        },

        populateSettingsForm() {
            const firstNameInput = document.querySelector('#settings input[value="Ann"]');
            if (firstNameInput) firstNameInput.value = AppState.profile.firstName || 'User';

            const lastNameInput = document.querySelector('#settings input[value="Muthoni"]');
            if (lastNameInput) lastNameInput.value = AppState.profile.lastName || '';

            const emailInput = document.querySelector('#settings input[value="ann.muthoni@email.com"]');
            if (emailInput) emailInput.value = AppState.profile.email || 'user@email.com';

            const phoneInput = document.querySelector('#settings input[value="+254 712 345 678"]');
            if (phoneInput) phoneInput.value = AppState.profile.phone || '+254 712 345 678';
        },

        setupNotificationToggles() {
            const toggles = document.querySelectorAll('#settings input[type="checkbox"]');

            toggles.forEach(toggle => {
                toggle.addEventListener('change', function () {
                    const setting = this.closest('.flex.items-center.justify-between')?.querySelector('.font-medium')?.textContent;
                    UI.showNotification(`${setting} ${this.checked ? 'enabled' : 'disabled'}`, 'info');
                });
            });
        },

        saveAllSettings() {
            const firstName = document.querySelector('#settings input[value="Ann"]')?.value;
            const lastName = document.querySelector('#settings input[value="Muthoni"]')?.value;
            const email = document.querySelector('#settings input[value="ann.muthoni@email.com"]')?.value;
            const phone = document.querySelector('#settings input[value="+254 712 345 678"]')?.value;

            if (AppState.profile) {
                AppState.profile.firstName = firstName;
                AppState.profile.lastName = lastName;
                AppState.profile.email = email;
                AppState.profile.phone = phone;

                this.saveUserProfile();
                this.updateProfileHeader();
                this.showNotification('Settings saved successfully!', 'success');
            }
        },

        async saveUserProfile() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                let users = cached ? JSON.parse(cached) : [];
                const userIndex = users.findIndex(u => u.id === AppState.profile.id);

                if (userIndex >= 0) {
                    users[userIndex] = AppState.profile;
                } else {
                    users.push(AppState.profile);
                }

                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

                window.dispatchEvent(new CustomEvent('pesasmart-profile-update', {
                    detail: { profile: AppState.profile }
                }));

                return true;
            } catch (error) {
                console.error('Failed to save user profile:', error);
                return false;
            }
        },

        setupDangerZone() {
            const deactivateBtn = document.querySelector('.border.border-red-500.text-red-600');
            if (deactivateBtn) {
                deactivateBtn.addEventListener('click', () => {
                    this.confirmAction({
                        title: 'Deactivate Account',
                        message: 'Are you sure you want to temporarily deactivate your account? You can reactivate anytime by logging in.',
                        confirmText: 'Deactivate',
                        type: 'warning'
                    }).then(confirmed => {
                        if (confirmed) {
                            this.deactivateAccount();
                        }
                    });
                });
                deactivateBtn.classList.add('min-h-[44px]');
            }

            const deleteBtn = document.querySelector('.bg-red-500.hover\\:bg-red-600');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.confirmAction({
                        title: 'Delete Account Permanently',
                        message: 'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
                        confirmText: 'Delete Forever',
                        type: 'danger'
                    }).then(confirmed => {
                        if (confirmed) {
                            this.deleteAccountPermanently();
                        }
                    });
                });
                deleteBtn.classList.add('min-h-[44px]');
            }
        },

        deactivateAccount() {
            this.showNotification('Account deactivated. Redirecting...', 'info');
            setTimeout(() => {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
                window.location.href = 'index.html';
            }, 2000);
        },

        async deleteAccountPermanently() {
            this.showLoading('Deleting account...');

            try {
                // Remove user data from all storage
                const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
                const filteredUsers = users.filter(u => u.id !== AppState.user.userId);
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));

                const goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '[]');
                const filteredGoals = goals.filter(g => g.userId !== AppState.user.userId);
                localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(filteredGoals));

                const transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
                const filteredTrans = transactions.filter(t => t.userId !== AppState.user.userId);
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filteredTrans));

                const progress = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '[]');
                const filteredProgress = progress.filter(p => p.userId !== AppState.user.userId);
                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(filteredProgress));

                localStorage.removeItem(STORAGE_KEYS.SESSION);

                this.showNotification('Account permanently deleted. Goodbye!', 'info');

                setTimeout(() => {
                    window.location.href = 'register.html';
                }, 2000);

            } catch (error) {
                console.error('Account deletion error:', error);
                this.showNotification('Failed to delete account', 'error');
                this.hideLoading();
            }
        },

        showEditProfileModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Edit Profile</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-gray-700 mb-2">First Name</label>
                                <input type="text" id="edit-firstName" value="${AppState.profile.firstName || ''}" 
                                       class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            </div>
                            <div>
                                <label class="block text-gray-700 mb-2">Last Name</label>
                                <input type="text" id="edit-lastName" value="${AppState.profile.lastName || ''}" 
                                       class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 mb-2">Email</label>
                            <input type="email" id="edit-email" value="${AppState.profile.email || ''}" 
                                   class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 mb-2">Phone</label>
                            <input type="tel" id="edit-phone" value="${AppState.profile.phone || ''}" 
                                   class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 mb-2">Occupation</label>
                            <select id="edit-occupation" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                <option value="student" ${AppState.profile.profile?.occupation === 'student' ? 'selected' : ''}>Student</option>
                                <option value="employed" ${AppState.profile.profile?.occupation === 'employed' ? 'selected' : ''}>Employed</option>
                                <option value="business" ${AppState.profile.profile?.occupation === 'business' ? 'selected' : ''}>Business Owner</option>
                                <option value="farmer" ${AppState.profile.profile?.occupation === 'farmer' ? 'selected' : ''}>Farmer</option>
                                <option value="juaKali" ${AppState.profile.profile?.occupation === 'juaKali' ? 'selected' : ''}>Jua Kali Artisan</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 mb-2">Date of Birth</label>
                            <input type="date" id="edit-dob" value="${AppState.profile.profile?.dateOfBirth || ''}" 
                                   class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 mb-2">County</label>
                            <select id="edit-county" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                <option value="Nairobi">Nairobi</option>
                                <option value="Mombasa">Mombasa</option>
                                <option value="Kisumu">Kisumu</option>
                                <option value="Nakuru">Nakuru</option>
                                <option value="Kiambu">Kiambu</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3 mt-6">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="save-profile-btn">
                            Save Changes
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('save-profile-btn').addEventListener('click', () => {
                AppState.profile.firstName = document.getElementById('edit-firstName').value;
                AppState.profile.lastName = document.getElementById('edit-lastName').value;
                AppState.profile.email = document.getElementById('edit-email').value;
                AppState.profile.phone = document.getElementById('edit-phone').value;

                if (!AppState.profile.profile) AppState.profile.profile = {};
                AppState.profile.profile.occupation = document.getElementById('edit-occupation').value;
                AppState.profile.profile.dateOfBirth = document.getElementById('edit-dob').value;
                AppState.profile.profile.county = document.getElementById('edit-county').value;

                this.saveUserProfile();
                this.updateProfileHeader();
                this.populateSettingsForm();

                modal.remove();
                this.showNotification('Profile updated successfully!', 'success');
            });
        },

        // SCROLL SPY

        setupScrollSpy() {
            const sections = ['overview', 'achievements', 'accounts', 'goals', 'documents', 'security', 'settings'];
            const navLinks = document.querySelectorAll('nav a[href^="#"]');

            window.addEventListener('scroll', () => {
                let current = '';

                sections.forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        const sectionTop = section.offsetTop - 100;
                        const sectionBottom = sectionTop + section.offsetHeight;

                        if (window.scrollY >= sectionTop && window.scrollY < sectionBottom) {
                            current = sectionId;
                        }
                    }
                });

                navLinks.forEach(link => {
                    link.classList.remove('text-green-600', 'bg-green-50');
                    link.classList.add('text-gray-700');

                    const href = link.getAttribute('href')?.substring(1);
                    if (href === current) {
                        link.classList.remove('text-gray-700');
                        link.classList.add('text-green-600', 'bg-green-50');
                    }
                });
            });

            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href')?.substring(1);
                    const targetSection = document.getElementById(targetId);

                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        },

        // GOOGLE CHARTS

        drawCharts() {
            google.charts.load('current', { packages: ['corechart', 'line', 'bar'] });
            google.charts.setOnLoadCallback(() => {
                this.drawPortfolioChart();
                this.drawGoalsChart();
                this.drawActivityChart();
                this.drawCategoryChart();
            });
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
            data.addColumn({ type: 'string', role: 'style' });

            AppState.goals.slice(0, 5).forEach(goal => {
                const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
                let color = percent < 25 ? '#FDCB6E' : percent < 50 ? '#F39C12' : percent < 75 ? '#E67E22' : '#00B894';
                data.addRow([goal.name, percent, color]);
            });

            const options = {
                title: 'Goal Progress',
                legend: { position: 'none' },
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
                animation: {
                    startup: true,
                    duration: 1000
                },
                responsive: true,
                maintainAspectRatio: false
            };

            const chart = new google.visualization.ColumnChart(container);
            chart.draw(data, options);

            window.addEventListener('resize', () => {
                chart.draw(data, options);
            });
        },

        drawActivityChart() {
            const container = document.getElementById('activity-chart');
            if (!container || !AppState.transactions?.length) return;

            const months = {};
            const now = new Date();

            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthKey = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
                months[monthKey] = 0;
            }

            AppState.transactions.forEach(t => {
                if (t.amount) {
                    const date = new Date(t.date);
                    const monthKey = date.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
                    if (months.hasOwnProperty(monthKey)) {
                        months[monthKey] += t.amount;
                    }
                }
            });

            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Month');
            data.addColumn('number', 'Amount');

            Object.entries(months).forEach(([month, amount]) => {
                data.addRow([month, amount]);
            });

            const options = {
                title: 'Monthly Activity',
                legend: { position: 'none' },
                colors: ['#00B894'],
                hAxis: {
                    slantedText: true,
                    textStyle: { fontSize: 10 }
                },
                vAxis: {
                    format: 'short',
                    textStyle: { fontSize: 10 }
                },
                chartArea: {
                    width: '80%',
                    height: '70%',
                    left: 50,
                    right: 20
                },
                animation: {
                    startup: true,
                    duration: 1000
                },
                responsive: true,
                maintainAspectRatio: false
            };

            const chart = new google.visualization.ColumnChart(container);
            chart.draw(data, options);

            window.addEventListener('resize', () => {
                chart.draw(data, options);
            });
        },

        drawCategoryChart() {
            const container = document.getElementById('category-chart');
            if (!container || !AppState.transactions?.length) return;

            const byType = {};
            AppState.transactions.forEach(t => {
                if (t.amount) {
                    byType[t.type] = (byType[t.type] || 0) + t.amount;
                }
            });

            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Category');
            data.addColumn('number', 'Amount');

            Object.entries(byType).forEach(([type, amount]) => {
                data.addRow([type.charAt(0).toUpperCase() + type.slice(1), amount]);
            });

            const options = {
                title: 'Spending by Category',
                pieHole: 0.4,
                colors: ['#00B894', '#0984E3', '#6C5CE7', '#FDCB6E', '#E17055'],
                chartArea: {
                    width: '100%',
                    height: '80%'
                },
                legend: {
                    position: 'bottom',
                    textStyle: { fontSize: 11 }
                },
                animation: {
                    startup: true,
                    duration: 1000
                },
                responsive: true,
                maintainAspectRatio: false
            };

            const chart = new google.visualization.PieChart(container);
            chart.draw(data, options);

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

        formatDate(dateString, format = 'short') {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';

            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (format === 'relative') {
                if (diffDays < 1) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 7) return `${diffDays} days ago`;
                return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
            }

            if (format === 'short') {
                return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            return date.toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Could not copy to clipboard', 'error');
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
            this.updateProfileHeader();
            this.updateSidebarStats();
            this.updateOverviewStats();
            this.updateAchievementsSection();
            this.updateAccountsSection();
            this.updateGoalsSection();
            this.updateDocumentsSection();
            this.updateSecuritySection();
            this.updateSettingsSection();

            this.setupScrollSpy();
            this.drawCharts();

            this.hideLoading();

            // Handle URL hash
            if (window.location.hash) {
                const targetId = window.location.hash.substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    setTimeout(() => {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 500);
                }
            }

            // Announce for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = 'Profile page loaded. You can manage your account settings and view your progress.';
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);

            console.log('Profile page initialized');
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
        .goal-card, .achievement-card, .activity-item {
            transition: all 0.2s ease;
        }
        .goal-card:hover, .achievement-card:hover, .activity-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .goal-card:focus-visible, .achievement-card:focus-visible, .activity-item:focus-visible {
            outline: 2px solid #00B894;
            outline-offset: 2px;
        }
        nav a[href^="#"] {
            transition: all 0.2s ease;
        }
        nav a[href^="#"]:focus-visible {
            outline: 2px solid #00B894;
            outline-offset: 2px;
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
            button, a, [role="button"], .goal-card, .achievement-card, .activity-item {
                min-height: 44px;
            }
            input, select, textarea {
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