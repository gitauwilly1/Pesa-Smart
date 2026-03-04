// server.js - JSON Server configuration
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('data'); // Serves everything in /data folder
const middlewares = jsonServer.defaults();

// Custom middleware for logging
server.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares);

// Add custom routes before JSON Server router
server.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'PesaSmart API is running' });
});

// Get user with their transactions (simulate SQL join)
server.get('/api/users/:id/portfolio', (req, res) => {
    const db = router.db; // Get lowdb instance
    const userId = req.params.id;
    
    const user = db.get('users').find({ id: userId }).value();
    const transactions = db.get('transactions').filter({ userId }).value();
    const goals = db.get('goals').filter({ userId }).value();
    
    res.json({
        user,
        transactions,
        goals,
        totalInvested: transactions
            .filter(t => t.type === 'investment')
            .reduce((sum, t) => sum + t.amount, 0)
    });
});

// Get market summary with indices
server.get('/api/market/summary', (req, res) => {
    const db = router.db;
    const stocks = db.get('stocks').value();
    const indices = db.get('indices').value();
    
    const gainers = stocks.filter(s => s.change > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5);
    
    const losers = stocks.filter(s => s.change < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5);
    
    res.json({
        indices,
        gainers,
        losers,
        lastUpdated: new Date().toISOString()
    });
});

// Use default router
server.use('/api', router);

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`✅ PesaSmart API Server running on port ${port}`);
    console.log(`📁 Serving data from: ${__dirname}/data`);
    console.log(`\nAvailable endpoints:`);
    console.log(`   GET  /api/users`);
    console.log(`   GET  /api/products`);
    console.log(`   GET  /api/courses`);
    console.log(`   GET  /api/market`);
    console.log(`   GET  /api/transactions`);
    console.log(`   GET  /api/goals`);
    console.log(`   GET  /api/insurance`);
    console.log(`   GET  /api/static/counties`);
    console.log(`   GET  /api/static/occupations`);
    console.log(`\nCustom endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/users/:id/portfolio`);
    console.log(`   GET  /api/market/summary`);
    console.log(`\n🚀 Server ready at: http://localhost:${port}/api`);
});