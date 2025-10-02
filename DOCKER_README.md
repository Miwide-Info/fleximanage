# FlexiManage Docker Quick Guide

This document provides a quick guide for FlexiManage Docker containerized deployment. For more detailed information, please refer to the [Docker Usage Guide](DOCKER_USAGE_GUIDE.md).

## 🚀 Quick Start

### System Requirements
- Docker 20.10+ and Docker Compose 2.0+
- At least 4GB memory
- Available ports: 3000, 3443, 6380, 8025, 1026, 27017-27019

### Setup Steps

1. **Clone the project**
   ```bash
   git clone https://github.com/Miwide-Info/fleximanage.git
   cd fleximanage
   ```

2. **Start services**
   ```bash
   # Using start script
   ./start.sh
   
   # Or start manually
   docker compose up -d
   ```

3. **Access applications**
   - **Management Interface**: https://manage.miwide.com:3443
   - **Email Debug**: http://localhost:8025
   - **Database**: mongodb://localhost:27017

## 🛠️ Development Environment

Development environment provides hot reload and debugging support:

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f backend
```

## 📋 Service Components

| Service | Ports | Description |
|---------|-------|-------------|
| **Backend** | 3000, 3443 | Node.js API service |
| **MongoDB** | 27017-27019 | Database replica set |
| **Redis** | 6380 | Cache service |
| **SMTP4Dev** | 1026, 8025 | Email testing tool |

### Health Checks
```bash
# API health status
curl -k https://localhost:3443/api/health

# Database connection
docker exec mongo-primary mongosh --eval "rs.status()"
```

## 👤 User Registration

### Web Interface Registration (Recommended)
1. Visit https://manage.miwide.com:3443
2. Click the "Register" button
3. Fill out the form information
4. Check verification email at http://localhost:8025
5. Click verification link to complete registration

### API Registration
```bash
# Register user
curl -X POST -k "https://localhost:3443/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "testaccount",
    "userFirstName": "Test",
    "userLastName": "User",
    "email": "test@example.com",
    "password": "testpassword",
    "country": "US",
    "serviceType": "Provider"
  }'

# Check verification email: http://localhost:8025
# Verify account
curl -X POST -k "https://localhost:3443/api/users/verify-account" \
  -H "Content-Type: application/json" \
  -d '{"id": "<id>", "token": "<token>"}'
```

## 🔧 Management Commands

### View Logs
```bash
docker compose logs -f backend          # Backend logs
docker compose logs -f mongo-primary    # Database logs
```

### Service Management
```bash
docker compose ps                       # Service status
docker compose restart backend         # Restart backend
docker compose down                     # Stop services
```

### Container Access
```bash
# Backend container
docker exec -it flexi-backend sh

# Database
docker exec -it flexi-mongo-primary mongosh
```

### Environment Variables
Key environment variables in docker-compose.yml:
- `NODE_ENV=production`
- `MONGO_URL`: Main database connection
- `REDIS_URL`: Redis connection
- `CAPTCHA_SECRET_KEY`: Google reCAPTCHA secret (optional)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │    Backend       │
│   (React)       │────│  (Node.js/API)   │
└─────────────────┘    └──────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼───┐   ┌───▼───┐   ┌───▼──────┐
            │ MongoDB   │   │ Redis │   │ SMTP4Dev │
            │ Replica   │   │       │   │          │
            │ Set (3)   │   │       │   │          │
            └───────────┘   └───────┘   └──────────┘
```

## SSL Certificates

The backend expects SSL certificates in `backend/bin/cert.local.flexiwan.com/`:
- `certificate.pem`
- `domain.key`

For development, the system will work with HTTP on port 3000, but HTTPS is preferred.

## 🔍 Troubleshooting

### Common Issues
```bash
# Backend fails to start
docker compose logs backend

# Database connection failure
docker compose ps
docker exec flexi-mongo-primary mongosh --eval "rs.status()"

# Port conflicts
# Modify port mappings in docker-compose.yml
```

### Reset Environment
```bash
docker compose down -v
docker system prune -f
./start.sh
```

## 📖 More Documentation

- **[Complete Docker Guide](DOCKER_USAGE_GUIDE.md)** - Detailed deployment and configuration instructions
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Development environment and coding standards
- **[Technical Guide](TECHNICAL_GUIDE.md)** - System architecture and API documentation
- **[Operations Guide](OPERATIONS_GUIDE.md)** - System administration and maintenance

## 📄 License

This project follows the open source license of the original FlexiManage project.