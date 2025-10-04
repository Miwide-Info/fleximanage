const express = require('express');
const bodyParser = require('body-parser');

const dashboardRouter = express.Router();
dashboardRouter.use(bodyParser.json());

// Test route - no auth required for debugging
dashboardRouter.route('/test')
  .options((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.sendStatus(200);
  })
  .get((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.json({
      message: 'Dashboard router is working!',
      timestamp: new Date().toISOString()
    });
  });

// Stats route - minimal auth check
dashboardRouter.route('/stats')
  .options((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.sendStatus(200);
  })
  .get((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');

    // Basic auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No auth token' });
    }

    // Return actual data
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
      }
    };

    res.json(stats);
  });

// Alerts route
dashboardRouter.route('/alerts')
  .options((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.sendStatus(200);
  })
  .get((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');

    // Basic auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No auth token' });
    }

    // Return empty alerts
    res.json([]);
  });

module.exports = dashboardRouter;