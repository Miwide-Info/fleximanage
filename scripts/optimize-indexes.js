// MongoDB Index Optimization Script
// Run this script to create optimal indexes for FlexiWAN

// Connect to the databases
const dbs = [
  'flexiwan',
  'flexiwanAnalytics', 
  'flexibilling',
  'flexivpn'
];

// Common index patterns for FlexiWAN collections
const indexPatterns = {
  // User-related indexes
  users: [
    { email: 1 },
    { username: 1 },
    { defaultAccount: 1 },
    { 'defaultOrg._id': 1 },
    { createdAt: -1 },
    { 'email': 1, 'isVerified': 1 } // Compound index
  ],
  
  // Account and organization indexes
  accounts: [
    { name: 1 },
    { createdAt: -1 },
    { 'subscription.status': 1 }
  ],
  
  organizations: [
    { account: 1 },
    { name: 1 },
    { createdAt: -1 },
    { 'account': 1, 'name': 1 } // Compound index
  ],
  
  // Device-related indexes
  devices: [
    { machineId: 1 },
    { org: 1 },
    { 'org': 1, 'machineId': 1 }, // Compound index
    { 'org': 1, 'isConnected': 1 }, // Compound index
    { 'org': 1, 'createdAt': -1 }, // Compound index
    { versions: 1 },
    { hostname: 1 },
    { isApproved: 1 },
    { isConnected: 1 }
  ],
  
  // Job and queue indexes
  jobs: [
    { 'meta.device': 1 },
    { 'meta.org': 1 },
    { state: 1 },
    { created_at: -1 },
    { 'meta.org': 1, 'state': 1 }, // Compound index
    { 'meta.device': 1, 'created_at': -1 } // Compound index
  ],
  
  // Token-related indexes
  tokens: [
    { org: 1 },
    { name: 1 },
    { 'org': 1, 'name': 1 }, // Compound index
    { createdAt: -1 }
  ],
  
  // Membership and permissions
  memberships: [
    { user: 1 },
    { account: 1 },
    { organization: 1 },
    { 'user': 1, 'account': 1 }, // Compound index
    { 'account': 1, 'to': 1 } // Compound index
  ],
  
  // Application and policy indexes
  applications: [
    { org: 1 },
    { name: 1 },
    { 'org': 1, 'name': 1 }, // Compound index
    { modified: -1 }
  ],
  
  policies: [
    { org: 1 },
    { name: 1 },
    { 'org': 1, 'name': 1 }, // Compound index
    { modified: -1 }
  ],
  
  // Analytics indexes (for flexiwanAnalytics DB)
  devicestats: [
    { device: 1 },
    { org: 1 },
    { time: -1 },
    { 'device': 1, 'time': -1 }, // Compound index
    { 'org': 1, 'time': -1 } // Compound index
  ],
  
  // Session and logging indexes
  sessions: [
    { expires: 1 }, // TTL index
    { 'session.user': 1 }
  ],
  
  logs: [
    { timestamp: -1 },
    { level: 1 },
    { 'meta.org': 1 },
    { 'meta.device': 1 },
    { 'timestamp': -1, 'level': 1 } // Compound index
  ]
};

// TTL indexes for cleanup
const ttlIndexes = {
  sessions: { expires: 1 }, // Auto-cleanup expired sessions
  logs: { timestamp: 1 }, // Auto-cleanup old logs (set expireAfterSeconds)
  notifications: { createdAt: 1 } // Auto-cleanup old notifications
};

// Function to create indexes for a collection
function createIndexesForCollection(db, collectionName, indexes) {
  const collection = db.getCollection(collectionName);
  
  print(`Creating indexes for ${collectionName}...`);
  
  indexes.forEach((index, i) => {
    try {
      const result = collection.createIndex(index, { background: true });
      print(`  ✓ Index ${i + 1}: ${JSON.stringify(index)} - ${result}`);
    } catch (e) {
      if (e.code !== 85) { // Ignore "IndexOptionsConflict" errors for existing indexes
        print(`  ✗ Failed to create index ${JSON.stringify(index)}: ${e.message}`);
      } else {
        print(`  - Index ${i + 1}: ${JSON.stringify(index)} - Already exists`);
      }
    }
  });
}

// Function to create TTL indexes
function createTTLIndexes(db, collectionName, index, expireAfterSeconds = 86400) {
  const collection = db.getCollection(collectionName);
  
  try {
    const result = collection.createIndex(index, { 
      background: true, 
      expireAfterSeconds: expireAfterSeconds 
    });
    print(`  ✓ TTL Index: ${JSON.stringify(index)} - ${result} (expires after ${expireAfterSeconds}s)`);
  } catch (e) {
    if (e.code !== 85) {
      print(`  ✗ Failed to create TTL index ${JSON.stringify(index)}: ${e.message}`);
    } else {
      print(`  - TTL Index: ${JSON.stringify(index)} - Already exists`);
    }
  }
}

// Main execution
print('=== FlexiWAN Database Index Optimization ===');
print('Creating optimal indexes for better query performance...\n');

// Process each database
dbs.forEach(dbName => {
  print(`--- Processing database: ${dbName} ---`);
  
  try {
    const db = db.getSiblingDB(dbName);
    
    // Create regular indexes
    Object.entries(indexPatterns).forEach(([collectionName, indexes]) => {
      // Check if collection exists
      const collections = db.getCollectionNames();
      if (collections.includes(collectionName)) {
        createIndexesForCollection(db, collectionName, indexes);
      } else {
        print(`  - Collection '${collectionName}' not found, skipping...`);
      }
    });
    
    // Create TTL indexes
    Object.entries(ttlIndexes).forEach(([collectionName, index]) => {
      const collections = db.getCollectionNames();
      if (collections.includes(collectionName)) {
        print(`Creating TTL indexes for ${collectionName}...`);
        
        // Different TTL periods for different collections
        let expireAfterSeconds = 86400; // 1 day default
        if (collectionName === 'logs') expireAfterSeconds = 604800; // 7 days
        if (collectionName === 'sessions') expireAfterSeconds = 3600; // 1 hour
        if (collectionName === 'notifications') expireAfterSeconds = 2592000; // 30 days
        
        createTTLIndexes(db, collectionName, index, expireAfterSeconds);
      }
    });
    
  } catch (e) {
    print(`Error processing database ${dbName}: ${e.message}`);
  }
  
  print('');
});

print('=== Index Optimization Complete ===');
print('');

// Show index usage stats (optional)
print('--- Current Index Statistics ---');
dbs.forEach(dbName => {
  try {
    const db = db.getSiblingDB(dbName);
    const collections = db.getCollectionNames();
    
    print(`Database: ${dbName}`);
    collections.forEach(collectionName => {
      if (indexPatterns[collectionName]) {
        const stats = db.getCollection(collectionName).getIndexes();
        print(`  ${collectionName}: ${stats.length} indexes`);
      }
    });
  } catch (e) {
    print(`Error getting stats for ${dbName}: ${e.message}`);
  }
});

print('\n=== Optimization Tips ===');
print('1. Monitor query performance using db.collection.explain()');
print('2. Use the performance monitoring endpoint: /api/performance/metrics');
print('3. Consider adding custom indexes based on your specific query patterns');
print('4. Review and drop unused indexes periodically');
print('5. Monitor index usage with db.collection.aggregate([{$indexStats:{}}])');