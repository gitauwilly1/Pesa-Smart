/**
 * PESASMART - HOME/DASHBOARD PAGE
 * ================================
 * This file adds functionality to index.html
 * Loads data from JSON files and updates the UI
 */

// Immediately Invoked Function Expression to avoid global scope pollution
(function() {
    'use strict';

    /**
     * SECTION 1: DATA LOADING
     * Load JSON files using fetch
     */
    async function loadData() {
        try {
            // Load all JSON files in parallel
            const [usersData, transactionsData, goalsData, productsData] = await Promise.all([
                fetch('data/users.json').then(res => res.json()),
                fetch('data/transactions.json').then(res => res.json()),
                fetch('data/goals.json').then(res => res.json()),
                fetch('data/products.json').then(res => res.json())
            ]);

            return {
                users: usersData.users || [],
                transactions: transactionsData.transactions || [],
                goals: goalsData.goals || [],
                products: productsData.products || []
            };
        } catch (error) {
            console.error('Failed to load data:', error);
            showErrorMessage('Unable to load dashboard data. Please refresh the page.');
            return null;
        }
    }

    /**
     * SECTION 2: USER IDENTIFICATION
     * Get current user from session storage
     */
    function getCurrentUser() {
        // Check if user is logged in (from session storage)
        const sessionData = sessionStorage.getItem('pesasmart_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                return session.userId;
            } catch (e) {
                return null;
            }
        }
        
        // For demo purposes, use a default user (Ann Muthoni)
        // In production, this would come from login
        return 'USR001';
    }

    /**
     * SECTION 3: PROCESS DATA FOR DISPLAY
     * Filter and calculate user-specific data
     */
    function processUserData(userId, data) {
        if (!data) return null;

        // Filter transactions for this user
        const userTransactions = data.transactions.filter(t => t.userId === userId);
        
        // Filter goals for this user
        const userGoals = data.goals.filter(g => g.userId === userId);
        
        // Find user profile
        const user = data.users.find(u => u.id === userId);

        // Calculate totals
        const totalInvested = userTransactions
            .filter(t => t.type === 'investment')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalSaved = userGoals
            .reduce((sum, g) => sum + (g.savedAmount || 0), 0);

        // Get recent transactions (last 5)
        const recentTransactions = [...userTransactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        return {
            user,
            transactions: userTransactions,
            goals: userGoals,
            stats: {
                financialScore: user?.financialScore || 0,
                totalInvested,
                totalSaved,
                goalCount: userGoals.length
            },
            recentTransactions
        };
    }

    /**
     * SECTION 4: UPDATE UI ELEMENTS
     * Update all dashboard elements with processed data
     */
    function updateDashboard(processedData) {
        if (!processedData) return;

        // Update stats cards
        updateStatsCards(processedData.stats);
        
        // Update goals section
        updateGoalsSection(processedData.goals);
        
        // Update activity feed
        updateActivityFeed(processedData.recentTransactions);
        
        // Update user greeting
        updateUserGreeting(processedData.user);
        
        // Setup quick action buttons
        setupQuickActions();
    }

    /**
     * Update the statistics cards
     */
    function updateStatsCards(stats) {
        // Financial Score
        const scoreEl = document.getElementById('financial-score');
        if (scoreEl) {
            scoreEl.textContent = `${stats.financialScore}/5`;
            
            // Update star rating if it exists
            const stars = document.querySelectorAll('.fa-star');
            if (stars.length) {
                const fullStars = Math.floor(stats.financialScore);
                const hasHalf = stats.financialScore % 1 >= 0.5;
                
                stars.forEach((star, index) => {
                    if (index < fullStars) {
                        star.classList.remove('far');
                        star.classList.add('fas');
                    } else if (index === fullStars && hasHalf) {
                        star.classList.remove('far', 'fas');
                        star.classList.add('fas', 'fa-star-half-alt');
                    } else {
                        star.classList.remove('fas');
                        star.classList.add('far');
                    }
                });
            }
        }

        // Invested Amount
        const investedEl = document.getElementById('invested-amount');
        if (investedEl) {
            investedEl.textContent = formatCurrency(stats.totalInvested);
            
            // Update trend if it exists
            const trendEl = investedEl.nextElementSibling;
            if (trendEl && trendEl.classList.contains('text-success')) {
                trendEl.textContent = `+${calculateTrend(stats.totalInvested)}%`;
            }
        }

        // Saved Amount
        const savedEl = document.getElementById('saved-amount');
        if (savedEl) {
            savedEl.textContent = formatCurrency(stats.totalSaved);
        }

        // Goals Count
        const goalsCountEl = document.getElementById('goals-count');
        if (goalsCountEl) {
            goalsCountEl.textContent = stats.goalCount;
        }
    }

    /**
     * Update the goals section with progress bars
     */
    function updateGoalsSection(goals) {
        const container = document.getElementById('goals-container');
        if (!container) return;

        if (!goals || goals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-bullseye text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No goals yet</p>
                    <button class="text-primary-600 mt-2" id="create-goal-btn">Create your first goal</button>
                </div>
            `;
            
            document.getElementById('create-goal-btn')?.addEventListener('click', () => {
                window.location.href = 'profile.html#goals';
            });
            return;
        }

        // Display up to 2 goals (as per design)
        const displayGoals = goals.slice(0, 2);
        
        container.innerHTML = displayGoals.map(goal => {
            const percentage = (goal.savedAmount / goal.targetAmount) * 100;
            const daysRemaining = calculateDaysRemaining(goal.deadline);
            
            return `
                <div class="bg-white rounded-xl p-6 shadow-lg hover-card mb-4" data-goal-id="${goal.id}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas ${getGoalIcon(goal.category)} text-primary-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-lg">${goal.name}</h3>
                                <p class="text-gray-600">Target: ${formatDate(goal.deadline)}</p>
                            </div>
                        </div>
                        <span class="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                            ${Math.round(percentage)}%
                        </span>
                    </div>
                    
                    <div class="mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600">${formatCurrency(goal.savedAmount)} saved</span>
                            <span class="font-semibold">${formatCurrency(goal.targetAmount)} target</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-primary-500 h-3 rounded-full progress-bar" style="width: ${percentage}%"></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-clock mr-1"></i> ${daysRemaining} days remaining
                        </div>
                        <button class="text-primary-600 hover:text-primary-700 font-medium view-goal" data-goal-id="${goal.id}">
                            View Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add "View All" link if there are more goals
        if (goals.length > 2) {
            container.innerHTML += `
                <div class="text-center mt-4">
                    <a href="profile.html#goals" class="text-primary-600 hover:text-primary-700 font-medium">
                        View all ${goals.length} goals →
                    </a>
                </div>
            `;
        }

        // Add click handlers for view details buttons
        document.querySelectorAll('.view-goal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const goalId = btn.dataset.goalId;
                showGoalDetails(goalId, goals);
            });
        });
    }

    /**
     * Update the activity feed
     */
    function updateActivityFeed(transactions) {
        const container = document.getElementById('activity-feed');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No recent activity</p>';
            return;
        }

        container.innerHTML = transactions.map(t => {
            let icon = 'fa-exchange-alt';
            let bgColor = 'bg-gray-100';
            let textColor = 'text-gray-600';
            
            switch(t.type) {
                case 'investment':
                    icon = 'fa-chart-line';
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-600';
                    break;
                case 'dividend':
                    icon = 'fa-hand-holding-usd';
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-600';
                    break;
                case 'insurance':
                    icon = 'fa-shield-alt';
                    bgColor = 'bg-purple-100';
                    textColor = 'text-purple-600';
                    break;
                case 'savings':
                    icon = 'fa-piggy-bank';
                    bgColor = 'bg-yellow-100';
                    textColor = 'text-yellow-600';
                    break;
            }

            return `
                <div class="flex items-center p-3 bg-gray-50 rounded-lg mb-2">
                    <div class="w-10 h-10 ${bgColor} rounded-full flex items-center justify-center mr-3">
                        <i class="fas ${icon} ${textColor}"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium text-gray-800">${getTransactionDescription(t)}</p>
                        <p class="text-gray-600 text-sm">${formatDate(t.date, 'time')}</p>
                    </div>
                    <span class="text-gray-600 font-medium">${formatCurrency(t.amount)}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Update user greeting
     */
    function updateUserGreeting(user) {
        const greetingEl = document.querySelector('.welcome-message, [class*="welcome"]');
        if (greetingEl && user) {
            greetingEl.textContent = `Welcome back, ${user.firstName}!`;
        }

        const userNameEl = document.getElementById('user-name');
        if (userNameEl && user) {
            userNameEl.textContent = `${user.firstName} ${user.lastName}`;
        }
    }

    /**
     * Setup quick action buttons
     */
    function setupQuickActions() {
        // Quick Invest button
        document.getElementById('quick-invest')?.addEventListener('click', () => {
            window.location.href = 'act.html';
        });

        // Quick Learn button
        document.getElementById('quick-learn')?.addEventListener('click', () => {
            window.location.href = 'learn.html';
        });

        // Quick Practice button
        document.getElementById('quick-practice')?.addEventListener('click', () => {
            window.location.href = 'practice.html';
        });

        // Create Goal button (if exists)
        document.getElementById('create-goal')?.addEventListener('click', () => {
            window.location.href = 'profile.html#goals';
        });
    }

    /**
     * SECTION 5: HELPER FUNCTIONS
     * Utility functions for formatting and calculations
     */

    function formatCurrency(amount) {
        return 'Ksh ' + amount.toLocaleString('en-KE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    function formatDate(dateString, format = 'short') {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';

        if (format === 'time') {
            return date.toLocaleDateString('en-KE', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return date.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function calculateDaysRemaining(deadline) {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }

    function calculateTrend(value) {
        // Simple trend calculation (mock)
        return (value * 0.12).toFixed(1);
    }

    function getGoalIcon(category) {
        const icons = {
            investment: 'fa-home',
            education: 'fa-graduation-cap',
            business: 'fa-store',
            savings: 'fa-piggy-bank',
            emergency: 'fa-ambulance'
        };
        return icons[category] || 'fa-bullseye';
    }

    function getTransactionDescription(transaction) {
        if (transaction.notes) return transaction.notes;
        
        switch(transaction.type) {
            case 'investment':
                return `Invested in ${transaction.productName || 'product'}`;
            case 'dividend':
                return `Dividend from ${transaction.productName || 'investment'}`;
            case 'insurance':
                return `Insurance premium payment`;
            case 'savings':
                return `Added to ${transaction.goalName || 'savings'}`;
            default:
                return transaction.type || 'Transaction';
        }
    }

    function showGoalDetails(goalId, goals) {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        // Create a modal or redirect to profile page
        window.location.href = `profile.html#goal-${goalId}`;
    }

    function showErrorMessage(message) {
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
            errorDiv.role = 'alert';
            errorDiv.innerHTML = `
                <strong class="font-bold">Error!</strong>
                <span class="block sm:inline"> ${message}</span>
            `;
            container.prepend(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    /**
     * SECTION 6: INITIALIZATION
     * Main function to initialize the page
     */
    async function initDashboard() {
        console.log('Initializing dashboard...');

        // Show loading state
        showLoading();

        // Load data
        const data = await loadData();
        
        // Get current user
        const userId = getCurrentUser();
        
        // Process data for this user
        const processedData = processUserData(userId, data);
        
        // Update the UI
        updateDashboard(processedData);

        // Hide loading state
        hideLoading();
    }

    function showLoading() {
        // Add loading overlay or spinners if needed
        const containers = ['#goals-container', '#activity-feed'];
        containers.forEach(selector => {
            const el = document.querySelector(selector);
            if (el && el.children.length === 0) {
                el.innerHTML = '<div class="text-center py-8"><div class="loader"></div><p class="mt-2">Loading...</p></div>';
            }
        });
    }

    function hideLoading() {
        // Remove loading indicators
        // Content already populated by update functions
    }

    /**
     * Start the dashboard when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', initDashboard);

})();