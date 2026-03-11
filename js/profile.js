(function() {
    'use strict';

    //==============================================================================
    // CONFIGURATION & CONSTANTS
    //==============================================================================

    const APP_VERSION = '2.0.0';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const NOTIFICATION_SOUND = false; // Toggle for production

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        GOALS: 'pesasmart_goals',
        TRANSACTIONS: 'pesasmart_transactions',
        PROGRESS: 'pesasmart_progress',
        PRODUCTS: 'pesasmart_products',
        MARKET: 'pesasmart_market',
        NOTIFICATIONS: 'pesasmart_notifications',
        CACHE_PREFIX: 'cache_',
        VERSION: 'pesasmart_version'
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
        notifications: [],
        loading: false,
        lastSync: null,
        
        // Version control for cross-page consistency
        version: APP_VERSION,
        
        // Update timestamp for index page correlation
        lastUpdated: null,

        // Update state and trigger re-render
        update(key, value) {
            this[key] = value;
            this.lastUpdated = Date.now();
            this.persist();
            
            // Dispatch event for index page to sync
            window.dispatchEvent(new CustomEvent('pesasmart-state-change', {
                detail: { key, value, timestamp: this.lastUpdated }
            }));
        },

        // Persist to localStorage for index page access
        persist() {
            try {
                localStorage.setItem(STORAGE_KEYS.CACHE_PREFIX + 'appstate', JSON.stringify({
                    version: this.version,
                    lastUpdated: this.lastUpdated,
                    profile: this.profile?.id
                }));
            } catch (e) {
                console.warn('Failed to persist state:', e);
            }
        },

        // Clear sensitive data on logout
        clear() {
            this.user = null;
            this.profile = null;
            this.goals = [];
            this.transactions = [];
            this.progress = null;
            this.achievements = [];
            this.notifications = [];
        }
    };

    //==============================================================================
    // SECURITY & AUTHENTICATION
    //==============================================================================

    const Security = {
        /**
         * Validate session with expiry check
         */
        validateSession() {
            const session = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!session) {
                this.redirectToLogin('No active session');
                return false;
            }

            try {
                const sessionData = JSON.parse(session);
                
                // Check expiry
                if (sessionData.expires && sessionData.expires < Date.now()) {
                    this.redirectToLogin('Session expired');
                    return false;
                }

                // Validate session integrity
                if (!sessionData.userId || !sessionData.email) {
                    this.redirectToLogin('Invalid session');
                    return false;
                }

                AppState.user = sessionData;
                return true;

            } catch (e) {
                console.error('Session validation error:', e);
                this.redirectToLogin('Session corrupted');
                return false;
            }
        },

        /**
         * Redirect to login with return URL
         */
        redirectToLogin(reason = '') {
            const returnUrl = encodeURIComponent(window.location.pathname);
            window.location.href = `login.html?redirect=${returnUrl}&reason=${encodeURIComponent(reason)}`;
        },

        /**
         * Secure logout with cleanup
         */
        async logout() {
            const confirmed = await UI.confirmAction({
                title: 'Log Out',
                message: 'Are you sure you want to log out of your PesaSmart account?',
                confirmText: 'Log Out',
                cancelText: 'Stay',
                type: 'warning'
            });

            if (!confirmed) return;

            UI.showLoading('Logging out...');

            try {
                // Clear all session data
                localStorage.removeItem(STORAGE_KEYS.SESSION);
                sessionStorage.clear();
                
                // Clear state
                AppState.clear();
                
                // Log activity (optional)
                console.log('User logged out at:', new Date().toISOString());
                
                UI.showNotification('Logged out successfully', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

            } catch (error) {
                console.error('Logout error:', error);
                UI.showNotification('Logout failed, but session cleared', 'warning');
                window.location.href = 'index.html';
            } finally {
                UI.hideLoading();
            }
        },

        /**
         * Simulate 2FA setup (demo)
         */
        async setup2FA() {
            UI.showNotification('2FA setup initiated - check your email', 'info');
            
            // In production, this would integrate with actual 2FA service
            setTimeout(() => {
                UI.showNotification('2FA enabled successfully!', 'success');
            }, 2000);
        },

        /**
         * Download user data (GDPR compliance demo)
         */
        downloadUserData() {
            const userData = {
                profile: AppState.profile,
                goals: AppState.goals,
                transactions: AppState.transactions,
                progress: AppState.progress,
                achievements: AppState.achievements,
                exportDate: new Date().toISOString(),
                appVersion: APP_VERSION
            };

            const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pesasmart-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            UI.showNotification('Your data has been downloaded', 'success');
        }
    };

    //==============================================================================
    // DATA LAYER (Shared with index.html)
    //==============================================================================

    const DataLayer = {
        /**
         * Load all user data with caching and error handling
         */
        async loadUserData() {
            UI.showLoading('Loading your profile...');

            try {
                // Load from various sources in parallel
                const [users, goals, transactions, progress] = await Promise.all([
                    this.loadUsers(),
                    this.loadGoals(),
                    this.loadTransactions(),
                    this.loadProgress()
                ]);

                // Find current user profile
                const profile = users.find(u => u.id === AppState.user.userId);
                
                if (!profile) {
                    throw new Error('User profile not found');
                }

                // Update state
                AppState.profile = profile;
                AppState.goals = goals.filter(g => g.userId === profile.id);
                AppState.transactions = transactions.filter(t => t.userId === profile.id);
                AppState.progress = progress.find(p => p.userId === profile.id) || this.createDefaultProgress(profile.id);
                
                // Load achievements from progress
                this.loadAchievements();

                // Sync with index page
                this.syncWithIndex();

                return true;

            } catch (error) {
                console.error('Data loading error:', error);
                UI.showNotification('Failed to load profile data', 'error');
                return false;

            } finally {
                UI.hideLoading();
            }
        },

        /**
         * Load users with cache
         */
        async loadUsers() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.USERS);
                if (cached) {
                    const data = JSON.parse(cached);
                    // Check cache age
                    if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                        return data.users || [];
                    }
                }

                const response = await fetch('data/users.json');
                const data = await response.json();
                const users = data.users || [];
                
                // Cache with timestamp
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify({
                    users,
                    _timestamp: Date.now()
                }));
                
                return users;

            } catch (error) {
                console.error('Failed to load users:', error);
                return [];
            }
        },

        /**
         * Load goals with cache
         */
        async loadGoals() {
            try {
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

            } catch (error) {
                console.error('Failed to load goals:', error);
                return [];
            }
        },

        /**
         * Load transactions with cache
         */
        async loadTransactions() {
            try {
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

            } catch (error) {
                console.error('Failed to load transactions:', error);
                return [];
            }
        },

        /**
         * Load progress with cache
         */
        async loadProgress() {
            try {
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

            } catch (error) {
                console.error('Failed to load progress:', error);
                return [];
            }
        },

        /**
         * Create default progress for new users
         */
        createDefaultProgress(userId) {
            return {
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
        },

        /**
         * Load achievements from progress and badge data
         */
        async loadAchievements() {
            if (!AppState.progress || !AppState.progress.earnedBadges) {
                AppState.achievements = [];
                return;
            }

            try {
                // Try to load badge details from courses.json
                const cached = localStorage.getItem('pesasmart_courses');
                let badges = {};

                if (cached) {
                    const courses = JSON.parse(cached);
                    badges = courses.badges || {};
                } else {
                    const response = await fetch('data/courses.json');
                    const data = await response.json();
                    badges = data.badges || {};
                    localStorage.setItem('pesasmart_courses', JSON.stringify(data));
                }

                AppState.achievements = AppState.progress.earnedBadges.map(badgeId => ({
                    id: badgeId,
                    ...badges[badgeId],
                    earnedAt: AppState.progress.lastActive
                }));

            } catch (error) {
                console.error('Failed to load achievements:', error);
                AppState.achievements = AppState.progress.earnedBadges.map(id => ({
                    id,
                    name: id,
                    description: 'Achievement unlocked',
                    icon: 'fa-medal',
                    points: 0
                }));
            }
        },

        /**
         * Save goals back to storage (for index page sync)
         */
        saveGoals(goals) {
            try {
                const allGoals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '{"goals":[]}');
                const otherGoals = allGoals.goals.filter(g => g.userId !== AppState.user.userId);
                
                const updated = {
                    goals: [...otherGoals, ...goals],
                    _timestamp: Date.now()
                };
                
                localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
                
                // Trigger sync for index page
                window.dispatchEvent(new CustomEvent('pesasmart-goals-updated', {
                    detail: { goals: AppState.goals }
                }));
                
                return true;

            } catch (error) {
                console.error('Failed to save goals:', error);
                return false;
            }
        },

        /**
         * Save profile back to storage (for index page sync)
         */
        saveProfile(profileData) {
            try {
                const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '{"users":[]}');
                const otherUsers = allUsers.users.filter(u => u.id !== AppState.user.userId);
                
                const updated = {
                    users: [...otherUsers, profileData],
                    _timestamp: Date.now()
                };
                
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
                AppState.profile = profileData;
                
                // Trigger sync for index page
                window.dispatchEvent(new CustomEvent('pesasmart-profile-updated', {
                    detail: { profile: profileData }
                }));
                
                return true;

            } catch (error) {
                console.error('Failed to save profile:', error);
                return false;
            }
        },

        /**
         * Sync with index page (bidirectional)
         */
        syncWithIndex() {
            // Listen for updates from index page
            window.addEventListener('pesasmart-index-update', (e) => {
                console.log('Received update from index:', e.detail);
                
                if (e.detail.type === 'goal-update') {
                    // Refresh goals
                    this.loadGoals().then(() => {
                        AppState.goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || '{"goals":[]}')
                            .goals.filter(g => g.userId === AppState.user.userId);
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
        /**
         * Show loading overlay
         */
        showLoading(message = 'Loading...') {
            AppState.loading = true;
            
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

        /**
         * Hide loading overlay
         */
        hideLoading() {
            AppState.loading = false;
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 300);
            }
        },

        /**
         * Show notification toast
         */
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

        /**
         * Show confirmation modal (returns promise)
         */
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

        /**
         * Show modal with custom content
         */
        showModal(options) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-${options.size || 'lg'} w-full mx-4 p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">${options.title}</h3>
                            <button class="text-gray-500 hover:text-gray-700" id="modal-close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-content">
                            ${options.content}
                        </div>
                        
                        ${options.buttons ? `
                            <div class="flex justify-end space-x-3 mt-6">
                                ${options.buttons.map(btn => `
                                    <button class="px-6 py-2 ${btn.primary ? 'bg-green-500 text-white hover:bg-green-600' : 'border border-gray-300 hover:bg-gray-50'} rounded-lg transition font-medium" data-action="${btn.action}">
                                        ${btn.text}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;

                document.body.appendChild(modal);

                document.getElementById('modal-close')?.addEventListener('click', () => {
                    modal.remove();
                    resolve({ action: 'close' });
                });

                if (options.buttons) {
                    options.buttons.forEach(btn => {
                        modal.querySelector(`[data-action="${btn.action}"]`).addEventListener('click', () => {
                            modal.remove();
                            resolve({ action: btn.action });
                        });
                    });
                }

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                        resolve({ action: 'close' });
                    }
                });
            });
        },

        /**
         * Update all UI sections
         */
        updateAllSections() {
            this.updateProfileHeader();
            this.updateOverviewStats();
            this.updateRecentActivity();
            this.updateAchievements();
            this.updateGoals();
            this.updateAccounts();
            this.updateDocuments();
            this.updateSecuritySettings();
            this.updateSettingsForm();
            this.updateSidebarStats();
            this.updateCharts();
        },

        /**
         * Update profile header
         */
        updateProfileHeader() {
            const profile = AppState.profile;
            if (!profile) return;

            // Name
            const nameEl = document.querySelector('h1.text-2xl.font-bold.text-white');
            if (nameEl) {
                nameEl.textContent = `${profile.firstName || 'Ann'} ${profile.lastName || 'Muthoni'}`;
            }

            // Location and occupation
            const locationEl = document.querySelector('p.text-green-100');
            if (locationEl) {
                const occupation = profile.profile?.occupation || 'Student';
                locationEl.innerHTML = `
                    <i class="fas fa-map-marker-alt mr-1"></i> Nairobi, Kenya •
                    <span class="ml-2">
                        <i class="fas ${this.getOccupationIcon(occupation)} mr-1"></i> ${this.formatOccupation(occupation)}
                    </span>
                `;
            }

            // Financial score
            const scoreEl = document.querySelector('.text-3xl.font-bold.text-white');
            if (scoreEl) {
                const score = profile.financialScore || 4.2;
                scoreEl.innerHTML = `${score}<span class="text-xl">/5</span>`;
            }

            // Stars
            this.updateStars(profile.financialScore || 4.2);
        },

        /**
         * Update star rating
         */
        updateStars(score) {
            const starsContainer = document.querySelector('.flex.items-center.justify-center.mt-1');
            if (!starsContainer) return;

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

        /**
         * Get occupation icon
         */
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

        /**
         * Format occupation for display
         */
        formatOccupation(occupation) {
            if (!occupation) return 'Student';
            return occupation.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },

        /**
         * Update overview stats
         */
        updateOverviewStats() {
            const profile = AppState.profile;
            const progress = AppState.progress;
            const transactions = AppState.transactions;

            // Modules completed
            const modulesEl = document.querySelector('.bg-green-50.rounded-lg.p-4 .text-xl.font-bold');
            if (modulesEl && modulesEl.closest('.bg-green-50').querySelector('.fa-graduation-cap')) {
                const completed = progress?.completedModules?.length || 3;
                modulesEl.textContent = `${completed}/8`;
            }

            // Portfolio performance
            const portfolioEl = Array.from(document.querySelectorAll('.bg-green-50.rounded-lg.p-4 .text-xl.font-bold'))
                .find(el => el.textContent.includes('%'));
            if (portfolioEl) {
                const performance = this.calculatePortfolioPerformance();
                portfolioEl.textContent = performance >= 0 ? `+${performance}%` : `${performance}%`;
                portfolioEl.className = performance >= 0 ? 'text-xl font-bold text-green-600' : 'text-xl font-bold text-red-600';
            }

            // Insurance count
            const insuranceEl = Array.from(document.querySelectorAll('.bg-green-50.rounded-lg.p-4 .text-xl.font-bold'))
                .find(el => el.closest('.bg-green-50')?.querySelector('.fa-shield-alt'));
            if (insuranceEl) {
                const insuranceCount = transactions?.filter(t => t.type === 'insurance').length || 2;
                insuranceEl.textContent = insuranceCount;
            }

            // Badges count
            const badgesEl = document.querySelector('.bg-purple-50 .text-xl.font-bold');
            if (badgesEl) {
                badgesEl.textContent = AppState.achievements.length || 8;
            }
        },

        /**
         * Calculate portfolio performance
         */
        calculatePortfolioPerformance() {
            const investments = AppState.transactions?.filter(t => t.type === 'investment') || [];
            if (investments.length === 0) return 5.3;

            const totalInvested = investments.reduce((sum, t) => sum + (t.amount || 0), 0);
            // Simple calculation - in production would use current market values
            return 5.3;
        },

        /**
         * Update recent activity
         */
        updateRecentActivity() {
            const container = document.querySelector('#overview .space-y-3');
            if (!container) return;

            if (!AppState.transactions || AppState.transactions.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">No recent activity</p>';
                return;
            }

            // Get 3 most recent transactions
            const recent = [...AppState.transactions]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3);

            container.innerHTML = recent.map(t => {
                const { icon, bgColor } = this.getTransactionStyle(t.type);
                const description = this.getTransactionDescription(t);

                return `
                    <div class="flex items-center p-3 bg-gray-50 rounded-lg hover:shadow-md transition cursor-pointer activity-item" data-id="${t.id}">
                        <div class="w-10 h-10 ${bgColor} rounded-full flex items-center justify-center mr-3">
                            <i class="fas ${icon} text-white"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium text-gray-800">${description}</p>
                            <p class="text-gray-600 text-sm">${this.formatDate(t.date)}</p>
                        </div>
                        ${t.amount ? `<span class="text-gray-600 font-medium">${this.formatCurrency(t.amount)}</span>` : ''}
                    </div>
                `;
            }).join('');

            // Add click handlers
            document.querySelectorAll('.activity-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.showTransactionDetails(item.dataset.id);
                });
            });
        },

        /**
         * Get transaction icon and color
         */
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

        /**
         * Get transaction description
         */
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

        /**
         * Show transaction details
         */
        showTransactionDetails(transactionId) {
            const transaction = AppState.transactions.find(t => t.id === transactionId);
            if (!transaction) return;

            this.showModal({
                title: 'Transaction Details',
                size: 'md',
                content: `
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
                `
            });
        },

        /**
         * Update achievements section
         */
        updateAchievements() {
            const container = document.querySelector('#achievements .grid');
            if (!container) return;

            const achievements = AppState.achievements;

            if (achievements.length === 0) {
                container.innerHTML = `
                    <div class="col-span-3 text-center py-12">
                        <i class="fas fa-trophy text-5xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500">No achievements yet. Complete modules to earn badges!</p>
                    </div>
                `;
                return;
            }

            // Display achievements in grid
            container.innerHTML = achievements.slice(0, 6).map(a => `
                <div class="border rounded-lg p-4 text-center hover:shadow-lg transition cursor-pointer achievement-card" data-id="${a.id}">
                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                    </div>
                    <h4 class="font-bold text-gray-800">${a.name}</h4>
                    <p class="text-xs text-gray-600 mt-1">${a.description || 'Achievement unlocked'}</p>
                    <p class="text-xs text-green-600 mt-2">${this.formatDate(a.earnedAt, 'short')}</p>
                </div>
            `).join('');

            // Add click handlers
            document.querySelectorAll('.achievement-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.showAchievementDetails(card.dataset.id);
                });
            });

            // Setup view all link
            const viewAllLink = document.querySelector('#achievements .text-center a');
            if (viewAllLink) {
                viewAllLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAllAchievements();
                });
            }
        },

        /**
         * Show achievement details
         */
        showAchievementDetails(achievementId) {
            const achievement = AppState.achievements.find(a => a.id === achievementId);
            if (!achievement) return;

            this.showModal({
                title: achievement.name,
                size: 'md',
                content: `
                    <div class="text-center mb-6">
                        <div class="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trophy text-yellow-600 text-4xl"></i>
                        </div>
                        <p class="text-gray-600">${achievement.description || 'Achievement unlocked'}</p>
                        <p class="text-sm text-gray-500 mt-2">Earned: ${this.formatDate(achievement.earnedAt, 'full')}</p>
                        ${achievement.points ? `<p class="text-green-600 font-bold mt-2">+${achievement.points} points</p>` : ''}
                    </div>
                `
            });
        },

        /**
         * Show all achievements
         */
        showAllAchievements() {
            const achievements = AppState.achievements;

            this.showModal({
                title: `All Achievements (${achievements.length})`,
                size: '2xl',
                content: `
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        ${achievements.map(a => `
                            <div class="border rounded-lg p-4 text-center">
                                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                                </div>
                                <h4 class="font-bold text-gray-800">${a.name}</h4>
                                <p class="text-xs text-gray-600 mt-1">${a.description || ''}</p>
                                <p class="text-xs text-green-600 mt-2">${this.formatDate(a.earnedAt, 'short')}</p>
                            </div>
                        `).join('')}
                    </div>
                `
            });
        },

        /**
         * Update goals section
         */
        updateGoals() {
            const container = document.querySelector('#goals .grid');
            if (!container) return;

            const goals = AppState.goals;

            if (goals.length === 0) {
                container.innerHTML = '<p class="col-span-2 text-center py-8 text-gray-500">No goals yet. Create your first goal!</p>';
                return;
            }

            container.innerHTML = goals.slice(0, 2).map(goal => this.renderGoalCard(goal)).join('');

            // Setup new goal link
            const newGoalLink = document.querySelector('#goals a[href="#"]');
            if (newGoalLink) {
                newGoalLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNewGoalModal();
                });
            }

            // Update completed goal
            this.updateCompletedGoal();
        },

        /**
         * Render individual goal card
         */
        renderGoalCard(goal) {
            const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <div class="border-2 border-green-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition cursor-pointer goal-card" data-id="${goal.id}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                <i class="fas ${this.getGoalIcon(goal.name)} text-green-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg text-gray-800">${goal.name}</h3>
                                <p class="text-gray-600 text-sm">Target: ${deadline.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</p>
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
                            <div class="bg-green-500 h-3 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-clock mr-1"></i> ${daysLeft} days remaining
                        </div>
                        <div class="space-x-2">
                            <button class="text-green-600 hover:text-green-700 text-sm font-medium add-to-goal" data-id="${goal.id}">
                                <i class="fas fa-plus-circle mr-1"></i>Add
                            </button>
                            <button class="text-green-600 hover:text-green-700 text-sm font-medium view-goal" data-id="${goal.id}">
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Get goal icon
         */
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

        /**
         * Update completed goal
         */
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
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-check text-green-600"></i>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-800">${goal.name}</h4>
                            <p class="text-gray-600 text-sm">Achieved: ${this.formatDate(goal.completedDate || goal.deadline, 'short')}</p>
                        </div>
                    </div>
                    <span class="text-green-600 font-medium">${this.formatCurrency(goal.targetAmount)}</span>
                </div>
            `;
        },

        /**
         * Show goal details
         */
        showGoalDetails(goalId) {
            const goal = AppState.goals.find(g => g.id === goalId);
            if (!goal) return;

            const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
            const remaining = goal.targetAmount - goal.savedAmount;
            const deadline = new Date(goal.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            this.showModal({
                title: goal.name,
                size: 'lg',
                content: `
                    <div class="space-y-6">
                        <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <span class="text-gray-600">Overall Progress</span>
                            <span class="font-bold text-2xl text-green-600">${percent}%</span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Saved</p>
                                <p class="text-2xl font-bold">${this.formatCurrency(goal.savedAmount)}</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Target</p>
                                <p class="text-2xl font-bold">${this.formatCurrency(goal.targetAmount)}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Remaining</p>
                                <p class="text-2xl font-bold text-orange-600">${this.formatCurrency(remaining)}</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg text-center">
                                <p class="text-sm text-gray-600">Days Left</p>
                                <p class="text-2xl font-bold ${daysLeft < 30 ? 'text-red-600' : 'text-green-600'}">${daysLeft}</p>
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
                    </div>
                `,
                buttons: [
                    { text: 'Add Money', action: 'add', primary: true },
                    { text: 'Edit Goal', action: 'edit', primary: false },
                    { text: 'Delete', action: 'delete', primary: false }
                ]
            }).then(result => {
                if (result.action === 'add') {
                    this.showAddToGoalModal(goal);
                } else if (result.action === 'edit') {
                    this.showEditGoalModal(goal);
                } else if (result.action === 'delete') {
                    this.deleteGoal(goal);
                }
            });
        },

        /**
         * Show add to goal modal
         */
        async showAddToGoalModal(goal) {
            const result = await this.showModal({
                title: `Add to ${goal.name}`,
                size: 'md',
                content: `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Amount (Ksh)</label>
                            <input type="number" id="add-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" 
                                   min="100" step="100" value="1000">
                        </div>
                        
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Source</label>
                            <select id="add-source" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                                <option value="mpesa">M-Pesa</option>
                                <option value="bank">Bank Account</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>
                        
                        <div class="bg-green-50 p-4 rounded-lg">
                            <p class="text-sm text-gray-600">Current progress: ${this.formatCurrency(goal.savedAmount)} of ${this.formatCurrency(goal.targetAmount)}</p>
                            <p class="text-sm text-gray-600 mt-1">After adding: <span id="after-amount">${this.formatCurrency(goal.savedAmount + 1000)}</span></p>
                        </div>
                    </div>
                `,
                buttons: [
                    { text: 'Cancel', action: 'cancel', primary: false },
                    { text: 'Add Money', action: 'confirm', primary: true }
                ]
            });

            if (result.action === 'confirm') {
                const amount = parseFloat(document.getElementById('add-amount').value);
                const source = document.getElementById('add-source').value;
                
                if (amount < 100) {
                    this.showNotification('Minimum amount is Ksh 100', 'error');
                    return;
                }

                // Update goal
                goal.savedAmount += amount;
                
                // Add contribution
                if (!goal.contributions) goal.contributions = [];
                goal.contributions.push({
                    date: new Date().toISOString(),
                    amount: amount,
                    type: source
                });

                // Save to storage
                DataLayer.saveGoals(AppState.goals);

                // Create transaction
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

                const allTransactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '{"transactions":[]}');
                allTransactions.transactions.push(transaction);
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify({
                    transactions: allTransactions.transactions,
                    _timestamp: Date.now()
                }));

                // Update UI
                this.updateGoals();
                this.updateRecentActivity();
                this.showNotification(`Added ${this.formatCurrency(amount)} to ${goal.name}`, 'success');
            }
        },

        /**
         * Show edit goal modal
         */
        async showEditGoalModal(goal) {
            const deadline = new Date(goal.deadline).toISOString().split('T')[0];

            const result = await this.showModal({
                title: 'Edit Goal',
                size: 'md',
                content: `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Goal Name</label>
                            <input type="text" id="edit-name" value="${goal.name}" class="w-full border rounded-lg px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Amount (Ksh)</label>
                            <input type="number" id="edit-target" value="${goal.targetAmount}" class="w-full border rounded-lg px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Date</label>
                            <input type="date" id="edit-deadline" value="${deadline}" class="w-full border rounded-lg px-4 py-3">
                        </div>
                    </div>
                `,
                buttons: [
                    { text: 'Cancel', action: 'cancel', primary: false },
                    { text: 'Save Changes', action: 'save', primary: true }
                ]
            });

            if (result.action === 'save') {
                goal.name = document.getElementById('edit-name').value;
                goal.targetAmount = parseFloat(document.getElementById('edit-target').value);
                goal.deadline = new Date(document.getElementById('edit-deadline').value).toISOString();

                DataLayer.saveGoals(AppState.goals);
                this.updateGoals();
                this.showNotification('Goal updated successfully', 'success');
            }
        },

        /**
         * Delete goal
         */
        async deleteGoal(goal) {
            const confirmed = await this.confirmAction({
                title: 'Delete Goal',
                message: `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Keep',
                type: 'danger'
            });

            if (confirmed) {
                AppState.goals = AppState.goals.filter(g => g.id !== goal.id);
                DataLayer.saveGoals(AppState.goals);
                this.updateGoals();
                this.showNotification('Goal deleted', 'warning');
            }
        },

        /**
         * Show new goal modal
         */
        async showNewGoalModal() {
            const result = await this.showModal({
                title: 'Create New Goal',
                size: 'md',
                content: `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Goal Name</label>
                            <input type="text" id="goal-name" placeholder="e.g., Buy a car" class="w-full border rounded-lg px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Amount (Ksh)</label>
                            <input type="number" id="goal-amount" placeholder="50000" class="w-full border rounded-lg px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Target Date</label>
                            <input type="date" id="goal-deadline" class="w-full border rounded-lg px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-gray-700 font-medium mb-2">Category</label>
                            <select id="goal-category" class="w-full border rounded-lg px-4 py-3">
                                <option value="savings">Savings</option>
                                <option value="investment">Investment</option>
                                <option value="education">Education</option>
                                <option value="business">Business</option>
                                <option value="emergency">Emergency Fund</option>
                            </select>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="goal-auto-save" class="mr-2">
                            <label for="goal-auto-save">Set up auto-save (Ksh 1,000/month)</label>
                        </div>
                    </div>
                `,
                buttons: [
                    { text: 'Cancel', action: 'cancel', primary: false },
                    { text: 'Create Goal', action: 'create', primary: true }
                ]
            });

            if (result.action === 'create') {
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
                DataLayer.saveGoals(AppState.goals);
                this.updateGoals();
                this.showNotification('Goal created successfully!', 'success');
            }
        },

        /**
         * Update accounts section
         */
        updateAccounts() {
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
            }

            // Setup CDS account button
            const cdsBtn = document.querySelector('.bg-blue-50 button');
            if (cdsBtn) {
                cdsBtn.addEventListener('click', () => {
                    this.showNotification('CDS account setup coming soon!', 'info');
                });
            }

            // Setup connect bank button
            const bankBtn = document.querySelector('.bg-gray-50 .text-green-600');
            if (bankBtn) {
                bankBtn.addEventListener('click', () => {
                    this.showNotification('Bank connection coming soon!', 'info');
                });
            }

            // Setup learn more link
            const learnMore = document.querySelector('#accounts .text-green-600.font-medium');
            if (learnMore) {
                learnMore.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNotification('Data privacy information coming soon', 'info');
                });
            }
        },

        /**
         * Show add account modal
         */
        showAddAccountModal() {
            this.showModal({
                title: 'Connect Account',
                size: 'lg',
                content: `
                    <div class="space-y-3">
                        <button class="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center transition" data-type="bank">
                            <i class="fas fa-university text-2xl text-blue-600 mr-4"></i>
                            <div class="text-left">
                                <div class="font-medium">Bank Account</div>
                                <div class="text-sm text-gray-600">Connect your bank for easy transfers</div>
                            </div>
                        </button>
                        
                        <button class="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center transition" data-type="cds">
                            <i class="fas fa-landmark text-2xl text-green-600 mr-4"></i>
                            <div class="text-left">
                                <div class="font-medium">CDS Account</div>
                                <div class="text-sm text-gray-600">Connect your Central Depository account</div>
                            </div>
                        </button>
                        
                        <button class="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center transition" data-type="mpesa">
                            <i class="fab fa-whatsapp text-2xl text-green-500 mr-4"></i>
                            <div class="text-left">
                                <div class="font-medium">M-Pesa</div>
                                <div class="text-sm text-gray-600">Already connected: ${AppState.profile?.phone || '+254 XXX XXX XXX'}</div>
                            </div>
                        </button>
                    </div>
                `,
                buttons: [
                    { text: 'Close', action: 'close', primary: false }
                ]
            }).then(result => {
                if (result.action === 'close') return;
            });

            // Add click handlers after modal is in DOM
            setTimeout(() => {
                document.querySelectorAll('[data-type]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const type = btn.dataset.type;
                        if (type === 'mpesa') {
                            UI.showNotification('M-Pesa is already connected', 'info');
                        } else {
                            UI.showNotification(`${type.toUpperCase()} account connection coming soon!`, 'info');
                        }
                        document.querySelector('.fixed').remove();
                    });
                });
            }, 100);
        },

        /**
         * Update documents section
         */
        updateDocuments() {
            // Update certificate dates
            const bronzeCert = document.querySelector('#documents .grid .text-gray-600.text-sm');
            if (bronzeCert && AppState.achievements.length > 0) {
                const bronzeAchievement = AppState.achievements.find(a => a.name === 'Budget Master');
                if (bronzeAchievement) {
                    bronzeCert.textContent = `Issued: ${this.formatDate(bronzeAchievement.earnedAt)}`;
                }
            }

            // Setup document links
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
            });

            // Setup view all link
            const viewAllLink = document.querySelector('#documents .text-center a');
            if (viewAllLink) {
                viewAllLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAllDocuments();
                });
            }
        },

        /**
         * Show document preview
         */
        showDocumentPreview(docName) {
            this.showModal({
                title: docName,
                size: 'lg',
                content: `
                    <div class="bg-gray-100 rounded-lg p-12 text-center">
                        <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
                        <p class="text-gray-600 mb-4">Document preview</p>
                        <div class="flex justify-center space-x-4">
                            <button class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition">
                                <i class="fas fa-download mr-2"></i>Download
                            </button>
                            <button class="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 transition">
                                <i class="fas fa-print mr-2"></i>Print
                            </button>
                        </div>
                    </div>
                `
            });
        },

        /**
         * Download document
         */
        downloadDocument(docName) {
            this.showNotification(`Downloading ${docName}...`, 'info');
            setTimeout(() => {
                this.showNotification('Document downloaded successfully!', 'success');
            }, 1500);
        },

        /**
         * Share document
         */
        shareDocument(docName) {
            if (navigator.share) {
                navigator.share({
                    title: docName,
                    text: `Check out my ${docName} from PesaSmart!`,
                    url: window.location.origin
                }).catch(() => {
                    this.copyToClipboard(`Check out my ${docName} from PesaSmart!`);
                });
            } else {
                this.copyToClipboard(`Check out my ${docName} from PesaSmart!`);
            }
        },

        /**
         * Show all documents
         */
        showAllDocuments() {
            this.showModal({
                title: 'All Documents',
                size: '2xl',
                content: `
                    <div class="space-y-4">
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold">PesaSmart Bronze Certified</h4>
                                    <p class="text-sm text-gray-600">Issued: ${this.formatDate(AppState.progress?.lastActive || new Date())}</p>
                                </div>
                                <div class="space-x-2">
                                    <button class="text-green-600 hover:text-green-700"><i class="fas fa-eye"></i> View</button>
                                    <button class="text-green-600 hover:text-green-700"><i class="fas fa-download"></i> Download</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold">Investment Basics (CMA)</h4>
                                    <p class="text-sm text-gray-600">Issued: ${this.formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))}</p>
                                </div>
                                <div class="space-x-2">
                                    <button class="text-green-600 hover:text-green-700"><i class="fas fa-eye"></i> View</button>
                                    <button class="text-green-600 hover:text-green-700"><i class="fas fa-download"></i> Download</button>
                                </div>
                            </div>
                        </div>
                        
                        ${AppState.achievements.filter(a => a.certificate).map(a => `
                            <div class="border rounded-lg p-4">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <h4 class="font-bold">${a.name} Certificate</h4>
                                        <p class="text-sm text-gray-600">Issued: ${this.formatDate(a.earnedAt)}</p>
                                    </div>
                                    <div class="space-x-2">
                                        <button class="text-green-600 hover:text-green-700"><i class="fas fa-eye"></i> View</button>
                                        <button class="text-green-600 hover:text-green-700"><i class="fas fa-download"></i> Download</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `
            });
        },

        /**
         * Update security settings
         */
        updateSecuritySettings() {
            // Two-factor toggle
            const twoFactorToggle = document.querySelector('.bg-green-50 input[type="checkbox"]');
            if (twoFactorToggle) {
                twoFactorToggle.addEventListener('change', function() {
                    const enabled = this.checked;
                    UI.showNotification(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, 'info');
                    
                    if (enabled) {
                        Security.setup2FA();
                    }
                });
            }

            // SMS notifications toggle
            const smsToggle = document.querySelector('.bg-blue-50 input[type="checkbox"]');
            if (smsToggle) {
                smsToggle.addEventListener('change', function() {
                    const enabled = this.checked;
                    UI.showNotification(`SMS notifications ${enabled ? 'enabled' : 'disabled'}`, 'info');
                });
            }

            // View login history
            const historyBtn = document.querySelector('.bg-purple-50 a[href="#"]');
            if (historyBtn) {
                historyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLoginHistory();
                });
            }

            // Download data
            const downloadBtn = document.querySelector('.bg-red-50 a[href="#"]');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    Security.downloadUserData();
                });
            }
        },

        /**
         * Show login history
         */
        showLoginHistory() {
            // Mock login history
            const history = [
                { date: new Date(), device: 'Chrome on Windows', location: 'Nairobi, Kenya', ip: '192.168.1.1' },
                { date: new Date(Date.now() - 86400000), device: 'Safari on iPhone', location: 'Mombasa, Kenya', ip: '192.168.1.2' },
                { date: new Date(Date.now() - 172800000), device: 'Firefox on Mac', location: 'Kisumu, Kenya', ip: '192.168.1.3' }
            ];

            this.showModal({
                title: 'Login History',
                size: '2xl',
                content: `
                    <table class="w-full">
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
                `
            });
        },

        /**
         * Update settings form
         */
        updateSettingsForm() {
            const profile = AppState.profile;
            if (!profile) return;

            // Populate form fields
            const firstNameInput = document.querySelector('#settings input[value="Ann"]');
            if (firstNameInput) firstNameInput.value = profile.firstName || 'Ann';

            const lastNameInput = document.querySelector('#settings input[value="Muthoni"]');
            if (lastNameInput) lastNameInput.value = profile.lastName || 'Muthoni';

            const emailInput = document.querySelector('#settings input[value="ann.muthoni@email.com"]');
            if (emailInput) emailInput.value = profile.email || 'user@email.com';

            const phoneInput = document.querySelector('#settings input[value="+254 712 345 678"]');
            if (phoneInput) phoneInput.value = profile.phone || '+254 712 345 678';

            // Edit profile button
            const editBtn = document.querySelector('#settings .text-green-600');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showEditProfileModal();
                });
            }

            // Notification toggles
            this.setupNotificationToggles();

            // Save all changes
            const saveBtn = document.querySelector('#settings .flex.justify-end button');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveAllSettings();
                });
            }

            // Danger zone buttons
            this.setupDangerZone();
        },

        /**
         * Setup notification toggles
         */
        setupNotificationToggles() {
            const toggles = document.querySelectorAll('#settings input[type="checkbox"]');
            
            toggles.forEach(toggle => {
                toggle.addEventListener('change', function() {
                    const setting = this.closest('.flex.items-center.justify-between')?.querySelector('.font-medium')?.textContent;
                    UI.showNotification(`${setting} ${this.checked ? 'enabled' : 'disabled'}`, 'info');
                });
            });
        },

        /**
         * Save all settings
         */
        saveAllSettings() {
            const profile = AppState.profile;
            if (!profile) return;

            // Collect form data
            const firstName = document.querySelector('#settings input[value="Ann"]')?.value;
            const lastName = document.querySelector('#settings input[value="Muthoni"]')?.value;
            const email = document.querySelector('#settings input[value="ann.muthoni@email.com"]')?.value;
            const phone = document.querySelector('#settings input[value="+254 712 345 678"]')?.value;

            // Update profile
            profile.firstName = firstName;
            profile.lastName = lastName;
            profile.email = email;
            profile.phone = phone;

            // Save to storage
            DataLayer.saveProfile(profile);

            // Update UI
            this.updateProfileHeader();
            this.showNotification('Settings saved successfully!', 'success');
        },

        /**
         * Setup danger zone
         */
        setupDangerZone() {
            const deactivateBtn = document.querySelector('.border.border-red-500.text-red-600');
            if (deactivateBtn) {
                deactivateBtn.addEventListener('click', () => {
                    this.confirmAction({
                        title: 'Deactivate Account',
                        message: 'Are you sure you want to temporarily deactivate your account? You can reactivate anytime by logging in.',
                        confirmText: 'Deactivate',
                        cancelText: 'Cancel',
                        type: 'warning'
                    }).then(confirmed => {
                        if (confirmed) {
                            this.showNotification('Account deactivated. Redirecting...', 'info');
                            setTimeout(() => {
                                localStorage.removeItem('pesasmart_session');
                                window.location.href = 'index.html';
                            }, 2000);
                        }
                    });
                });
            }

            const deleteBtn = document.querySelector('.bg-red-500.hover\\:bg-red-600');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.confirmAction({
                        title: 'Delete Account Permanently',
                        message: 'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
                        confirmText: 'Delete Forever',
                        cancelText: 'Cancel',
                        type: 'danger'
                    }).then(confirmed => {
                        if (confirmed) {
                            this.deleteAccountPermanently();
                        }
                    });
                });
            }
        },

        /**
         * Delete account permanently
         */
        deleteAccountPermanently() {
            this.showLoading('Deleting account...');

            try {
                // Remove user data from all storage
                const storages = [
                    STORAGE_KEYS.USERS,
                    STORAGE_KEYS.GOALS,
                    STORAGE_KEYS.TRANSACTIONS,
                    STORAGE_KEYS.PROGRESS,
                    STORAGE_KEYS.NOTIFICATIONS
                ];

                storages.forEach(key => {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    if (data.users) {
                        data.users = data.users.filter(u => u.id !== AppState.user.userId);
                    }
                    if (data.goals) {
                        data.goals = data.goals.filter(g => g.userId !== AppState.user.userId);
                    }
                    if (data.transactions) {
                        data.transactions = data.transactions.filter(t => t.userId !== AppState.user.userId);
                    }
                    if (data.progress) {
                        data.progress = data.progress.filter(p => p.userId !== AppState.user.userId);
                    }
                    localStorage.setItem(key, JSON.stringify(data));
                });

                // Clear session
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

        /**
         * Show edit profile modal
         */
        async showEditProfileModal() {
            const profile = AppState.profile;

            const result = await this.showModal({
                title: 'Edit Profile',
                size: 'lg',
                content: `
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-gray-700 mb-2">First Name</label>
                                <input type="text" id="edit-firstName" value="${profile?.firstName || ''}" 
                                       class="w-full border rounded-lg px-4 py-2">
                            </div>
                            <div>
                                <label class="block text-gray-700 mb-2">Last Name</label>
                                <input type="text" id="edit-lastName" value="${profile?.lastName || ''}" 
                                       class="w-full border rounded-lg px-4 py-2">
                            </div>
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">Email</label>
                            <input type="email" id="edit-email" value="${profile?.email || ''}" 
                                   class="w-full border rounded-lg px-4 py-2">
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">Phone</label>
                            <input type="tel" id="edit-phone" value="${profile?.phone || ''}" 
                                   class="w-full border rounded-lg px-4 py-2">
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">Occupation</label>
                            <select id="edit-occupation" class="w-full border rounded-lg px-4 py-2">
                                <option value="student" ${profile?.profile?.occupation === 'student' ? 'selected' : ''}>Student</option>
                                <option value="employed" ${profile?.profile?.occupation === 'employed' ? 'selected' : ''}>Employed</option>
                                <option value="business" ${profile?.profile?.occupation === 'business' ? 'selected' : ''}>Business Owner</option>
                                <option value="farmer" ${profile?.profile?.occupation === 'farmer' ? 'selected' : ''}>Farmer</option>
                                <option value="juaKali" ${profile?.profile?.occupation === 'juaKali' ? 'selected' : ''}>Jua Kali Artisan</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">Date of Birth</label>
                            <input type="date" id="edit-dob" value="${profile?.profile?.dateOfBirth || ''}" 
                                   class="w-full border rounded-lg px-4 py-2">
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">County</label>
                            <select id="edit-county" class="w-full border rounded-lg px-4 py-2">
                                <option value="Nairobi">Nairobi</option>
                                <option value="Mombasa">Mombasa</option>
                                <option value="Kisumu">Kisumu</option>
                                <option value="Nakuru">Nakuru</option>
                                <option value="Kiambu">Kiambu</option>
                            </select>
                        </div>
                    </div>
                `,
                buttons: [
                    { text: 'Cancel', action: 'cancel', primary: false },
                    { text: 'Save Changes', action: 'save', primary: true }
                ]
            });

            if (result.action === 'save') {
                profile.firstName = document.getElementById('edit-firstName').value;
                profile.lastName = document.getElementById('edit-lastName').value;
                profile.email = document.getElementById('edit-email').value;
                profile.phone = document.getElementById('edit-phone').value;
                
                if (!profile.profile) profile.profile = {};
                profile.profile.occupation = document.getElementById('edit-occupation').value;
                profile.profile.dateOfBirth = document.getElementById('edit-dob').value;
                profile.profile.county = document.getElementById('edit-county').value;

                DataLayer.saveProfile(profile);
                this.updateProfileHeader();
                this.updateSettingsForm();
                this.showNotification('Profile updated successfully!', 'success');
            }
        },

        /**
         * Update sidebar stats
         */
        updateSidebarStats() {
            const profile = AppState.profile;
            const progress = AppState.progress;
            const transactions = AppState.transactions;

            const stats = document.querySelectorAll('.border-t .flex.justify-between .font-medium');
            if (stats.length >= 4) {
                // Member Since
                const memberDate = profile?.createdAt ? new Date(profile.createdAt) : new Date();
                stats[0].textContent = memberDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
                
                // Learning Hours
                stats[1].textContent = (progress?.totalLearningHours || 0) + ' hrs';
                
                // Total Invested
                const invested = transactions?.filter(t => t.type === 'investment')
                    .reduce((sum, t) => sum + (t.amount || 0), 0) || 12500;
                stats[2].textContent = this.formatCurrency(invested);
                
                // Active Goals
                stats[3].textContent = AppState.goals?.filter(g => g.status === 'active').length || 0;
            }

            // Update invite code
            const inviteCode = document.querySelector('.font-mono.font-bold');
            if (inviteCode && profile) {
                const code = profile.id + (profile.firstName?.substring(0, 2) || 'XX');
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
            }
        },

        /**
         * Update all charts
         */
        updateCharts() {
            setTimeout(() => {
                this.drawPortfolioChart();
                this.drawGoalsChart();
                this.drawActivityChart();
                this.drawCategoryChart();
            }, 500);
        },

        /**
         * Draw portfolio chart
         */
        drawPortfolioChart() {
            const chartContainer = document.getElementById('portfolio-chart');
            if (!chartContainer) return;

            if (!AppState.transactions || AppState.transactions.length === 0) {
                chartContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No portfolio data yet. Start investing to see your performance!</p>';
                return;
            }

            // Generate portfolio history
            const history = this.generatePortfolioHistory();
            
            if (history.length < 2) {
                chartContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Not enough data to display chart</p>';
                return;
            }

            const chartData = [['Date', 'Portfolio Value']];
            history.forEach(entry => {
                chartData.push([entry.date, entry.value]);
            });

            const data = google.visualization.arrayToDataTable(chartData);

            const options = {
                title: 'Portfolio Performance',
                curveType: 'function',
                legend: { position: 'none' },
                colors: ['#00B894'],
                hAxis: { 
                    slantedText: true,
                    slantedTextAngle: 45,
                    showTextEvery: Math.max(1, Math.floor(history.length / 5))
                },
                vAxis: { 
                    format: 'short',
                    gridlines: { count: 5 }
                },
                chartArea: { width: '85%', height: '70%' },
                animation: { startup: true, duration: 1000 }
            };

            const chart = new google.visualization.LineChart(chartContainer);
            chart.draw(data, options);
        },

        /**
         * Generate portfolio history
         */
        generatePortfolioHistory() {
            if (!AppState.transactions || AppState.transactions.length === 0) {
                return [];
            }

            const sorted = [...AppState.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            let balance = 0;
            const history = [];
            
            // Start 30 days ago
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            history.push({
                date: startDate.toISOString().split('T')[0],
                value: 1000000
            });
            
            sorted.forEach(t => {
                if (t.type === 'investment' || t.type === 'dividend') {
                    balance += t.amount || 0;
                } else if (t.type === 'withdrawal') {
                    balance -= t.amount || 0;
                }
                
                const txDate = new Date(t.date).toISOString().split('T')[0];
                if (history[history.length - 1].date !== txDate) {
                    history.push({
                        date: txDate,
                        value: 1000000 + balance
                    });
                }
            });
            
            const today = new Date().toISOString().split('T')[0];
            if (history[history.length - 1].date !== today) {
                history.push({
                    date: today,
                    value: 1000000 + balance
                });
            }
            
            return history;
        },

        /**
         * Draw goals chart
         */
        drawGoalsChart() {
            const chartContainer = document.getElementById('goals-chart');
            if (!chartContainer) return;

            if (!AppState.goals || AppState.goals.length === 0) {
                chartContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No goals yet. Create your first goal!</p>';
                return;
            }

            const chartData = [['Goal', 'Progress', { role: 'style' }, { role: 'annotation' }]];
            
            AppState.goals.slice(0, 5).forEach(goal => {
                const percent = Math.round((goal.savedAmount / goal.targetAmount) * 100);
                let color = percent < 25 ? '#FDCB6E' : percent < 50 ? '#F39C12' : percent < 75 ? '#E67E22' : '#00B894';
                chartData.push([goal.name, percent, color, percent + '%']);
            });

            const data = google.visualization.arrayToDataTable(chartData);
            const options = {
                title: 'Goal Progress',
                legend: { position: 'none' },
                hAxis: { slantedText: true },
                vAxis: { minValue: 0, maxValue: 100 },
                chartArea: { width: '70%', height: '70%' },
                animation: { startup: true, duration: 1000 }
            };

            const chart = new google.visualization.ColumnChart(chartContainer);
            chart.draw(data, options);
        },

        /**
         * Draw activity chart
         */
        drawActivityChart() {
            const chartContainer = document.getElementById('activity-chart');
            if (!chartContainer) return;

            if (!AppState.transactions || AppState.transactions.length === 0) {
                chartContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No transaction data yet</p>';
                return;
            }

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

            const chartData = [['Month', 'Amount']];
            Object.entries(months).forEach(([month, amount]) => {
                chartData.push([month, amount]);
            });

            const data = google.visualization.arrayToDataTable(chartData);
            const options = {
                title: 'Monthly Activity',
                legend: { position: 'none' },
                colors: ['#00B894'],
                hAxis: { slantedText: true },
                vAxis: { format: 'short' },
                chartArea: { width: '80%', height: '70%' },
                animation: { startup: true, duration: 1000 }
            };

            const chart = new google.visualization.ColumnChart(chartContainer);
            chart.draw(data, options);
        },

        /**
         * Draw category chart
         */
        drawCategoryChart() {
            const chartContainer = document.getElementById('category-chart');
            if (!chartContainer) return;

            if (!AppState.transactions || AppState.transactions.length === 0) {
                chartContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No transaction data yet</p>';
                return;
            }

            const byType = {};
            AppState.transactions.forEach(t => {
                if (t.amount) {
                    byType[t.type] = (byType[t.type] || 0) + t.amount;
                }
            });

            const chartData = [['Category', 'Amount']];
            Object.entries(byType).forEach(([type, amount]) => {
                chartData.push([type.charAt(0).toUpperCase() + type.slice(1), amount]);
            });

            const data = google.visualization.arrayToDataTable(chartData);
            const options = {
                title: 'Spending by Category',
                pieHole: 0.4,
                colors: ['#00B894', '#0984E3', '#6C5CE7', '#FDCB6E', '#E17055'],
                legend: { position: 'bottom' },
                chartArea: { width: '100%', height: '80%' },
                animation: { startup: true, duration: 1000 }
            };

            const chart = new google.visualization.PieChart(chartContainer);
            chart.draw(data, options);
        },

        //------------------------------------------------------------------------------
        // UTILITY FUNCTIONS
        //------------------------------------------------------------------------------

        /**
         * Format currency
         */
        formatCurrency(amount) {
            return 'Ksh ' + amount.toLocaleString('en-KE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        },

        /**
         * Format date
         */
        formatDate(dateString, format = 'short') {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';

            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (format === 'short') {
                if (diffDays < 1) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 7) return `${diffDays} days ago`;
                return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
            }

            return date.toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        /**
         * Copy to clipboard
         */
        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Could not copy to clipboard', 'error');
            });
        }
    };

    //==============================================================================
    // SCROLL SPY FOR NAVIGATION
    //==============================================================================

    const ScrollSpy = {
        sections: ['overview', 'achievements', 'accounts', 'goals', 'documents', 'security', 'settings'],

        init() {
            const navLinks = document.querySelectorAll('nav a[href^="#"]');

            window.addEventListener('scroll', () => {
                let current = '';
                
                this.sections.forEach(sectionId => {
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

            // Smooth scroll on click
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
        }
    };

    //==============================================================================
    // INITIALIZATION
    //==============================================================================

    /**
     * Initialize the page
     */
    async function initializePage() {
        // Validate session
        if (!Security.validateSession()) return;

        // Load all user data
        const success = await DataLayer.loadUserData();
        
        if (!success) {
            UI.showNotification('Failed to load profile data', 'error');
            return;
        }

        // Update all UI sections
        UI.updateAllSections();

        // Initialize scroll spy
        ScrollSpy.init();

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

        // Listen for updates from index page
        window.addEventListener('pesasmart-index-update', (e) => {
            console.log('Received update from index:', e.detail);
            if (e.detail.type === 'goal-update' || e.detail.type === 'transaction-update') {
                DataLayer.loadUserData().then(() => {
                    UI.updateAllSections();
                });
            }
        });

        console.log('Profile page initialized successfully');
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
        nav a[href^="#"] {
            transition: all 0.2s;
        }
    `;
    document.head.appendChild(style);

    // Start when DOM is ready
    document.addEventListener('DOMContentLoaded', initializePage);

})();