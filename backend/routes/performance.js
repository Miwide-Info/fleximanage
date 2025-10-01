// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// Performance monitoring router

const express = require('express');
const router = express.Router();
const os = require('os');
const process = require('process');
const { getCacheStats } = require('../middleware/cache');

// Memory usage monitoring
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100 // MB
  };
}

// CPU usage monitoring
function getCpuUsage() {
  const cpus = os.cpus();
  return {
    count: cpus.length,
    model: cpus[0]?.model || 'Unknown',
    speed: cpus[0]?.speed || 0,
    loadAvg: os.loadavg(),
    uptime: os.uptime()
  };
}

// Process statistics
function getProcessStats() {
  return {
    pid: process.pid,
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

// System information
function getSystemInfo() {
  return {
    hostname: os.hostname(),
    type: os.type(),
    release: os.release(),
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 * 100) / 100, // MB
    freeMemory: Math.round(os.freemem() / 1024 / 1024 * 100) / 100, // MB
    memoryUsagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 100 * 100) / 100
  };
}

// Performance metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: getMemoryUsage(),
      cpu: getCpuUsage(),
      process: getProcessStats(),
      system: getSystemInfo(),
      cache: getCacheStats()
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Health check with performance data
router.get('/health', (req, res) => {
  try {
    const memory = getMemoryUsage();
    const system = getSystemInfo();
    
    // Simple health checks
    const isHealthy = {
      memory: memory.heapUsed < 512, // Less than 512MB heap usage
      systemMemory: system.memoryUsagePercent < 90, // Less than 90% system memory usage
      uptime: process.uptime() > 10 // Process running for more than 10 seconds
    };

    const overallHealth = Object.values(isHealthy).every(check => check === true);

    res.status(overallHealth ? 200 : 503).json({
      status: overallHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: require('../package.json')?.version || 'unknown',
      checks: isHealthy,
      uptime: process.uptime(),
      memory: {
        heapUsed: memory.heapUsed,
        systemUsagePercent: system.memoryUsagePercent
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: 'Health check failed' 
    });
  }
});

// Performance summary
router.get('/summary', (req, res) => {
  try {
    const memory = getMemoryUsage();
    const system = getSystemInfo();
    const cacheStats = getCacheStats();
    
    const summary = {
      status: 'running',
      uptime: Math.round(process.uptime()),
      memory: {
        process: `${memory.heapUsed}MB`,
        system: `${system.memoryUsagePercent}%`
      },
      cache: {
        short: { 
          keys: cacheStats.short?.keys || 0,
          hits: cacheStats.short?.hits || 0,
          misses: cacheStats.short?.misses || 0
        },
        medium: { 
          keys: cacheStats.medium?.keys || 0,
          hits: cacheStats.medium?.hits || 0,
          misses: cacheStats.medium?.misses || 0
        },
        long: { 
          keys: cacheStats.long?.keys || 0,
          hits: cacheStats.long?.hits || 0,
          misses: cacheStats.long?.misses || 0
        }
      }
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;