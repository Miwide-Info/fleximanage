# FlexiManage Windows & Docker Quick Start

This repository includes helper scripts to run the full stack (Mongo replica set, Redis, SMTP test server, backend, optional React dev frontend) on Windows machines using Docker.

## Scripts

| Script | Purpose |
|--------|---------|
| `start.sh` | Original Linux/macOS startup script (bash) with health checks. |
| `start-windows.ps1` | Full-featured Windows PowerShell script (health checks, waits, optional dev frontend). |
| `start-docker.cmd` | Minimal Windows CMD helper (basic startup, simple delay). |

## Prerequisites
- Docker Desktop running
- (Optional) PowerShell 7+ recommended for better performance

## PowerShell Usage
```powershell
# Standard startup (backend + databases + redis + smtp4dev)
./start-windows.ps1

# Include React development hot-reload server (port 3001)
./start-windows.ps1 -IncludeDevFrontend

# Force legacy docker-compose even if plugin exists
./start-windows.ps1 -ForceLegacyCompose

# Adjust timeouts
./start-windows.ps1 -MaxMongoWait 420 -MaxBackendWait 400
```

The script will:
1. Verify Docker & Compose
2. Create `backend/logs` if missing
3. Bring up services via `docker compose` (or fallback `docker-compose`)
4. Wait for Mongo replica set init
5. Poll backend `/api/health`
6. Print service URLs and helper commands

## CMD Usage (Fallback)
```cmd
start-docker.cmd
```
This: 
- Starts core services
- Sleeps ~25 seconds
- Prints helpful commands
(No health polling; use PowerShell script for robustness.)

## Starting Dev Frontend Separately
If you already ran the base stack:
```powershell
# Add dev frontend later
$compose = (docker compose version > $null 2>&1) ? 'docker compose' : 'docker-compose'
& $compose -f docker-compose.yml -f docker-compose.dev.yml up -d frontend-dev
```

## Creating First Admin User
```powershell
docker exec flexi-backend node create-admin.js
```

## Example User Registration
```bash
curl -X POST -k "https://localhost:3443/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{"accountName":"testaccount","userFirstName":"Test","userLastName":"User","email":"test@example.com","password":"testpassword","userJobTitle":"Admin","userPhoneNumber":"","country":"US","companySize":"0-10","serviceType":"Provider","numberSites":"10","companyType":"","companyDesc":"","captcha":""}'
```

Check verification email in smtp4dev: http://localhost:8025

## Stopping & Cleanup
```powershell
# Stop containers (preserves volumes)
$compose = (docker compose version > $null 2>&1) ? 'docker compose' : 'docker-compose'
& $compose down

# Remove volumes too (DANGER: deletes Mongo/Redis data)
& $compose down -v
```

## Logs
```powershell
$compose = (docker compose version > $null 2>&1) ? 'docker compose' : 'docker-compose'
& $compose logs -f backend
```

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| Backend health never OK | Check container logs: `docker logs flexi-backend` |
| Mongo replica set timeout | Remove volumes and retry: `docker compose down -v` then up again |
| Port conflicts | Ensure ports 3000,3443,8025,27017-27019,6380 free |
| SMTP emails missing | Open smtp4dev UI http://localhost:8025 |
| React dev not auto-reloading | Ensure file mounts not blocked by AV software |

## Next Steps
- Add `.env` support if needed for custom overrides
- Add optional TLS certificate mounting for external domains

---
Happy hacking!
