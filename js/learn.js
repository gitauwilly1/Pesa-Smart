(function() {
    'use strict';

    // CONFIGURATION & CONSTANTS

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        PROGRESS: 'pesasmart_progress',
        COURSES: 'pesasmart_courses',
        ACHIEVEMENTS: 'pesasmart_achievements',
        BOOKMARKS: 'pesasmart_bookmarks'
    };

    const VIDEO_PLACEHOLDERS = {
        'Why Budget?': 'dQw4w9WgXcQ',
        'Types of Debt': 'dQw4w9WgXcQ',
        'Why Save?': 'dQw4w9WgXcQ',
        'Investment Options': 'dQw4w9WgXcQ',
        'What is Inflation?': 'dQw4w9WgXcQ',
        'Types of Insurance': 'dQw4w9WgXcQ'
    };

    // STATE MANAGEMENT

    const AppState = {
        user: null,
        courses: null,
        progress: null,
        badges: null,
        bookmarks: [],
        isLoading: false,
        currentFilter: 'all',
        searchTerm: '',
        networkStatus: navigator.onLine,

        async initialize() {
            this.user = this.getCurrentUser();
            if (!this.user) {
                window.location.href = 'login.html?redirect=learn.html';
                return false;
            }

            await this.loadCourses();
            await this.loadProgress();
            await this.loadBookmarks();
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
                UI.showNotification('Network restored. Syncing progress...', 'success');
                this.syncProgress();
            });
            
            window.addEventListener('offline', () => {
                this.networkStatus = false;
                UI.showNotification('You are offline. Progress will be saved locally.', 'warning');
            });
        },

        listenForUpdates() {
            window.addEventListener('pesasmart-progress-update', (e) => {
                console.log('Progress update received:', e.detail);
                this.loadProgress();
            });
        },

        async syncProgress() {
            if (this.networkStatus && this.progress) {
                await this.saveProgress();
            }
        },

        async loadCourses() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.COURSES);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.courses = data.courses || {};
                    this.badges = data.badges || {};
                    return;
                }

                const response = await fetch('data/courses.json');
                const data = await response.json();
                this.courses = data.courses || {};
                this.badges = data.badges || {};
                
                localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(data));
            } catch (error) {
                console.error('Failed to load courses:', error);
                this.courses = this.getDefaultCourses();
            }
        },

        getDefaultCourses() {
            return {
                bronze: [
                    {
                        id: 'MOD001',
                        title: 'Budgeting 101',
                        description: 'Learn how to create and stick to a budget',
                        duration: 20,
                        level: 'beginner',
                        content: [
                            { type: 'video', title: 'Why Budget?', duration: 5 },
                            { type: 'text', title: 'The 50-30-20 Rule' },
                            { type: 'quiz', questions: [] }
                        ],
                        badge: { id: 'BDG001', name: 'Budget Master' }
                    }
                ],
                silver: [],
                gold: []
            };
        },

        async loadProgress() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                let progressList = cached ? JSON.parse(cached) : [];

                this.progress = progressList.find(p => p.userId === this.user.userId);
                
                if (!this.progress) {
                    this.progress = this.createDefaultProgress();
                    progressList.push(this.progress);
                    await this.saveProgressList(progressList);
                }
            } catch (error) {
                console.error('Failed to load progress:', error);
                this.progress = this.createDefaultProgress();
            }
        },

        createDefaultProgress() {
            return {
                userId: this.user.userId,
                completedModules: [],
                inProgress: {},
                earnedBadges: [],
                certificates: [],
                lastActive: new Date().toISOString(),
                totalLearningHours: 0,
                currentStreak: 1,
                longestStreak: 1,
                lastSync: null
            };
        },

        async saveProgress() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                let progressList = cached ? JSON.parse(cached) : [];
                
                const index = progressList.findIndex(p => p.userId === this.user.userId);
                if (index >= 0) {
                    progressList[index] = this.progress;
                } else {
                    progressList.push(this.progress);
                }
                
                this.progress.lastSync = new Date().toISOString();
                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList));
                
                // Notify other pages
                window.dispatchEvent(new CustomEvent('pesasmart-progress-update', {
                    detail: { progress: this.progress }
                }));
                
                return true;
            } catch (error) {
                console.error('Failed to save progress:', error);
                return false;
            }
        },

        async saveProgressList(progressList) {
            try {
                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList));
                return true;
            } catch (error) {
                console.error('Failed to save progress list:', error);
                return false;
            }
        },

        async loadBookmarks() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.bookmarks = data[this.user.userId] || [];
                }
            } catch (error) {
                console.error('Failed to load bookmarks:', error);
                this.bookmarks = [];
            }
        },

        async saveBookmark(moduleId) {
            if (!this.bookmarks.includes(moduleId)) {
                this.bookmarks.push(moduleId);
                await this.saveBookmarks();
                return true;
            }
            return false;
        },

        async removeBookmark(moduleId) {
            this.bookmarks = this.bookmarks.filter(id => id !== moduleId);
            await this.saveBookmarks();
        },

        async saveBookmarks() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
                const bookmarks = cached ? JSON.parse(cached) : {};
                bookmarks[this.user.userId] = this.bookmarks;
                localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
            } catch (error) {
                console.error('Failed to save bookmarks:', error);
            }
        },

        calculatePathProgress(path) {
            const modules = this.courses[path] || [];
            const completed = modules.filter(m => this.progress.completedModules.includes(m.id)).length;
            return modules.length ? Math.round((completed / modules.length) * 100) : 0;
        },

        calculateTotalProgress() {
            const bronzeProgress = this.calculatePathProgress('bronze');
            const silverProgress = this.calculatePathProgress('silver');
            const goldProgress = this.calculatePathProgress('gold');
            return Math.round((bronzeProgress + silverProgress + goldProgress) / 3);
        }
    };

    // UI COMPONENTS - FULLY RESPONSIVE

    const UI = {
        // LOADING STATES

        showLoading(message = 'Loading courses...') {
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
                    <a href="learn.html" class="block py-3 px-4 text-green-600 font-medium hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Learn</a>
                    <a href="practice.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Practice</a>
                    <a href="act.html" class="block py-3 px-4 text-gray-700 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500">Act</a>
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
            if (AppState.progress?.earnedBadges?.length > 0) count++;
            if (AppState.progress?.currentStreak > 5) count++;
            return Math.min(count, 9);
        },

        showNotifications() {
            const notifications = [];

            if (AppState.progress?.earnedBadges?.length > 0) {
                notifications.push({
                    title: 'New Achievements',
                    message: `You've earned ${AppState.progress.earnedBadges.length} badges!`,
                    type: 'success',
                    icon: 'fa-trophy',
                    time: 'Today'
                });
            }

            if (AppState.progress?.currentStreak > 5) {
                notifications.push({
                    title: 'Learning Streak',
                    message: `${AppState.progress.currentStreak} day streak! Keep it up!`,
                    type: 'info',
                    icon: 'fa-fire',
                    time: 'Now'
                });
            }

            if (notifications.length === 0) {
                notifications.push({
                    title: 'No Notifications',
                    message: 'You\'re all caught up!',
                    type: 'info',
                    icon: 'fa-check-circle',
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
                            <div class="p-4 ${n.type === 'success' ? 'bg-green-50' : 'bg-blue-50'} rounded-lg animate-fade-in">
                                <div class="flex items-start">
                                    <div class="w-10 h-10 ${n.type === 'success' ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                        <i class="fas ${n.icon} ${n.type === 'success' ? 'text-green-600' : 'text-blue-600'}"></i>
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

        async handleLogout() {
            const confirmed = await this.confirmAction({
                title: 'Log Out',
                message: 'Are you sure you want to log out? Your progress will be saved.',
                confirmText: 'Log Out',
                type: 'warning'
            });

            if (!confirmed) return;

            this.showLoading('Logging out...');

            try {
                await AppState.saveProgress();
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

        confirmAction(options) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
                modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                        <div class="text-center mb-6">
                            <div class="w-20 h-20 ${options.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas ${options.type === 'danger' ? 'fa-exclamation-triangle text-red-600' : 'fa-question-circle text-yellow-600'} text-3xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">${options.title}</h3>
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

        // SEARCH AND FILTER

        setupSearchAndFilter() {
            const searchInput = document.getElementById('course-search');
            const filterButtons = document.querySelectorAll('.filter-btn');

            if (searchInput) {
                searchInput.addEventListener('input', this.debounce(() => {
                    AppState.searchTerm = searchInput.value.toLowerCase();
                    this.renderLearningTracks();
                }, 300));
            }

            filterButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterButtons.forEach(b => {
                        b.classList.remove('bg-green-500', 'text-white');
                        b.classList.add('bg-gray-200', 'text-gray-800');
                    });
                    btn.classList.remove('bg-gray-200', 'text-gray-800');
                    btn.classList.add('bg-green-500', 'text-white');
                    
                    AppState.currentFilter = btn.dataset.filter;
                    this.renderLearningTracks();
                });

                // Touch optimization
                btn.classList.add('min-h-[44px]', 'px-4', 'py-2');
            });
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // CONTINUE LEARNING SECTION

        renderContinueLearning() {
            const container = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.mb-8');
            if (!container) return;

            const inProgressModules = Object.keys(AppState.progress.inProgress || {});
            
            if (inProgressModules.length === 0) {
                const firstModule = this.findFirstAvailableModule();
                if (!firstModule) {
                    container.style.display = 'none';
                    return;
                }

                container.innerHTML = this.renderStartLearningCard(firstModule);
                container.querySelector('.start-module')?.addEventListener('click', () => {
                    this.openModule(firstModule.id);
                });
            } else {
                const moduleId = inProgressModules[0];
                const moduleProgress = AppState.progress.inProgress[moduleId];
                const currentModule = this.findModuleById(moduleId);
                
                if (!currentModule) return;

                container.innerHTML = this.renderContinueLearningCard(currentModule, moduleProgress);
                container.querySelector('.resume-module')?.addEventListener('click', () => {
                    this.openModule(currentModule.id);
                });
            }
        },

        renderStartLearningCard(module) {
            return `
                <div class="p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                        <div class="flex items-center mb-3 sm:mb-0">
                            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-play-circle text-green-600 text-2xl"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold text-gray-800">Start Learning</h2>
                                <p class="text-gray-600 text-sm">Begin your financial journey</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold self-start sm:self-auto">
                            Not Started
                        </span>
                    </div>

                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">${module.title}</h3>
                        <p class="text-gray-600 text-sm mb-4">${module.description}</p>

                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="text-gray-600 text-sm">
                                <i class="far fa-clock mr-1"></i> ${module.duration} mins
                            </div>
                            <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px] start-module">
                                Start Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        renderContinueLearningCard(module, progress) {
            return `
                <div class="p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                        <div class="flex items-center mb-3 sm:mb-0">
                            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-play-circle text-green-600 text-2xl"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold text-gray-800">Continue Learning</h2>
                                <p class="text-gray-600 text-sm">Pick up where you left off</p>
                            </div>
                        </div>
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold self-start sm:self-auto">
                            ${progress.progress || 0}% Complete
                        </span>
                    </div>

                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">${module.title}</h3>
                        <p class="text-gray-600 text-sm mb-4">${module.description}</p>

                        <div class="mb-4">
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-700">Progress</span>
                                <span class="font-semibold">${progress.progress || 0}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div class="bg-green-500 h-2.5 rounded-full transition-all duration-500" style="width: ${progress.progress || 0}%"></div>
                            </div>
                        </div>

                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="text-gray-600 text-sm">
                                <i class="far fa-clock mr-1"></i> ${Math.max(0, module.duration - (progress.timeSpent || 0))} mins remaining
                            </div>
                            <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px] resume-module">
                                Resume Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        // LEARNING TRACKS

        renderLearningTracks() {
            this.renderBronzePath();
            this.renderSilverPath();
            this.renderGoldPath();
        },

        renderBronzePath() {
            const section = document.querySelector('.border-l-4.border-yellow-500');
            if (!section || !AppState.courses.bronze) return;

            const modules = this.filterModules(AppState.courses.bronze);
            const progressPercent = AppState.calculatePathProgress('bronze');

            const progressText = section.querySelector('.text-sm.text-gray-600');
            if (progressText) {
                progressText.innerHTML = `<i class="fas fa-chart-line mr-1"></i> Overall Progress: ${progressPercent}%`;
            }

            const modulesContainer = section.querySelector('.space-y-4');
            if (modulesContainer) {
                modulesContainer.innerHTML = modules.map(module => this.renderModuleItem(module, 'bronze')).join('');

                modulesContainer.querySelectorAll('.module-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.openModule(item.dataset.moduleId);
                    });

                    // Keyboard support
                    item.setAttribute('tabindex', '0');
                    item.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.openModule(item.dataset.moduleId);
                        }
                    });
                });
            }

            const continueBtn = section.querySelector('.text-green-600.font-semibold');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    const firstIncomplete = modules.find(m => 
                        !AppState.progress.completedModules.includes(m.id)
                    );
                    if (firstIncomplete) {
                        this.openModule(firstIncomplete.id);
                    } else {
                        this.showNotification('You have completed all bronze modules! 🎉', 'success');
                    }
                });
            }
        },

        renderSilverPath() {
            const section = document.querySelectorAll('.border-l-4.border-gray-300')[0];
            if (!section || !AppState.courses.silver) return;

            const bronzeModules = AppState.courses.bronze || [];
            const bronzeCompleted = bronzeModules.every(m => AppState.progress.completedModules.includes(m.id));
            
            if (bronzeCompleted) {
                section.classList.remove('border-gray-300');
                section.classList.add('border-gray-500');
                
                const lockSection = section.querySelector('.p-4.bg-gray-50');
                if (lockSection) {
                    const modules = this.filterModules(AppState.courses.silver);
                    lockSection.innerHTML = `
                        <div class="space-y-4">
                            ${modules.map(module => this.renderModuleItem(module, 'silver')).join('')}
                        </div>
                    `;
                    
                    lockSection.querySelectorAll('.module-item').forEach(item => {
                        item.addEventListener('click', () => {
                            this.openModule(item.dataset.moduleId);
                        });

                        item.setAttribute('tabindex', '0');
                        item.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                this.openModule(item.dataset.moduleId);
                            }
                        });
                    });
                }
            }
        },

        renderGoldPath() {
            const section = document.querySelectorAll('.border-l-4.border-gray-300')[1];
            if (!section || !AppState.courses.gold) return;

            const silverModules = AppState.courses.silver || [];
            const silverCompleted = silverModules.every(m => AppState.progress.completedModules.includes(m.id));
            
            if (silverCompleted) {
                section.classList.remove('border-gray-300');
                section.classList.add('border-gray-500');
                
                const lockSection = section.querySelector('.p-4.bg-gray-50');
                if (lockSection) {
                    const modules = this.filterModules(AppState.courses.gold);
                    lockSection.innerHTML = `
                        <div class="space-y-4">
                            ${modules.map(module => this.renderModuleItem(module, 'gold')).join('')}
                        </div>
                    `;
                    
                    lockSection.querySelectorAll('.module-item').forEach(item => {
                        item.addEventListener('click', () => {
                            this.openModule(item.dataset.moduleId);
                        });

                        item.setAttribute('tabindex', '0');
                        item.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                this.openModule(item.dataset.moduleId);
                            }
                        });
                    });
                }
            }
        },

        renderModuleItem(module, path) {
            const isCompleted = AppState.progress.completedModules.includes(module.id);
            const isInProgress = AppState.progress.inProgress[module.id];
            const isBookmarked = AppState.bookmarks.includes(module.id);
            
            let icon = 'far fa-circle text-gray-400';
            let statusClass = '';
            
            if (isCompleted) {
                icon = 'fas fa-check-circle text-green-500';
                statusClass = 'text-green-600';
            } else if (isInProgress) {
                icon = 'fas fa-play-circle text-yellow-500';
                statusClass = 'text-yellow-600';
            }

            return `
                <div class="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item focus:outline-none focus:ring-2 focus:ring-green-500" 
                     data-module-id="${module.id}" 
                     data-path="${path}"
                     tabindex="0"
                     role="button">
                    <div class="flex items-center min-w-0 flex-1">
                        <i class="${icon} mr-3 text-lg flex-shrink-0"></i>
                        <div class="min-w-0">
                            <h4 class="font-medium text-gray-800 truncate">${module.title}</h4>
                            <p class="text-gray-600 text-sm hidden sm:block">${module.description}</p>
                            <div class="flex items-center mt-1 sm:hidden">
                                <span class="text-xs ${statusClass} mr-2">${isCompleted ? 'Completed' : isInProgress ? 'In Progress' : ''}</span>
                                <span class="text-xs text-gray-500">${module.duration} min</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3 ml-2">
                        <span class="text-gray-500 text-sm hidden sm:inline">${module.duration} min</span>
                        ${!isCompleted ? `
                            <button class="text-gray-400 hover:text-yellow-500 transition bookmark-btn focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-lg p-2" 
                                    data-module-id="${module.id}"
                                    aria-label="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
                                <i class="fas ${isBookmarked ? 'fa-bookmark text-yellow-500' : 'fa-bookmark'}"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        },

        filterModules(modules) {
            return modules.filter(module => {
                const matchesFilter = AppState.currentFilter === 'all' || 
                                     AppState.currentFilter === module.level ||
                                     (AppState.currentFilter === 'completed' && AppState.progress.completedModules.includes(module.id)) ||
                                     (AppState.currentFilter === 'in-progress' && AppState.progress.inProgress[module.id]);
                
                const matchesSearch = AppState.searchTerm === '' || 
                                     module.title.toLowerCase().includes(AppState.searchTerm) ||
                                     module.description.toLowerCase().includes(AppState.searchTerm);
                
                return matchesFilter && matchesSearch;
            });
        },

        findModuleById(moduleId) {
            for (const path of ['bronze', 'silver', 'gold']) {
                const found = AppState.courses[path]?.find(m => m.id === moduleId);
                if (found) return found;
            }
            return null;
        },

        findFirstAvailableModule() {
            for (const path of ['bronze', 'silver', 'gold']) {
                const module = AppState.courses[path]?.[0];
                if (module) return module;
            }
            return null;
        },

        // ACHIEVEMENTS SECTION

        renderAchievements() {
            const container = document.querySelector('#achievements .space-y-4');
            if (!container) return;

            const earnedBadges = AppState.progress.earnedBadges || [];
            
            if (earnedBadges.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 px-4">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trophy text-gray-400 text-3xl"></i>
                        </div>
                        <p class="text-gray-600">Complete modules to earn badges!</p>
                    </div>
                `;
            } else {
                const recentBadges = earnedBadges.slice(0, 3);
                container.innerHTML = recentBadges.map(badgeId => {
                    const badge = AppState.badges?.[badgeId] || { name: badgeId, description: '' };
                    return `
                        <div class="flex items-center p-3 sm:p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition cursor-pointer achievement-item" data-badge-id="${badgeId}">
                            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas fa-trophy text-yellow-600 text-xl"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="font-semibold text-gray-800 truncate">${badge.name}</h4>
                                <p class="text-gray-600 text-sm hidden sm:block">${badge.description || 'Achievement unlocked'}</p>
                                <p class="text-gray-500 text-xs mt-1">Earned recently</p>
                            </div>
                        </div>
                    `;
                }).join('');

                container.querySelectorAll('.achievement-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.showAchievementDetails(item.dataset.badgeId);
                    });

                    item.setAttribute('tabindex', '0');
                    item.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.showAchievementDetails(item.dataset.badgeId);
                        }
                    });
                });
            }

            const viewAllBtn = container.nextElementSibling?.querySelector('button');
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => this.showAllBadges());
            }
        },

        showAchievementDetails(badgeId) {
            const badge = AppState.badges?.[badgeId] || { name: badgeId, description: '', points: 0 };
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="text-center mb-6">
                        <div class="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-trophy text-yellow-600 text-4xl"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${badge.name}</h3>
                        <p class="text-gray-600">${badge.description || 'Achievement unlocked'}</p>
                        ${badge.points ? `<p class="text-green-600 font-bold mt-2">+${badge.points} points</p>` : ''}
                    </div>
                    <button class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                        Close
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        },

        showAllBadges() {
            const earnedBadges = AppState.progress.earnedBadges || [];
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 class="text-xl font-bold">Your Badges (${earnedBadges.length})</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        ${earnedBadges.map(badgeId => {
                            const badge = AppState.badges?.[badgeId] || { name: badgeId, description: '', points: 0 };
                            return `
                                <div class="border rounded-lg p-4 text-center hover:shadow-lg transition">
                                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                                    </div>
                                    <h4 class="font-bold text-gray-800 text-sm truncate">${badge.name}</h4>
                                    <p class="text-xs text-gray-600 mt-1 hidden sm:block">${badge.description || ''}</p>
                                    <p class="text-xs text-green-600 mt-2">+${badge.points || 0} pts</p>
                                </div>
                            `;
                        }).join('')}
                        
                        ${earnedBadges.length === 0 ? `
                            <div class="col-span-3 text-center py-8 text-gray-500">
                                <i class="fas fa-trophy text-4xl mb-2 text-gray-300"></i>
                                <p>No badges yet. Complete modules to earn badges!</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        // LEARNING STATS

        renderLearningStats() {
            const statsContainer = document.querySelector('.bg-gradient-to-br.from-green-500.to-green-600');
            if (!statsContainer) return;

            const totalHours = AppState.progress.totalLearningHours || 0;
            const completedCount = AppState.progress.completedModules?.length || 0;
            const bronzeModules = AppState.courses.bronze?.length || 0;
            const silverModules = AppState.courses.silver?.length || 0;
            const goldModules = AppState.courses.gold?.length || 0;
            const totalModules = bronzeModules + silverModules + goldModules;
            const streak = AppState.progress.currentStreak || 0;

            statsContainer.innerHTML = `
                <div class="p-4 sm:p-6">
                    <h2 class="text-xl font-bold mb-4">Learning Stats</h2>
                    
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-green-100 text-sm">Total Learning Time</p>
                                <p class="text-2xl font-bold">${totalHours} hours</p>
                            </div>
                            <i class="far fa-clock text-2xl opacity-80"></i>
                        </div>

                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-green-100 text-sm">Modules Completed</p>
                                <p class="text-2xl font-bold">${completedCount}/${totalModules}</p>
                            </div>
                            <i class="fas fa-check-circle text-2xl opacity-80"></i>
                        </div>

                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-green-100 text-sm">Current Streak</p>
                                <p class="text-2xl font-bold">${streak} days</p>
                            </div>
                            <i class="fas fa-fire text-2xl opacity-80"></i>
                        </div>
                    </div>
                    
                    <div id="learning-progress-chart" class="w-full h-48 mt-6"></div>

                    <div class="mt-6 text-center">
                        <button class="bg-white text-green-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-600 min-h-[44px]" id="share-progress">
                            Share Progress
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('share-progress')?.addEventListener('click', () => this.shareProgress());
            this.drawCharts();
        },

        shareProgress() {
            const completed = AppState.progress.completedModules?.length || 0;
            const bronzeModules = AppState.courses.bronze?.length || 0;
            const silverModules = AppState.courses.silver?.length || 0;
            const goldModules = AppState.courses.gold?.length || 0;
            const total = bronzeModules + silverModules + goldModules;
            const percent = total ? Math.round((completed / total) * 100) : 0;
            
            const text = `I've completed ${completed}/${total} (${percent}%) financial literacy modules on PesaSmart! 🚀`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'My Learning Progress',
                    text: text,
                    url: window.location.origin
                }).catch(() => {
                    this.copyToClipboard(text);
                });
            } else {
                this.copyToClipboard(text);
            }
        },

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Progress copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Could not copy to clipboard', 'error');
            });
        },

        // MICRO-LEARNING FEATURES

        setupMicroLearning() {
            this.setupAudioLessons();
            this.setupWhatsAppSubscribe();
        },

        setupAudioLessons() {
            const audioButtons = document.querySelectorAll('.text-green-600.hover\\:text-green-700.text-sm.font-medium');
            
            audioButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const lessonName = btn.textContent.trim().replace('• ', '');
                    this.showAudioPlayer(lessonName);
                });

                // Touch optimization
                btn.classList.add('min-h-[44px]', 'inline-flex', 'items-center', 'px-3', 'py-2');
            });
        },

        showAudioPlayer(lessonName) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Audio Lesson</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="text-center mb-6">
                        <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-headphones text-green-600 text-4xl"></i>
                        </div>
                        <h4 class="font-bold text-lg">${lessonName}</h4>
                        <p class="text-gray-600">5-minute audio lesson</p>
                    </div>
                    
                    <div class="bg-gray-100 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-600">00:00</span>
                            <span class="text-gray-600">05:00</span>
                        </div>
                        <div class="w-full bg-gray-300 h-2 rounded-full mt-2 overflow-hidden">
                            <div class="w-0 bg-green-500 h-2 rounded-full transition-all duration-300"></div>
                        </div>
                    </div>
                    
                    <div class="flex justify-center space-x-4">
                        <button class="w-12 h-12 bg-gray-200 rounded-full hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-500" aria-label="Previous">
                            <i class="fas fa-backward"></i>
                        </button>
                        <button class="w-12 h-12 bg-green-500 text-white rounded-full hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500" aria-label="Play">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="w-12 h-12 bg-gray-200 rounded-full hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-500" aria-label="Next">
                            <i class="fas fa-forward"></i>
                        </button>
                    </div>
                    
                    <p class="text-center text-sm text-gray-500 mt-4">
                        Audio lessons are for demonstration purposes
                    </p>
                </div>
            `;
            document.body.appendChild(modal);
        },

        setupWhatsAppSubscribe() {
            const subscribeBtn = document.querySelector('.bg-success-500');
            if (subscribeBtn) {
                subscribeBtn.classList.remove('bg-success-500', 'hover:bg-success-600');
                subscribeBtn.classList.add('bg-green-500', 'hover:bg-green-600', 'min-h-[44px]');
                
                subscribeBtn.addEventListener('click', () => this.showWhatsAppModal());
            }
        },

        showWhatsAppModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">WhatsApp Tips</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">
                        Get daily financial tips delivered to your WhatsApp.
                    </p>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-medium mb-2">Phone Number</label>
                        <div class="flex">
                            <div class="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-4 py-3">
                                <span class="text-gray-700">+254</span>
                            </div>
                            <input type="tel" id="whatsapp-phone" 
                                class="flex-1 border border-gray-300 rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="712 345 678"
                                inputmode="numeric">
                        </div>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                            Cancel
                        </button>
                        <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="confirm-whatsapp">
                            Subscribe
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('confirm-whatsapp')?.addEventListener('click', () => {
                const phone = document.getElementById('whatsapp-phone')?.value;
                if (phone) {
                    this.showNotification('Successfully subscribed to WhatsApp tips!', 'success');
                    modal.remove();
                } else {
                    this.showNotification('Please enter your phone number', 'error');
                }
            });
        },

        // MODULE PLAYER

        async openModule(moduleId) {
            const currentModule = this.findModuleById(moduleId);
            if (!currentModule) {
                this.showNotification('Module not found', 'error');
                return;
            }

            let moduleProgress = AppState.progress.inProgress[moduleId] || {
                startedAt: new Date().toISOString(),
                progress: 0,
                lastPosition: 0,
                timeSpent: 0
            };

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'module-title');
            
            const currentContent = currentModule.content[moduleProgress.lastPosition] || currentModule.content[0];
            
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                        <h2 id="module-title" class="text-xl font-bold truncate pr-4">${currentModule.title}</h2>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2 flex-shrink-0" id="close-module" aria-label="Close">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="p-4 sm:p-6">
                        <div class="mb-6">
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-600">Progress</span>
                                <span class="font-semibold" id="progress-percent">${moduleProgress.progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div class="bg-green-500 h-2.5 rounded-full transition-all duration-500 module-progress-bar" style="width: ${moduleProgress.progress}%"></div>
                            </div>
                        </div>
                        
                        <div id="module-content" class="mb-6">
                            ${this.renderModuleContent(currentContent)}
                        </div>
                        
                        <div class="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
                            <button class="w-full sm:w-auto px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px] ${moduleProgress.lastPosition === 0 ? 'opacity-50 cursor-not-allowed' : ''}" 
                                    id="prev-section" ${moduleProgress.lastPosition === 0 ? 'disabled' : ''}>
                                <i class="fas fa-arrow-left mr-2"></i>Previous
                            </button>
                            <span class="text-gray-600 order-first sm:order-none">${moduleProgress.lastPosition + 1} / ${currentModule.content.length}</span>
                            <button class="w-full sm:w-auto px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="next-section">
                                Next <i class="fas fa-arrow-right ml-2"></i>
                            </button>
                        </div>
                        
                        <div class="mt-6 text-center">
                            <button class="text-green-600 hover:text-green-700 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-4 py-2 min-h-[44px]" id="mark-complete">
                                <i class="fas fa-check-circle mr-2"></i>Mark as Complete
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            this.attachModuleEventListeners(modal, currentModule, moduleProgress, moduleId);
        },

        renderModuleContent(content) {
            switch(content.type) {
                case 'video':
                    return this.renderVideoContent(content);
                case 'text':
                    return this.renderTextContent(content);
                case 'quiz':
                    return this.renderQuiz(content.questions);
                case 'interactive':
                case 'calculator':
                case 'comparison':
                    return this.renderInteractiveContent(content);
                default:
                    return `<p class="text-gray-600">Content type: ${content.type}</p>`;
            }
        },

        renderVideoContent(content) {
            const videoId = VIDEO_PLACEHOLDERS[content.title] || 'dQw4w9WgXcQ';
            
            return `
                <div class="mb-4">
                    <div class="relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
                        <iframe class="absolute top-0 left-0 w-full h-full" 
                                src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                        </iframe>
                    </div>
                    <h3 class="text-xl font-bold mt-4 mb-2">${content.title}</h3>
                    ${content.description ? `<p class="text-gray-600">${content.description}</p>` : ''}
                </div>
            `;
        },

        renderTextContent(content) {
            return `
                <div class="prose max-w-none">
                    <h3 class="text-xl font-bold mb-4">${content.title}</h3>
                    <div class="text-gray-700 leading-relaxed">
                        ${content.content || 'Content coming soon...'}
                    </div>
                </div>
            `;
        },

        renderQuiz(questions) {
            if (!questions?.length) return '<p class="text-gray-600">No questions available</p>';

            return `
                <div class="quiz-container">
                    <h3 class="text-xl font-bold mb-4">Quick Check</h3>
                    ${questions.map((q, idx) => `
                        <div class="mb-6 p-4 bg-gray-50 rounded-lg" data-question="${idx}">
                            <p class="font-medium mb-3">${idx + 1}. ${q.question}</p>
                            <div class="space-y-2">
                                ${q.options.map((opt, optIdx) => `
                                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer transition">
                                        <input type="radio" name="q${idx}" value="${optIdx}" class="mr-3 w-4 h-4">
                                        <span class="text-sm sm:text-base">${opt}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <div class="quiz-feedback mt-2 text-sm hidden"></div>
                        </div>
                    `).join('')}
                    <button class="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="submit-quiz">
                        Check Answers
                    </button>
                    <div id="quiz-results" class="mt-4 hidden"></div>
                </div>
            `;
        },

        renderInteractiveContent(content) {
            return `
                <div class="text-center py-8 px-4">
                    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-calculator text-green-600 text-3xl"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">${content.title}</h3>
                    <p class="text-gray-600 mb-6">${content.template || 'Interactive tool'} coming soon!</p>
                    <button class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]">
                        Launch Tool
                    </button>
                </div>
            `;
        },

        attachModuleEventListeners(modal, module, progress, moduleId) {
            const closeBtn = document.getElementById('close-module');
            const prevBtn = document.getElementById('prev-section');
            const nextBtn = document.getElementById('next-section');
            const markCompleteBtn = document.getElementById('mark-complete');

            closeBtn?.addEventListener('click', () => {
                this.saveModuleProgress(moduleId, progress);
                modal.remove();
            });

            if (prevBtn && progress.lastPosition > 0) {
                prevBtn.addEventListener('click', () => {
                    progress.lastPosition--;
                    progress.timeSpent += 2;
                    this.updateModuleContent(module, progress);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (progress.lastPosition < module.content.length - 1) {
                        progress.lastPosition++;
                        progress.timeSpent += 2;
                        this.updateModuleContent(module, progress);
                    } else {
                        this.showNotification('You\'ve reached the end of this module!', 'info');
                    }
                });
            }

            markCompleteBtn?.addEventListener('click', async () => {
                await this.completeModule(module);
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.saveModuleProgress(moduleId, progress);
                    modal.remove();
                }
            });
        },

        updateModuleContent(module, progress) {
            const content = module.content[progress.lastPosition];
            const contentContainer = document.getElementById('module-content');
            if (contentContainer) {
                contentContainer.innerHTML = this.renderModuleContent(content);
            }

            progress.progress = Math.round((progress.lastPosition / module.content.length) * 100);
            
            const progressBar = document.querySelector('.module-progress-bar');
            if (progressBar) {
                progressBar.style.width = progress.progress + '%';
            }
            
            const progressPercent = document.getElementById('progress-percent');
            if (progressPercent) {
                progressPercent.textContent = progress.progress + '%';
            }
            
            const positionSpan = document.querySelector('.flex.flex-col.sm\\:flex-row .text-gray-600');
            if (positionSpan) {
                positionSpan.textContent = `${progress.lastPosition + 1} / ${module.content.length}`;
            }

            const prevBtn = document.getElementById('prev-section');
            if (prevBtn) {
                if (progress.lastPosition === 0) {
                    prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    prevBtn.disabled = true;
                } else {
                    prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    prevBtn.disabled = false;
                }
            }

            if (content.type === 'quiz') {
                this.setupQuizHandlers(content.questions);
            }
        },

        setupQuizHandlers(questions) {
            const submitBtn = document.getElementById('submit-quiz');
            if (!submitBtn) return;

            submitBtn.addEventListener('click', () => {
                let score = 0;
                const total = questions.length;

                questions.forEach((q, idx) => {
                    const selected = document.querySelector(`input[name="q${idx}"]:checked`);
                    const questionDiv = document.querySelector(`[data-question="${idx}"]`);
                    const feedbackDiv = questionDiv?.querySelector('.quiz-feedback');
                    
                    if (selected) {
                        const answer = parseInt(selected.value);
                        if (answer === q.correct) {
                            score++;
                            feedbackDiv.className = 'quiz-feedback mt-2 text-sm text-green-600';
                            feedbackDiv.textContent = 'Correct! ' + (q.explanation || '');
                        } else {
                            feedbackDiv.className = 'quiz-feedback mt-2 text-sm text-red-600';
                            feedbackDiv.textContent = 'Incorrect. ' + (q.explanation || `The correct answer was: ${q.options[q.correct]}`);
                        }
                        feedbackDiv.classList.remove('hidden');
                    } else {
                        feedbackDiv.className = 'quiz-feedback mt-2 text-sm text-yellow-600';
                        feedbackDiv.textContent = 'Please select an answer';
                        feedbackDiv.classList.remove('hidden');
                    }
                });

                const resultsDiv = document.getElementById('quiz-results');
                if (resultsDiv) {
                    resultsDiv.className = `mt-4 p-4 rounded-lg text-center font-bold animate-fade-in ${
                        score === total ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`;
                    resultsDiv.textContent = `You scored ${score} out of ${total}!`;
                    resultsDiv.classList.remove('hidden');
                }

                if (score === total) {
                    this.showNotification('Perfect score! 🎉', 'success');
                }
            });
        },

        async saveModuleProgress(moduleId, progress) {
            AppState.progress.inProgress[moduleId] = progress;
            await AppState.saveProgress();
        },

        async completeModule(module) {
            if (!AppState.progress.completedModules.includes(module.id)) {
                AppState.progress.completedModules.push(module.id);
            }
            
            delete AppState.progress.inProgress[module.id];

            if (module.badge && !AppState.progress.earnedBadges.includes(module.badge.id)) {
                AppState.progress.earnedBadges.push(module.badge.id);
                this.showAchievementUnlock(module.badge);
            }

            AppState.progress.totalLearningHours += Math.ceil(module.duration / 60);
            AppState.progress.currentStreak += 1;
            if (AppState.progress.currentStreak > AppState.progress.longestStreak) {
                AppState.progress.longestStreak = AppState.progress.currentStreak;
            }

            await AppState.saveProgress();

            this.showNotification(`Module completed: ${module.title}!`, 'success');
            this.renderContinueLearning();
            this.renderLearningTracks();
            this.renderAchievements();
            this.renderLearningStats();
        },

        showAchievementUnlock(badge) {
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-slide-in';
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-trophy text-yellow-500"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-bold"> Badge Unlocked!</p>
                        <p class="text-sm">${badge.name}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        },

        // CHARTS

        drawCharts() {
            google.charts.load('current', { packages: ['corechart', 'bar'] });
            google.charts.setOnLoadCallback(() => {
                this.drawProgressChart();
            });
        },

        drawProgressChart() {
            const chartContainer = document.getElementById('learning-progress-chart');
            if (!chartContainer) return;

            const bronzeProgress = AppState.calculatePathProgress('bronze');
            const silverProgress = AppState.calculatePathProgress('silver');
            const goldProgress = AppState.calculatePathProgress('gold');

            const data = google.visualization.arrayToDataTable([
                ['Path', 'Progress', { role: 'style' }],
                ['Bronze', bronzeProgress, '#FDB813'],
                ['Silver', silverProgress, '#C0C0C0'],
                ['Gold', goldProgress, '#FFD700']
            ]);

            const options = {
                title: 'Learning Progress by Path',
                legend: { position: 'none' },
                colors: ['#FDB813', '#C0C0C0', '#FFD700'],
                hAxis: {
                    title: 'Learning Path',
                    textStyle: { fontSize: 12 }
                },
                vAxis: {
                    title: 'Progress (%)',
                    minValue: 0,
                    maxValue: 100,
                    format: '#\'%\'',
                    textStyle: { fontSize: 12 }
                },
                chartArea: {
                    width: '80%',
                    height: '70%',
                    left: 50,
                    right: 20
                },
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                responsive: true,
                maintainAspectRatio: false
            };

            const chart = new google.visualization.ColumnChart(chartContainer);
            chart.draw(data, options);

            window.addEventListener('resize', () => {
                chart.draw(data, options);
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
            this.setupSearchAndFilter();
            this.renderContinueLearning();
            this.renderLearningTracks();
            this.renderAchievements();
            this.renderLearningStats();
            this.setupMicroLearning();

            this.hideLoading();

            // Announce for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = 'Learning hub loaded. You have access to multiple financial literacy courses.';
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);

            console.log('Learning hub initialized');
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
        .module-item {
            transition: all 0.2s ease;
        }
        .module-item:hover {
            transform: translateX(5px);
        }
        .module-item:focus-visible {
            outline: 2px solid #00B894;
            outline-offset: 2px;
        }
        .achievement-item {
            transition: all 0.2s ease;
        }
        .achievement-item:hover {
            transform: scale(1.02);
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
            button, a {
                min-height: 44px;
            }
            input, select {
                font-size: 16px !important;
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