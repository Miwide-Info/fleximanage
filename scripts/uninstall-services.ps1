<#!
.SYNOPSIS
  Uninstall (stop & delete) local Windows services for aiosmtpd, MongoDB replica set services, single MongoDB service, and Redis.

.DESCRIPTION
  This script targets services discovered earlier in your environment:
    - aiosmtpd
    - MongoDB, MongoDB-27017, MongoDB-27018, MongoDB-27019
    - Redis
  It will:
    1. Optionally prompt for confirmation (unless -NoPrompt)
    2. Stop each service if it exists
    3. Delete each service
    4. Kill any leftover processes (mongod / redis-server / python)
    5. (Optional) Remove data directories if -RemoveData is specified

.PARAMETER NoPrompt
  Do not ask for interactive confirmation.

.PARAMETER RemoveData
  Attempt to remove MongoDB & Redis data directories AFTER service deletion.
  Use with caution. Attempts to detect dbPath by reading mongod.cfg files.

.PARAMETER DryRun
  Show the operations that would occur without performing them.

.PARAMETER VerboseLogs
  Print extra diagnostic output (paths, config parse results).

.PARAMETER ForceKill
  Force kill processes even if graceful stop succeeds.

.EXAMPLE
  ./uninstall-services.ps1

.EXAMPLE
  ./uninstall-services.ps1 -NoPrompt -RemoveData -VerboseLogs

.EXAMPLE
  ./uninstall-services.ps1 -DryRun
#>
[CmdletBinding()] param(
  [switch]$NoPrompt,
  [switch]$RemoveData,
  [switch]$DryRun,
  [switch]$VerboseLogs,
  [switch]$ForceKill,
  # Aggressively also match processes by name even if services absent
  [switch]$Aggressive,
  # Number of port recheck loops after service deletion (default 5)
  [int]$RecheckLoops = 5,
  # Attempt to uninstall related Chocolatey packages (redis) if found
  [switch]$UninstallPackages,
  # Attempt to detect and remove scheduled tasks referencing redis/mongo
  [switch]$RemoveTasks
)

$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err ($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }
function Verb($m){ if($VerboseLogs){ Write-Host "[VERB] $m" -ForegroundColor DarkGray } }

function Get-ListeningPids([int[]]$ports){
  $map = @{}
  foreach($p in $ports){ $map[$p] = @() }
  try {
    $conns = Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in $ports }
    foreach($c in $conns){ $map[$c.LocalPort] += $c.OwningProcess }
  } catch {
    $lines = netstat -ano | Select-String "LISTENING"
    foreach($l in $lines){
      if($l -match ":(\d+)\s+.*LISTENING\s+(\d+)$"){
        $lp = [int]$Matches[1]; $foundPid = [int]$Matches[2]
        if($lp -in $ports){ $map[$lp] += $foundPid }
      }
    }
  }
  return $map
}

$services = @('aiosmtpd','MongoDB-27017','MongoDB-27018','MongoDB-27019','MongoDB','Redis')
${PortsToClear} = @(27017,27018,27019,6379,1025)

Info "Services targeted: $($services -join ', ')"

if(-not $NoPrompt -and -not $DryRun){
  $answer = Read-Host "Proceed with STOP + DELETE of these services? (y/N)"
  if($answer.ToLower() -ne 'y'){ Warn "Aborted by user."; return }
}

if($DryRun){ Warn "DryRun mode - no changes will be applied." }

# --- Stop services ---
foreach($svc in $services){
  $exists = sc.exe query $svc 2>$null | Select-String "SERVICE_NAME" | ForEach-Object { $_.Line }
  if(-not $exists){ Verb "Service $svc not present"; continue }
  Info "Stopping $svc"
  if(-not $DryRun){ sc.exe stop $svc >$null 2>&1 }
}

if(-not $DryRun){ Start-Sleep -Seconds 5 }

# --- Delete services ---
foreach($svc in $services){
  $exists = sc.exe query $svc 2>$null | Select-String "SERVICE_NAME" | ForEach-Object { $_.Line }
  if(-not $exists){ continue }
  Info "Deleting service $svc"
  if(-not $DryRun){ sc.exe delete $svc >$null 2>&1 }
}

# --- Kill leftover processes ---
$procNames = @('mongod','redis-server','python')
$procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $procNames -contains $_.ProcessName }
if($procs){
  foreach($p in $procs){
    Info "Terminating PID $($p.Id) ($($p.ProcessName))"
    if(-not $DryRun){
      try {
        if($ForceKill){ Stop-Process -Id $p.Id -Force -ErrorAction Stop }
        else { Stop-Process -Id $p.Id -ErrorAction Stop }
      } catch { Warn "Failed to stop $($p.Id): $_" }
    }
  }
} else { Verb "No matching leftover processes (initial pass)." }

