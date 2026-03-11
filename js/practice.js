(function () {
    'use strict';

    //==============================================================================
    // CONFIGURATION
    //==============================================================================

    const APP_VERSION = '2.0.0';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const PRICE_UPDATE_INTERVAL = 10000; // 10 seconds

    const STORAGE_KEYS = {
        SESSION: 'pesasmart_session',
        USERS: 'pesasmart_users',
        TRANSACTIONS: 'pesasmart_transactions',
        PROGRESS: 'pesasmart_progress',
        MARKET: 'pesasmart_market',
        PORTFOLIO_PREFIX: 'portfolio_',
        LEADERBOARD: 'pesasmart_leaderboard'
    };

    //==============================================================================
    // STATE MANAGEMENT
    //==============================================================================

    const AppState = {
        user: null,
        profile: null,
        marketData: null,
        portfolio: null,
        transactions: [],
        leaderboard: [],
        priceUpdateInterval: null,
        isLoading: false,

        async initialize() {
            this.user = this.getCurrentUser();
            if (!this.user) {
                window.location.href = 'login.html?redirect=practice.html';
                return false;
            }

            await this.loadMarketData();
            await this.loadPortfolio();
            await this.loadTransactions();
            await this.loadLeaderboard();
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

        async loadMarketData() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.MARKET);
                if (cached) {
                    const data = JSON.parse(cached);
                    if (data._timestamp && Date.now() - data._timestamp < CACHE_TTL) {
                        this.marketData = data;
                        return;
                    }
                }

                const response = await fetch('data/market.json');
                const data = await response.json();
                data._timestamp = Date.now();

                localStorage.setItem(STORAGE_KEYS.MARKET, JSON.stringify(data));
                this.marketData = data;
            } catch (error) {
                console.error('Failed to load market data:', error);
                this.marketData = this.getDefaultMarketData();
            }
        },

        getDefaultMarketData() {
            return {
                stocks: [
                    { symbol: "SCOM", name: "Safaricom PLC", price: 14.50, change: 0.35, changePercent: 2.47, volume: 2540000, sector: "Telecom" },
                    { symbol: "EQTY", name: "Equity Bank", price: 38.20, change: -0.42, changePercent: -1.09, volume: 1820000, sector: "Banking" },
                    { symbol: "KCB", name: "KCB Group", price: 42.50, change: 0.28, changePercent: 0.66, volume: 1250000, sector: "Banking" },
                    { symbol: "EABL", name: "EABL", price: 145.00, change: 2.30, changePercent: 1.61, volume: 820000, sector: "Manufacturing" }
                ],
                indices: [
                    { name: "NSE 20 Share Index", value: 1824.56, change: 12.34, changePercent: 0.68 }
                ],
                _timestamp: Date.now()
            };
        },

        async loadPortfolio() {
            const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO_PREFIX + this.user.userId);

            if (saved) {
                this.portfolio = JSON.parse(saved);
            } else {
                this.portfolio = this.createDefaultPortfolio();
                await this.savePortfolio();
            }
        },

        createDefaultPortfolio() {
            const portfolio = {
                cash: 1000000,
                holdings: {},
                transactions: [],
                history: [],
                lastUpdated: new Date().toISOString()
            };

            // Add sample holdings for demo
            if (this.marketData?.stocks) {
                portfolio.holdings["SCOM"] = {
                    shares: 40,
                    avgPrice: 14.20,
                    currentPrice: 14.50
                };
                portfolio.holdings["EQTY"] = {
                    shares: 25,
                    avgPrice: 38.50,
                    currentPrice: 38.20
                };
                portfolio.holdings["KCB"] = {
                    shares: 15,
                    avgPrice: 42.00,
                    currentPrice: 42.50
                };

                // Add sample transactions
                portfolio.transactions.push(
                    {
                        id: 'TXN' + Date.now() - 86400000,
                        date: new Date(Date.now() - 86400000).toISOString(),
                        symbol: "SCOM",
                        action: "buy",
                        shares: 40,
                        price: 14.20,
                        total: 568
                    },
                    {
                        id: 'TXN' + Date.now() - 172800000,
                        date: new Date(Date.now() - 172800000).toISOString(),
                        symbol: "EQTY",
                        action: "buy",
                        shares: 25,
                        price: 38.50,
                        total: 962.50
                    }
                );

                // Generate history
                for (let i = 29; i >= 0; i--) {
                    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    const randomChange = (Math.random() * 0.1 - 0.02) * 1000000;
                    portfolio.history.push({
                        date,
                        value: 1000000 + randomChange
                    });
                }
            }

            return portfolio;
        },

        async savePortfolio() {
            this.portfolio.lastUpdated = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.PORTFOLIO_PREFIX + this.user.userId, JSON.stringify(this.portfolio));

            // Update leaderboard
            await this.updateLeaderboard();

            // Notify profile page
            window.dispatchEvent(new CustomEvent('pesasmart-portfolio-update', {
                detail: { portfolio: this.portfolio }
            }));
        },

        async loadTransactions() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                if (cached) {
                    const data = JSON.parse(cached);
                    this.transactions = data.transactions?.filter(t => t.userId === this.user.userId) || [];
                }
            } catch (error) {
                console.error('Failed to load transactions:', error);
                this.transactions = [];
            }
        },

        async loadLeaderboard() {
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
                if (cached) {
                    this.leaderboard = JSON.parse(cached);
                } else {
                    this.leaderboard = this.generateDummyLeaderboard();
                    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(this.leaderboard));
                }
            } catch (error) {
                console.error('Failed to load leaderboard:', error);
                this.leaderboard = this.generateDummyLeaderboard();
            }
        },

        generateDummyLeaderboard() {
            return [
                { name: "Jane K.", return: 23.4, portfolio: 1234000, rank: 1 },
                { name: "Peter M.", return: 18.7, portfolio: 1187000, rank: 2 },
                { name: "Sarah W.", return: 15.2, portfolio: 1152000, rank: 3 },
                { name: "John D.", return: 12.8, portfolio: 1128000, rank: 4 },
                { name: "Mary A.", return: 10.5, portfolio: 1105000, rank: 5 },
                { name: "James K.", return: 8.9, portfolio: 1089000, rank: 6 },
                { name: "Lucy M.", return: 7.3, portfolio: 1073000, rank: 7 },
                { name: "David O.", return: 6.1, portfolio: 1061000, rank: 8 },
                { name: "Grace N.", return: 4.8, portfolio: 1048000, rank: 9 },
                { name: "Joseph R.", return: 3.2, portfolio: 1032000, rank: 10 }
            ];
        },

        async updateLeaderboard() {
            const portfolioValue = this.calculatePortfolioValue();
            const userReturn = ((portfolioValue - 1000000) / 1000000) * 100;

            // Update or add user to leaderboard
            const userIndex = this.leaderboard.findIndex(e => e.name === this.user.name);
            const userEntry = {
                name: this.user.name || 'You',
                return: userReturn,
                portfolio: portfolioValue
            };

            if (userIndex >= 0) {
                this.leaderboard[userIndex] = { ...this.leaderboard[userIndex], ...userEntry };
            } else {
                this.leaderboard.push(userEntry);
            }

            // Sort and re-rank
            this.leaderboard.sort((a, b) => b.portfolio - a.portfolio);
            this.leaderboard = this.leaderboard.slice(0, 10).map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));

            localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(this.leaderboard));
        },

        calculatePortfolioValue() {
            if (!this.portfolio || !this.marketData) return 1000000;

            let holdingsValue = 0;
            Object.entries(this.portfolio.holdings || {}).forEach(([symbol, holding]) => {
                const stock = this.marketData.stocks.find(s => s.symbol === symbol);
                if (stock) {
                    holdingsValue += holding.shares * stock.price;
                }
            });

            return this.portfolio.cash + holdingsValue;
        },

        calculateMonthlyPerformance() {
            const currentValue = this.calculatePortfolioValue();
            const oneMonthAgo = this.portfolio.history?.[0]?.value || 1000000;
            return ((currentValue - oneMonthAgo) / oneMonthAgo) * 100;
        },

        startPriceSimulation() {
            if (this.priceUpdateInterval) {
                clearInterval(this.priceUpdateInterval);
            }

            this.priceUpdateInterval = setInterval(() => {
                this.simulatePriceUpdate();
            }, PRICE_UPDATE_INTERVAL);
        },

        simulatePriceUpdate() {
            if (!this.marketData?.stocks) return;

            this.marketData.stocks.forEach(stock => {
                const changePercent = (Math.random() * 4 - 2) / 100;
                const oldPrice = stock.price;
                stock.price = Math.max(0.01, oldPrice * (1 + changePercent));
                stock.change = stock.price - oldPrice;
                stock.changePercent = (stock.change / oldPrice) * 100;
            });

            if (this.marketData.indices) {
                this.marketData.indices.forEach(index => {
                    const changePercent = (Math.random() * 1 - 0.5) / 100;
                    index.value *= (1 + changePercent);
                    index.change = index.value * changePercent;
                    index.changePercent = changePercent * 100;
                });
            }

            this.marketData._timestamp = Date.now();
            localStorage.setItem(STORAGE_KEYS.MARKET, JSON.stringify(this.marketData));

            UI.updateMarketData();
            UI.updatePortfolioDisplay();
        },

        stopPriceSimulation() {
            if (this.priceUpdateInterval) {
                clearInterval(this.priceUpdateInterval);
                this.priceUpdateInterval = null;
            }
        }
    };

    //==============================================================================
    // UI COMPONENTS
    //==============================================================================

    const UI = {
        showLoading(message = 'Loading practice zone...') {
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
                    <a href="practice.html" class="block py-2 text-green-600 font-medium">
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

            document.getElementById('mobile-logout')?.addEventListener('click', () => this.handleLogout());
        },

        getNotificationCount() {
            let count = 0;
            if (AppState.portfolio?.transactions?.length > 10) count++;
            if (AppState.calculateMonthlyPerformance() > 10) count++;
            return Math.min(count, 9);
        },

        showNotifications() {
            const notifications = [
                {
                    title: 'Portfolio Update',
                    message: `Your portfolio is up ${AppState.calculateMonthlyPerformance().toFixed(1)}% this month`,
                    type: 'success',
                    icon: 'fa-chart-line',
                    time: 'Now'
                }
            ];

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Notifications</h3>
                        <button class="text-gray-500 hover:text-gray-700" id="close-notifications">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        ${notifications.map(n => `
                            <div class="p-4 bg-green-50 rounded-lg">
                                <div class="flex items-start">
                                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                        <i class="fas ${n.icon} text-green-600"></i>
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
            document.getElementById('close-notifications').addEventListener('click', () => modal.remove());
        },

        async handleLogout() {
            const confirmed = await this.confirmAction({
                title: 'Log Out',
                message: 'Are you sure you want to log out? Your portfolio will be saved.',
                confirmText: 'Log Out',
                type: 'warning'
            });

            if (!confirmed) return;

            this.showLoading('Logging out...');

            try {
                AppState.stopPriceSimulation();
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

        updateHeader() {
            const balanceEl = document.querySelector('.bg-white.bg-opacity-20 .text-white.font-bold');
            if (balanceEl) {
                balanceEl.textContent = this.formatCurrency(AppState.calculatePortfolioValue());
            }

            const performanceEl = document.querySelector('.text-green-600.font-bold');
            if (performanceEl) {
                const perf = AppState.calculateMonthlyPerformance();
                performanceEl.textContent = (perf >= 0 ? '+' : '') + perf.toFixed(1) + '% this month';
                performanceEl.className = perf >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
            }

            const totalValueEl = document.querySelector('.text-right .text-xl.font-bold');
            if (totalValueEl) {
                totalValueEl.textContent = this.formatCurrency(AppState.calculatePortfolioValue());
            }
        },

        updatePortfolioDisplay() {
            this.updateHeader();
            this.renderHoldings();
            this.renderMarketData();
            this.updateCharts();
        },

        renderHoldings() {
            const container = document.querySelector('.space-y-3.mb-6');
            if (!container) return;

            const holdings = AppState.portfolio?.holdings || {};

            if (Object.keys(holdings).length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-chart-line text-4xl mb-2 text-gray-300"></i>
                        <p>No holdings yet. Start trading!</p>
                    </div>
                `;
                return;
            }

            let totalValue = 0;
            Object.values(holdings).forEach(h => {
                totalValue += h.shares * (h.currentPrice || 0);
            });

            container.innerHTML = Object.entries(holdings).map(([symbol, holding]) => {
                const stock = AppState.marketData?.stocks.find(s => s.symbol === symbol);
                if (!stock) return '';

                const value = holding.shares * stock.price;
                const percentOfPortfolio = (value / (AppState.portfolio.cash + totalValue)) * 100;

                return `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:shadow-md transition cursor-pointer holding-item" data-symbol="${symbol}">
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${this.getSectorColor(stock.sector)} rounded-lg flex items-center justify-center mr-3">
                                <span class="font-bold text-white">${symbol}</span>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">${stock.name}</h4>
                                <p class="text-gray-600 text-sm">
                                    Ksh ${stock.price.toFixed(2)} • 
                                    <span class="${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        ${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-gray-800">${holding.shares} shares</p>
                            <p class="text-gray-600 text-sm">${percentOfPortfolio.toFixed(1)}% of portfolio</p>
                        </div>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.holding-item').forEach(item => {
                item.addEventListener('click', () => {
                    const symbol = item.dataset.symbol;
                    const stock = AppState.marketData?.stocks.find(s => s.symbol === symbol);
                    if (stock) this.openTradeModal(stock, 'sell');
                });
            });
        },

        getSectorColor(sector) {
            const colors = {
                'Telecom': 'bg-blue-500',
                'Banking': 'bg-green-500',
                'Manufacturing': 'bg-orange-500',
                'Energy': 'bg-yellow-500'
            };
            return colors[sector] || 'bg-gray-500';
        },

        renderMarketData() {
            let tableContainer = document.getElementById('market-data-table');
            if (!tableContainer) {
                const stockSimulator = document.querySelector('.lg\\:col-span-2 > .bg-white');
                if (stockSimulator) {
                    tableContainer = document.createElement('div');
                    tableContainer.id = 'market-data-table';
                    tableContainer.className = 'mt-6';
                    stockSimulator.appendChild(tableContainer);
                } else {
                    return;
                }
            }

            if (!AppState.marketData?.stocks) {
                tableContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Market data unavailable</p>';
                return;
            }

            tableContainer.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Market Watch</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="text-left bg-gray-50">
                                <th class="py-3 px-4">Symbol</th>
                                <th class="py-3 px-4">Company</th>
                                <th class="py-3 px-4">Price</th>
                                <th class="py-3 px-4">Change</th>
                                <th class="py-3 px-4">Volume</th>
                                <th class="py-3 px-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AppState.marketData.stocks.map(stock => `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="py-3 px-4 font-medium">${stock.symbol}</td>
                                    <td class="py-3 px-4">${stock.name}</td>
                                    <td class="py-3 px-4 font-medium">Ksh ${stock.price.toFixed(2)}</td>
                                    <td class="py-3 px-4 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}">
                                        <i class="fas ${stock.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1"></i>
                                        ${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                                    </td>
                                    <td class="py-3 px-4">${(stock.volume / 1000000).toFixed(1)}M</td>
                                    <td class="py-3 px-4">
                                        <button class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm buy-btn" data-symbol="${stock.symbol}">Buy</button>
                                        <button class="border border-green-500 text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm ml-2 sell-btn" data-symbol="${stock.symbol}">Sell</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            document.querySelectorAll('.buy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const symbol = btn.dataset.symbol;
                    const stock = AppState.marketData.stocks.find(s => s.symbol === symbol);
                    if (stock) this.openTradeModal(stock, 'buy');
                });
            });

            document.querySelectorAll('.sell-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const symbol = btn.dataset.symbol;
                    const stock = AppState.marketData.stocks.find(s => s.symbol === symbol);
                    if (stock) this.openTradeModal(stock, 'sell');
                });
            });
        },

        openTradeModal(stock, action) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            const currentPrice = stock.price;
            const availableCash = AppState.portfolio.cash;
            const availableShares = AppState.portfolio.holdings[stock.symbol]?.shares || 0;

            modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-md w-full mx-4 p-6 animate-fade-in">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">${action === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}</h3>
                            <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="mb-4">
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-600">Company:</span>
                                <span class="font-medium">${stock.name}</span>
                            </div>
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-600">Current Price:</span>
                                <span class="font-medium text-green-600">Ksh ${currentPrice.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between text-sm mb-4">
                                <span class="text-gray-600">Available Cash:</span>
                                <span class="font-medium">${this.formatCurrency(availableCash)}</span>
                            </div>
                            ${action === 'sell' ? `
                                <div class="flex justify-between text-sm mb-4">
                                    <span class="text-gray-600">Available Shares:</span>
                                    <span class="font-medium">${availableShares}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 font-medium mb-2">Number of Shares</label>
                            <input type="number" id="share-quantity" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" 
                                   min="1" ${action === 'sell' ? `max="${availableShares}"` : ''} value="1">
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-4 mb-6">
                            <div class="flex justify-between mb-2">
                                <span>Total ${action === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                                <span class="font-bold text-lg" id="total-amount">${this.formatCurrency(currentPrice)}</span>
                            </div>
                            <div class="flex justify-between text-sm text-gray-600">
                                <span>Price per share:</span>
                                <span>Ksh ${currentPrice.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="cancel-trade">
                                Cancel
                            </button>
                            <button class="flex-1 px-6 py-3 ${action === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg transition" id="execute-trade">
                                ${action === 'buy' ? 'Buy' : 'Sell'}
                            </button>
                        </div>
                    </div>
                `;

            document.body.appendChild(modal);

            const quantityInput = document.getElementById('share-quantity');
            const totalSpan = document.getElementById('total-amount');

            quantityInput.addEventListener('input', () => {
                const quantity = parseInt(quantityInput.value) || 0;
                const total = quantity * currentPrice;
                totalSpan.textContent = this.formatCurrency(total);
            });

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            document.getElementById('cancel-trade').addEventListener('click', () => modal.remove());

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('execute-trade').addEventListener('click', async () => {
                const quantity = parseInt(quantityInput.value);

                if (!quantity || quantity <= 0) {
                    this.showNotification('Please enter a valid number of shares', 'error');
                    return;
                }

                if (action === 'buy') {
                    const totalCost = quantity * currentPrice;
                    if (totalCost > AppState.portfolio.cash) {
                        this.showNotification('Insufficient funds for this purchase', 'error');
                        return;
                    }
                    await this.executeBuyOrder(stock, quantity);
                } else {
                    if (quantity > availableShares) {
                        this.showNotification('Insufficient shares to sell', 'error');
                        return;
                    }
                    await this.executeSellOrder(stock, quantity);
                }

                modal.remove();
            });
        },

        async executeBuyOrder(stock, shares) {
            const totalCost = shares * stock.price;

            AppState.portfolio.cash -= totalCost;

            if (!AppState.portfolio.holdings[stock.symbol]) {
                AppState.portfolio.holdings[stock.symbol] = { shares: 0, avgPrice: 0 };
            }

            const holding = AppState.portfolio.holdings[stock.symbol];
            const newTotalShares = holding.shares + shares;
            const newTotalCost = (holding.shares * holding.avgPrice) + totalCost;
            holding.avgPrice = newTotalCost / newTotalShares;
            holding.shares = newTotalShares;
            holding.currentPrice = stock.price;

            const transaction = {
                id: 'TXN' + Date.now(),
                date: new Date().toISOString(),
                symbol: stock.symbol,
                action: 'buy',
                shares: shares,
                price: stock.price,
                total: totalCost
            };

            AppState.portfolio.transactions.push(transaction);

            const today = new Date().toISOString().split('T')[0];
            AppState.portfolio.history.push({
                date: today,
                value: AppState.calculatePortfolioValue()
            });

            if (AppState.portfolio.history.length > 60) {
                AppState.portfolio.history = AppState.portfolio.history.slice(-60);
            }

            await AppState.savePortfolio();

            this.updatePortfolioDisplay();
            this.updateLeaderboard();
            this.updatePracticeStats();

            this.showNotification(`Successfully bought ${shares} shares of ${stock.symbol} for ${this.formatCurrency(totalCost)}`, 'success');
        },

        async executeSellOrder(stock, shares) {
            const totalProceeds = shares * stock.price;

            AppState.portfolio.cash += totalProceeds;

            const holding = AppState.portfolio.holdings[stock.symbol];
            holding.shares -= shares;

            if (holding.shares === 0) {
                delete AppState.portfolio.holdings[stock.symbol];
            }

            const transaction = {
                id: 'TXN' + Date.now(),
                date: new Date().toISOString(),
                symbol: stock.symbol,
                action: 'sell',
                shares: shares,
                price: stock.price,
                total: totalProceeds
            };

            AppState.portfolio.transactions.push(transaction);

            const today = new Date().toISOString().split('T')[0];
            AppState.portfolio.history.push({
                date: today,
                value: AppState.calculatePortfolioValue()
            });

            if (AppState.portfolio.history.length > 60) {
                AppState.portfolio.history = AppState.portfolio.history.slice(-60);
            }

            await AppState.savePortfolio();

            this.updatePortfolioDisplay();
            this.updateLeaderboard();
            this.updatePracticeStats();

            this.showNotification(`Successfully sold ${shares} shares of ${stock.symbol} for ${this.formatCurrency(totalProceeds)}`, 'success');
        },

        updateLeaderboard() {
            const container = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.hover-card .space-y-3');
            if (!container) return;

            const userPortfolioValue = AppState.calculatePortfolioValue();
            const userReturn = ((userPortfolioValue - 1000000) / 1000000) * 100;

            let leaderboard = [...AppState.leaderboard];

            // Add current user
            const userEntry = {
                name: AppState.user.name || 'You',
                return: userReturn,
                portfolio: userPortfolioValue,
                rank: 999
            };

            leaderboard.push(userEntry);
            leaderboard.sort((a, b) => b.portfolio - a.portfolio);
            leaderboard = leaderboard.slice(0, 10).map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));

            let html = '';

            leaderboard.slice(0, 3).forEach((entry, index) => {
                const isUser = entry.name === (AppState.user.name || 'You');
                const rankColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500'];

                html += `
                        <div class="flex items-center justify-between p-3 ${isUser ? 'bg-blue-50' : index === 0 ? 'bg-yellow-50' : 'bg-gray-50'} rounded-lg">
                            <div class="flex items-center">
                                <span class="w-6 h-6 ${rankColors[index]} text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">${entry.rank}</span>
                                <div>
                                    <h4 class="font-semibold text-gray-800">${entry.name} ${isUser ? '(You)' : ''}</h4>
                                    <p class="text-gray-600 text-sm">${this.formatCurrency(entry.portfolio)}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="font-semibold ${entry.return >= 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${entry.return >= 0 ? '+' : ''}${entry.return.toFixed(1)}%
                                </span>
                                ${index === 0 ? '<i class="fas fa-crown text-yellow-500 ml-2"></i>' : ''}
                            </div>
                        </div>
                    `;
            });

            if (leaderboard.length > 3) {
                leaderboard.slice(3).forEach(entry => {
                    const isUser = entry.name === (AppState.user.name || 'You');
                    html += `
                            <div class="flex items-center justify-between p-3 ${isUser ? 'bg-blue-50' : 'bg-gray-50'} rounded-lg">
                                <div class="flex items-center">
                                    <span class="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">${entry.rank}</span>
                                    <div>
                                        <h4 class="font-semibold text-gray-800">${entry.name} ${isUser ? '(You)' : ''}</h4>
                                        <p class="text-gray-600 text-sm">${this.formatCurrency(entry.portfolio)}</p>
                                    </div>
                                </div>
                                <span class="font-semibold ${entry.return >= 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${entry.return >= 0 ? '+' : ''}${entry.return.toFixed(1)}%
                                </span>
                            </div>
                        `;
                });
            }

            container.innerHTML = html;

            const viewAllBtn = document.querySelector('.mt-6.text-center button');
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => this.showFullLeaderboard(leaderboard));
            }
        },

        showFullLeaderboard(leaderboard) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Full Leaderboard</h3>
                            <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <table class="w-full">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="py-3 px-4 text-left">Rank</th>
                                    <th class="py-3 px-4 text-left">Name</th>
                                    <th class="py-3 px-4 text-left">Portfolio</th>
                                    <th class="py-3 px-4 text-left">Return</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leaderboard.map(entry => {
                const isUser = entry.name === (AppState.user.name || 'You');
                return `
                                        <tr class="border-b ${isUser ? 'bg-blue-50' : ''}">
                                            <td class="py-3 px-4 font-medium">${entry.rank}</td>
                                            <td class="py-3 px-4">${entry.name} ${isUser ? '(You)' : ''}</td>
                                            <td class="py-3 px-4">${this.formatCurrency(entry.portfolio)}</td>
                                            <td class="py-3 px-4 ${entry.return >= 0 ? 'text-green-600' : 'text-red-600'}">
                                                ${entry.return >= 0 ? '+' : ''}${entry.return.toFixed(1)}%
                                            </td>
                                        </tr>
                                    `;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

            document.body.appendChild(modal);
            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        },

        updatePracticeStats() {
            const container = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.hover-card .space-y-4');
            if (!container) return;

            const totalTrades = AppState.portfolio.transactions.length;
            const bestReturn = this.calculateBestReturn();
            const totalHours = Math.floor(totalTrades * 0.5);

            container.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-600 text-sm">Total Practice Hours</p>
                            <p class="text-xl font-bold text-gray-800">${totalHours} hours</p>
                        </div>
                        <i class="fas fa-clock text-green-500 text-2xl"></i>
                    </div>

                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-600 text-sm">Trades Made</p>
                            <p class="text-xl font-bold text-gray-800">${totalTrades} trades</p>
                        </div>
                        <i class="fas fa-exchange-alt text-green-500 text-2xl"></i>
                    </div>

                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-gray-600 text-sm">Best Return</p>
                            <p class="text-xl font-bold text-gray-800 ${bestReturn >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${bestReturn >= 0 ? '+' : ''}${bestReturn.toFixed(1)}%
                            </p>
                        </div>
                        <i class="fas fa-chart-line text-green-500 text-2xl"></i>
                    </div>
                `;

            const shareBtn = document.querySelector('.mt-6.pt-4.border-t button');
            if (shareBtn) {
                shareBtn.addEventListener('click', () => this.shareProgress());
            }
        },

        calculateBestReturn() {
            if (!AppState.portfolio.transactions.length) return 0;
            const currentValue = AppState.calculatePortfolioValue();
            return ((currentValue - 1000000) / 1000000) * 100;
        },

        shareProgress() {
            const portfolioValue = AppState.calculatePortfolioValue();
            const totalReturn = ((portfolioValue - 1000000) / 1000000) * 100;
            const trades = AppState.portfolio.transactions.length;

            const text = `I've made ${trades} trades on PesaSmart Practice with a ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}% return! Join me to improve your investing skills. 🚀`;

            if (navigator.share) {
                navigator.share({ title: 'My Practice Progress', text }).catch(() => {
                    navigator.clipboard.writeText(text);
                    this.showNotification('Progress copied to clipboard!', 'success');
                });
            } else {
                navigator.clipboard.writeText(text);
                this.showNotification('Progress copied to clipboard!', 'success');
            }
        },

        setupLoanSimulator() {
            const loanBtn = document.querySelector('.bg-indigo-500');
            if (!loanBtn) return;

            loanBtn.addEventListener('click', () => this.openLoanSimulator());
        },

        openLoanSimulator() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Loan Decision Simulator</h3>
                            <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <p class="text-gray-600 mb-4">Compare loan options to see the 1-year impact.</p>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 font-medium mb-2">Loan Amount (Ksh)</label>
                            <input type="number" id="loan-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" value="50000" min="1000" max="500000">
                        </div>
                        
                        <div class="mb-6">
                            <label class="block text-gray-700 font-medium mb-2">Loan Term (Months)</label>
                            <input type="number" id="loan-term" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" value="12" min="3" max="60">
                        </div>
                        
                        <button class="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-semibold transition mb-6" id="calculate-loan">
                            Calculate Options
                        </button>
                        
                        <div id="loan-results" class="hidden"></div>
                    </div>
                `;

            document.body.appendChild(modal);

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            document.getElementById('calculate-loan').addEventListener('click', () => {
                const amount = parseFloat(document.getElementById('loan-amount').value);
                const months = parseInt(document.getElementById('loan-term').value);
                this.calculateLoanOptions(amount, months);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        calculateLoanOptions(amount, months) {
            const options = [
                { name: 'M-Shwari', rate: 0.12, color: 'text-red-600' },
                { name: 'Bank Loan', rate: 0.15, color: 'text-yellow-600' },
                { name: 'SACCO', rate: 0.10, color: 'text-green-600' }
            ];

            const resultsDiv = document.getElementById('loan-results');
            let html = '<h4 class="font-bold mb-3">Comparison Results</h4><div class="space-y-3">';

            options.forEach(option => {
                const monthlyRate = option.rate / 12;
                const monthlyPayment = this.calculateMonthlyPayment(amount, monthlyRate, months);
                const totalRepayment = monthlyPayment * months;
                const totalInterest = totalRepayment - amount;

                html += `
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <div class="flex justify-between items-center mb-2">
                                <h5 class="font-bold">${option.name}</h5>
                                <span class="${option.color} font-semibold">${(option.rate * 100).toFixed(0)}% APR</span>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p class="text-gray-600">Monthly</p>
                                    <p class="font-medium">${this.formatCurrency(monthlyPayment)}</p>
                                </div>
                                <div>
                                    <p class="text-gray-600">Total Interest</p>
                                    <p class="font-medium">${this.formatCurrency(totalInterest)}</p>
                                </div>
                                <div>
                                    <p class="text-gray-600">Total</p>
                                    <p class="font-medium">${this.formatCurrency(totalRepayment)}</p>
                                </div>
                            </div>
                        </div>
                    `;
            });

            html += '</div>';
            resultsDiv.innerHTML = html;
            resultsDiv.classList.remove('hidden');
        },

        calculateMonthlyPayment(principal, monthlyRate, months) {
            if (monthlyRate === 0) return principal / months;
            return principal * monthlyRate * Math.pow(1 + monthlyRate, months) /
                (Math.pow(1 + monthlyRate, months) - 1);
        },

        setupInsuranceSimulator() {
            const insuranceBtn = document.querySelector('.bg-cyan-500');
            if (!insuranceBtn) return;

            insuranceBtn.addEventListener('click', () => this.openInsuranceSimulator());
        },

        openInsuranceSimulator() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Insurance Claim Simulator</h3>
                            <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <p class="text-gray-600 mb-4">Practice the insurance claim process step by step.</p>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 font-medium mb-2">Claim Type</label>
                            <select id="claim-type" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                                <option value="rainfall">Rainfall Insurance</option>
                                <option value="accident">BodaBoda Accident</option>
                                <option value="health">Health Cash</option>
                            </select>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 font-medium mb-2">Claim Amount (Ksh)</label>
                            <input type="number" id="claim-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" value="5000" min="1000" max="50000">
                        </div>
                        
                        <div class="mb-6">
                            <label class="block text-gray-700 font-medium mb-2">Upload Document</label>
                            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500" id="upload-area">
                                <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                                <p class="text-gray-600">Click to simulate document upload</p>
                            </div>
                            <p id="upload-status" class="text-sm text-gray-500 mt-2"></p>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="cancel-claim">
                                Cancel
                            </button>
                            <button class="flex-1 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition" id="process-claim">
                                Process Claim
                            </button>
                        </div>
                        
                        <div id="claim-result" class="mt-6 hidden"></div>
                    </div>
                `;

            document.body.appendChild(modal);

            let documentUploaded = false;
            const uploadArea = document.getElementById('upload-area');
            const uploadStatus = document.getElementById('upload-status');

            uploadArea.addEventListener('click', () => {
                documentUploaded = true;
                uploadStatus.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> Document uploaded successfully';
                uploadStatus.classList.add('text-green-600');
            });

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());
            document.getElementById('cancel-claim').addEventListener('click', () => modal.remove());

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            document.getElementById('process-claim').addEventListener('click', () => {
                if (!documentUploaded) {
                    this.showNotification('Please upload a document first', 'error');
                    return;
                }

                const type = document.getElementById('claim-type').value;
                const amount = parseFloat(document.getElementById('claim-amount').value);
                this.processInsuranceClaim(type, amount);
            });
        },

        processInsuranceClaim(type, amount) {
            const resultDiv = document.getElementById('claim-result');
            const success = Math.random() < 0.8; // 80% success rate

            if (success) {
                const payout = amount * 0.9;
                resultDiv.className = 'mt-6 p-4 bg-green-50 rounded-lg';
                resultDiv.innerHTML = `
                        <div class="text-center">
                            <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                            <h4 class="font-bold text-green-700 mb-1">Claim Approved!</h4>
                            <p class="text-gray-600 mb-2">Your claim has been processed successfully.</p>
                            <p class="text-green-600 font-bold">Payout: ${this.formatCurrency(payout)}</p>
                        </div>
                    `;
            } else {
                resultDiv.className = 'mt-6 p-4 bg-red-50 rounded-lg';
                resultDiv.innerHTML = `
                        <div class="text-center">
                            <i class="fas fa-times-circle text-red-500 text-3xl mb-2"></i>
                            <h4 class="font-bold text-red-700 mb-1">Claim Rejected</h4>
                            <p class="text-gray-600 mb-2">Insufficient documentation. Please review requirements.</p>
                        </div>
                    `;
            }

            resultDiv.classList.remove('hidden');
        },

        setupBudgetChallenge() {
            const joinBtn = document.querySelector('.bg-white.text-green-600');
            if (!joinBtn) return;

            joinBtn.addEventListener('click', () => this.joinBudgetChallenge());
        },

        joinBudgetChallenge() {
            const challengeData = localStorage.getItem(`challenge_${AppState.user.userId}`);

            if (challengeData) {
                this.showChallengeModal(JSON.parse(challengeData));
            } else {
                const newChallenge = {
                    day: 1,
                    budget: 30000,
                    spent: 0,
                    categories: { food: 0, transport: 0, rent: 0, entertainment: 0, other: 0 },
                    startDate: new Date().toISOString()
                };
                localStorage.setItem(`challenge_${AppState.user.userId}`, JSON.stringify(newChallenge));
                this.showChallengeModal(newChallenge);
            }
        },

        showChallengeModal(challenge) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

            const remaining = challenge.budget - challenge.spent;
            const progress = (challenge.spent / challenge.budget) * 100;

            modal.innerHTML = `
                    <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">30-Day Budget Challenge</h3>
                            <button class="text-gray-500 hover:text-gray-700" id="close-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="text-center mb-6">
                            <span class="text-4xl font-bold text-green-600">Day ${challenge.day}/30</span>
                        </div>
                        
                        <div class="mb-4">
                            <div class="flex justify-between mb-1">
                                <span class="text-gray-600">Daily Budget: Ksh 1,000</span>
                                <span class="font-medium">Spent: ${this.formatCurrency(challenge.spent)}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-3">
                                <div class="bg-green-500 h-3 rounded-full" style="width: ${progress}%"></div>
                            </div>
                            <p class="text-right text-sm text-gray-500 mt-1">Remaining: ${this.formatCurrency(remaining)}</p>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3 mb-6">
                            <button class="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition spending-btn" data-category="food" data-amount="200">
                                <i class="fas fa-utensils text-green-600 text-xl mb-2"></i>
                                <p class="font-medium">Food</p>
                                <p class="text-sm text-gray-600">Ksh 200</p>
                            </button>
                            <button class="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition spending-btn" data-category="transport" data-amount="150">
                                <i class="fas fa-bus text-blue-600 text-xl mb-2"></i>
                                <p class="font-medium">Transport</p>
                                <p class="text-sm text-gray-600">Ksh 150</p>
                            </button>
                            <button class="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition spending-btn" data-category="entertainment" data-amount="300">
                                <i class="fas fa-film text-purple-600 text-xl mb-2"></i>
                                <p class="font-medium">Entertainment</p>
                                <p class="text-sm text-gray-600">Ksh 300</p>
                            </button>
                            <button class="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition spending-btn" data-category="other" data-amount="100">
                                <i class="fas fa-ellipsis-h text-orange-600 text-xl mb-2"></i>
                                <p class="font-medium">Other</p>
                                <p class="text-sm text-gray-600">Ksh 100</p>
                            </button>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition" id="end-day">
                                End Day
                            </button>
                            <button class="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" id="reset-challenge">
                                Reset
                            </button>
                        </div>
                    </div>
                `;

            document.body.appendChild(modal);

            document.querySelectorAll('.spending-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const amount = parseInt(btn.dataset.amount);
                    const category = btn.dataset.category;

                    if (remaining - amount >= 0) {
                        challenge.spent += amount;
                        challenge.categories[category] += amount;
                        localStorage.setItem(`challenge_${AppState.user.userId}`, JSON.stringify(challenge));
                        this.showNotification(`Spent ${this.formatCurrency(amount)} on ${category}`, 'info');

                        const newProgress = (challenge.spent / challenge.budget) * 100;
                        modal.querySelector('.bg-green-500.h-3').style.width = newProgress + '%';
                        modal.querySelector('.text-right.text-sm.text-gray-500').textContent =
                            `Remaining: ${this.formatCurrency(challenge.budget - challenge.spent)}`;
                    } else {
                        this.showNotification('Insufficient budget for this expense', 'error');
                    }
                });
            });

            document.getElementById('close-modal').addEventListener('click', () => modal.remove());

            document.getElementById('end-day').addEventListener('click', () => {
                if (challenge.day >= 30) {
                    this.showNotification('🎉 Congratulations! You completed the 30-day challenge!', 'success');
                    localStorage.removeItem(`challenge_${AppState.user.userId}`);
                    modal.remove();
                } else {
                    challenge.day++;
                    challenge.spent = 0;
                    challenge.categories = { food: 0, transport: 0, rent: 0, entertainment: 0, other: 0 };
                    localStorage.setItem(`challenge_${AppState.user.userId}`, JSON.stringify(challenge));
                    this.showNotification(`Day ${challenge.day} started! New budget: Ksh 1,000`, 'success');
                    modal.remove();
                }
            });

            document.getElementById('reset-challenge').addEventListener('click', () => {
                localStorage.removeItem(`challenge_${AppState.user.userId}`);
                this.showNotification('Challenge reset', 'info');
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        updateCharts() {
            setTimeout(() => {
                this.drawPortfolioChart();
                this.drawAllocationChart();
            }, 500);
        },

        drawPortfolioChart() {
            const container = document.getElementById('portfolio-performance-chart');
            if (!container) return;

            if (!AppState.portfolio?.history?.length) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No portfolio history yet</p>';
                return;
            }

            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Date');
            data.addColumn('number', 'Value');

            AppState.portfolio.history.slice(-30).forEach(entry => {
                data.addRow([entry.date, entry.value]);
            });

            const options = {
                title: 'Portfolio Performance (30 Days)',
                curveType: 'function',
                colors: ['#00B894'],
                hAxis: { slantedText: true },
                vAxis: { format: 'short' },
                chartArea: { width: '85%', height: '70%' },
                animation: { duration: 1000 }
            };

            const chart = new google.visualization.LineChart(container);
            chart.draw(data, options);
        },

        drawAllocationChart() {
            const container = document.getElementById('asset-allocation-chart');
            if (!container) return;

            const holdings = AppState.portfolio?.holdings || {};

            if (Object.keys(holdings).length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 py-8">No holdings to display</p>';
                return;
            }

            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Asset');
            data.addColumn('number', 'Value');

            let totalValue = 0;
            Object.entries(holdings).forEach(([symbol, holding]) => {
                const stock = AppState.marketData?.stocks.find(s => s.symbol === symbol);
                if (stock) {
                    const value = holding.shares * stock.price;
                    totalValue += value;
                    data.addRow([stock.name, value]);
                }
            });

            data.addRow(['Cash', AppState.portfolio.cash]);

            const options = {
                title: 'Asset Allocation',
                pieHole: 0.4,
                colors: ['#00B894', '#0984E3', '#6C5CE7', '#FDCB6E'],
                chartArea: { width: '100%', height: '80%' },
                animation: { duration: 1000 }
            };

            const chart = new google.visualization.PieChart(container);
            chart.draw(data, options);
        },

        formatCurrency(amount) {
            return 'Ksh ' + amount.toLocaleString('en-KE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        }
    };

    //==============================================================================
    // GOOGLE CHARTS
    //==============================================================================

    google.charts.load('current', { packages: ['corechart', 'line'] });
    google.charts.setOnLoadCallback(() => {
        console.log('Google Charts loaded');
        if (AppState.portfolio) {
            UI.updateCharts();
        }
    });

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

        UI.updateNavbar();
        UI.updatePortfolioDisplay();
        UI.updateLeaderboard();
        UI.updatePracticeStats();
        UI.setupLoanSimulator();
        UI.setupInsuranceSimulator();
        UI.setupBudgetChallenge();

        AppState.startPriceSimulation();

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
            .hover-card {
                transition: all 0.3s;
            }
            .hover-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
        `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', initialize);

})();