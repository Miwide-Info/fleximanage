# FlexiManage Technical Implementation Guide

## Quick Start Guide

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Memory**: 4GB+ RAM
- **Storage**: 20GB+ available space
- **Network**: HTTPS/SSL capable

### Installation & Setup

#### 1. Clone Repository
```bash
git clone https://github.com/Miwide-Info/fleximanage.git
cd fleximanage
```

#### 2. Environment Configuration
```bash
# Create environment file
cat > .env << EOF
NODE_ENV=development
MONGO_URI=mongodb://mongo-primary:27017,mongo-secondary1:27017,mongo-secondary2:27017/flexiwan?replicaSet=rs
DEVICE_SECRET_KEY=abcdefg1234567
TOKEN_ALLOWED_SERVERS=https://manage.miwide.com:3443,https://manage.miwide.com:443
AGENT_BROKER=manage.miwide.com:3443
CORS_WHITELIST=https://manage.miwide.com:3443,http://local.miwide.com:3000
EOF
```

#### 3. SSL Certificate Setup
```bash
# Create certificate directory
mkdir -p backend/bin/cert.manage.miwide.com

# Generate self-signed certificate (for development)
openssl req -x509 -newkey rsa:4096 -keyout backend/bin/cert.manage.miwide.com/domain.key \
  -out backend/bin/cert.manage.miwide.com/certificate.pem -days 365 -nodes \
  -subj "/CN=manage.miwide.com"
```

#### 4. Deploy Services
```bash
# Start all services
docker compose up -d

# Initialize MongoDB replica set
sleep 30
docker exec flexi-mongo-primary mongo --eval "
rs.initiate({
  _id: 'rs',
  members: [
    { _id: 0, host: 'mongo-primary:27017' },
    { _id: 1, host: 'mongo-secondary1:27017' },
    { _id: 2, host: 'mongo-secondary2:27017' }
  ]
})
"
```

#### 5. Create Admin User
```bash
# Access backend container
docker exec -it flexi-backend bash

# Run admin creation script
node create-admin.js
# Username: admin@flexiwan.com
# Password: admin
```

#### 6. Verify Installation
```bash
# Check service health
curl -k https://manage.miwide.com:3443/api/health

# Test authentication
curl -k -X POST https://manage.miwide.com:3443/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@flexiwan.com","password":"admin"}'
```

## Architecture Deep Dive

### Backend Architecture

#### Express.js Application Structure
```
backend/
├── bin/www                    # Application entry point
├── configs.js                # Configuration management
├── expressserver.js          # Express server setup
├── authenticate.js           # JWT authentication
├── controllers/              # API controllers
├── services/                 # Business logic
├── models/                   # MongoDB schemas
├── routes/                   # API routes
├── middleware/               # Custom middleware
├── utils/                    # Utility functions
└── periodic/                 # Background tasks
```

#### Key Service Files
- **DevicesService.js**: Device management and API endpoints
- **TokensService.js**: Authentication token handling
- **OrganizationsService.js**: Multi-tenant organization management
- **UsersService.js**: User authentication and authorization

#### Database Models
```javascript
// Device Schema
const deviceSchema = new Schema({
  org: { type: ObjectId, ref: 'organizations', required: true },
  account: { type: ObjectId, ref: 'accounts', required: true },
  machineId: { type: String, required: true, unique: true },
  hostname: { type: String, required: true },
  deviceToken: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  interfaces: [interfaceSchema],
  versions: versionSchema,
  status: { type: String, default: 'pending' },
  isConnected: { type: Boolean, default: false }
});
```

### Frontend Architecture

#### React Application Structure
```
frontend/
├── public/                   # Static assets
├── src/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── utils/              # Helper functions
│   ├── styles/             # CSS/SCSS files
│   └── App.js              # Main application
└── package.json            # Dependencies
```

#### API Integration
```javascript
// API Service Example
const apiClient = axios.create({
  baseURL: 'https://manage.miwide.com:3443/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Devices API
export const getDevices = async (detailed = false) => {
  const params = detailed ? '?response=detailed' : '';
  const response = await apiClient.get(`/devices${params}`);
  return response.data;
};
```

### Database Configuration

#### MongoDB Replica Set
```javascript
// Connection Configuration
const mongoConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  replicaSet: 'rs',
  readPreference: 'primary',
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
};
```

