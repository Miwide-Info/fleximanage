# FlexiManage Docker Usage Guide

## Overview

FlexiManage is an open-source SD-WAN management platform. This document provides a complete guide for running FlexiManage backend services using Docker.

## System Requirements

### Minimum Configuration
- **Operating System**: Linux (Ubuntu 20.04+), macOS, Windows with WSL2
- **Memory**: 4GB RAM (recommended 8GB+)
- **Storage**: 20GB available space
- **Network**: Internet access required for dependency downloads

### Required Software
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Git**: For cloning code repository

### Port Requirements
Ensure the following ports are not occupied:
- `3000` - HTTP API service
- `3443` - HTTPS API service  
- `27017-27019` - MongoDB replica set
- `6379` - Redis cache
- `8025` - SMTP4Dev (development mail service)

## Quick Start

### 1. Get Code
```bash
git clone https://github.com/Miwide-Info/fleximanage.git
cd fleximanage
```

### 2. Environment Configuration
```bash
# Copy environment variable template
cp .env.example .env.docker

# Edit environment variables as needed
nano .env.docker
```

### 3. Start Services
```bash
# Use startup script (recommended)
./start.sh

# Or start manually
docker compose up -d
```

### 4. Verify Services
```bash
# Check container status
docker compose ps

# Health check
curl -k https://localhost:3443/api/health
```

## Service Architecture

### Core Services

#### 1. Backend Service
- **Container Name**: `flexi-backend`
- **Technology Stack**: Node.js 18 + Express.js
- **Ports**: 
  - `3000` - HTTP
  - `3443` - HTTPS
- **Health Check**: `GET /api/health`
- **API Documentation**: `https://localhost:3443/api-docs`

#### 2. MongoDB Replica Set
- **Primary**: `mongo-primary:27017`
- **Secondary 1**: `mongo-secondary1:27018`
- **Secondary 2**: `mongo-secondary2:27019`
- **Replica Set Name**: `rs`
- **Data Persistence**: Docker volumes

#### 3. Redis Cache
- **Container Name**: `flexi-redis`
- **Port**: `6379`
- **Purpose**: Session management, API caching

#### 4. SMTP4Dev (Development Environment)
- **Container Name**: `flexi-smtp`
- **Port**: `8025` (Web UI)
- **Purpose**: Email testing and debugging

### Network Configuration
- **Network Name**: `flexi-network`
- **Type**: Bridge network
- **Inter-service Communication**: Container name resolution

## Development Environment Configuration

### 1. Development Mode Startup
```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# View real-time logs
docker compose logs -f backend
```

### 2. Code Hot Reload
```bash
# Mount source code directory for hot reload
docker compose -f docker-compose.dev.yml up -d

# Enter backend container
docker exec -it flexi-backend sh
```

### 3. Database Management
```bash
# Connect to MongoDB Primary
docker exec -it flexi-mongo-primary mongosh

# Check replica set status
docker exec -it flexi-mongo-primary mongosh --eval "rs.status()"

# Database backup
docker exec flexi-mongo-primary mongodump --out /backup
```

## Environment Variables Configuration

### Key Environment Variables

```bash
# .env.docker configuration example

# Application configuration
NODE_ENV=development
PORT=3000
HTTPS_PORT=3443

# Database configuration
MONGO_URI=mongodb://mongo-primary:27017,mongo-secondary1:27017,mongo-secondary2:27017/flexiwan?replicaSet=rs

# Authentication configuration
JWT_SECRET=your_jwt_secret_here
DEVICE_SECRET_KEY=your_device_secret_here

# Network configuration
AGENT_BROKER=localhost:3443
CORS_WHITELIST=http://localhost:3000,https://localhost:3443

# Redis configuration
REDIS_URL=redis://redis:6379

# Mail configuration (development)
SMTP_HOST=smtp4dev
SMTP_PORT=25
```

