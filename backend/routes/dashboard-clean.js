const express = require('express');
const bodyParser = require('body-parser');

const dashboardRouter = express.Router();
dashboardRouter.use(bodyParser.json());

// Add CORS headers manually
const addCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};

dashboardRouter.use(addCorsHeaders);

// Test route
dashboardRouter.get('/test', (req, res) => {
  res.json({
    message: 'Dashboard router is working!',
    timestamp: new Date().toISOString()
  });
});

// Stats route with basic auth check
dashboardRouter.get('/stats', (req, res) => {
  try {
    // Basic auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Return realistic dashboard data
    const stats = {
      devices: {
        total: 2,
        connected: 2,
        approved: 2,
        running: 1
      },
      tunnels: {
        total: 0,
        active: 0
      },
      networks: {
        total: 8,
        active: 4
      },
      alerts: {
        total: 0,
        unread: 0
      },
      summary: {
        devices: 2,
        tunnels: 0,
        networks: 8,
        alerts: 0
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

// Alerts route
dashboardRouter.get('/alerts', (req, res) => {
  try {
    // Basic auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Return empty alerts for now
    res.json([]);
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ error: 'Failed to get dashboard alerts' });
  }
});

module.exports = dashboardRouter;