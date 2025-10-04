const express = require('express');
const dashboardRouter = express.Router();

// Add CORS headers manually
dashboardRouter.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Test route - minimal implementation
dashboardRouter.get('/test', (req, res) => {
  console.log('Dashboard test route called');
  res.json({
    message: 'Dashboard router is working!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  });
});

// Stats route - minimal auth check
dashboardRouter.get('/stats', (req, res) => {
  console.log('Dashboard stats route called');
  
  // Very basic auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Return static test data
  const stats = {
    summary: {
      devices: 2,
      tunnels: 0,
      networks: 8,
      alerts: 0
    }
  };

  res.json(stats);
});

// Alerts route
dashboardRouter.get('/alerts', (req, res) => {
  console.log('Dashboard alerts route called');
  
  // Very basic auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Return empty alerts for now
  res.json([]);
});

console.log('Dashboard router module loaded');
module.exports = dashboardRouter;