#### Collection Indexes
```javascript
// Recommended indexes for performance
db.devices.createIndex({ "org": 1, "machineId": 1 })
db.devices.createIndex({ "deviceToken": 1 })
db.devices.createIndex({ "isApproved": 1, "status": 1 })
db.tokens.createIndex({ "org": 1, "name": 1 })
db.organizations.createIndex({ "account": 1 })
```

## API Reference

### Authentication Endpoints

#### POST /api/users/login
```bash
curl -k -X POST https://manage.miwide.com:3443/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@flexiwan.com",
    "password": "admin"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "_id": "user_id",
    "username": "admin@flexiwan.com",
    "org": "org_id"
  }
}
```

### Device Management Endpoints

#### GET /api/devices
```bash
curl -k -H "Authorization: Bearer $TOKEN" \
  https://manage.miwide.com:3443/api/devices?response=detailed
```

**Response:**
```json
[
  {
    "_id": "device_id",
    "machineId": "8074EA04-95F9-48A8-BB14-3AD7479B6BAE",
    "hostname": "flexiwan-router",
    "isApproved": true,
    "status": "pending",
    "isConnected": false,
    "versions": {
      "agent": "6.3.40",
      "router": "22.02.0",
      "device": "1.0.0"
    },
    "interfaces": [],
    "org": {
      "_id": "org_id",
      "name": "mytest"
    }
  }
]
```

#### POST /api/devices
```bash
curl -k -X POST https://manage.miwide.com:3443/api/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "NEW-DEVICE-ID",
    "hostname": "new-router",
    "deviceToken": "device_registration_token"
  }'
```

### Token Management

#### GET /api/tokens
```bash
curl -k -H "Authorization: Bearer $TOKEN" \
  https://manage.miwide.com:3443/api/tokens
```

#### POST /api/tokens
```bash
curl -k -X POST https://manage.miwide.com:3443/api/tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EdgeToken",
    "description": "Device registration token"
  }'
```

## Development Workflows

### Adding New Device Types

#### 1. Update Device Schema
```javascript
// models/devices.js
const deviceTypeSchema = new Schema({
  type: {
    type: String,
    enum: ['router', 'gateway', 'switch', 'firewall'],
    default: 'router'
  },
  capabilities: [{
    type: String,
    enum: ['routing', 'switching', 'firewall', 'vpn']
  }]
});
```

#### 2. Extend Device Service
```javascript
// services/DevicesService.js
async function createDevice(deviceData) {
  const device = new devices({
    ...deviceData,
    type: deviceData.type || 'router',
    capabilities: deviceData.capabilities || ['routing']
  });
  
  return await device.save();
}
```

#### 3. Update API Controller
```javascript
// controllers/DevicesController.js
exports.createDevice = async (req, res) => {
  try {
    const device = await DevicesService.createDevice(req.body);
    res.status(201).json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

### Database Migration Example

#### Create Migration Script
```javascript
// migrations/add-device-type.js
const mongoose = require('mongoose');

async function up() {
  const db = mongoose.connection.db;
  
  // Add type field to existing devices
  await db.collection('devices').updateMany(
    { type: { $exists: false } },
    { $set: { type: 'router', capabilities: ['routing'] } }
  );
  
  console.log('Migration completed: Added device types');
}

async function down() {
  const db = mongoose.connection.db;
  
  // Remove type field
  await db.collection('devices').updateMany(
    {},
    { $unset: { type: '', capabilities: '' } }
  );
  
  console.log('Migration reverted: Removed device types');
}

module.exports = { up, down };
```

#### Run Migration
```bash
# Execute migration
node migrations/add-device-type.js
```

## Testing & Quality Assurance

### Unit Testing Setup

#### Install Testing Dependencies
```bash
npm install --save-dev jest supertest
```

#### Example Test File
```javascript
// tests/devices.test.js
const request = require('supertest');
const app = require('../expressserver');

describe('Devices API', () => {
  let authToken;
  
  beforeAll(async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        username: 'admin@flexiwan.com',
        password: 'admin'
      });
    
    authToken = response.body.token;
  });
  
  test('GET /api/devices should return device list', async () => {
    const response = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
  
  test('POST /api/devices should create new device', async () => {
    const deviceData = {
      machineId: 'TEST-DEVICE-123',
      hostname: 'test-router'
    };
    
    const response = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData)
      .expect(201);
    
    expect(response.body.machineId).toBe(deviceData.machineId);
  });
});
```

#### Run Tests
```bash
npm test
```

### Load Testing

#### Install Artillery
```bash
npm install -g artillery
```

#### Create Load Test Config
```yaml
# load-test.yml
config:
  target: 'https://manage.miwide.com:3443'
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    token: 'your_jwt_token_here'

