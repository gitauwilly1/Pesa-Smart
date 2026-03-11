(function() {
    'use strict';

    // SECTION 1: INITIALIZATION & SETUP

    // State variables
    let currentUser = null;
    let courses = null;
    let userProgress = null;
    let badges = null;

    /**
     * Check if user is authenticated
     */
    function checkAuthentication() {
        const session = localStorage.getItem('pesasmart_session');
        if (!session) {
            window.location.href = 'login.html?redirect=learn.html';
            return false;
        }

        try {
            currentUser = JSON.parse(session);
            if (currentUser.expires && currentUser.expires < Date.now()) {
                localStorage.removeItem('pesasmart_session');
                window.location.href = 'login.html?expired=true&redirect=learn.html';
                return false;
            }
            return true;
        } catch (e) {
            localStorage.removeItem('pesasmart_session');
            window.location.href = 'login.html';
            return false;
        }
    }

    /**
     * Load courses from JSON
     */
    async function loadCoursesFromJSON() {
        try {
            // Try cache first
            const cached = localStorage.getItem('pesasmart_courses');
            if (cached) {
                courses = JSON.parse(cached);
                return courses;
            }

            const response = await fetch('data/courses.json');
            const data = await response.json();
            courses = data.courses || {};
            
            // Store badges separately for easy access
            badges = data.badges || {};
            
            // Cache in localStorage
            localStorage.setItem('pesasmart_courses', JSON.stringify(courses));
            return courses;
        } catch (error) {
            console.error('Failed to load courses:', error);
            showNotification('Failed to load courses. Please refresh.', 'error');
            return { bronze: [], silver: [], gold: [] };
        }
    }

    /**
     * Load user progress from JSON
     */
    async function loadProgressFromJSON() {
        try {
            const cached = localStorage.getItem('pesasmart_progress');
            let progressList = [];
            
            if (cached) {
                progressList = JSON.parse(cached);
            } else {
                const response = await fetch('data/progress.json');
                const data = await response.json();
                progressList = data.progress || [];
                localStorage.setItem('pesasmart_progress', JSON.stringify(progressList));
            }

            // Find progress for current user
            let progress = progressList.find(p => p.userId === currentUser.userId);
            
            // Create default progress if not found
            if (!progress) {
                progress = {
                    userId: currentUser.userId,
                    completedModules: [],
                    inProgress: {},
                    earnedBadges: [],
                    certificates: [],
                    lastActive: new Date().toISOString(),
                    totalLearningHours: 0,
                    currentStreak: 1,
                    longestStreak: 1
                };
                progressList.push(progress);
                await saveProgressToJSON(progressList);
            }
            
            userProgress = progress;
            return progress;
        } catch (error) {
            console.error('Failed to load progress:', error);
            // Create default in-memory progress
            userProgress = {
                userId: currentUser.userId,
                completedModules: [],
                inProgress: {},
                earnedBadges: [],
                certificates: [],
                lastActive: new Date().toISOString(),
                totalLearningHours: 0,
                currentStreak: 1,
                longestStreak: 1
            };
            return userProgress;
        }
    }

    /**
     * Save progress to JSON
     */
    async function saveProgressToJSON(progressList) {
        try {
            localStorage.setItem('pesasmart_progress', JSON.stringify(progressList));
            
            // Update userProgress if it's the current user
            if (userProgress) {
                const updated = progressList.find(p => p.userId === currentUser.userId);
                if (updated) userProgress = updated;
            }
            
            return true;
        } catch (error) {
            console.error('Failed to save progress:', error);
            return false;
        }
    }

    /**
     * Update progress for current user
     */
    async function updateCurrentUserProgress(updates) {
        try {
            const cached = localStorage.getItem('pesasmart_progress');
            let progressList = cached ? JSON.parse(cached) : [];
            
            const index = progressList.findIndex(p => p.userId === currentUser.userId);
            if (index >= 0) {
                progressList[index] = { ...progressList[index], ...updates, lastActive: new Date().toISOString() };
                userProgress = progressList[index];
            } else {
                const newProgress = {
                    userId: currentUser.userId,
                    ...updates,
                    lastActive: new Date().toISOString()
                };
                progressList.push(newProgress);
                userProgress = newProgress;
            }
            
            await saveProgressToJSON(progressList);
            return true;
        } catch (error) {
            console.error('Failed to update progress:', error);
            return false;
        }
    }

    // SECTION 2: NAVBAR MANAGEMENT (with logout and mobile menu)

    /**
     * Update navbar based on auth state - PRESERVES ORIGINAL LOGO
     */
    function updateNavbarForAuthState() {
        const navbar = document.querySelector('nav .flex.items-center.space-x-4');
        if (!navbar) return;

        // Get the original logo - IMPORTANT: We don't change the logo at all
        // The logo HTML is preserved from the original file with "PS" only
        
        const userName = currentUser?.name || 
                        (currentUser?.email ? currentUser.email.split('@')[0] : 'User');
        
        // Check if mobile menu exists, if not create it
        ensureMobileMenu();

        navbar.innerHTML = `
            <div class="hidden md:flex items-center space-x-4">
                <div class="relative">
                    <i class="fas fa-bell text-gray-600 text-xl hover:text-green-600 cursor-pointer" id="notification-bell"></i>
                    <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center notification-count hidden">0</span>
                </div>
                <div class="relative" id="user-menu-container">
                    <button class="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition" id="user-menu-button">
                        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-green-600"></i>
                        </div>
                        <span class="font-medium">${userName}</span>
                        <i class="fas fa-chevron-down text-xs ml-1"></i>
                    </button>
                    
                    <!-- Dropdown menu -->
                    <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden z-50" id="user-dropdown">
                        <a href="profile.html" class="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600">
                            <i class="fas fa-user mr-2"></i> My Profile
                        </a>
                        <a href="profile.html#settings" class="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600">
                            <i class="fas fa-cog mr-2"></i> Settings
                        </a>
                        <hr class="my-2 border-gray-200">
                        <button class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50" id="logout-button">
                            <i class="fas fa-sign-out-alt mr-2"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Mobile menu button -->
            <button class="md:hidden text-gray-700 hover:text-green-600 focus:outline-none" id="mobile-menu-button">
                <i class="fas fa-bars text-2xl"></i>
            </button>
        `;

        // Setup dropdown toggle
        setupUserDropdown();
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Setup mobile menu
        setupMobileMenu();
    }

    /**
     * Ensure mobile menu container exists
     */
    function ensureMobileMenu() {
        if (!document.getElementById('mobile-menu-container')) {
            const mobileContainer = document.createElement('div');
            mobileContainer.id = 'mobile-menu-container';
            mobileContainer.className = 'hidden md:hidden bg-white border-t mt-2';
            document.querySelector('nav .container').appendChild(mobileContainer);
        }
    }

    /**
     * Setup mobile menu
     */
    function setupMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const mobileContainer = document.getElementById('mobile-menu-container');
        
        if (menuButton && mobileContainer) {
            // Create mobile menu content
            mobileContainer.innerHTML = `
                <div class="px-4 py-2 space-y-2">
                    <a href="index.html" class="block py-2 text-gray-700 hover:text-green-600">
                        <i class="fas fa-home mr-2"></i>Home
                    </a>
                    <a href="learn.html" class="block py-2 text-green-600 font-medium">
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
            
            menuButton.addEventListener('click', () => {
                mobileContainer.classList.toggle('hidden');
            });
            
            document.getElementById('mobile-logout')?.addEventListener('click', handleLogout);
        }
    }

    /**
     * Setup user dropdown menu
     */
    function setupUserDropdown() {
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
    }

    /**
     * Handle logout with confirmation
     */
    function handleLogout() {
        showLogoutConfirmation();
    }

    /**
     * Show logout confirmation modal
     */
    function showLogoutConfirmation() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 animate-fade-in">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-sign-out-alt text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">Log Out</h3>
                    <p class="text-gray-600">Are you sure you want to log out of your PesaSmart account?</p>
                </div>
                
                <div class="flex space-x-3">
                    <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition" id="cancel-logout">
                        Cancel
                    </button>
                    <button class="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition" id="confirm-logout">
                        <i class="fas fa-sign-out-alt mr-2"></i> Log Out
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('cancel-logout').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('confirm-logout').addEventListener('click', () => {
            localStorage.removeItem('pesasmart_session');
            localStorage.removeItem('pesasmart_remember');
            showNotification('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // SECTION 3: GOOGLE CHARTS INITIALIZATION

    google.charts.load('current', { packages: ['corechart', 'bar', 'line'] });
    google.charts.setOnLoadCallback(() => {
        console.log('✅ Google Charts loaded for learning page');
        // Charts will be drawn when data is available
    });

    /**
     * Draw learning progress chart
     */
    function drawLearningProgressChart() {
        const chartContainer = document.getElementById('learning-progress-chart');
        if (!chartContainer) return;

        // Calculate module completion data
        const bronzeTotal = courses.bronze?.length || 0;
        const silverTotal = courses.silver?.length || 0;
        const goldTotal = courses.gold?.length || 0;
        
        const bronzeCompleted = userProgress.completedModules.filter(id => 
            courses.bronze?.some(m => m.id === id)
        ).length || 0;
        
        const silverCompleted = userProgress.completedModules.filter(id => 
            courses.silver?.some(m => m.id === id)
        ).length || 0;
        
        const goldCompleted = userProgress.completedModules.filter(id => 
            courses.gold?.some(m => m.id === id)
        ).length || 0;

        const data = google.visualization.arrayToDataTable([
            ['Path', 'Completed', 'Total'],
            ['Bronze', bronzeCompleted, bronzeTotal],
            ['Silver', silverCompleted, silverTotal],
            ['Gold', goldCompleted, goldTotal]
        ]);

        const options = {
            title: 'Learning Progress by Path',
            legend: { position: 'top' },
            colors: ['#00B894', '#FD9644'],
            isStacked: true,
            hAxis: { title: 'Learning Path' },
            vAxis: { title: 'Modules', minValue: 0 },
            chartArea: { width: '70%', height: '70%' },
            animation: { startup: true, duration: 1000 }
        };

        const chart = new google.visualization.ColumnChart(chartContainer);
        chart.draw(data, options);
    }

    /**
     * Draw time distribution chart
     */
    function drawTimeDistributionChart() {
        const chartContainer = document.getElementById('time-distribution-chart');
        if (!chartContainer) return;

        // Calculate time spent per path
        const timeData = [
            ['Path', 'Hours Spent'],
            ['Bronze', Math.min(12, userProgress.totalLearningHours * 0.6)],
            ['Silver', Math.min(8, userProgress.totalLearningHours * 0.3)],
            ['Gold', Math.min(4, userProgress.totalLearningHours * 0.1)]
        ];

        const data = google.visualization.arrayToDataTable(timeData);

        const options = {
            title: 'Time Spent by Path',
            pieHole: 0.4,
            colors: ['#00B894', '#74B9FF', '#6C5CE7'],
            legend: { position: 'bottom' },
            chartArea: { width: '100%', height: '80%' },
            animation: { startup: true, duration: 1000 }
        };

        const chart = new google.visualization.PieChart(chartContainer);
        chart.draw(data, options);
    }

    // SECTION 4: RENDER FUNCTIONS

    /**
     * Render continue learning section
     */
    function renderContinueLearning() {
        const container = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.mb-8');
        if (!container) return;

        // Find in-progress module
        const inProgressModules = Object.keys(userProgress.inProgress || {});
        
        if (inProgressModules.length === 0) {
            // No modules in progress, show first bronze module
            const firstModule = courses.bronze?.[0];
            if (!firstModule) {
                container.style.display = 'none';
                return;
            }
            
            container.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4">
                            <i class="fas fa-play-circle text-green-600 text-2xl"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-gray-800">Start Learning</h2>
                            <p class="text-gray-600">Begin your financial journey</p>
                        </div>
                    </div>
                    <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                        Not Started
                    </span>
                </div>

                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">${firstModule.title}</h3>
                    <p class="text-gray-600 mb-4">${firstModule.description}</p>

                    <div class="flex items-center justify-between">
                        <div class="text-gray-600">
                            <i class="far fa-clock mr-1"></i> ${firstModule.duration} mins
                        </div>
                        <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition start-module-btn" data-module-id="${firstModule.id}">
                            Start Now
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Get the first in-progress module
            const moduleId = inProgressModules[0];
            const moduleProgress = userProgress.inProgress[moduleId];
            
            // Find module details
            let currentModule = null;
            for (const path of ['bronze', 'silver', 'gold']) {
                const found = courses[path]?.find(m => m.id === moduleId);
                if (found) {
                    currentModule = found;
                    break;
                }
            }
            
            if (!currentModule) {
                container.style.display = 'none';
                return;
            }

            container.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mr-4">
                            <i class="fas fa-play-circle text-green-600 text-2xl"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-gray-800">Continue Learning</h2>
                            <p class="text-gray-600">Pick up where you left off</p>
                        </div>
                    </div>
                    <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                        ${moduleProgress.progress || 0}% Complete
                    </span>
                </div>

                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">${currentModule.title}</h3>
                    <p class="text-gray-600 mb-4">${currentModule.description}</p>

                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-700">Progress</span>
                        <span class="font-semibold">${moduleProgress.progress || 0}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div class="bg-green-500 h-2.5 rounded-full" style="width: ${moduleProgress.progress || 0}%"></div>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="text-gray-600">
                            <i class="far fa-clock mr-1"></i> ${Math.max(0, currentModule.duration - (moduleProgress.timeSpent || 0))} mins remaining
                        </div>
                        <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition resume-module-btn" data-module-id="${currentModule.id}">
                            Resume Now
                        </button>
                    </div>
                </div>
            `;
        }

        // Add event listeners
        container.querySelector('.start-module-btn, .resume-module-btn')?.addEventListener('click', (e) => {
            const moduleId = e.target.dataset.moduleId;
            openModule(moduleId);
        });
    }

    /**
     * Render learning tracks
     */
    function renderLearningTracks() {
        renderBronzePath();
        renderSilverPath();
        renderGoldPath();
    }

    /**
     * Render bronze path
     */
    function renderBronzePath() {
        const bronzeSection = document.querySelector('.border-l-4.border-yellow-500');
        if (!bronzeSection || !courses.bronze) return;

        const modules = courses.bronze;
        const completedCount = modules.filter(m => userProgress.completedModules.includes(m.id)).length;
        const totalCount = modules.length;
        const progressPercent = Math.round((completedCount / totalCount) * 100);

        // Update progress text
        const progressText = bronzeSection.querySelector('.text-sm.text-gray-600');
        if (progressText) {
            progressText.innerHTML = `<i class="fas fa-chart-line mr-1"></i> Overall Progress: ${progressPercent}%`;
        }

        // Update modules list
        const modulesContainer = bronzeSection.querySelector('.space-y-4');
        if (modulesContainer) {
            modulesContainer.innerHTML = modules.map(module => {
                let status = 'not-started';
                let icon = 'far fa-circle text-gray-400';
                
                if (userProgress.completedModules.includes(module.id)) {
                    status = 'completed';
                    icon = 'fas fa-check-circle text-green-500';
                } else if (userProgress.inProgress[module.id]) {
                    status = 'in-progress';
                    icon = 'fas fa-play-circle text-yellow-500';
                }

                return `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item" data-module-id="${module.id}" data-path="bronze">
                        <div class="flex items-center">
                            <i class="${icon} mr-3"></i>
                            <div>
                                <h4 class="font-medium text-gray-800">${module.title}</h4>
                                <p class="text-gray-600 text-sm">${module.description}</p>
                            </div>
                        </div>
                        <span class="text-gray-500 text-sm">${module.duration} mins</span>
                    </div>
                `;
            }).join('');

            // Add click handlers
            modulesContainer.querySelectorAll('.module-item').forEach(item => {
                item.addEventListener('click', () => {
                    const moduleId = item.dataset.moduleId;
                    openModule(moduleId);
                });
            });
        }

        // Update continue button
        const continueBtn = bronzeSection.querySelector('.text-green-600.font-semibold');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                // Find first incomplete module
                const firstIncomplete = modules.find(m => 
                    !userProgress.completedModules.includes(m.id)
                );
                if (firstIncomplete) {
                    openModule(firstIncomplete.id);
                } else {
                    showNotification('You have completed all bronze modules! 🎉', 'success');
                }
            });
        }
    }

    /**
     * Render silver path
     */
    function renderSilverPath() {
        const silverSection = document.querySelector('.border-l-4.border-gray-300');
        if (!silverSection || !courses.silver) return;

        // Check if bronze is complete
        const bronzeModules = courses.bronze || [];
        const bronzeCompleted = bronzeModules.every(m => userProgress.completedModules.includes(m.id));
        
        if (bronzeCompleted) {
            // Unlock silver
            silverSection.querySelector('.border-l-4').classList.remove('border-gray-300');
            silverSection.querySelector('.border-l-4').classList.add('border-gray-500');
            
            const lockSection = silverSection.querySelector('.p-4.bg-gray-50');
            if (lockSection) {
                lockSection.innerHTML = `
                    <div class="space-y-4">
                        ${courses.silver.map(module => {
                            const isCompleted = userProgress.completedModules.includes(module.id);
                            const isInProgress = userProgress.inProgress[module.id];
                            const icon = isCompleted ? 'fas fa-check-circle text-green-500' : 
                                        isInProgress ? 'fas fa-play-circle text-yellow-500' : 
                                        'far fa-circle text-gray-400';
                            
                            return `
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item" data-module-id="${module.id}" data-path="silver">
                                    <div class="flex items-center">
                                        <i class="${icon} mr-3"></i>
                                        <div>
                                            <h4 class="font-medium text-gray-800">${module.title}</h4>
                                            <p class="text-gray-600 text-sm">${module.description}</p>
                                        </div>
                                    </div>
                                    <span class="text-gray-500 text-sm">${module.duration} mins</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                
                // Add click handlers
                lockSection.querySelectorAll('.module-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const moduleId = item.dataset.moduleId;
                        openModule(moduleId);
                    });
                });
            }
        }
    }

    /**
     * Render gold path
     */
    function renderGoldPath() {
        const goldSection = document.querySelectorAll('.border-l-4.border-gray-300')[1];
        if (!goldSection || !courses.gold) return;

        // Check if silver is complete
        const silverModules = courses.silver || [];
        const silverCompleted = silverModules.every(m => userProgress.completedModules.includes(m.id));
        
        if (silverCompleted) {
            goldSection.classList.remove('border-gray-300');
            goldSection.classList.add('border-gray-500');
            
            const lockSection = goldSection.querySelector('.p-4.bg-gray-50');
            if (lockSection) {
                lockSection.innerHTML = `
                    <div class="space-y-4">
                        ${courses.gold.map(module => {
                            const isCompleted = userProgress.completedModules.includes(module.id);
                            const isInProgress = userProgress.inProgress[module.id];
                            const icon = isCompleted ? 'fas fa-check-circle text-green-500' : 
                                        isInProgress ? 'fas fa-play-circle text-yellow-500' : 
                                        'far fa-circle text-gray-400';
                            
                            return `
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item" data-module-id="${module.id}" data-path="gold">
                                    <div class="flex items-center">
                                        <i class="${icon} mr-3"></i>
                                        <div>
                                            <h4 class="font-medium text-gray-800">${module.title}</h4>
                                            <p class="text-gray-600 text-sm">${module.description}</p>
                                        </div>
                                    </div>
                                    <span class="text-gray-500 text-sm">${module.duration} mins</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                
                lockSection.querySelectorAll('.module-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const moduleId = item.dataset.moduleId;
                        openModule(moduleId);
                    });
                });
            }
        }
    }

    /**
     * Render achievements
     */
    function renderAchievements() {
        const container = document.querySelector('#achievements .space-y-4');
        if (!container) return;

        const earnedBadges = userProgress.earnedBadges || [];
        
        if (earnedBadges.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <i class="fas fa-trophy text-4xl mb-2 text-gray-300"></i>
                    <p>Complete modules to earn badges!</p>
                </div>
            `;
        } else {
            // Show up to 3 most recent badges
            const recentBadges = earnedBadges.slice(0, 3);
            container.innerHTML = recentBadges.map(badgeId => {
                const badge = badges?.[badgeId] || { name: badgeId, description: '', icon: 'fa-medal' };
                return `
                    <div class="flex items-center p-3 bg-yellow-50 rounded-lg">
                        <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-trophy text-yellow-600"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800">${badge.name}</h4>
                            <p class="text-gray-600 text-sm">${badge.description || 'Achievement unlocked'}</p>
                            <p class="text-gray-500 text-xs mt-1">Earned recently</p>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Setup "View All" button
        const viewAllBtn = container.nextElementSibling?.querySelector('button');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', showAllBadges);
        }
    }

    /**
     * Render learning stats
     */
    function renderLearningStats() {
        const statsContainer = document.querySelector('.bg-gradient-to-br.from-green-500.to-green-600');
        if (!statsContainer) return;

        const totalHours = userProgress.totalLearningHours || 0;
        const completedCount = userProgress.completedModules?.length || 0;
        const totalModules = (courses.bronze?.length || 0) + (courses.silver?.length || 0) + (courses.gold?.length || 0);
        const streak = userProgress.currentStreak || 0;

        statsContainer.innerHTML = `
            <h2 class="text-xl font-bold mb-4">Learning Stats</h2>
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-green-100">Total Learning Time</p>
                        <p class="text-2xl font-bold">${totalHours} hours</p>
                    </div>
                    <i class="far fa-clock text-2xl opacity-80"></i>
                </div>

                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-green-100">Modules Completed</p>
                        <p class="text-2xl font-bold">${completedCount}/${totalModules}</p>
                    </div>
                    <i class="fas fa-check-circle text-2xl opacity-80"></i>
                </div>

                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-green-100">Current Streak</p>
                        <p class="text-2xl font-bold">${streak} days</p>
                    </div>
                    <i class="fas fa-fire text-2xl opacity-80"></i>
                </div>
            </div>
            
            <!-- Charts container -->
            <div id="learning-progress-chart" class="w-full h-48 mt-4"></div>
            <div id="time-distribution-chart" class="w-full h-40 mt-2"></div>

            <div class="mt-6 text-center">
                <button class="bg-white text-green-600 hover:bg-gray-100 px-6 py-2 rounded-lg font-semibold transition" id="share-progress-btn">
                    Share Progress
                </button>
            </div>
        `;

        // Draw charts
        setTimeout(() => {
            drawLearningProgressChart();
            drawTimeDistributionChart();
        }, 500);

        // Setup share button
        document.getElementById('share-progress-btn')?.addEventListener('click', shareProgress);
    }

    // SECTION 5: MODULE PLAYER

    /**
     * Open module player modal
     */
    function openModule(moduleId) {
        // Find module
        let currentModule = null;
        let modulePath = '';
        for (const path of ['bronze', 'silver', 'gold']) {
            const found = courses[path]?.find(m => m.id === moduleId);
            if (found) {
                currentModule = found;
                modulePath = path;
                break;
            }
        }
        
        if (!currentModule) {
            showNotification('Module not found', 'error');
            return;
        }

        // Get or create progress
        let moduleProgress = userProgress.inProgress[moduleId] || {
            startedAt: new Date().toISOString(),
            progress: 0,
            lastPosition: 0,
            timeSpent: 0
        };

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.id = 'module-modal';
        
        const currentContent = currentModule.content[moduleProgress.lastPosition] || currentModule.content[0];
        
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold">${currentModule.title}</h2>
                        <p class="text-sm text-gray-600">${modulePath.charAt(0).toUpperCase() + modulePath.slice(1)} Path</p>
                    </div>
                    <button class="text-gray-500 hover:text-gray-700" id="close-module">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="p-6">
                    <div class="mb-6">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Module Progress</span>
                            <span>${moduleProgress.progress}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-green-500 h-2 rounded-full module-progress-bar" style="width: ${moduleProgress.progress}%"></div>
                        </div>
                    </div>
                    
                    <div id="module-content" class="mb-6">
                        ${renderModuleContent(currentContent)}
                    </div>
                    
                    <div class="flex justify-between mt-8">
                        <button class="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition ${moduleProgress.lastPosition === 0 ? 'opacity-50 cursor-not-allowed' : ''}" 
                                id="prev-section" ${moduleProgress.lastPosition === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-left mr-2"></i>Previous
                        </button>
                        <span class="text-gray-600">${moduleProgress.lastPosition + 1} / ${currentModule.content.length}</span>
                        <button class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="next-section">
                            Next <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                    
                    <div class="mt-6 text-center">
                        <button class="text-green-600 hover:text-green-700 font-medium" id="mark-complete">
                            <i class="fas fa-check-circle mr-2"></i>Mark as Complete
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('close-module').addEventListener('click', () => {
            // Save progress before closing
            updateModuleProgress(moduleId, moduleProgress);
            modal.remove();
        });

        const prevBtn = document.getElementById('prev-section');
        const nextBtn = document.getElementById('next-section');

        if (prevBtn && moduleProgress.lastPosition > 0) {
            prevBtn.addEventListener('click', () => {
                moduleProgress.lastPosition--;
                moduleProgress.timeSpent += 2; // Simulate time spent
                updateModuleContent(currentModule, moduleProgress);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (moduleProgress.lastPosition < currentModule.content.length - 1) {
                    moduleProgress.lastPosition++;
                    moduleProgress.timeSpent += 2;
                    updateModuleContent(currentModule, moduleProgress);
                } else {
                    // Last section, prompt to complete
                    showNotification('You\'ve reached the end of this module! Mark it as complete.', 'info');
                }
            });
        }

        document.getElementById('mark-complete').addEventListener('click', () => {
            completeModule(currentModule, modulePath);
            modal.remove();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                updateModuleProgress(moduleId, moduleProgress);
                modal.remove();
            }
        });
    }

    /**
     * Render module content based on type
     */
    function renderModuleContent(content) {
        switch(content.type) {
            case 'video':
                return renderVideoContent(content);
            case 'text':
                return renderTextContent(content);
            case 'quiz':
                return renderQuiz(content.questions);
            case 'interactive':
            case 'calculator':
            case 'comparison':
                return renderInteractiveContent(content);
            default:
                return `<p class="text-gray-600">Content type: ${content.type}</p>`;
        }
    }

    /**
     * Render video content
     */
    function renderVideoContent(content) {
        // YouTube video IDs for demo content
        const videoMap = {
            'Why Budget?': 'dQw4w9WgXcQ', // Placeholder - replace with actual educational videos
            'Types of Debt': 'dQw4w9WgXcQ',
            'Why Save?': 'dQw4w9WgXcQ',
            'Investment Options': 'dQw4w9WgXcQ',
            'What is Inflation?': 'dQw4w9WgXcQ',
            'Types of Insurance': 'dQw4w9WgXcQ'
        };
        
        const videoId = videoMap[content.title] || 'dQw4w9WgXcQ';
        
        return `
            <div class="aspect-w-16 aspect-h-9 mb-4">
                <iframe class="w-full h-64 rounded-lg" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            </div>
            <h3 class="text-xl font-bold mb-2">${content.title}</h3>
            ${content.description ? `<p class="text-gray-600 mb-4">${content.description}</p>` : ''}
        `;
    }

    /**
     * Render text content
     */
    function renderTextContent(content) {
        return `
            <h3 class="text-xl font-bold mb-4">${content.title}</h3>
            <div class="prose max-w-none text-gray-700">
                ${content.content || 'Content coming soon...'}
            </div>
        `;
    }

    /**
     * Render quiz content
     */
    function renderQuiz(questions) {
        if (!questions || questions.length === 0) {
            return '<p class="text-gray-600">No questions available</p>';
        }

        return `
            <div class="quiz-container">
                <h3 class="text-xl font-bold mb-4">Quick Check</h3>
                ${questions.map((q, idx) => `
                    <div class="mb-6 p-4 bg-gray-50 rounded-lg" data-question="${idx}">
                        <p class="font-medium mb-3">${idx + 1}. ${q.question}</p>
                        <div class="space-y-2">
                            ${q.options.map((opt, optIdx) => `
                                <label class="flex items-center p-2 border rounded hover:bg-gray-100 cursor-pointer">
                                    <input type="radio" name="q${idx}" value="${optIdx}" class="mr-3">
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="quiz-feedback mt-2 text-sm hidden"></div>
                    </div>
                `).join('')}
                <button class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 mt-4" id="submit-quiz">
                    Check Answers
                </button>
                <div id="quiz-results" class="mt-4 hidden"></div>
            </div>
        `;
    }

    /**
     * Render interactive content
     */
    function renderInteractiveContent(content) {
        return `
            <h3 class="text-xl font-bold mb-4">${content.title}</h3>
            <div class="bg-gray-50 rounded-lg p-6 text-center">
                <i class="fas fa-calculator text-4xl text-green-600 mb-3"></i>
                <p class="text-gray-600">${content.template || 'Interactive tool'} coming soon!</p>
                <button class="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                    Launch Tool
                </button>
            </div>
        `;
    }

    /**
     * Update module content
     */
    function updateModuleContent(module, progress) {
        const contentContainer = document.getElementById('module-content');
        const content = module.content[progress.lastPosition];
        
        if (contentContainer && content) {
            contentContainer.innerHTML = renderModuleContent(content);
        }

        // Update progress bar
        const progressPercent = Math.round((progress.lastPosition / module.content.length) * 100);
        progress.progress = progressPercent;
        
        const progressBar = document.querySelector('.module-progress-bar');
        if (progressBar) {
            progressBar.style.width = progressPercent + '%';
        }

        // Update position indicator
        const positionSpan = document.querySelector('.flex.justify-between.mt-8 span');
        if (positionSpan) {
            positionSpan.textContent = `${progress.lastPosition + 1} / ${module.content.length}`;
        }

        // Enable/disable prev button
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

        // Re-attach quiz handler if needed
        if (content.type === 'quiz') {
            setupQuizHandlers(content.questions);
        }
    }

    /**
     * Setup quiz handlers
     */
    function setupQuizHandlers(questions) {
        const submitBtn = document.getElementById('submit-quiz');
        if (!submitBtn) return;

        submitBtn.addEventListener('click', () => {
            let score = 0;
            const total = questions.length;

            questions.forEach((q, idx) => {
                const selected = document.querySelector(`input[name="q${idx}"]:checked`);
                const questionDiv = document.querySelector(`[data-question="${idx}"]`);
                const feedbackDiv = questionDiv.querySelector('.quiz-feedback');
                
                if (selected) {
                    const answer = parseInt(selected.value);
                    if (answer === q.correct) {
                        score++;
                        feedbackDiv.className = 'quiz-feedback mt-2 text-sm text-green-600';
                        feedbackDiv.textContent = '✓ Correct! ' + (q.explanation || '');
                    } else {
                        feedbackDiv.className = 'quiz-feedback mt-2 text-sm text-red-600';
                        feedbackDiv.textContent = '✗ Incorrect. ' + (q.explanation || `The correct answer was: ${q.options[q.correct]}`);
                    }
                    feedbackDiv.classList.remove('hidden');
                } else {
                    feedbackDiv.className = 'quiz-feedback mt-2 text-sm text-yellow-600';
                    feedbackDiv.textContent = '⚠ Please select an answer';
                    feedbackDiv.classList.remove('hidden');
                }
            });

            const resultsDiv = document.getElementById('quiz-results');
            resultsDiv.className = 'mt-4 p-4 rounded-lg text-center font-bold ' + 
                (score === total ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700');
            resultsDiv.textContent = `You scored ${score} out of ${total}!`;
            resultsDiv.classList.remove('hidden');
        });
    }

    /**
     * Update module progress
     */
    async function updateModuleProgress(moduleId, progress) {
        userProgress.inProgress[moduleId] = progress;
        await updateCurrentUserProgress({
            inProgress: userProgress.inProgress,
            lastActive: new Date().toISOString()
        });
    }

    /**
     * Complete module
     */
    async function completeModule(module, path) {
        if (!userProgress.completedModules.includes(module.id)) {
            userProgress.completedModules.push(module.id);
        }
        
        if (userProgress.inProgress[module.id]) {
            delete userProgress.inProgress[module.id];
        }

        // Award badge
        if (module.badge && !userProgress.earnedBadges.includes(module.badge.id)) {
            userProgress.earnedBadges.push(module.badge.id);
            showNotification(`🏆 Badge earned: ${module.badge.name}!`, 'success');
        }

        // Update learning hours
        userProgress.totalLearningHours += Math.ceil(module.duration / 60);

        await updateCurrentUserProgress({
            completedModules: userProgress.completedModules,
            inProgress: userProgress.inProgress,
            earnedBadges: userProgress.earnedBadges,
            totalLearningHours: userProgress.totalLearningHours,
            lastActive: new Date().toISOString()
        });

        showNotification(`🎉 Module completed: ${module.title}!`, 'success');

        // Refresh UI
        renderContinueLearning();
        renderBronzePath();
        renderSilverPath();
        renderGoldPath();
        renderAchievements();
        renderLearningStats();
    }

    // SECTION 6: MICRO-LEARNING FEATURES

    /**
     * Setup audio lessons
     */
    function setupAudioLessons() {
        const audioButtons = document.querySelectorAll('.text-green-600.hover\\:text-green-700.text-sm.font-medium');
        
        audioButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lessonName = btn.textContent.trim().replace('• ', '');
                
                // Create audio player modal
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Audio Lesson</h3>
                            <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
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
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">00:00</span>
                                <span class="text-sm text-gray-600">05:00</span>
                            </div>
                            <div class="w-full bg-gray-300 h-2 rounded-full mt-1">
                                <div class="w-0 bg-green-500 h-2 rounded-full"></div>
                            </div>
                        </div>
                        
                        <div class="flex justify-center space-x-4">
                            <button class="w-12 h-12 bg-gray-200 rounded-full hover:bg-gray-300">
                                <i class="fas fa-backward"></i>
                            </button>
                            <button class="w-12 h-12 bg-green-500 text-white rounded-full hover:bg-green-600">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="w-12 h-12 bg-gray-200 rounded-full hover:bg-gray-300">
                                <i class="fas fa-forward"></i>
                            </button>
                        </div>
                        
                        <p class="text-center text-sm text-gray-500 mt-4">
                            Audio lessons are for demonstration purposes
                        </p>
                    </div>
                `;
                
                document.body.appendChild(modal);
            });
        });
    }

    /**
     * Setup WhatsApp subscribe button (changed to green)
     */
    function setupWhatsAppSubscribe() {
        const subscribeBtn = document.querySelector('.bg-success-500');
        if (subscribeBtn) {
            // Change color from success-500 to green-500
            subscribeBtn.classList.remove('bg-success-500', 'hover:bg-success-600');
            subscribeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            
            subscribeBtn.addEventListener('click', () => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">WhatsApp Tips</h3>
                            <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
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
                                    class="flex-1 border border-gray-300 rounded-r-lg px-4 py-3 focus:outline-none focus:border-green-500"
                                    placeholder="712 345 678">
                            </div>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button class="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition" onclick="this.closest('.fixed').remove()">
                                Cancel
                            </button>
                            <button class="flex-1 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="confirm-whatsapp">
                                Subscribe
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                document.getElementById('confirm-whatsapp').addEventListener('click', () => {
                    const phone = document.getElementById('whatsapp-phone').value;
                    if (phone) {
                        showNotification('Successfully subscribed to WhatsApp tips!', 'success');
                        modal.remove();
                    } else {
                        showNotification('Please enter your phone number', 'error');
                    }
                });
            });
        }
    }

    /**
     * Show all badges modal
     */
    function showAllBadges() {
        const earnedBadges = userProgress.earnedBadges || [];
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Your Badges (${earnedBadges.length})</h3>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${earnedBadges.map(badgeId => {
                        const badge = badges?.[badgeId] || { name: badgeId, description: '', points: 0 };
                        return `
                            <div class="border rounded-lg p-4 text-center">
                                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                                </div>
                                <h4 class="font-bold text-gray-800">${badge.name}</h4>
                                <p class="text-xs text-gray-600 mt-1">${badge.description || 'Achievement unlocked'}</p>
                                <p class="text-xs text-green-600 mt-2">+${badge.points || 0} points</p>
                            </div>
                        `;
                    }).join('')}
                    
                    ${earnedBadges.length === 0 ? `
                        <div class="col-span-3 text-center py-8 text-gray-500">
                            <i class="fas fa-trophy text-4xl mb-2 text-gray-300"></i>
                            <p>No badges earned yet. Complete modules to earn badges!</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Share progress
     */
    function shareProgress() {
        const completed = userProgress.completedModules?.length || 0;
        const total = (courses.bronze?.length || 0) + (courses.silver?.length || 0) + (courses.gold?.length || 0);
        const percent = Math.round((completed / total) * 100);
        
        const shareText = `I've completed ${completed}/${total} (${percent}%) financial literacy modules on PesaSmart! Join me on my journey to financial confidence. 🚀`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My PesaSmart Progress',
                text: shareText,
                url: window.location.origin
            }).catch(() => {
                copyToClipboard(shareText);
            });
        } else {
            copyToClipboard(shareText);
        }
    }

    /**
     * Copy to clipboard
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Progress copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Could not copy to clipboard', 'error');
        });
    }

    // SECTION 7: HELPER FUNCTIONS

    /**
     * Show notification toast
     */
    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        } text-white`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // SECTION 8: INITIALIZATION

    /**
     * Initialize the page
     */
    async function initializePage() {
        // Check authentication
        if (!checkAuthentication()) return;
        
        // Load data
        await loadCoursesFromJSON();
        await loadProgressFromJSON();
        
        // Update navbar (preserves original logo)
        updateNavbarForAuthState();
        
        // Render sections
        renderContinueLearning();
        renderLearningTracks();
        renderAchievements();
        renderLearningStats();
        
        // Setup micro-learning features
        setupAudioLessons();
        setupWhatsAppSubscribe();
        
        // Update hero section progress bar color (ensure it's green)
        const heroProgressBar = document.querySelector('.bg-white.h-3.rounded-full');
        if (heroProgressBar) {
            heroProgressBar.classList.remove('bg-white');
            heroProgressBar.classList.add('bg-green-500');
        }
        
        // Update overall progress in hero
        const totalModules = (courses.bronze?.length || 0) + (courses.silver?.length || 0) + (courses.gold?.length || 0);
        const completedModules = userProgress.completedModules?.length || 0;
        const overallPercent = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
        
        const heroProgressText = document.querySelector('.text-white.font-bold');
        if (heroProgressText) {
            heroProgressText.textContent = overallPercent + '%';
        }
        
        const heroProgressFill = document.querySelector('.bg-white.h-3.rounded-full');
        if (heroProgressFill) {
            heroProgressFill.style.width = overallPercent + '%';
        }
        
        const heroSubtitle = document.querySelector('.text-green-100');
        if (heroSubtitle) {
            heroSubtitle.textContent = `Your Financial Journey • ${completedModules} of ${totalModules} Modules Complete`;
        }
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
        }
        .animate-fade-out {
            animation: fadeOut 0.3s ease-out;
        }
        .module-item {
            transition: all 0.2s;
        }
        .module-item:hover {
            transform: translateX(5px);
        }
    `;
    document.head.appendChild(style);

    // Start when DOM is ready
    document.addEventListener('DOMContentLoaded', initializePage);

})();