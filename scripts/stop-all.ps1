<#!
.SYNOPSIS
  Stop all local fleximanage related servers (Node backend, Mongo replica set ports 27017-27019, Redis 6379, test SMTP 1025).

.DESCRIPTION
  Enumerates processes bound to known development ports and terminates them. By default it attempts a graceful stop for Node
  (Ctrl+C like) and then force kills if still alive. For other daemons (mongod, redis-server, python aiosmtpd) it sends Stop-Process.

.PARAMETER Force
  Immediately force kill (no graceful attempt) for all matched processes.

.PARAMETER KeepMongo
  Do not stop mongod processes.

.PARAMETER KeepRedis
  Do not stop redis process.

.PARAMETER KeepSMTP
  Do not stop local test SMTP (aiosmtpd) process.

.PARAMETER DryRun
  Show what would be stopped without actually stopping.

.EXAMPLE
  ./stop-all.ps1

.EXAMPLE
  ./stop-all.ps1 -Force

.EXAMPLE
  ./stop-all.ps1 -DryRun

.NOTES
  Run from an elevated PowerShell if processes were started with higher privileges.
#>
[CmdletBinding()] param(
  [switch]$Force,
  [switch]$KeepMongo,
  [switch]$KeepRedis,
  [switch]$KeepSMTP,
  [switch]$DryRun,
  # Aggressive: kill processes by known names even if no listening port found (e.g. starting up / stuck)
  [switch]$Aggressive,
  # ServiceCheck: list possible Windows services (mongo/redis/aiosmtpd/flexi) so user can stop them manually
  [switch]$ServiceCheck
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg){ Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[ERR ] $msg" -ForegroundColor Red }

# Known ports mapping
$portGroups = @(
  @{ Name='NodeBackend'; Ports=@(3000,3443); ProcessNames=@('node'); Optional=$false },
  @{ Name='Mongo'; Ports=@(27017,27018,27019); ProcessNames=@('mongod'); Optional=$true; Skip=$KeepMongo },
  @{ Name='Redis'; Ports=@(6379); ProcessNames=@('redis-server','redis-server.exe'); Optional=$true; Skip=$KeepRedis },
  @{ Name='SMTP'; Ports=@(1025); ProcessNames=@('python','python3'); Optional=$true; Skip=$KeepSMTP }
)

# Collect listening processes (fallback methods for different Windows versions)
function Get-PortPids([int[]]$ports){
  $result = @{}
  foreach($p in $ports){ $result[$p] = @() }
  try {
    $conns = Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in $ports }
    foreach($c in $conns){ $result[$c.LocalPort] += $c.OwningProcess }
  } catch {
    # Fallback to netstat parsing
    $net = netstat -ano | Select-String "LISTENING"
    foreach($line in $net){
      if($line -match ":(\d+)\s+.*LISTENING\s+(\d+)$"){
        $lp = [int]$Matches[1]; $pid = [int]$Matches[2]
        if($lp -in $ports){ $result[$lp] += $pid }
      }
    }
  }
  return $result
}

$allPorts = ($portGroups | ForEach-Object { $_.Ports }) | Sort-Object -Unique
$portPidMap = Get-PortPids -ports $allPorts

$targets = @()
foreach($group in $portGroups){
  if($group.Skip){ Write-Info "Skipping group: $($group.Name)"; continue }
  foreach($port in $group.Ports){
    $pids = $portPidMap[$port] | Sort-Object -Unique
    foreach($pid in $pids){
      if(-not $pid){ continue }
      try { $proc = Get-Process -Id $pid -ErrorAction Stop } catch { continue }
      $targets += [PSCustomObject]@{
        Group=$group.Name; Port=$port; PID=$pid; Name=$proc.ProcessName
      }
    }
  }
}

if(-not $targets){
  Write-Info "No processes found by listening ports.";
  if(-not $Aggressive){
    Write-Info "Use -Aggressive to attempt name-based termination (may catch initializing processes).";
    if($ServiceCheck){ Write-Info "ServiceCheck requested; listing services." }
  }
}

if($ServiceCheck){
  Write-Info "Scanning Windows services for related names (mongo|redis|aiosmtpd|flexi)...";
  try {
    sc.exe query state= all | Select-String -Pattern 'mongo|redis|aiosmtpd|flexi' | ForEach-Object { $_.Line }
    Write-Info "If a service is running, stop it with: sc stop <ServiceName>";
  } catch { Write-Warn "Service enumeration failed: $_" }
}

# Aggressive mode: add processes by name even if ports not yet bound
if($Aggressive){
  $nameList = @('node','mongod','redis-server','redis-server.exe','python','python3','aiosmtpd')
  if($KeepMongo){ $nameList = $nameList | Where-Object { $_ -notmatch 'mongod' } }
  if($KeepRedis){ $nameList = $nameList | Where-Object { $_ -notmatch 'redis-server' } }
  if($KeepSMTP){ $nameList = $nameList | Where-Object { $_ -notmatch 'python' -and $_ -notmatch 'aiosmtpd' } }
  $added = @()
  foreach($n in $nameList){
    try {
      $procs = Get-Process -Name $n -ErrorAction SilentlyContinue
      foreach($p in $procs){
        if($targets.PID -notcontains $p.Id){
          $targets += [PSCustomObject]@{ Group='Aggressive'; Port=$null; PID=$p.Id; Name=$p.ProcessName }
          $added += $p.Id
        }
      }
    } catch {}
  }
  if($added.Count -gt 0){
    Write-Warn "Aggressive added PIDs: $($added -join ', ')";
  } elseif(-not $targets){
    Write-Warn "Aggressive mode found no matching process names.";
  }
}

if(-not $targets){ return }

Write-Info "Processes to consider:";
$targets | Sort-Object Group,Port | Format-Table Group,Port,PID,Name -AutoSize

if($DryRun){ Write-Warn "DryRun specified - no processes will be stopped."; return }

# De-duplicate by PID (one process may own multiple ports)
$uniqueTargets = $targets | Group-Object PID | ForEach-Object { $_.Group[0] }

foreach($t in $uniqueTargets){
  $pid = $t.PID
  $name = $t.Name
  $grp = $t.Group
  if($Force){
    Write-Info "Force killing PID $pid ($name) [$grp]"
    try { Stop-Process -Id $pid -Force -ErrorAction Stop } catch { Write-Err "Failed to kill $pid : $_" }
    continue
  }
  if($name -eq 'node'){
    # Attempt graceful: send CTRL+C not trivial from script; fall back to Stop-Process without -Force
    Write-Info "Stopping Node (graceful) PID $pid [$grp]"
    try { Stop-Process -Id $pid -ErrorAction Stop } catch { Write-Warn "Graceful stop failed for $pid, forcing"; try { Stop-Process -Id $pid -Force } catch { Write-Err $_ } }
  } else {
    Write-Info "Stopping PID $pid ($name) [$grp]"
    try { Stop-Process -Id $pid -ErrorAction Stop } catch { Write-Err "Failed to stop $pid : $_" }
  }
}

Write-Info "Done. Re-check listening ports if needed."