### Production Environment Variables
```bash
# Additional production environment configuration
NODE_ENV=production
LOG_LEVEL=info
SSL_CERT_PATH=/app/certs/certificate.pem
SSL_KEY_PATH=/app/certs/private.key

# External database
MONGO_URI=mongodb://prod-mongo1:27017,prod-mongo2:27017,prod-mongo3:27017/flexiwan?replicaSet=rs&ssl=true
MONGO_AUTH_SOURCE=admin
MONGO_USERNAME=flexiwan_user
MONGO_PASSWORD=secure_password

# External Redis
REDIS_URL=redis://prod-redis:6379
REDIS_PASSWORD=redis_password
```

## API Usage Guide

### 1. Authentication
```bash
# Login to get JWT Token
curl -k -X POST https://localhost:3443/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@flexiwan.com","password":"admin"}'

# Use Token to access API
curl -k -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://localhost:3443/api/devices
```

### 2. Common API Endpoints
```bash
# Health check
GET /api/health

# User management
POST /api/users/login          # User login
GET  /api/users/profile        # Get user information

# Device management
GET    /api/devices            # Get device list
POST   /api/devices            # Register new device
GET    /api/devices/:id        # Get device details
PUT    /api/devices/:id        # Update device configuration
DELETE /api/devices/:id        # Delete device

# Organization management
GET  /api/organizations        # Get organization list
POST /api/organizations        # Create organization

# Token management
GET  /api/tokens              # Get token list
POST /api/tokens              # Create new token
```

## Troubleshooting

### Common Issues

#### 1. Container Startup Failure
```bash
# Check container status
docker compose ps

# View error logs
docker compose logs backend

# Restart service
docker compose restart backend
```

#### 2. Database Connection Issues
```bash
# Check MongoDB replica set status
docker exec flexi-mongo-primary mongo --eval "rs.status()"

# Re-initialize replica set
docker exec flexi-mongo-primary mongo --eval '
rs.initiate({
  _id: "rs",
  members: [
    { _id: 0, host: "mongo-primary:27017" },
    { _id: 1, host: "mongo-secondary1:27017" },
    { _id: 2, host: "mongo-secondary2:27017" }
  ]
})
'
```

#### 3. SSL Certificate Issues
```bash
# Check certificate files
ls -la backend/bin/cert.*

# Regenerate self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout backend/bin/cert.localhost/domain.key \
  -out backend/bin/cert.localhost/certificate.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

#### 4. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :3443

# Modify port mapping
# Edit ports configuration in docker-compose.yml
```

### Log Debugging

#### 1. Application Logs
```bash
# View real-time application logs
docker compose logs -f backend

# View logs for specific time period
docker compose logs backend --since="2025-01-01T00:00:00"

# Export logs to file
docker compose logs backend > backend.log
```

#### 2. Database Logs
```bash
# MongoDB logs
docker compose logs mongo-primary

# Redis logs
docker compose logs redis
```

## Performance Optimization

### 1. Resource Limits
```yaml
# Add resource limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### 2. Database Optimization
```bash
# MongoDB connection pool configuration
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=2

# Redis memory limit
REDIS_MAXMEMORY=256mb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### 3. Cache Configuration
```bash
# Node.js cache settings
NODE_CACHE_TTL=600
NODE_CACHE_MAX_KEYS=1000
```

## Data Management

### 1. Data Backup
```bash
#!/bin/bash
# backup.sh - Data backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# MongoDB backup
docker exec flexi-mongo-primary mongodump \
  --db flexiwan \
  --out /data/backup_$DATE

# Compress backup
docker exec flexi-mongo-primary tar -czf \
  /data/flexiwan_backup_$DATE.tar.gz \
  -C /data backup_$DATE

# Copy to host machine
docker cp flexi-mongo-primary:/data/flexiwan_backup_$DATE.tar.gz \
  $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR/flexiwan_backup_$DATE.tar.gz"
```

