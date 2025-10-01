// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// Database query optimization utilities

const logger = require('../logging/logging')({ module: module.filename, type: 'db' });

// MongoDB query optimization helpers
class QueryOptimizer {
  constructor() {
    this.queryStats = new Map();
  }

  // Add query execution time tracking
  trackQuery(collection, query, executionTime) {
    const queryKey = `${collection}:${JSON.stringify(query)}`;
    const stats = this.queryStats.get(queryKey) || { 
      count: 0, 
      totalTime: 0, 
      avgTime: 0,
      maxTime: 0 
    };
    
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    
    this.queryStats.set(queryKey, stats);

    // Log slow queries
    if (executionTime > 1000) { // Queries taking more than 1 second
      logger.warn('Slow query detected', {
        params: {
          collection,
          query: JSON.stringify(query),
          executionTime: `${executionTime}ms`
        }
      });
    }
  }

  // Get query statistics
  getStats() {
    const stats = {};
    this.queryStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  // Get slow queries
  getSlowQueries(threshold = 500) {
    const slowQueries = {};
    this.queryStats.forEach((value, key) => {
      if (value.avgTime > threshold) {
        slowQueries[key] = value;
      }
    });
    return slowQueries;
  }
}

// Mongoose middleware for query optimization
function addQueryOptimization(schema) {
  const optimizer = new QueryOptimizer();

  // Pre-hook to start timing
  schema.pre(/^find/, function() {
    this._startTime = Date.now();
  });

  // Post-hook to track execution time
  schema.post(/^find/, function() {
    if (this._startTime) {
      const executionTime = Date.now() - this._startTime;
      const collection = this.model.collection.name;
      const query = this.getQuery();
      
      optimizer.trackQuery(collection, query, executionTime);
    }
  });

  // Add static method to get stats
  schema.statics.getQueryStats = function() {
    return optimizer.getStats();
  };

  schema.statics.getSlowQueries = function(threshold) {
    return optimizer.getSlowQueries(threshold);
  };
}

// Common query optimizations
const commonOptimizations = {
  // Add lean() for read-only operations
  addLean: (query) => {
    if (query.op && query.op.includes('find')) {
      return query.lean();
    }
    return query;
  },

  // Add proper field selection
  selectFields: (query, fields) => {
    if (fields && Array.isArray(fields)) {
      return query.select(fields.join(' '));
    }
    return query;
  },

  // Add pagination
  addPagination: (query, page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    return query.skip(skip).limit(limit);
  },

  // Add sorting with index hints
  addSort: (query, sort = { _id: 1 }) => {
    return query.sort(sort);
  }
};

// Database connection pooling optimization
function optimizeMongoConnection(mongoose) {
  // Set optimal connection pool settings
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection optimized', {
      params: {
        maxPoolSize: mongoose.connection.db.options?.maxPoolSize || 'default',
        minPoolSize: mongoose.connection.db.options?.minPoolSize || 'default',
        serverSelectionTimeoutMS: mongoose.connection.db.options?.serverSelectionTimeoutMS || 'default'
      }
    });
  });

  // Monitor connection pool events
  mongoose.connection.on('connectionPoolCreated', () => {
    logger.info('MongoDB connection pool created');
  });

  mongoose.connection.on('connectionCheckedOut', () => {
    logger.debug('MongoDB connection checked out from pool');
  });

  mongoose.connection.on('connectionCheckedIn', () => {
    logger.debug('MongoDB connection returned to pool');
  });
}

// Index recommendations based on query patterns
function generateIndexRecommendations(queryStats) {
  const recommendations = [];
  
  Object.entries(queryStats).forEach(([queryKey, stats]) => {
    if (stats.avgTime > 100) { // Queries averaging more than 100ms
      const [collection, queryStr] = queryKey.split(':');
      try {
        const query = JSON.parse(queryStr);
        const fields = Object.keys(query);
        
        if (fields.length > 0) {
          recommendations.push({
            collection,
            fields,
            reason: `Slow query (avg: ${stats.avgTime.toFixed(2)}ms, count: ${stats.count})`,
            suggestedIndex: fields.reduce((acc, field) => {
              acc[field] = 1;
              return acc;
            }, {})
          });
        }
      } catch (e) {
        // Skip invalid query strings
      }
    }
  });
  
  return recommendations;
}

module.exports = {
  QueryOptimizer,
  addQueryOptimization,
  commonOptimizations,
  optimizeMongoConnection,
  generateIndexRecommendations
};