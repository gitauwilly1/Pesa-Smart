(function() {
    'use strict';

    // SECTION 1: INITIALIZATION & SETUP

    // State variables
    let currentUser = null;
    let marketData = null;
    let userPortfolio = null;
    let allUsers = [];
    let allTransactions = [];
    let priceUpdateInterval = null;
    let leaderboardData = [];

    // Dummy data for leaderboard when no real users
    const DUMMY_LEADERBOARD = [
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

    /**
     * Check if user is authenticated
     */
    function checkAuthentication() {
        const session = localStorage.getItem('pesasmart_session');
        if (!session) {
            window.location.href = 'login.html?redirect=practice.html';
            return false;
        }

        try {
            currentUser = JSON.parse(session);
            if (currentUser.expires && currentUser.expires < Date.now()) {
                localStorage.removeItem('pesasmart_session');
                window.location.href = 'login.html?expired=true&redirect=practice.html';
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
     * Load market data from JSON
     */
    async function loadMarketDataFromJSON() {
        try {
            const cached = localStorage.getItem('pesasmart_market');
            if (cached) {
                marketData = JSON.parse(cached);
                return marketData;
            }

            const response = await fetch('data/market.json');
            const data = await response.json();
            marketData = data;
            
            // Cache in localStorage
            localStorage.setItem('pesasmart_market', JSON.stringify(marketData));
            return marketData;
        } catch (error) {
            console.error('Failed to load market data:', error);
            showNotification('Failed to load market data. Using default values.', 'warning');
            
            // Default market data if fetch fails
            marketData = {
                stocks: [
                    { symbol: "SCOM", name: "Safaricom PLC", price: 14.50, change: 0.35, changePercent: 2.47, volume: 2540000, sector: "Telecom" },
                    { symbol: "EQTY", name: "Equity Bank", price: 38.20, change: -0.42, changePercent: -1.09, volume: 1820000, sector: "Banking" },
                    { symbol: "KCB", name: "KCB Group", price: 42.50, change: 0.28, changePercent: 0.66, volume: 1250000, sector: "Banking" },
                    { symbol: "EABL", name: "EABL", price: 145.00, change: 2.30, changePercent: 1.61, volume: 820000, sector: "Manufacturing" },
                    { symbol: "COOP", name: "Co-op Bank", price: 12.75, change: 0.10, changePercent: 0.79, volume: 980000, sector: "Banking" }
                ],
                indices: [
                    { name: "NSE 20 Share Index", value: 1824.56, change: 12.34, changePercent: 0.68 }
                ]
            };
            return marketData;
        }
    }

    /**
     * Load user portfolio from localStorage
     */
    function loadUserPortfolio() {
        if (!currentUser) return null;

        const saved = localStorage.getItem(`portfolio_${currentUser.userId}`);
        
        if (saved) {
            userPortfolio = JSON.parse(saved);
        } else {
            // Create default portfolio with Ksh 1,000,000
            userPortfolio = {
                cash: 1000000,
                holdings: {},
                transactions: [],
                history: [
                    { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: 1000000 }
                ],
                lastUpdated: new Date().toISOString()
            };
            
            // Add some sample holdings for demo
            if (marketData && marketData.stocks) {
                // Safaricom - 40 shares
                userPortfolio.holdings["SCOM"] = { 
                    shares: 40, 
                    avgPrice: 14.20,
                    currentPrice: marketData.stocks.find(s => s.symbol === "SCOM")?.price || 14.50
                };
                
                // Equity - 25 shares
                userPortfolio.holdings["EQTY"] = { 
                    shares: 25, 
                    avgPrice: 38.50,
                    currentPrice: marketData.stocks.find(s => s.symbol === "EQTY")?.price || 38.20
                };
                
                // KCB - 15 shares
                userPortfolio.holdings["KCB"] = { 
                    shares: 15, 
                    avgPrice: 42.00,
                    currentPrice: marketData.stocks.find(s => s.symbol === "KCB")?.price || 42.50
                };
                
                // Add sample transaction history
                userPortfolio.transactions.push(
                    {
                        id: `txn_${Date.now() - 86400000}`,
                        date: new Date(Date.now() - 86400000).toISOString(),
                        symbol: "SCOM",
                        action: "buy",
                        shares: 40,
                        price: 14.20,
                        total: 568
                    },
                    {
                        id: `txn_${Date.now() - 172800000}`,
                        date: new Date(Date.now() - 172800000).toISOString(),
                        symbol: "EQTY",
                        action: "buy",
                        shares: 25,
                        price: 38.50,
                        total: 962.50
                    },
                    {
                        id: `txn_${Date.now() - 259200000}`,
                        date: new Date(Date.now() - 259200000).toISOString(),
                        symbol: "KCB",
                        action: "buy",
                        shares: 15,
                        price: 42.00,
                        total: 630
                    }
                );
                
                // Add history entries
                for (let i = 29; i >= 1; i--) {
                    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    const randomChange = (Math.random() * 0.06 - 0.02) * userPortfolio.history[0].value;
                    const newValue = userPortfolio.history[0].value + randomChange;
                    userPortfolio.history.unshift({ date, value: Math.max(950000, newValue) });
                }
            }
            
            savePortfolio();
        }
        
        return userPortfolio;
    }

    /**
     * Save portfolio to localStorage
     */
    function savePortfolio() {
        if (!currentUser || !userPortfolio) return;
        userPortfolio.lastUpdated = new Date().toISOString();
        localStorage.setItem(`portfolio_${currentUser.userId}`, JSON.stringify(userPortfolio));
    }

    /**
     * Load all users for leaderboard
     */
    async function loadAllUsersForLeaderboard() {
        try {
            const cached = localStorage.getItem('pesasmart_users');
            if (cached) {
                allUsers = JSON.parse(cached);
            } else {
                const response = await fetch('data/users.json');
                const data = await response.json();
                allUsers = data.users || [];
                localStorage.setItem('pesasmart_users', JSON.stringify(allUsers));
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            allUsers = [];
        }
    }

    // SECTION 2: NAVBAR MANAGEMENT (logo preserved)

    /**
     * Update navbar based on auth state - PRESERVES ORIGINAL LOGO
     */
    function updateNavbarForAuthState() {
        const navbar = document.querySelector('nav .flex.items-center.space-x-4');
        if (!navbar) return;

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

        setupUserDropdown();
        
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
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
            // Clear price update interval
            if (priceUpdateInterval) {
                clearInterval(priceUpdateInterval);
            }
            
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

    google.charts.load('current', { packages: ['corechart', 'line', 'bar'] });
    google.charts.setOnLoadCallback(() => {
        console.log('✅ Google Charts loaded for practice page');
        // Charts will be drawn when data is available
    });

    /**
     * Draw portfolio performance chart
     */
    function drawPortfolioPerformanceChart() {
        const chartContainer = document.getElementById('portfolio-performance-chart');
        if (!chartContainer) {
            // Create chart container if it doesn't exist
            const stockSimulator = document.querySelector('.lg\\:col-span-2 > .bg-white.rounded-xl.shadow-lg');
            if (stockSimulator) {
                const chartDiv = document.createElement('div');
                chartDiv.id = 'portfolio-performance-chart';
                chartDiv.className = 'w-full h-64 mt-6';
                stockSimulator.querySelector('.mb-6').after(chartDiv);
            } else {
                return;
            }
        }

        if (!userPortfolio || !userPortfolio.history || userPortfolio.history.length === 0) {
            document.getElementById('portfolio-performance-chart').innerHTML = 
                '<p class="text-center text-gray-500 py-8">No portfolio history yet. Start trading to see your performance!</p>';
            return;
        }

        const chartData = [['Date', 'Portfolio Value']];
        
        // Take last 30 days of history or all if less
        const history = userPortfolio.history.slice(-30);
        history.forEach(entry => {
            chartData.push([entry.date, entry.value]);
        });

        const data = google.visualization.arrayToDataTable(chartData);

        const options = {
            title: 'Portfolio Performance (30 Days)',
            curveType: 'function',
            legend: { position: 'bottom' },
            colors: ['#00B894'],
            hAxis: { 
                title: 'Date',
                slantedText: true,
                slantedTextAngle: 45
            },
            vAxis: { 
                title: 'Value (Ksh)',
                format: 'short'
            },
            chartArea: { width: '80%', height: '60%' },
            animation: { startup: true, duration: 1000 }
        };

        const chart = new google.visualization.LineChart(document.getElementById('portfolio-performance-chart'));
        chart.draw(data, options);
    }

    /**
     * Draw asset allocation chart
     */
    function drawAssetAllocationChart() {
        const chartContainer = document.getElementById('asset-allocation-chart');
        if (!chartContainer) {
            // Create chart container
            const rightColumn = document.querySelector('.lg\\:col-span-1');
            if (rightColumn) {
                const chartDiv = document.createElement('div');
                chartDiv.id = 'asset-allocation-chart';
                chartDiv.className = 'bg-white rounded-xl shadow-lg p-6 hover-card mt-6';
                chartDiv.innerHTML = '<h3 class="text-lg font-bold text-gray-800 mb-4">Asset Allocation</h3><div id="allocation-chart-inner" class="w-full h-48"></div>';
                rightColumn.appendChild(chartDiv);
            } else {
                return;
            }
        }

        if (!userPortfolio || !userPortfolio.holdings || Object.keys(userPortfolio.holdings).length === 0) {
            document.querySelector('#asset-allocation-chart #allocation-chart-inner').innerHTML = 
                '<p class="text-center text-gray-500 py-8">No holdings yet. Buy stocks to see your asset allocation!</p>';
            return;
        }

        const chartData = [['Asset', 'Value']];
        let totalValue = 0;
        
        // Calculate current values
        Object.entries(userPortfolio.holdings).forEach(([symbol, holding]) => {
            const stock = marketData.stocks.find(s => s.symbol === symbol);
            if (stock) {
                const value = holding.shares * stock.price;
                totalValue += value;
                chartData.push([stock.name, value]);
            }
        });
        
        // Add cash
        chartData.push(['Cash', userPortfolio.cash]);

        if (chartData.length <= 1) {
            document.querySelector('#asset-allocation-chart #allocation-chart-inner').innerHTML = 
                '<p class="text-center text-gray-500 py-8">No assets to display</p>';
            return;
        }

        const data = google.visualization.arrayToDataTable(chartData);

        const options = {
            pieHole: 0.4,
            colors: ['#00B894', '#0984E3', '#6C5CE7', '#FDCB6E', '#E17055', '#D63031'],
            legend: { position: 'bottom', alignment: 'center' },
            chartArea: { width: '100%', height: '80%' },
            animation: { startup: true, duration: 1000 }
        };

        const chart = new google.visualization.PieChart(document.getElementById('allocation-chart-inner'));
        chart.draw(data, options);
    }

    /**
     * Draw performance comparison chart
     */
    function drawPerformanceComparisonChart() {
        const chartContainer = document.getElementById('comparison-chart');
        if (!chartContainer) {
            // Create chart container
            const rightColumn = document.querySelector('.lg\\:col-span-1');
            if (rightColumn) {
                const chartDiv = document.createElement('div');
                chartDiv.id = 'comparison-chart';
                chartDiv.className = 'bg-white rounded-xl shadow-lg p-6 hover-card mt-6';
                chartDiv.innerHTML = '<h3 class="text-lg font-bold text-gray-800 mb-4">Performance Comparison</h3><div id="comparison-chart-inner" class="w-full h-48"></div>';
                rightColumn.appendChild(chartDiv);
            } else {
                return;
            }
        }

        // Calculate user performance
        const portfolioValue = calculatePortfolioValue();
        const initialValue = 1000000; // Starting cash
        const userReturn = ((portfolioValue - initialValue) / initialValue) * 100;

        // Get market index performance (simulated)
        const marketReturn = marketData.indices?.[0]?.changePercent || 2.5;

        const data = google.visualization.arrayToDataTable([
            ['Metric', 'User', 'Market'],
            ['Return (%)', userReturn, marketReturn]
        ]);

        const options = {
            legend: { position: 'top' },
            colors: ['#00B894', '#74B9FF'],
            hAxis: { title: 'Performance' },
            vAxis: { title: 'Return (%)', minValue: -10, maxValue: 30 },
            chartArea: { width: '70%', height: '70%' },
            animation: { startup: true, duration: 1000 }
        };

        const chart = new google.visualization.ColumnChart(document.getElementById('comparison-chart-inner'));
        chart.draw(data, options);
    }

    // SECTION 4: STOCK MARKET SIMULATOR

    /**
     * Render portfolio display
     */
    function renderPortfolioDisplay() {
        // Update virtual balance in header
        const balanceElement = document.querySelector('.bg-white.bg-opacity-20 .text-white.font-bold');
        if (balanceElement) {
            balanceElement.textContent = formatCurrency(calculatePortfolioValue());
        }

        // Update portfolio performance text
        const performanceElement = document.querySelector('.text-green-600.font-bold');
        if (performanceElement) {
            const performance = calculateMonthlyPerformance();
            performanceElement.textContent = (performance >= 0 ? '+' : '') + performance.toFixed(1) + '% this month';
            performanceElement.className = performance >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
        }

        // Update total value in portfolio section
        const totalValueElement = document.querySelector('.text-right .text-xl.font-bold');
        if (totalValueElement) {
            totalValueElement.textContent = formatCurrency(calculatePortfolioValue());
        }

        // Render holdings
        renderHoldingsList();
    }

    /**
     * Render holdings list
     */
    function renderHoldingsList() {
        const holdingsContainer = document.querySelector('.space-y-3.mb-6');
        if (!holdingsContainer || !userPortfolio || !marketData) return;

        const holdings = userPortfolio.holdings || {};
        
        if (Object.keys(holdings).length === 0) {
            holdingsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-chart-line text-4xl mb-2 text-gray-300"></i>
                    <p>No holdings yet. Start trading!</p>
                </div>
            `;
            return;
        }

        let holdingsHtml = '';
        let totalValue = 0;

        Object.entries(holdings).forEach(([symbol, holding]) => {
            const stock = marketData.stocks.find(s => s.symbol === symbol);
            if (stock) {
                const currentPrice = stock.price;
                const value = holding.shares * currentPrice;
                totalValue += value;
                
                // Determine background color based on sector
                let bgColor = 'bg-blue-100';
                if (stock.sector === 'Banking') bgColor = 'bg-green-100';
                else if (stock.sector === 'Manufacturing') bgColor = 'bg-orange-100';
                
                holdingsHtml += `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:shadow-md transition cursor-pointer holding-item" data-symbol="${symbol}">
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mr-3">
                                <span class="font-bold ${bgColor.replace('bg-', 'text-').replace('100', '600')}">${symbol}</span>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">${stock.name}</h4>
                                <p class="text-gray-600 text-sm">Ksh ${currentPrice.toFixed(2)} • ${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}% today</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-gray-800">${holding.shares} shares</p>
                            <p class="text-gray-600 text-sm">${((value / totalValue) * 100).toFixed(1)}% of portfolio</p>
                        </div>
                    </div>
                `;
            }
        });

        holdingsContainer.innerHTML = holdingsHtml;

        // Add click handlers for holdings
        document.querySelectorAll('.holding-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                const stock = marketData.stocks.find(s => s.symbol === symbol);
                if (stock) {
                    openTradeModal(stock, 'sell');
                }
            });
        });
    }

    /**
     * Render market data table
     */
    function renderMarketDataTable() {
        // Create market table if it doesn't exist
        const stockSimulator = document.querySelector('.lg\\:col-span-2 > .bg-white.rounded-xl.shadow-lg');
        if (!stockSimulator) return;

        // Check if table already exists
        let tableContainer = document.getElementById('market-data-table');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'market-data-table';
            tableContainer.className = 'mt-6';
            stockSimulator.appendChild(tableContainer);
        }

        if (!marketData || !marketData.stocks) {
            tableContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Market data unavailable</p>';
            return;
        }

        let tableHtml = `
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
        `;

        marketData.stocks.forEach(stock => {
            const changeClass = stock.change >= 0 ? 'text-green-600' : 'text-red-600';
            const changeIcon = stock.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            tableHtml += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${stock.symbol}</td>
                    <td class="py-3 px-4">${stock.name}</td>
                    <td class="py-3 px-4 font-medium">Ksh ${stock.price.toFixed(2)}</td>
                    <td class="py-3 px-4 ${changeClass}">
                        <i class="fas ${changeIcon} mr-1"></i>
                        ${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                    </td>
                    <td class="py-3 px-4">${(stock.volume / 1000000).toFixed(1)}M</td>
                    <td class="py-3 px-4">
                        <button class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm buy-btn" data-symbol="${stock.symbol}">Buy</button>
                        <button class="border border-green-500 text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm ml-2 sell-btn" data-symbol="${stock.symbol}">Sell</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.innerHTML = tableHtml;

        // Add event listeners to buy/sell buttons
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const symbol = btn.dataset.symbol;
                const stock = marketData.stocks.find(s => s.symbol === symbol);
                if (stock) openTradeModal(stock, 'buy');
            });
        });

        document.querySelectorAll('.sell-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const symbol = btn.dataset.symbol;
                const stock = marketData.stocks.find(s => s.symbol === symbol);
                if (stock) openTradeModal(stock, 'sell');
            });
        });
    }

    /**
     * Calculate total portfolio value
     */
    function calculatePortfolioValue() {
        if (!userPortfolio || !marketData) return userPortfolio?.cash || 1000000;

        let holdingsValue = 0;
        Object.entries(userPortfolio.holdings || {}).forEach(([symbol, holding]) => {
            const stock = marketData.stocks.find(s => s.symbol === symbol);
            if (stock) {
                holdingsValue += holding.shares * stock.price;
            }
        });

        return userPortfolio.cash + holdingsValue;
    }

    /**
     * Calculate monthly performance
     */
    function calculateMonthlyPerformance() {
        const currentValue = calculatePortfolioValue();
        const oneMonthAgo = userPortfolio.history?.[0]?.value || 1000000;
        return ((currentValue - oneMonthAgo) / oneMonthAgo) * 100;
    }

    /**
     * Open trade modal
     */
    function openTradeModal(stock, action) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const currentPrice = stock.price;
        const availableCash = userPortfolio.cash;
        const availableShares = userPortfolio.holdings[stock.symbol]?.shares || 0;
        
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
                        <span class="font-medium">${formatCurrency(availableCash)}</span>
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
                        <span class="font-bold text-lg" id="total-amount">Ksh ${currentPrice.toFixed(2)}</span>
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

        // Update total on quantity change
        const quantityInput = document.getElementById('share-quantity');
        const totalSpan = document.getElementById('total-amount');
        
        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            const total = quantity * currentPrice;
            totalSpan.textContent = formatCurrency(total);
        });

        // Close modal
        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-trade').addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Execute trade
        document.getElementById('execute-trade').addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value);
            
            if (!quantity || quantity <= 0) {
                showNotification('Please enter a valid number of shares', 'error');
                return;
            }

            if (action === 'buy') {
                const totalCost = quantity * currentPrice;
                if (totalCost > userPortfolio.cash) {
                    showNotification('Insufficient funds for this purchase', 'error');
                    return;
                }
                executeBuyOrder(stock, quantity);
            } else {
                const availableShares = userPortfolio.holdings[stock.symbol]?.shares || 0;
                if (quantity > availableShares) {
                    showNotification('Insufficient shares to sell', 'error');
                    return;
                }
                executeSellOrder(stock, quantity);
            }
            
            modal.remove();
        });
    }

    /**
     * Execute buy order
     */
    function executeBuyOrder(stock, shares) {
        const totalCost = shares * stock.price;

        // Deduct cash
        userPortfolio.cash -= totalCost;

        // Add to holdings
        if (!userPortfolio.holdings[stock.symbol]) {
            userPortfolio.holdings[stock.symbol] = { shares: 0, avgPrice: 0 };
        }
        
        const holding = userPortfolio.holdings[stock.symbol];
        const newTotalShares = holding.shares + shares;
        const newTotalCost = (holding.shares * holding.avgPrice) + totalCost;
        holding.avgPrice = newTotalCost / newTotalShares;
        holding.shares = newTotalShares;
        holding.currentPrice = stock.price;

        // Record transaction
        const transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: new Date().toISOString(),
            symbol: stock.symbol,
            action: 'buy',
            shares: shares,
            price: stock.price,
            total: totalCost
        };
        
        userPortfolio.transactions.push(transaction);

        // Add to history
        const today = new Date().toISOString().split('T')[0];
        userPortfolio.history.push({
            date: today,
            value: calculatePortfolioValue()
        });

        // Keep last 60 days of history
        if (userPortfolio.history.length > 60) {
            userPortfolio.history = userPortfolio.history.slice(-60);
        }

        savePortfolio();
        
        // Update displays
        renderPortfolioDisplay();
        renderHoldingsList();
        drawPortfolioPerformanceChart();
        drawAssetAllocationChart();
        drawPerformanceComparisonChart();
        updateLeaderboard();

        showNotification(`Successfully bought ${shares} shares of ${stock.symbol} for ${formatCurrency(totalCost)}`, 'success');
    }

    /**
     * Execute sell order
     */
    function executeSellOrder(stock, shares) {
        const totalProceeds = shares * stock.price;

        // Add cash
        userPortfolio.cash += totalProceeds;

        // Update holdings
        const holding = userPortfolio.holdings[stock.symbol];
        holding.shares -= shares;

        // Remove holding if zero shares left
        if (holding.shares === 0) {
            delete userPortfolio.holdings[stock.symbol];
        }

        // Record transaction
        const transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: new Date().toISOString(),
            symbol: stock.symbol,
            action: 'sell',
            shares: shares,
            price: stock.price,
            total: totalProceeds
        };
        
        userPortfolio.transactions.push(transaction);

        // Add to history
        const today = new Date().toISOString().split('T')[0];
        userPortfolio.history.push({
            date: today,
            value: calculatePortfolioValue()
        });

        // Keep last 60 days of history
        if (userPortfolio.history.length > 60) {
            userPortfolio.history = userPortfolio.history.slice(-60);
        }

        savePortfolio();
        
        // Update displays
        renderPortfolioDisplay();
        renderHoldingsList();
        drawPortfolioPerformanceChart();
        drawAssetAllocationChart();
        drawPerformanceComparisonChart();
        updateLeaderboard();

        showNotification(`Successfully sold ${shares} shares of ${stock.symbol} for ${formatCurrency(totalProceeds)}`, 'success');
    }

    /**
     * Simulate price updates
     */
    function startPriceSimulation() {
        if (priceUpdateInterval) {
            clearInterval(priceUpdateInterval);
        }

        priceUpdateInterval = setInterval(() => {
            if (!marketData || !marketData.stocks) return;

            // Update each stock price
            marketData.stocks.forEach(stock => {
                const oldPrice = stock.price;
                // Random change between -2% and +2%
                const changePercent = (Math.random() * 4 - 2) / 100;
                const newPrice = oldPrice * (1 + changePercent);
                
                stock.price = Math.max(0.01, parseFloat(newPrice.toFixed(2)));
                stock.change = parseFloat((stock.price - oldPrice).toFixed(2));
                stock.changePercent = parseFloat(((stock.price - oldPrice) / oldPrice * 100).toFixed(2));
            });

            // Update market indices
            if (marketData.indices) {
                marketData.indices.forEach(index => {
                    const oldValue = index.value;
                    const changePercent = (Math.random() * 1 - 0.5) / 100;
                    index.value = parseFloat((oldValue * (1 + changePercent)).toFixed(2));
                    index.change = parseFloat((index.value - oldValue).toFixed(2));
                    index.changePercent = parseFloat(((index.value - oldValue) / oldValue * 100).toFixed(2));
                });
            }

            // Update displays
            renderMarketDataTable();
            renderPortfolioDisplay();
            renderHoldingsList();
            drawPortfolioPerformanceChart();
            drawAssetAllocationChart();
            drawPerformanceComparisonChart();

            // Save updated market data to cache
            localStorage.setItem('pesasmart_market', JSON.stringify(marketData));

        }, 10000); // Update every 10 seconds
    }

    // SECTION 5: LEADERBOARD

    /**
     * Update leaderboard display
     */
    function updateLeaderboard() {
        const leaderboardContainer = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.hover-card .space-y-3');
        if (!leaderboardContainer) return;

        // Combine dummy data with real user if available
        let leaderboard = [...DUMMY_LEADERBOARD];
        
        // Add current user to leaderboard if not already there
        if (currentUser) {
            const portfolioValue = calculatePortfolioValue();
            const userReturn = ((portfolioValue - 1000000) / 1000000) * 100;
            
            // Check if user is already in top 10
            const userIndex = leaderboard.findIndex(entry => entry.name === currentUser.name);
            
            if (userIndex >= 0) {
                // Update existing entry
                leaderboard[userIndex].portfolio = portfolioValue;
                leaderboard[userIndex].return = userReturn;
            } else {
                // Add user and re-sort
                leaderboard.push({
                    name: currentUser.name || 'You',
                    return: userReturn,
                    portfolio: portfolioValue,
                    rank: 999
                });
            }
            
            // Sort by portfolio value
            leaderboard.sort((a, b) => b.portfolio - a.portfolio);
            
            // Update ranks
            leaderboard = leaderboard.slice(0, 10).map((entry, index) => {
                return { ...entry, rank: index + 1 };
            });
        }

        // Render top 3 with special styling
        let leaderboardHtml = '';
        
        leaderboard.slice(0, 3).forEach((entry, index) => {
            const rankColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500'];
            const isUser = entry.name === (currentUser?.name || 'You');
            
            leaderboardHtml += `
                <div class="flex items-center justify-between p-3 ${isUser ? 'bg-blue-50' : index === 0 ? 'bg-yellow-50' : 'bg-gray-50'} rounded-lg">
                    <div class="flex items-center">
                        <span class="w-6 h-6 ${rankColors[index]} text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">${entry.rank}</span>
                        <div>
                            <h4 class="font-semibold text-gray-800">${entry.name} ${isUser ? '(You)' : ''}</h4>
                            <p class="text-gray-600 text-sm">${formatCurrency(entry.portfolio)}</p>
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

        // Add remaining entries (4-10) if any
        if (leaderboard.length > 3) {
            leaderboard.slice(3).forEach(entry => {
                const isUser = entry.name === (currentUser?.name || 'You');
                leaderboardHtml += `
                    <div class="flex items-center justify-between p-3 ${isUser ? 'bg-blue-50' : 'bg-gray-50'} rounded-lg">
                        <div class="flex items-center">
                            <span class="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">${entry.rank}</span>
                            <div>
                                <h4 class="font-semibold text-gray-800">${entry.name} ${isUser ? '(You)' : ''}</h4>
                                <p class="text-gray-600 text-sm">${formatCurrency(entry.portfolio)}</p>
                            </div>
                        </div>
                        <span class="font-semibold ${entry.return >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${entry.return >= 0 ? '+' : ''}${entry.return.toFixed(1)}%
                        </span>
                    </div>
                `;
            });
        }

        leaderboardContainer.innerHTML = leaderboardHtml;

        // Setup view full rankings button
        const viewAllBtn = document.querySelector('.mt-6.text-center button');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', showFullLeaderboard);
        }
    }

    /**
     * Show full leaderboard modal
     */
    function showFullLeaderboard() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        let leaderboard = [...DUMMY_LEADERBOARD];
        
        if (currentUser) {
            const portfolioValue = calculatePortfolioValue();
            const userReturn = ((portfolioValue - 1000000) / 1000000) * 100;
            
            leaderboard.push({
                name: currentUser.name || 'You',
                return: userReturn,
                portfolio: portfolioValue,
                rank: 999
            });
            
            leaderboard.sort((a, b) => b.portfolio - a.portfolio);
            leaderboard = leaderboard.map((entry, index) => {
                return { ...entry, rank: index + 1 };
            });
        }

        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Full Leaderboard</h3>
                    <button class="text-gray-500 hover:text-gray-700" id="close-leaderboard">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <table class="w-full">
                    <thead>
                        <tr class="text-left bg-gray-50">
                            <th class="py-3 px-4">Rank</th>
                            <th class="py-3 px-4">Name</th>
                            <th class="py-3 px-4">Portfolio</th>
                            <th class="py-3 px-4">Return</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboard.map(entry => {
                            const isUser = entry.name === (currentUser?.name || 'You');
                            return `
                                <tr class="border-b ${isUser ? 'bg-blue-50' : ''}">
                                    <td class="py-3 px-4 font-medium">${entry.rank}</td>
                                    <td class="py-3 px-4">${entry.name} ${isUser ? '(You)' : ''}</td>
                                    <td class="py-3 px-4">${formatCurrency(entry.portfolio)}</td>
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

        document.getElementById('close-leaderboard').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // SECTION 6: PRACTICE STATS

    /**
     * Update practice stats display
     */
    function updatePracticeStats() {
        if (!userPortfolio) return;

        const statsContainer = document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.hover-card .space-y-4');
        if (!statsContainer) return;

        // Calculate stats
        const totalTrades = userPortfolio.transactions.length;
        const bestReturn = calculateBestReturn();
        const totalHours = Math.floor(totalTrades * 0.5); // Rough estimate: 30 mins per trade
        const simulationsCompleted = 8; // Placeholder for loan/insurance sims

        statsContainer.innerHTML = `
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

            <div class="flex justify-between items-center">
                <div>
                    <p class="text-gray-600 text-sm">Simulations Completed</p>
                    <p class="text-xl font-bold text-gray-800">${simulationsCompleted}/12</p>
                </div>
                <i class="fas fa-check-circle text-purple-500 text-2xl"></i>
            </div>
        `;

        // Setup share button
        const shareBtn = document.querySelector('.mt-6.pt-4.border-t button');
        if (shareBtn) {
            shareBtn.addEventListener('click', sharePracticeProgress);
        }
    }

    /**
     * Calculate best return from transactions
     */
    function calculateBestReturn() {
        if (!userPortfolio.transactions || userPortfolio.transactions.length === 0) {
            return 0;
        }

        // Group buys and sells to calculate actual returns
        // Simplified: use overall portfolio performance
        const portfolioValue = calculatePortfolioValue();
        return ((portfolioValue - 1000000) / 1000000) * 100;
    }

    /**
     * Share practice progress
     */
    function sharePracticeProgress() {
        const portfolioValue = calculatePortfolioValue();
        const totalReturn = ((portfolioValue - 1000000) / 1000000) * 100;
        const trades = userPortfolio.transactions.length;
        
        const shareText = `I've made ${trades} trades on PesaSmart Practice Zone with a ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}% return! Join me to improve your investing skills. 🚀`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My PesaSmart Practice Progress',
                text: shareText,
                url: window.location.origin
            }).catch(() => {
                copyToClipboard(shareText);
            });
        } else {
            copyToClipboard(shareText);
        }
    }

    // SECTION 7: LOAN SIMULATOR

    /**
     * Setup loan simulator
     */
    function setupLoanSimulator() {
        const loanBtn = document.querySelector('.bg-indigo-500');
        if (!loanBtn) return;

        loanBtn.addEventListener('click', openLoanSimulator);
    }

    /**
     * Open loan simulator modal
     */
    function openLoanSimulator() {
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
                
                <p class="text-gray-600 mb-4">
                    Compare loan options to see the 1-year impact on your finances.
                </p>
                
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
                
                <div id="loan-results" class="hidden">
                    <h4 class="font-bold mb-3">Comparison Results</h4>
                    <div class="space-y-3" id="loan-comparison"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.getElementById('calculate-loan').addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('loan-amount').value);
            const months = parseInt(document.getElementById('loan-term').value);
            
            if (amount < 1000 || amount > 500000) {
                showNotification('Please enter an amount between Ksh 1,000 and Ksh 500,000', 'error');
                return;
            }
            
            if (months < 3 || months > 60) {
                showNotification('Please enter a term between 3 and 60 months', 'error');
                return;
            }
            
            calculateLoanOptions(amount, months);
        });
    }

    /**
     * Calculate loan options
     */
    function calculateLoanOptions(amount, months) {
        const options = [
            { name: 'M-Shwari', rate: 0.12, color: 'text-red-600' },
            { name: 'Bank Loan', rate: 0.15, color: 'text-yellow-600' },
            { name: 'SACCO', rate: 0.10, color: 'text-green-600' }
        ];

        const resultsDiv = document.getElementById('loan-results');
        const comparisonDiv = document.getElementById('loan-comparison');

        let html = '';
        
        options.forEach(option => {
            const monthlyRate = option.rate / 12;
            const monthlyPayment = calculateMonthlyPayment(amount, monthlyRate, months);
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
                            <p class="font-medium">${formatCurrency(monthlyPayment)}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Total Interest</p>
                            <p class="font-medium">${formatCurrency(totalInterest)}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Total</p>
                            <p class="font-medium">${formatCurrency(totalRepayment)}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        comparisonDiv.innerHTML = html;
        resultsDiv.classList.remove('hidden');
    }

    /**
     * Calculate monthly loan payment
     */
    function calculateMonthlyPayment(principal, monthlyRate, months) {
        if (monthlyRate === 0) return principal / months;
        
        const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                        (Math.pow(1 + monthlyRate, months) - 1);
        return payment;
    }

    // SECTION 8: INSURANCE CLAIM SIMULATOR

    /**
     * Setup insurance simulator
     */
    function setupInsuranceSimulator() {
        const insuranceBtn = document.querySelector('.bg-cyan-500');
        if (!insuranceBtn) return;

        insuranceBtn.addEventListener('click', openInsuranceSimulator);
    }

    /**
     * Open insurance claim simulator
     */
    function openInsuranceSimulator() {
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
                
                <p class="text-gray-600 mb-4">
                    Practice the insurance claim process step by step.
                </p>
                
                <div class="mb-4">
                    <label class="block text-gray-700 font-medium mb-2">Claim Type</label>
                    <select id="claim-type" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                        <option value="rainfall">Rainfall Insurance</option>
                        <option value="accident">BodaBoda Accident</option>
                        <option value="health">Health Cash</option>
                        <option value="phone">Phone Insurance</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 font-medium mb-2">Claim Amount (Ksh)</label>
                    <input type="number" id="claim-amount" class="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-green-500" value="5000" min="1000" max="50000">
                </div>
                
                <div class="mb-6">
                    <label class="block text-gray-700 font-medium mb-2">Upload Document (Simulated)</label>
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

        // Simulate file upload
        const uploadArea = document.getElementById('upload-area');
        const uploadStatus = document.getElementById('upload-status');
        let documentUploaded = false;

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
            const claimType = document.getElementById('claim-type').value;
            const claimAmount = parseFloat(document.getElementById('claim-amount').value);
            
            if (!documentUploaded) {
                showNotification('Please upload a document first', 'error');
                return;
            }
            
            processInsuranceClaim(claimType, claimAmount);
        });
    }

    /**
     * Process insurance claim simulation
     */
    function processInsuranceClaim(type, amount) {
        const resultDiv = document.getElementById('claim-result');
        
        // Simulate claim processing (80% success rate)
        const success = Math.random() < 0.8;
        
        if (success) {
            const payout = amount * 0.9; // 10% deductible
            
            resultDiv.className = 'mt-6 p-4 bg-green-50 rounded-lg';
            resultDiv.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                    <h4 class="font-bold text-green-700 mb-1">Claim Approved!</h4>
                    <p class="text-gray-600 mb-2">Your claim has been processed successfully.</p>
                    <p class="text-green-600 font-bold">Payout: ${formatCurrency(payout)}</p>
                    <p class="text-xs text-gray-500 mt-2">M-Pesa Code: MPESA${Math.floor(Math.random() * 1000000)}</p>
                </div>
            `;
        } else {
            resultDiv.className = 'mt-6 p-4 bg-red-50 rounded-lg';
            resultDiv.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-times-circle text-red-500 text-3xl mb-2"></i>
                    <h4 class="font-bold text-red-700 mb-1">Claim Rejected</h4>
                    <p class="text-gray-600 mb-2">Insufficient documentation. Please review requirements.</p>
                    <p class="text-sm text-gray-500">Reason: Documentation incomplete</p>
                </div>
            `;
        }
        
        resultDiv.classList.remove('hidden');
    }

    // SECTION 9: BUDGET CHALLENGE

    /**
     * Setup budget challenge
     */
    function setupBudgetChallenge() {
        const joinBtn = document.querySelector('.bg-white.text-green-600');
        if (!joinBtn) return;

        joinBtn.addEventListener('click', joinBudgetChallenge);
    }

    /**
     * Join budget challenge
     */
    function joinBudgetChallenge() {
        // Check if already joined
        const challengeData = localStorage.getItem(`challenge_${currentUser?.userId}`);
        
        if (challengeData) {
            // Resume challenge
            const data = JSON.parse(challengeData);
            showChallengeModal(data);
        } else {
            // Start new challenge
            const newChallenge = {
                day: 1,
                budget: 30000,
                spent: 0,
                categories: {
                    food: 0,
                    transport: 0,
                    rent: 0,
                    entertainment: 0,
                    other: 0
                },
                startDate: new Date().toISOString()
            };
            localStorage.setItem(`challenge_${currentUser?.userId}`, JSON.stringify(newChallenge));
            showChallengeModal(newChallenge);
        }
    }

    /**
     * Show challenge modal
     */
    function showChallengeModal(challenge) {
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
                        <span class="font-medium">Spent: ${formatCurrency(challenge.spent)}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-green-500 h-3 rounded-full" style="width: ${progress}%"></div>
                    </div>
                    <p class="text-right text-sm text-gray-500 mt-1">Remaining: ${formatCurrency(remaining)}</p>
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

        // Handle spending buttons
        document.querySelectorAll('.spending-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                const category = btn.dataset.category;
                
                if (remaining - amount >= 0) {
                    challenge.spent += amount;
                    challenge.categories[category] += amount;
                    localStorage.setItem(`challenge_${currentUser?.userId}`, JSON.stringify(challenge));
                    showNotification(`Spent ${formatCurrency(amount)} on ${category}`, 'info');
                    
                    // Update progress bar
                    const newProgress = (challenge.spent / challenge.budget) * 100;
                    document.querySelector('.bg-green-500.h-3').style.width = newProgress + '%';
                    document.querySelector('.text-right.text-sm.text-gray-500').textContent = 
                        `Remaining: ${formatCurrency(challenge.budget - challenge.spent)}`;
                } else {
                    showNotification('Insufficient budget for this expense', 'error');
                }
            });
        });

        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        document.getElementById('end-day').addEventListener('click', () => {
            if (challenge.day >= 30) {
                showNotification('🎉 Congratulations! You completed the 30-day challenge!', 'success');
                localStorage.removeItem(`challenge_${currentUser?.userId}`);
                modal.remove();
            } else {
                challenge.day++;
                challenge.spent = 0;
                challenge.categories = { food: 0, transport: 0, rent: 0, entertainment: 0, other: 0 };
                localStorage.setItem(`challenge_${currentUser?.userId}`, JSON.stringify(challenge));
                showNotification(`Day ${challenge.day} started! New budget: Ksh 1,000`, 'success');
                modal.remove();
            }
        });

        document.getElementById('reset-challenge').addEventListener('click', () => {
            localStorage.removeItem(`challenge_${currentUser?.userId}`);
            showNotification('Challenge reset', 'info');
            modal.remove();
        });
    }

    // SECTION 10: HELPER FUNCTIONS

    /**
     * Format currency
     */
    function formatCurrency(amount) {
        return 'Ksh ' + amount.toLocaleString('en-KE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    /**
     * Show notification toast
     */
    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        } text-white`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    /**
     * Copy to clipboard
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Could not copy to clipboard', 'error');
        });
    }

    // SECTION 11: INITIALIZATION

    /**
     * Initialize the page
     */
    async function initializePage() {
        // Check authentication
        if (!checkAuthentication()) return;
        
        // Load market data
        await loadMarketDataFromJSON();
        
        // Load user portfolio
        userPortfolio = loadUserPortfolio();
        
        // Update navbar (preserves original logo)
        updateNavbarForAuthState();
        
        // Render stock simulator components
        renderPortfolioDisplay();
        renderHoldingsList();
        renderMarketDataTable();
        
        // Setup simulators
        setupLoanSimulator();
        setupInsuranceSimulator();
        setupBudgetChallenge();
        
        // Update leaderboard and stats
        updateLeaderboard();
        updatePracticeStats();
        
        // Draw charts
        setTimeout(() => {
            drawPortfolioPerformanceChart();
            drawAssetAllocationChart();
            drawPerformanceComparisonChart();
        }, 500);
        
        // Start price simulation
        startPriceSimulation();
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
        .holding-item, .market-row {
            transition: all 0.2s;
        }
        .holding-item:hover, .market-row:hover {
            transform: translateX(5px);
        }
    `;
    document.head.appendChild(style);

    // Start when DOM is ready
    document.addEventListener('DOMContentLoaded', initializePage);

})();