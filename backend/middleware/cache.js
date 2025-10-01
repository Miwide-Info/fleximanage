// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// Advanced caching middleware for API responses

const NodeCache = require('node-cache');

// Create cache instances with different TTLs for different types of data
const caches = {
  // Short-term cache for frequently changing data (30 seconds)
  short: new NodeCache({ 
    stdTTL: 30, 
    checkperiod: 60,
    useClones: false,
    maxKeys: 1000
  }),
  
  // Medium-term cache for moderately changing data (5 minutes)
  medium: new NodeCache({ 
    stdTTL: 300, 
    checkperiod: 600,
    useClones: false,
    maxKeys: 500
  }),
  
  // Long-term cache for rarely changing data (1 hour)
  long: new NodeCache({ 
    stdTTL: 3600, 
    checkperiod: 1800,
    useClones: false,
    maxKeys: 200
  })
};

// Cache key generator
function generateCacheKey(req) {
  const userId = req.user ? req.user._id : 'anonymous';
  const orgId = req.user && req.user.defaultOrg ? req.user.defaultOrg._id : 'no-org';
  const method = req.method;
  const path = req.path;
  const query = JSON.stringify(req.query);
  
  return `${method}:${path}:${userId}:${orgId}:${query}`;
}

// Determine cache duration based on endpoint
function getCacheDuration(path) {
  // Static/reference data - cache longer
  if (path.includes('/public/') || 
      path.includes('/meta') || 
      path.includes('/serviceTypes')) {
    return 'long';
  }
  
  // User permissions and account data - medium cache
  if (path.includes('/permissions') || 
      path.includes('/account') ||
      path.includes('/organizations')) {
    return 'medium';
  }
  
  // Dynamic data - short cache
  return 'short';
}

// Cache middleware factory
function createCacheMiddleware(options = {}) {
  const {
    skipCache = false,
    customTTL = null,
    keyGenerator = generateCacheKey
  } = options;

  return (req, res, next) => {
    // Skip caching for non-GET requests or if explicitly disabled
    if (req.method !== 'GET' || skipCache) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cacheDuration = customTTL || getCacheDuration(req.path);
    const cache = caches[cacheDuration] || caches.short;

    // Try to get from cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      // Set cache headers
      res.set({
        'X-Cache': 'HIT',
        'X-Cache-Key': cacheKey,
        'Cache-Control': `public, max-age=${cache.options.stdTTL}`
      });
      
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function(body) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, body);
        
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${cache.options.stdTTL}`
        });
      }
      
      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  };
}

// Cache invalidation helpers
function invalidateCache(pattern) {
  Object.values(caches).forEach(cache => {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
      }
    });
  });
}

function invalidateUserCache(userId) {
  invalidateCache(`:${userId}`);
}

function invalidateOrgCache(orgId) {
  invalidateCache(`:${orgId}`);
}

// Cache statistics
function getCacheStats() {
  return {
    short: caches.short.getStats(),
    medium: caches.medium.getStats(),
    long: caches.long.getStats()
  };
}

module.exports = {
  createCacheMiddleware,
  invalidateCache,
  invalidateUserCache,
  invalidateOrgCache,
  getCacheStats,
  caches
};