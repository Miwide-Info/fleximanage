@echo off
REM FlexiManage Windows (CMD) startup helper - minimal version
REM For richer features (timeouts, health checks) use PowerShell script: start-windows.ps1

setlocal ENABLEDELAYEDEXPANSION

echo === FlexiManage Docker Setup (Windows CMD) ===

REM Detect docker
where docker >nul 2>nul || (
  echo ERROR: docker not found in PATH.
  exit /b 1
)

docker info >nul 2>nul || (
  echo ERROR: Docker daemon not running.
  exit /b 1
)

REM Determine compose command
set COMPOSE_CMD=docker compose
for /f "tokens=*" %%i in ('docker compose version 2^>nul') do set COMPOSE_DETECTED=1
if not defined COMPOSE_DETECTED (
  where docker-compose >nul 2>nul && (set COMPOSE_CMD=docker-compose) || (
    echo ERROR: Neither 'docker compose' plugin nor 'docker-compose' binary available.
    exit /b 1
  )
)

echo Using %COMPOSE_CMD%

if not exist backend\logs (
  mkdir backend\logs
  echo Created backend\logs directory
)

echo Starting core services...
%COMPOSE_CMD% -f docker-compose.yml up -d
if errorlevel 1 (
  echo ERROR: Failed to start docker-compose services
  exit /b 1
)

echo.
echo (Optional) Start React dev frontend with hot reload: %COMPOSE_CMD% -f docker-compose.yml -f docker-compose.dev.yml up -d

echo.
echo Waiting (simple sleep) 25s for services to settle...
REM Basic wait instead of full health logic; use PowerShell script for robustness
ping -n 6 127.0.0.1 >nul
ping -n 6 127.0.0.1 >nul
ping -n 6 127.0.0.1 >nul
ping -n 6 127.0.0.1 >nul
ping -n 6 127.0.0.1 >nul

REM Display summary
cls

echo === FlexiManage Services ===
echo Backend HTTP:      http://localhost:3000
echo Backend HTTPS:     https://localhost:3443
echo SMTP4Dev Web UI:   http://localhost:8025
echo MongoDB Primary:   mongodb://localhost:27017
echo Redis:             redis://localhost:6380
echo.
echo === Create Default Admin User ===
echo docker exec flexi-backend node create-admin.js
echo.
echo === Register a User (example) ===
echo curl -X POST -k "https://localhost:3443/api/users/register" ^
    -H "Content-Type: application/json" ^
    -d "{\"accountName\":\"testaccount\",\"userFirstName\":\"Test\",\"userLastName\":\"User\",\"email\":\"test@example.com\",\"password\":\"testpassword\",\"userJobTitle\":\"Admin\",\"userPhoneNumber\":\"\",\"country\":\"US\",\"companySize\":\"0-10\",\"serviceType\":\"Provider\",\"numberSites\":\"10\",\"companyType\":\"\",\"companyDesc\":\"\",\"captcha\":\"\"}"
echo.
echo Logs: %COMPOSE_CMD% logs -f
echo Stop: %COMPOSE_CMD% down
echo Restart: %COMPOSE_CMD% restart
echo.
echo === Done ===
endlocal
