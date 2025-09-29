# FlexiManage Docker Setup

This repository contains a complete Docker Compose setup for running FlexiManage, an open-source SD-WAN management system.

## Quick Start

1. **Prerequisites:**
   - Docker and Docker Compose
   - At least 4GB of RAM
   - Ports 3000, 3443, 6380, 8025, 1026, 27017-27019 available

2. **Start the services:**
   ```bash
   ./start.sh
   ```

   Or manually:
   ```bash
   docker compose up -d
   ```

3. **Access the services:**
   - **FlexiManage UI (HTTP)**: http://localhost:3000 (redirects to HTTPS)
   - **FlexiManage UI (HTTPS)**: https://localhost:3443
   - **SMTP4Dev Web UI**: http://localhost:8025
   - **MongoDB Primary**: mongodb://localhost:27017
   - **Redis**: redis://localhost:6380

## Services

### Backend (Node.js/Express)
- **Ports**: 3000 (HTTP), 3443 (HTTPS)
- **Health check**: http://localhost:3000/api/health
- **API docs**: https://localhost:3443/api-docs

### Frontend (React)
- Built and served by the backend
- Modern React 18 application
- Bootstrap 5 UI components

### MongoDB Replica Set
- **Primary**: localhost:27017
- **Secondary 1**: localhost:27018  
- **Secondary 2**: localhost:27019
- **Replica Set Name**: rs
- No authentication (development setup)

### Redis
- **Port**: 6380 (to avoid conflict with system Redis)
- Used for session management and caching

### SMTP4Dev (Email Testing)
- **SMTP Port**: 1026
- **Web UI**: http://localhost:8025
- Captures all outgoing emails for testing

## User Registration

1. **Register a new user:**
   ```bash
   curl -X POST -k "https://localhost:3443/api/users/register" \
     -H "Content-Type: application/json" \
     -d '{
       "accountName": "testaccount",
       "userFirstName": "Test",
       "userLastName": "User",
       "email": "test@example.com",
       "password": "testpassword",
       "userJobTitle": "Admin",
       "userPhoneNumber": "",
       "country": "US",
       "companySize": "0-10",
       "serviceType": "Provider",
       "numberSites": "10",
       "companyType": "",
       "companyDesc": "",
       "captcha": ""
     }'
   ```

2. **Check for verification email:**
   - Open http://localhost:8025
   - Find the verification email
   - Extract the `id` and `token` parameters from the verification link

3. **Verify account:**
   ```bash
   curl -X POST -k "https://localhost:3443/api/users/verify-account" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "<id_from_email>",
       "token": "<token_from_email>"
     }'
   ```

4. **Login:**
   ```bash
   curl -X POST -sD - -k "https://localhost:3443/api/users/login" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "test@example.com",
       "password": "testpassword",
       "captcha": ""
     }'
   ```

## Management Commands

### View logs
```bash
docker compose logs -f                    # All services
docker compose logs -f backend           # Backend only
docker compose logs -f mongo-primary     # MongoDB primary
```

### Service management
```bash
docker compose ps                        # Check status
docker compose restart backend          # Restart backend
docker compose down                      # Stop all services
docker compose down -v                  # Stop and remove volumes
```

### Database access
```bash
# Connect to MongoDB primary
docker exec -it flexi-mongo-primary mongo

# Connect to Redis
docker exec -it flexi-redis redis-cli
```

## Development

### Rebuild after code changes
```bash
docker compose up --build -d backend
```

### Access container shell
```bash
docker exec -it flexi-backend sh
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

## Troubleshooting

### Backend keeps restarting
```bash
docker compose logs backend
```
Common issues:
- Missing SSL certificates (non-fatal, HTTP still works)
- MongoDB connection issues
- Missing dependencies

### MongoDB connection errors
- Ensure all 3 MongoDB containers are healthy: `docker compose ps`
- Check replica set status: `docker exec flexi-mongo-primary mongo --eval "rs.status()"`

### Port conflicts
If ports are in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port
  - "3444:3443"
```

### Reset everything
```bash
docker compose down -v
docker system prune -f
./start.sh
```

## Production Considerations

This setup is intended for development and testing. For production:

1. **Security:**
   - Enable MongoDB authentication
   - Use proper SSL certificates
   - Set strong passwords and secrets
   - Configure firewall rules

2. **Performance:**
   - Increase MongoDB oplog size
   - Configure proper resource limits
   - Use persistent storage volumes
   - Set up monitoring

3. **High Availability:**
   - Deploy across multiple hosts
   - Configure load balancing
   - Set up automated backups
   - Monitor service health

## License

This project follows the same license as the original FlexiManage project.