scenarios:
  - name: "Device API Load Test"
    requests:
      - get:
          url: "/api/devices"
          headers:
            Authorization: "Bearer {{ token }}"
```

#### Run Load Test
```bash
artillery run load-test.yml
```

## Security Best Practices

### JWT Token Security

#### Token Configuration
```javascript
// Enhanced JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  expiresIn: '1h',
  refreshExpiresIn: '7d',
  algorithm: 'HS256',
  issuer: 'fleximanage',
  audience: 'fleximanage-users'
};
```

#### Token Validation Middleware
```javascript
const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Input Validation

#### Joi Validation Schemas
```javascript
const deviceValidationSchema = Joi.object({
  machineId: Joi.string().uuid().required(),
  hostname: Joi.string().min(3).max(63).required(),
  deviceToken: Joi.string().length(64).required(),
  interfaces: Joi.array().items(interfaceSchema).optional()
});

const validateDevice = (req, res, next) => {
  const { error } = deviceValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};
```

### Rate Limiting

#### Express Rate Limit Configuration
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

## Monitoring & Logging

### Application Logging

#### Winston Logger Configuration
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

#### Request Logging Middleware
```javascript
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};
```

### Health Monitoring

#### Health Check Endpoint
```javascript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {}
  };
  
  try {
    // Check MongoDB
    await mongoose.connection.db.admin().ping();
    health.services.mongodb = 'UP';
  } catch (error) {
    health.services.mongodb = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  try {
    // Check Redis
    await redis.ping();
    health.services.redis = 'UP';
  } catch (error) {
    health.services.redis = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

## Deployment Guide

### Production Deployment

#### Docker Compose Production
```yaml
version: '3.8'
services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
```

#### Nginx Configuration
```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 443 ssl http2;
    server_name manage.miwide.com;
    
    ssl_certificate /etc/nginx/ssl/certificate.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Environment Variables

#### Production Environment
```bash
# .env.production
NODE_ENV=production
MONGO_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/flexiwan?replicaSet=rs&ssl=true
JWT_SECRET=your_secure_random_secret_here
DEVICE_SECRET_KEY=your_device_secret_here
REDIS_URL=redis://redis:6379
LOG_LEVEL=info
```

### Backup & Recovery

#### MongoDB Backup Script
```bash
#!/bin/bash
# backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DATABASE="flexiwan"

mkdir -p $BACKUP_DIR

mongodump --host mongodb://mongo-primary:27017 \
  --db $DATABASE \
  --out $BACKUP_DIR/$DATE

tar -czf $BACKUP_DIR/flexiwan_$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

echo "Backup completed: flexiwan_$DATE.tar.gz"
```

#### Automated Backup with Cron
```bash
# Add to crontab
0 2 * * * /opt/scripts/backup-mongodb.sh >> /var/log/backup.log 2>&1
```

---

## Support & Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check replica set status
docker exec flexi-mongo-primary mongo --eval "rs.status()"

# Reinitialize replica set if needed
docker exec flexi-mongo-primary mongo --eval "rs.reconfig(config, {force: true})"
```

#### 2. SSL Certificate Issues
```bash
# Regenerate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout domain.key \
  -out certificate.pem -days 365 -nodes \
  -subj "/CN=manage.miwide.com"
```

#### 3. Device Registration Failures
```bash
# Check device token validity
node -e "
const jwt = require('jsonwebtoken');
const token = 'your_token_here';
console.log(jwt.decode(token));
"
```

### Debug Commands

```bash
# View application logs
docker compose logs backend --tail=100 -f

# MongoDB shell access
docker exec -it flexi-mongo-primary mongo

# Redis CLI access
docker exec -it flexi-redis redis-cli

# Backend container shell
docker exec -it flexi-backend bash
```

### Performance Tuning

#### Node.js Optimization
```javascript
// pm2 configuration
module.exports = {
  apps: [{
    name: 'fleximanage',
    script: './bin/www',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

#### MongoDB Optimization
```javascript
// Connection pool optimization
mongoose.connect(uri, {
  maxPoolSize: 10,
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

---

**Last Updated**: October 2, 2025  
**Version**: 6.3.37  
**Documentation**: Technical Implementation Guide