### 2. Data Restore
```bash
#!/bin/bash
# restore.sh - Data restore script

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Copy backup file to container
docker cp $BACKUP_FILE flexi-mongo-primary:/data/

# Extract backup
docker exec flexi-mongo-primary tar -xzf /data/$(basename $BACKUP_FILE) -C /data/

# Restore database
docker exec flexi-mongo-primary mongorestore \
  --db flexiwan \
  --drop \
  /data/backup_*/flexiwan

echo "Restore completed from: $BACKUP_FILE"
```

## Monitoring and Maintenance

### 1. Health Monitoring
```bash
#!/bin/bash
# health-check.sh - System health check

echo "=== FlexiManage Health Check ==="
echo "Date: $(date)"

# Check container status
echo -e "\n1. Container Status:"
docker compose ps

# Check API health
echo -e "\n2. API Health:"
curl -s -k https://localhost:3443/api/health | jq .

# Check database status
echo -e "\n3. Database Status:"
docker exec flexi-mongo-primary mongo --eval "db.runCommand('ping')" --quiet

# Check disk space
echo -e "\n4. Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"

# Check memory usage
echo -e "\n5. Memory Usage:"
free -h
```

### 2. Automated Maintenance
```bash
# crontab scheduled tasks example

# Backup database daily at 2 AM
0 2 * * * /opt/fleximanage/scripts/backup.sh

# Clean old logs every Sunday at 3 AM
0 3 * * 0 /opt/fleximanage/scripts/cleanup-logs.sh

# Check system health every hour
0 * * * * /opt/fleximanage/scripts/health-check.sh >> /var/log/fleximanage-health.log
```

## Upgrade Guide

### 1. Application Upgrade
```bash
#!/bin/bash
# upgrade.sh - Application upgrade script

echo "Starting FlexiManage upgrade..."

# 1. Backup current data
./scripts/backup.sh

# 2. Pull latest code
git pull origin main

# 3. Rebuild images
docker compose build --no-cache backend

# 4. Rolling update services
docker compose up -d --no-deps backend

# 5. Verify upgrade
sleep 30
curl -s -k https://localhost:3443/api/health

echo "Upgrade completed!"
```

### 2. Database Upgrade
```bash
# Run database migrations
docker exec flexi-backend npm run migrate

# Check database version
docker exec flexi-mongo-primary mongo flexiwan --eval "db.schema_version.find()"
```

## Security Configuration

### 1. Production Environment Security
```bash
# Production environment security configuration
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 64)
DEVICE_SECRET_KEY=$(openssl rand -hex 32)

# Enable HTTPS
SSL_ENABLED=true
SSL_CERT_PATH=/app/certs/certificate.pem
SSL_KEY_PATH=/app/certs/private.key

# Database authentication
MONGO_AUTH_ENABLED=true
MONGO_USERNAME=flexiwan_admin
MONGO_PASSWORD=$(openssl rand -base64 32)

# Redis password
REDIS_PASSWORD=$(openssl rand -base64 32)
```

### 2. Firewall Configuration
```bash
# UFW firewall rules example
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3443/tcp  # HTTPS API
sudo ufw deny 3000/tcp   # Deny HTTP (production environment)
sudo ufw deny 27017:27019/tcp  # Deny direct database access
```

---

## Summary

FlexiManage Docker deployment provides a complete SD-WAN management platform solution. Through this guide, you can:

1. **Quick Deployment**: One-click deployment of complete system using Docker Compose
2. **Development & Debugging**: Support for code hot reload and real-time debugging
3. **Production Deployment**: Provide production-level configuration and security settings
4. **Operations Management**: Include monitoring, backup, upgrade and other operational tools

For technical support, please refer to:
- **GitHub Issues**: https://github.com/Miwide-Info/fleximanage/issues
- **Technical Documentation**: `TECHNICAL_GUIDE.md` in project root directory
- **Operations Manual**: `OPERATIONS_GUIDE.md` in project root directory