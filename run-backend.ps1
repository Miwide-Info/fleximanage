<#!
.SYNOPSIS
  Convenient launcher for the backend (Express) with optional automatic MongoDB & Redis containers.

.DESCRIPTION
  This script simplifies local development when you only want the backend running without the full docker-compose stack.
  It can optionally (via -AutoDeps) start lightweight Docker containers for MongoDB (single node) and Redis if they are
  not already available on the specified ports. It then launches the Node.js backend from the ./backend directory.

.PARAMETER AutoDeps
  Start ephemeral MongoDB & Redis containers if not already listening on the target ports.

.PARAMETER Watch
  If specified and nodemon is available (global or local), use nodemon to restart on file changes.

.PARAMETER UseNodemon
  Alias of -Watch (kept for explicitness).

.PARAMETER MongoPort
  Target MongoDB port (default 27017). Container will map to it if AutoDeps.

.PARAMETER RedisPort
  Target Redis port (default 6379). Container will map to it if AutoDeps.

.PARAMETER BackendPort
  Backend HTTP port expectation (default 3000) – only used for informational output.

.PARAMETER EnableHttps
  If set, exports FLEXI_FORCE_HTTPS=1 (configs.js should read shouldRedirectHttps or similar) – adjust to your config logic.

.PARAMETER Env
  Node environment (default 'development'). Sets NODE_ENV.

.PARAMETER DetachedDeps
  If set, dependency containers are started detached and not automatically stopped when this script exits.

.PARAMETER ForceRecreate
  Force remove existing containers (flexi-dev-mongo, flexi-dev-redis) before (re)creating.

.EXAMPLE
  ./run-backend.ps1 -AutoDeps -Watch

.EXAMPLE
  ./run-backend.ps1 -AutoDeps -MongoPort 27018 -RedisPort 6380

.NOTES
  Requires PowerShell 5.1+ (Windows) or PowerShell Core 7+.
  For AutoDeps you must have Docker available in PATH and Docker daemon running.
#>
[CmdletBinding()] param(
  [switch]$AutoDeps,
  [switch]$Watch,
  [switch]$UseNodemon,
  [switch]$EnableHttps,
  [switch]$DetachedDeps,
  [switch]$ForceRecreate,
  [int]$MongoPort = 27017,
  [int]$RedisPort = 6379,
  [int]$BackendPort = 3000,
  [string]$Env = 'development'
)

$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

$useNodemon = $Watch -or $UseNodemon
$script:startedContainers = @()

function Test-PortListening {
  param([int]$Port)
  try {
    $tcp = Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -eq $Port }
    return ($tcp -ne $null)
  } catch {
    # Fallback to netstat parsing (older systems)
    netstat -ano | Select-String ":$Port" | Select-Object -First 1 | ForEach-Object { return $true }
    return $false
  }
}

function Ensure-DockerAvailable {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Docker CLI not found. Install Docker Desktop or disable -AutoDeps."
    throw "DockerNotFound"
  }
  docker info >$null 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Err "Docker daemon not running."; throw "DockerNotRunning" }
}

function Start-MongoContainer {
  param([int]$Port,[switch]$Force)
  $name = "flexi-dev-mongo"
  if ($Force) { Try { docker rm -f $name >$null 2>&1 } catch {} }
  if ((docker ps --format '{{.Names}}' | Select-String -SimpleMatch $name -Quiet)) {
    Write-Info "Mongo container already running: $name"
    return
  }
  Write-Info "Starting MongoDB container ($name) on port $Port..."
  docker run -d --name $name -p "$Port:27017" -e MONGO_INITDB_ROOT_USERNAME=dev -e MONGO_INITDB_ROOT_PASSWORD=dev mongo:7.0 >$null
  if ($LASTEXITCODE -ne 0) { throw "FailedMongoRun" }
  $script:startedContainers += $name
}

function Start-RedisContainer {
  param([int]$Port,[switch]$Force)
  $name = "flexi-dev-redis"
  if ($Force) { Try { docker rm -f $name >$null 2>&1 } catch {} }
  if ((docker ps --format '{{.Names}}' | Select-String -SimpleMatch $name -Quiet)) {
    Write-Info "Redis container already running: $name"
    return
  }
  Write-Info "Starting Redis container ($name) on port $Port..."
  docker run -d --name $name -p "$Port:6379" redis:7-alpine >$null
  if ($LASTEXITCODE -ne 0) { throw "FailedRedisRun" }
  $script:startedContainers += $name
}

function Wait-ServicePort {
  param([int]$Port,[int]$TimeoutSeconds = 30, [string]$Label)
  $start = Get-Date
  while ((Get-Date) -lt $start.AddSeconds($TimeoutSeconds)) {
    if (Test-PortListening -Port $Port) { Write-Info "$Label listening on $Port"; return }
    Start-Sleep -Seconds 2
  }
  Write-Warn "$Label not listening within $TimeoutSeconds seconds (continuing)."
}

function Stop-StartedContainers {
  if($DetachedDeps){ return }
  if($script:startedContainers.Count -eq 0){ return }
  Write-Info "Stopping containers: $($script:startedContainers -join ', ')"
  foreach($c in $script:startedContainers){
    try { docker rm -f $c >$null 2>&1 } catch { Write-Warn "Failed to remove container $c: $($_)" }
  }
}

try {
  Push-Location $PSScriptRoot
  if (-not (Test-Path './backend/package.json')) { Write-Err "backend/package.json not found. Run from repo root."; exit 1 }

  Write-Info "Node.js version: $(node -v 2>$null)"
  if ($LASTEXITCODE -ne 0) { Write-Err "Node.js not found in PATH"; exit 1 }

  if ($AutoDeps) {
    Ensure-DockerAvailable
    if (-not (Test-PortListening -Port $MongoPort)) { Start-MongoContainer -Port $MongoPort -Force:$ForceRecreate } else { Write-Info "Mongo port $MongoPort already in use; skipping container." }
    if (-not (Test-PortListening -Port $RedisPort)) { Start-RedisContainer -Port $RedisPort -Force:$ForceRecreate } else { Write-Info "Redis port $RedisPort already in use; skipping container." }
  }

  if (-not (Test-PortListening -Port $MongoPort)) { Write-Warn "MongoDB not detected on $MongoPort (proceeding)." } else { Write-Info "Mongo detected on $MongoPort" }
  if (-not (Test-PortListening -Port $RedisPort)) { Write-Warn "Redis not detected on $RedisPort (proceeding)." } else { Write-Info "Redis detected on $RedisPort" }

  $env:NODE_ENV = $Env
  if ($EnableHttps) { $env:FLEXI_FORCE_HTTPS = '1' }

  Push-Location './backend'
  Write-Info "Launching backend (port $BackendPort expected)."
  $cmd = 'node'; $args = @('./bin/www')
  if ($useNodemon) {
    if (Get-Command nodemon -ErrorAction SilentlyContinue) { $cmd = 'nodemon'; $args = @('--watch','.', './bin/www') }
    else { Write-Warn "nodemon not found; falling back to node" }
  }

  Write-Host "Command: $cmd $($args -join ' ')" -ForegroundColor Magenta
  & $cmd @args
}
finally {
  Pop-Location -ErrorAction SilentlyContinue
  Stop-StartedContainers
}
