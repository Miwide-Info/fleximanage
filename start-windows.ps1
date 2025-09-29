<#
    FlexiManage Windows Startup Script (PowerShell)
    Mirrors logic in start.sh for Windows environments.

    Usage Examples:
      # Basic startup (docker-compose.yml only)
      ./start-windows.ps1

      # Include dynamic React dev server (docker-compose.dev.yml)
      ./start-windows.ps1 -IncludeDevFrontend

      # Force using legacy docker-compose even if docker compose plugin exists
      ./start-windows.ps1 -ForceLegacyCompose

    Parameters:
      -IncludeDevFrontend : Also launches docker-compose.dev.yml (hot reload React dev server on port 3001)
      -ForceLegacyCompose : Use 'docker-compose' binary instead of 'docker compose'
      -MaxMongoWait       : Seconds to wait for Mongo replica set (default 300)
      -MaxBackendWait     : Seconds to wait for backend health (default 300)
#>
[CmdletBinding()]
param(
    [switch] $IncludeDevFrontend,
    [switch] $ForceLegacyCompose,
    [int] $MaxMongoWait = 300,
    [int] $MaxBackendWait = 300
)

Write-Host "=== FlexiManage Docker Setup (Windows) ===" -ForegroundColor Cyan

function Fail($msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

function Check-DockerRunning {
    Write-Host "Checking Docker daemon..." -NoNewline
    try {
        docker info *>$null 2>&1 || Fail "Docker is not running. Please start Docker Desktop first."
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Fail "Docker not available: $_"
    }
}

function Resolve-ComposeCommand {
    if ($ForceLegacyCompose) {
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) { return 'docker-compose' } else { Fail "docker-compose not found (legacy)." }
    }
    # Prefer plugin style
    $pluginOk = $false
    try { docker compose version *>$null 2>&1; if ($LASTEXITCODE -eq 0) { $pluginOk = $true } } catch {}
    if ($pluginOk) { return 'docker compose' }
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) { return 'docker-compose' }
    Fail "Neither 'docker compose' plugin nor 'docker-compose' binary found."
}

function Ensure-LogsDir {
    $dir = Join-Path $PSScriptRoot 'backend/logs'
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "Created logs directory: $dir"
    }
}

function Wait-MongoReplicaSet {
    param([int] $TimeoutSeconds)
    Write-Host "Waiting for MongoDB replica set to be ready..."
    $start = Get-Date
    while ((Get-Date) -lt $start.AddSeconds($TimeoutSeconds)) {
        docker exec flexi-mongo-primary mongo --quiet --eval "db.runCommand({isMaster:1}).ismaster" 2>$null | Select-String -Pattern 'true' -Quiet
        if ($?) {
            Write-Host "MongoDB replica set is ready!" -ForegroundColor Green
            return
        }
        $elapsed = [int]((Get-Date) - $start).TotalSeconds
        Write-Host ("  Still waiting... {0}s elapsed" -f $elapsed)
        Start-Sleep -Seconds 5
    }
    Fail "MongoDB replica set not ready within $TimeoutSeconds seconds."
}

function Wait-Backend {
    param([int] $TimeoutSeconds)
    Write-Host "Waiting for backend health endpoint..."
    $start = Get-Date
    while ((Get-Date) -lt $start.AddSeconds($TimeoutSeconds)) {
        try {
            $resp = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -Method GET -TimeoutSec 5 -UseBasicParsing
            if ($resp.StatusCode -eq 200) {
                Write-Host "Backend is healthy!" -ForegroundColor Green
                return
            }
        } catch {}
        $elapsed = [int]((Get-Date) - $start).TotalSeconds
        Write-Host ("  Health not ready... {0}s elapsed" -f $elapsed)
        Start-Sleep -Seconds 10
    }
    Write-Host "WARNING: Backend health endpoint not responding within timeout; it may still be starting." -ForegroundColor Yellow
}

function Show-ServiceInfo {
    Write-Host ""; Write-Host "=== FlexiManage Services ===" -ForegroundColor Cyan
    Write-Host "Backend HTTP:      http://localhost:3000"
    Write-Host "Backend HTTPS:     https://localhost:3443"
    Write-Host "SMTP4Dev Web UI:   http://localhost:8025"
    Write-Host "MongoDB Primary:   mongodb://localhost:27017"
    Write-Host "Redis:             redis://localhost:6380"
    if ($IncludeDevFrontend) { Write-Host "React Dev UI:       http://localhost:3001" }
    Write-Host ""
    Write-Host "=== Create Default Admin User ===" -ForegroundColor Cyan
    Write-Host "docker exec flexi-backend node create-admin.js"
    Write-Host ""
    Write-Host "=== Register a User (example) ===" -ForegroundColor Cyan
    Write-Host "curl -X POST -k \"https://localhost:3443/api/users/register\" `"
    Write-Host "  -H 'Content-Type: application/json' `"
    Write-Host "  -d '{`"accountName`":`"testaccount`",`"userFirstName`":`"Test`",`"userLastName`":`"User`",`"email`":`"test@example.com`",`"password`":`"testpassword`",`"userJobTitle`":`"Admin`",`"userPhoneNumber`":`"`",`"country`":`"US`",`"companySize`":`"0-10`",`"serviceType`":`"Provider`",`"numberSites`":`"10`",`"companyType`":`"`",`"companyDesc`":`"`",`"captcha`":`"`"}'"
    Write-Host ""
    Write-Host "Check email at http://localhost:8025 (smtp4dev)."
    Write-Host ""
    Write-Host "=== Common Commands ===" -ForegroundColor Cyan
    Write-Host "Follow logs:      $Global:ComposeCmd logs -f"
    Write-Host "Stop services:    $Global:ComposeCmd down"
    Write-Host "Restart services: $Global:ComposeCmd restart"
    if ($IncludeDevFrontend) {
        Write-Host "Rebuild frontend dev image: docker build -f frontend/Dockerfile.dev -t flexi-frontend-dev ./frontend"
    }
}

# --- Main Flow ---
Check-DockerRunning
$Global:ComposeCmd = Resolve-ComposeCommand
Ensure-LogsDir

$composeFiles = @('-f','docker-compose.yml')
if ($IncludeDevFrontend) { $composeFiles += @('-f','docker-compose.dev.yml') }

Write-Host "Starting containers using: $Global:ComposeCmd $($composeFiles -join ' ') up -d" -ForegroundColor Cyan
& $Global:ComposeCmd $composeFiles up -d
if ($LASTEXITCODE -ne 0) { Fail "Compose up failed" }

# Wait for dependencies
Wait-MongoReplicaSet -TimeoutSeconds $MaxMongoWait
Wait-Backend -TimeoutSeconds $MaxBackendWait

Show-ServiceInfo

Write-Host "=== Startup Complete ===" -ForegroundColor Green