# Aggressive name-based sweep (after initial termination)
if($Aggressive){
  Verb "Aggressive sweep enabled"
  $nameCandidates = $procNames
  foreach($n in $nameCandidates){
    $ps = Get-Process -Name $n -ErrorAction SilentlyContinue
    foreach($p in $ps){
      Info "Aggressive terminate PID $($p.Id) ($n)"
      if(-not $DryRun){ try { Stop-Process -Id $p.Id -Force -ErrorAction Stop } catch { Warn "Failed to force kill $($p.Id): $_" } }
    }
  }
}

# Recheck loop for listening ports
for($i=1; $i -le $RecheckLoops; $i++){
  $map = Get-ListeningPids -ports ${PortsToClear}
  $active = @(); foreach($k in $map.Keys){ if($map[$k].Count -gt 0){ $active += $k } }
  if(-not $active -or $active.Count -eq 0){ Verb "No listening target ports after iteration ${i}"; break }
  Warn "Recheck iteration ${i}: still listening ports: $($active -join ', ')";
  foreach($port in $active){
    $pids = $map[$port] | Sort-Object -Unique
    foreach($procId in $pids){
      try {
        $pr = Get-Process -Id $procId -ErrorAction Stop
        Info "Killing PID ${procId} ($($pr.ProcessName)) bound to port $port"
        if(-not $DryRun){
          try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch { Warn "Failed to kill ${procId}: $_" }
        }
      } catch {
        Verb "PID ${procId} already gone"
      }
    }
  }
  if(-not $DryRun){ Start-Sleep -Seconds 2 }
}

if($UninstallPackages -and -not $DryRun){
  try {
    $choco = (Get-Command choco -ErrorAction SilentlyContinue).Source
    if($choco){
      Info "Attempting Chocolatey uninstall of redis"
      & $choco uninstall redis -y | Out-Null
    } else { Verb "Chocolatey not found in PATH" }
  } catch { Warn "Chocolatey uninstall attempt failed: $_" }
}

if($RemoveTasks -and -not $DryRun){
  try {
    $tasks = Get-ScheduledTask | Where-Object { ($_.TaskName -match 'redis|mongo') -or (($_.Actions | Out-String) -match 'redis|mongo') }
    foreach($t in $tasks){
      Warn "Removing scheduled task: $($t.TaskName)"
      try { Unregister-ScheduledTask -TaskName $t.TaskName -Confirm:$false } catch { Warn "Failed to remove task $($t.TaskName): $_" }
    }
  } catch { Verb "Scheduled task enumeration failed: $_" }
}

# --- Data removal (optional) ---
if($RemoveData){
  Warn "RemoveData requested. Attempting to locate data directories."
  $mongoCfgDirs = @("C:\\Program Files\\MongoDB\\Server","C:\\Program Files (x86)\\MongoDB\\Server") | Where-Object { Test-Path $_ }
  $dbPaths = @()
  foreach($root in $mongoCfgDirs){
    Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $cfg = Join-Path $_.FullName 'bin\mongod.cfg'
      if(Test-Path $cfg){
        Verb "Parsing $cfg"
        try {
          $content = Get-Content $cfg -ErrorAction Stop
          foreach($line in $content){
            if($line -match '^\s*dbPath:\s*(.+)$'){
              $path = $Matches[1].Trim()
              if(Test-Path $path){ $dbPaths += $path }
            }
          }
  } catch { Warn "Failed reading ${cfg}: $_" }
      }
    }
  }
  # Common defaults if none detected
  if(-not $dbPaths -and (Test-Path 'C:\\data\\db')){ $dbPaths += 'C:\\data\\db' }
  $dbPaths = $dbPaths | Sort-Object -Unique
  if($dbPaths){
    foreach($p in $dbPaths){
      Warn "Removing MongoDB data directory: $p"
      if(-not $DryRun){ try { Remove-Item -Recurse -Force $p } catch { Warn "Failed to remove $p : $_" } }
    }
  } else { Verb "No MongoDB data paths detected." }

  # Redis typical data file (only if exists and not in use)
  $redisPaths = @('C:\\ProgramData\\redis','C:\\redis','C:\\ProgramData\\chocolatey\\lib\\redis') | Where-Object { Test-Path $_ }
  foreach($rp in $redisPaths){
    Warn "Removing Redis directory: $rp"
    if(-not $DryRun){ try { Remove-Item -Recurse -Force $rp } catch { Warn "Failed to remove $rp : $_" } }
  }
}

Info "Final service state (if any remain):"
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'mongo|redis|aiosmtpd' } | Select-Object Status,Name,DisplayName

Info "Leftover processes (should be empty):"
Get-Process -ErrorAction SilentlyContinue | Where-Object { $procNames -contains $_.ProcessName } | Select-Object Id,ProcessName,Path

Info "Uninstall script completed."