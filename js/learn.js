(function () {
    'use strict';

    //==============================================================================
    // CONFIGURATION
    //==============================================================================

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        PROGRESS: 'pesasmart_progress',
        COURSES: 'pesasmart_courses',
        ACHIEVEMENTS: 'pesasmart_achievements'
    };

    //==============================================================================
    // STATE MANAGEMENT
    //==============================================================================

    const AppState = {
        user: null,
        courses: null,
        progress: null,
        badges: null,
        isLoading: false,

        async initialize() {
            this.user = this.getCurrentUser();
            if (!this.user) {
                window.location.href = 'login.html?redirect=learn.html';
                return false;
            }

            await this.loadCourses();
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
                this.courses = { bronze: [], silver: [], gold: [] };
            }
        },

        async loadProgress() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.PROGRESS);
                let progressList = cached ? JSON.parse(cached) : [];

                this.progress = progressList.find(p => p.userId === this.user.userId);

                if (!this.progress) {
                    this.progress = this.createDefaultProgress();
                    progressList.push(this.progress);
                    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList));
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
                longestStreak: 1
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

                localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressList));

                // Notify profile page
                window.dispatchEvent(new CustomEvent('pesasmart-progress-update', {
                    detail: { progress: this.progress }
                }));

                return true;
            } catch (error) {
                console.error('Failed to save progress:', error);
                return false;
            }
        }
    };

    //==============================================================================
    // UI COMPONENTS
    //==============================================================================

    const UI = {
        showLoading() {
            AppState.isLoading = true;
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.classList.remove('hidden');
                return;
            }

            const newLoader = document.createElement('div');
            newLoader.id = 'global-loader';
            newLoader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            newLoader.innerHTML = `
                <div class="bg-white rounded-lg p-6 text-center">
                    <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 mx-auto"></div>
                    <p class="text-gray-700">Loading courses...</p>
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

        showNotification(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-2xl z-50 animate-slide-in ${type === 'success' ? 'bg-green-500' :
                    type === 'error' ? 'bg-red-500' :
                        type === 'warning' ? 'bg-yellow-500' :
                            'bg-blue-500'
                } text-white`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('animate-slide-out');
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        },

        renderContinueLearning() {
            const container = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.mb-8');
            if (!container) return;

            const inProgressModules = Object.keys(AppState.progress.inProgress || {});

            if (inProgressModules.length === 0) {
                const firstModule = AppState.courses.bronze?.[0];
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
                            <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition start-module" data-module-id="${firstModule.id}">
                                Start Now
                            </button>
                        </div>
                    </div>
                `;
            } else {
                const moduleId = inProgressModules[0];
                const moduleProgress = AppState.progress.inProgress[moduleId];

                let currentModule = this.findModuleById(moduleId);
                if (!currentModule) return;

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
                            <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition resume-module" data-module-id="${currentModule.id}">
                                Resume Now
                            </button>
                        </div>
                    </div>
                `;
            }

            container.querySelector('.start-module, .resume-module')?.addEventListener('click', (e) => {
                const moduleId = e.target.dataset.moduleId;
                this.openModule(moduleId);
            });
        },

        findModuleById(moduleId) {
            for (const path of ['bronze', 'silver', 'gold']) {
                const found = AppState.courses[path]?.find(m => m.id === moduleId);
                if (found) return found;
            }
            return null;
        },

        renderLearningTracks() {
            this.renderBronzePath();
            this.renderSilverPath();
            this.renderGoldPath();
        },

        renderBronzePath() {
            const section = document.querySelector('.border-l-4.border-yellow-500');
            if (!section || !AppState.courses.bronze) return;

            const modules = AppState.courses.bronze;
            const completedCount = modules.filter(m => AppState.progress.completedModules.includes(m.id)).length;
            const progressPercent = Math.round((completedCount / modules.length) * 100);

            const progressText = section.querySelector('.text-sm.text-gray-600');
            if (progressText) {
                progressText.innerHTML = `<i class="fas fa-chart-line mr-1"></i> Overall Progress: ${progressPercent}%`;
            }

            const modulesContainer = section.querySelector('.space-y-4');
            if (modulesContainer) {
                modulesContainer.innerHTML = modules.map(module => {
                    let icon = 'far fa-circle text-gray-400';
                    if (AppState.progress.completedModules.includes(module.id)) {
                        icon = 'fas fa-check-circle text-green-500';
                    } else if (AppState.progress.inProgress[module.id]) {
                        icon = 'fas fa-play-circle text-yellow-500';
                    }

                    return `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item" data-module-id="${module.id}">
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

                modulesContainer.querySelectorAll('.module-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.openModule(item.dataset.moduleId);
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
                    lockSection.innerHTML = `
                        <div class="space-y-4">
                            ${AppState.courses.silver.map(module => {
                        let icon = 'far fa-circle text-gray-400';
                        if (AppState.progress.completedModules.includes(module.id)) {
                            icon = 'fas fa-check-circle text-green-500';
                        } else if (AppState.progress.inProgress[module.id]) {
                            icon = 'fas fa-play-circle text-yellow-500';
                        }

                        return `
                                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item" data-module-id="${module.id}">
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
                            this.openModule(item.dataset.moduleId);
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
                    lockSection.innerHTML = `
                        <div class="space-y-4">
                            ${AppState.courses.gold.map(module => {
                        let icon = 'far fa-circle text-gray-400';
                        if (AppState.progress.completedModules.includes(module.id)) {
                            icon = 'fas fa-check-circle text-green-500';
                        } else if (AppState.progress.inProgress[module.id]) {
                            icon = 'fas fa-play-circle text-yellow-500';
                        }

                        return `
                                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition module-item" data-module-id="${module.id}">
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
                            this.openModule(item.dataset.moduleId);
                        });
                    });
                }
            }
        },

        renderAchievements() {
            const container = document.querySelector('#achievements .space-y-4');
            if (!container) return;

            const earnedBadges = AppState.progress.earnedBadges || [];

            if (earnedBadges.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        <i class="fas fa-trophy text-4xl mb-2 text-gray-300"></i>
                        <p>Complete modules to earn badges!</p>
                    </div>
                `;
            } else {
                const recentBadges = earnedBadges.slice(0, 3);
                container.innerHTML = recentBadges.map(badgeId => {
                    const badge = AppState.badges?.[badgeId] || { name: badgeId, description: '' };
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

            const viewAllBtn = container.nextElementSibling?.querySelector('button');
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', this.showAllBadges.bind(this));
            }
        },

        renderLearningStats() {
            const statsContainer = document.querySelector('.bg-gradient-to-br.from-green-500.to-green-600');
            if (!statsContainer) return;

            const totalHours = AppState.progress.totalLearningHours || 0;
            const completedCount = AppState.progress.completedModules?.length || 0;
            const totalModules = 8;
            const streak = AppState.progress.currentStreak || 0;

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
                
                <div id="learning-progress-chart" class="w-full h-48 mt-4"></div>

                <div class="mt-6 text-center">
                    <button class="bg-white text-green-600 hover:bg-gray-100 px-6 py-2 rounded-lg font-semibold transition" id="share-progress">
                        Share Progress
                    </button>
                </div>
            `;

            document.getElementById('share-progress')?.addEventListener('click', this.shareProgress.bind(this));
        },

        shareProgress() {
            const completed = AppState.progress.completedModules?.length || 0;
            const total = 8;
            const percent = Math.round((completed / total) * 100);

            const text = `I've completed ${completed}/${total} (${percent}%) financial literacy modules on PesaSmart! 🚀`;

            if (navigator.share) {
                navigator.share({ title: 'My Learning Progress', text }).catch(() => {
                    navigator.clipboard.writeText(text);
                    this.showNotification('Progress copied to clipboard!', 'success');
                });
            } else {
                navigator.clipboard.writeText(text);
                this.showNotification('Progress copied to clipboard!', 'success');
            }
        },

        showAllBadges() {
            const earnedBadges = AppState.progress.earnedBadges || [];

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
                const badge = AppState.badges?.[badgeId] || { name: badgeId, description: '', points: 0 };
                return `
                                <div class="border rounded-lg p-4 text-center">
                                    <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
                                    </div>
                                    <h4 class="font-bold text-gray-800">${badge.name}</h4>
                                    <p class="text-xs text-gray-600 mt-1">${badge.description || ''}</p>
                                    <p class="text-xs text-green-600 mt-2">+${badge.points || 0} points</p>
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

        async openModule(moduleId) {
            let currentModule = this.findModuleById(moduleId);
            if (!currentModule) return;

            let moduleProgress = AppState.progress.inProgress[moduleId] || {
                startedAt: new Date().toISOString(),
                progress: 0,
                lastPosition: 0,
                timeSpent: 0
            };

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            const currentContent = currentModule.content[moduleProgress.lastPosition] || currentModule.content[0];

            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                        <h2 class="text-2xl font-bold">${currentModule.title}</h2>
                        <button class="text-gray-500 hover:text-gray-700" id="close-module">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <div class="p-6">
                        <div class="mb-6">
                            <div class="flex justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span>${moduleProgress.progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-green-500 h-2 rounded-full module-progress" style="width: ${moduleProgress.progress}%"></div>
                            </div>
                        </div>
                        
                        <div id="module-content" class="mb-6">
                            ${this.renderContent(currentContent)}
                        </div>
                        
                        <div class="flex justify-between mt-8">
                            <button class="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition ${moduleProgress.lastPosition === 0 ? 'opacity-50 cursor-not-allowed' : ''}" 
                                    id="prev-section" ${moduleProgress.lastPosition === 0 ? 'disabled' : ''}>
                                Previous
                            </button>
                            <span class="text-gray-600">${moduleProgress.lastPosition + 1} / ${currentModule.content.length}</span>
                            <button class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="next-section">
                                Next
                            </button>
                        </div>
                        
                        <div class="mt-6 text-center">
                            <button class="text-green-600 hover:text-green-700 font-medium" id="mark-complete">
                                Mark as Complete
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('close-module').addEventListener('click', () => {
                this.saveModuleProgress(moduleId, moduleProgress);
                modal.remove();
            });

            const prevBtn = document.getElementById('prev-section');
            const nextBtn = document.getElementById('next-section');

            if (prevBtn && moduleProgress.lastPosition > 0) {
                prevBtn.addEventListener('click', () => {
                    moduleProgress.lastPosition--;
                    moduleProgress.timeSpent += 2;
                    this.updateModuleContent(currentModule, moduleProgress);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (moduleProgress.lastPosition < currentModule.content.length - 1) {
                        moduleProgress.lastPosition++;
                        moduleProgress.timeSpent += 2;
                        this.updateModuleContent(currentModule, moduleProgress);
                    }
                });
            }

            document.getElementById('mark-complete').addEventListener('click', () => {
                this.completeModule(currentModule);
                modal.remove();
            });
        },

        renderContent(content) {
            switch (content.type) {
                case 'video':
                    return `
                        <div class="aspect-w-16 aspect-h-9 mb-4">
                            <iframe class="w-full h-64 rounded-lg" 
                                    src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                                    frameborder="0" allowfullscreen>
                            </iframe>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${content.title}</h3>
                    `;
                case 'text':
                    return `
                        <h3 class="text-xl font-bold mb-4">${content.title}</h3>
                        <div class="prose max-w-none text-gray-700">
                            ${content.content || 'Content coming soon...'}
                        </div>
                    `;
                case 'quiz':
                    return this.renderQuiz(content.questions);
                default:
                    return `<p class="text-gray-600">Content type: ${content.type}</p>`;
            }
        },

        renderQuiz(questions) {
            if (!questions?.length) return '<p>No questions</p>';

            return `
                <div class="quiz-container">
                    <h3 class="text-xl font-bold mb-4">Quick Check</h3>
                    ${questions.map((q, idx) => `
                        <div class="mb-6 p-4 bg-gray-50 rounded-lg" data-question="${idx}">
                            <p class="font-medium mb-3">${idx + 1}. ${q.question}</p>
                            <div class="space-y-2">
                                ${q.options.map((opt, optIdx) => `
                                    <label class="flex items-center p-2 border rounded hover:bg-gray-100">
                                        <input type="radio" name="q${idx}" value="${optIdx}" class="mr-3">
                                        <span>${opt}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                    <button class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 mt-4" id="submit-quiz">
                        Check Answers
                    </button>
                </div>
            `;
        },

        updateModuleContent(module, progress) {
            const content = module.content[progress.lastPosition];
            document.getElementById('module-content').innerHTML = this.renderContent(content);

            progress.progress = Math.round((progress.lastPosition / module.content.length) * 100);
            document.querySelector('.module-progress').style.width = progress.progress + '%';

            document.querySelector('.flex.justify-between.mt-8 span').textContent =
                `${progress.lastPosition + 1} / ${module.content.length}`;

            if (content.type === 'quiz') {
                this.setupQuizHandlers(content.questions);
            }
        },

        setupQuizHandlers(questions) {
            const submitBtn = document.getElementById('submit-quiz');
            if (!submitBtn) return;

            submitBtn.addEventListener('click', () => {
                let score = 0;
                questions.forEach((q, idx) => {
                    const selected = document.querySelector(`input[name="q${idx}"]:checked`);
                    const feedback = document.querySelector(`[data-question="${idx}"] .quiz-feedback`);

                    if (selected && parseInt(selected.value) === q.correct) {
                        score++;
                    }
                });

                this.showNotification(`You scored ${score}/${questions.length}!`, 'info');
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
                this.showNotification(`🏆 Badge earned: ${module.badge.name}!`, 'success');
            }

            AppState.progress.totalLearningHours += Math.ceil(module.duration / 60);
            await AppState.saveProgress();

            this.showNotification(`🎉 Module completed: ${module.title}!`, 'success');
            this.renderContinueLearning();
            this.renderBronzePath();
            this.renderSilverPath();
            this.renderGoldPath();
            this.renderAchievements();
            this.renderLearningStats();
        }
    };

    //==============================================================================
    // INITIALIZATION
    //==============================================================================

    async function initialize() {
        UI.showLoading();

        const success = await AppState.initialize();
        if (!success) {
            UI.hideLoading();
            return;
        }

        UI.renderContinueLearning();
        UI.renderLearningTracks();
        UI.renderAchievements();
        UI.renderLearningStats();

        UI.hideLoading();
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        @keyframes slideOut {
            from { transform: translateX(0); }
            to { transform: translateX(100%); }
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