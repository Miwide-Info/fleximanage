REM @echo off
REM ==================================================================
REM install_services_win.bat
REM
REM Unified installation & management script — installs and runs:
REM   - aiosmtpd (SMTP server, default background process)
REM   - MongoDB (3-node replica set: 27017,27018,27019)
REM   - Redis (default 6379)
REM   - Node.js/npm (via Chocolatey)
REM
REM Design principles:
REM   - Non-destructive & re-entrant: skip or update if already installed; continue remaining steps on failure.
REM   - Background start (start /b) by default to avoid Python env differences under LocalSystem.
REM   - Optional NSSM service mode via PREFER_SERVICE=1 (requires NSSM installed & configured).
REM
REM Quick usage: open an elevated PowerShell/CMD and run:
REM   C:\fleximanage\install_services_win.bat
REM Optional: service mode (if NSSM installed):
REM   set PREFER_SERVICE=1
REM   C:\fleximanage\install_services_win.bat
REM
REM 入口：先跳转到参数/管理员检查，再进入主流程
goto :entry
REM Notes:
REM   - Must run elevated (service registration, low ports, system dirs).
REM   - Chocolatey install may need shell restart; script attempts to locate choco and warns if absent.
REM   - For aiosmtpd as service: use an account with site-packages access or system-wide Python.
REM
REM ==================================================================

:entry
REM Simple help argument parsing
if "%~1"=="--help" goto :usage
if "%~1"=="-h" goto :usage

REM Admin privilege check
openfiles >nul 2>&1
if %errorlevel% NEQ 0 (
    echo 请以管理员权限运行本脚本
    exit /b 1
)

goto :after_usage

:usage
echo.
echo Usage: %~nx0 [options]
echo.
echo Options:
echo   --help, -h        显示此帮助并退出
echo.
echo 默认行为：以后台进程方式启动 aiosmtpd（可靠、可见），并尝试安装/启动 Redis、MongoDB(副本集) 以及 Node.js/npm。
echo 若要尝试以 Windows 服务运行 aiosmtpd（需要 nssm），请先在同一命令行会话中设置环境变量：
echo   set PREFER_SERVICE=1
echo 然后重新运行本脚本。
echo.
exit /b 0

:after_usage


REM Dependency check
setlocal enabledelayedexpansion
set missing=

for %%C in (python pip curl powershell) do (
    where %%C >nul 2>&1 || set missing=!missing! %%C
)
if not "!missing!"=="" (
    echo 缺少依赖:!missing!
    exit /b 1
)
endlocal

REM Detect Chocolatey executable path early so we can call it even if PATH not refreshed
if exist "C:\ProgramData\chocolatey\bin\choco.exe" (
    set "CHOCO=C:\ProgramData\chocolatey\bin\choco.exe"
) else (
    for /f "delims=" %%x in ('where choco 2^>nul') do set "CHOCO=%%x"
)
if not defined CHOCO set "CHOCO=choco"

REM Detect NSSM (service helper) if available
for /f "delims=" %%n in ('where nssm 2^>nul') do set "NSSM=%%n"
if not defined NSSM (
    set "NSSM="
)

REM Prefer background run over Windows service.
REM Set PREFER_SERVICE=1 first to force service installation.
if not defined PREFER_SERVICE set "PREFER_SERVICE=0"

REM Jump to main flow to avoid falling into subroutine definitions.
goto :main_flow

REM Install aiosmtpd
:install_aiosmtpd
    echo 安装 aiosmtpd...
    pip install aiosmtpd
    set SVCNAME=aiosmtpd
    REM Absolute python path to avoid service env resolution issues
    for /f "delims=" %%P in ('where python 2^>nul') do set "PYEXE=%%P"
    if not defined PYEXE set "PYEXE=python"
    set ARGS=C:\fleximanage\aiosmtpd_launcher.py
    if not exist "C:\fleximanage" mkdir "C:\fleximanage"
    if not exist "C:\fleximanage\aiosmtpd.log" type nul > "C:\fleximanage\aiosmtpd.log" 2>nul
    if not exist "C:\fleximanage\aiosmtpd-error.log" type nul > "C:\fleximanage\aiosmtpd-error.log" 2>nul
    REM Pre-write start wrapper to avoid label calls inside parenthesis blocks
    >"C:\fleximanage\aiosmtpd_start.cmd" echo @echo off
    >>"C:\fleximanage\aiosmtpd_start.cmd" echo ^"%PYEXE%^" ^"%ARGS%^" 1^>^>^"C:\fleximanage\aiosmtpd-run.log^" 2^>^>^"C:\fleximanage\aiosmtpd-error.log^"
        if "%PREFER_SERVICE%"=="1" if defined NSSM (
            REM Register service when user requested and NSSM available
            echo PREFER_SERVICE=1 且检测到 NSSM，尝试注册为 Windows 服务...
            "%NSSM%" install %SVCNAME% "%PYEXE%" "%ARGS%"
            if %errorlevel% NEQ 0 (
                echo 服务 %SVCNAME% 可能已存在，尝试更新参数。
            )
            "%NSSM%" set %SVCNAME% Start SERVICE_AUTO_START
            "%NSSM%" set %SVCNAME% AppDirectory C:\fleximanage
            "%NSSM%" set %SVCNAME% AppStdout C:\fleximanage\aiosmtpd.log
            "%NSSM%" set %SVCNAME% AppStderr C:\fleximanage\aiosmtpd-error.log
            "%NSSM%" set %SVCNAME% AppParameters "C:\fleximanage\aiosmtpd_launcher.py"
            rem Use CALL to delay expansion of environment variables (PATH may contain parentheses)
            call "%NSSM%" set %SVCNAME% AppEnvironmentExtra "PYTHONPATH=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\Lib\site-packages"
            call "%NSSM%" set %SVCNAME% AppEnvironmentExtra "PATH=C:\Users\Administrator\AppData\Local\Programs\Python\Python312\;C:\Users\Administrator\AppData\Local\Programs\Python\Python312\Scripts\;%%PATH%%"
            echo aiosmtpd 服务已注册或已存在，尝试启动服务并检查运行状态...
            "%NSSM%" restart %SVCNAME% 2>nul || ("%NSSM%" start %SVCNAME% 2>nul) || (sc stop %SVCNAME% 2>nul & sc start %SVCNAME% 2>nul)
            timeout /t 3 >nul
            sc query %SVCNAME% | findstr /I "RUNNING" >nul 2>&1
            if %errorlevel% EQU 0 (
                echo aiosmtpd 服务正在运行（已使用 NSSM）。
            ) else (
                echo aiosmtpd 服务未能启动，回退到后台启动。
                goto :aiosmtpd_background_start
            )
            REM Write diagnostics for troubleshooting
            if exist "C:\Windows\system32\nssm.exe" C:\Windows\system32\nssm.exe dump aiosmtpd > C:\fleximanage\aiosmtpd-nssm-dump.txt 2>&1
            sc queryex aiosmtpd > C:\fleximanage\aiosmtpd-service-status.txt 2>&1
            if exist "%PYEXE%" (
                "%PYEXE%" C:\fleximanage\aiosmtpd_env_report.py > C:\fleximanage\aiosmtpd-env-report.out 2>&1
            )
        ) else (
            REM Default: background start (simpler / avoids service env issues)
            call :aiosmtpd_background_start
        )
:aiosmtpd_background_start
            setlocal enabledelayedexpansion
            echo 使用后台启动 aiosmtpd（PREFER_SERVICE!=1 或 NSSM 不可用）
            REM Use PowerShell to query listener (PID|Name|Path); fallback to netstat
            set "EXIST_PID="
            set "EXIST_NAME="
            set "EXIST_PATH="
            for /f "delims=" %%R in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $c = Get-NetTCPConnection -LocalPort 1025 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($null -ne $c) { $pid = $c.OwningProcess; $p = Get-Process -Id $pid -ErrorAction SilentlyContinue; $name=''; $path=''; if ($null -ne $p) { $name = $p.ProcessName; try { $path = $p.Path } catch {}; if ($null -eq $path) { $path = '' } }; Write-Output ($pid.ToString() + '|' + $name + '|' + $path) } else { Write-Output '' } } catch { Write-Output '' }"') do (
                set "_psout=%%R"
            )
            if defined _psout (
                for /f "tokens=1,2,3 delims=|" %%A in ("%_psout%") do (
                    set "EXIST_PID=%%A"
                    set "EXIST_NAME=%%B"
                    set "EXIST_PATH=%%C"
                )
            )
            if not defined EXIST_PID for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":1025"') do set EXIST_PID=%%p
            if defined EXIST_PID (
                echo 端口 1025 已被 PID %EXIST_PID% 占用，检查进程名...
                if not defined EXIST_NAME (
                    for /f "delims=" %%G in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Get-Process -Id %EXIST_PID% -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.ProcessName } else { '' } } catch { '' }"') do set "EXIST_NAME=%%G"
                    for /f "delims=" %%H in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Get-Process -Id %EXIST_PID% -ErrorAction SilentlyContinue; if ($null -ne $p) { try { $p.Path } catch { '' } } else { '' } } catch { '' }"') do set "EXIST_PATH=%%H"
                    rem remove any surrounding quotes if present
                    if defined EXIST_NAME set "EXIST_NAME=!EXIST_NAME:"=!"
                )
                if defined EXIST_NAME (
                    echo 占用进程名: !EXIST_NAME!
                    echo !EXIST_NAME! | findstr /I /C:"python" /C:"nssm" >nul 2>&1
                    if !errorlevel! EQU 0 (
                        echo 发现场景：已有 python/nssm 进程监听 1025，假定为已运行的 aiosmtpd，跳过启动。
                        >>"C:\fleximanage\aiosmtpd-debug.log" echo MARKER_SKIPPED_START
                    ) else (
                        echo 终止非 python 进程 %EXIST_PID% 并用后台 launcher 启动
                        taskkill /PID %EXIST_PID% /F >nul 2>&1 || echo 无法终止 PID %EXIST_PID%
                        timeout /t 1 >nul
                        start "aiosmtpd-fg" /b "C:\fleximanage\aiosmtpd_start.cmd"
                        >>"C:\fleximanage\aiosmtpd-debug.log" echo MARKER_DID_START
                    )
                ) else (
                    echo 无法检测到 PID %EXIST_PID% 的进程名，假定为临时进程，尝试终止并启动后台 launcher
                    taskkill /PID %EXIST_PID% /F >nul 2>&1 || echo 无法终止 PID %EXIST_PID%
                    timeout /t 1 >nul
                    start "aiosmtpd-fg" /b "C:\fleximanage\aiosmtpd_start.cmd"
                )
            ) else (
                echo 端口 1025 未被占用，启动后台 launcher
                start "aiosmtpd-fg" /b "C:\fleximanage\aiosmtpd_start.cmd"
            )
        REM Wait for aiosmtpd to listen on 1025 (max 15s); delayed expansion already enabled
    >>"C:\fleximanage\aiosmtpd-debug.log" echo MARKER_AFTER_START_CHECK
    REM If port in use identify PID and process name
    set LISTENER_PID=
    >>"C:\fleximanage\aiosmtpd-debug.log" echo MARKER_BEFORE_NETSTAT_CHECK
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":1025"') do set LISTENER_PID=%%p
        if defined LISTENER_PID (
            >>"C:\fleximanage\aiosmtpd-debug.log" echo MARKER_FOUND_LISTENER_PID_%LISTENER_PID%
            echo 端口 1025 当前被 PID %LISTENER_PID% 占用，检查进程...
            set "LISTENER_NAME="
            for /f "tokens=1 delims=," %%q in ('tasklist /FI "PID eq %LISTENER_PID%" /FO CSV /NH') do set "LISTENER_NAME=%%~q"
            REM LISTENER_NAME was extracted via %%~q (quotes removed); do not strip quotes again
            if defined LISTENER_NAME (
                >>"C:\fleximanage\aiosmtpd-debug.log" echo MARKER_FOUND_LISTENER_NAME_!LISTENER_NAME!
                echo 占用进程名: !LISTENER_NAME!
                echo !LISTENER_NAME! | findstr /I /C:"python.exe" /C:"nssm.exe" >nul 2>&1
                if !errorlevel! EQU 0 (
                    echo 发现 python/nssm 进程占用端口，假定它是合法的 aiosmtpd 实例，跳过重启。
                ) else (
                    echo 非 python/nssm 进程占用端口，尝试终止 PID %LISTENER_PID% ...
                    taskkill /PID %LISTENER_PID% /F >nul 2>&1 || echo 无法终止 PID %LISTENER_PID%
                    timeout /t 1 >nul
                    echo 端口 %LISTENER_PID% 终止后，将以后台 launcher 启动 aiosmtpd
                    start "aiosmtpd-fg" /b "C:\fleximanage\aiosmtpd_start.cmd"
                    >>"C:\fleximanage\aiosmtpd-debug.log" echo %DATE% %TIME% DID_START
                    echo 已使用后台进程启动 aiosmtpd，日志: C:\fleximanage\aiosmtpd-run.log 和 C:\fleximanage\aiosmtpd-error.log
                )
            ) else (
                rem attempt to query process name/path for LISTENER_PID via PowerShell (fallback to tasklist is removed)
                for /f "delims=" %%G in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Get-Process -Id %LISTENER_PID% -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.ProcessName } else { '' } } catch { '' }"') do set "LISTENER_NAME=%%G"
                for /f "delims=" %%H in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Get-Process -Id %LISTENER_PID% -ErrorAction SilentlyContinue; if ($null -ne $p) { try { $p.Path } catch { '' } } else { '' } } catch { '' }"') do set "LISTENER_PATH=%%H"
                if defined LISTENER_NAME (
                    echo 占用进程名: !LISTENER_NAME!
                    echo !LISTENER_NAME! | findstr /I /C:"python.exe" /C:"nssm.exe" >nul 2>&1
                    if !errorlevel! EQU 0 (
                        echo 发现 python/nssm 进程占用端口，假定它是合法的 aiosmtpd 实例，跳过重启。
                    ) else (
                        echo 非 python/nssm 进程占用端口，尝试终止 PID %LISTENER_PID% ...
                        taskkill /PID %LISTENER_PID% /F >nul 2>&1 || echo 无法终止 PID %LISTENER_PID%
                        timeout /t 1 >nul
                        echo 端口 %LISTENER_PID% 终止后，将以后台 launcher 启动 aiosmtpd
                        start "aiosmtpd-fg" /b "C:\fleximanage\aiosmtpd_start.cmd"
                        echo 已使用后台进程启动 aiosmtpd，日志: C:\fleximanage\aiosmtpd-run.log 和 C:\fleximanage\aiosmtpd-error.log
                    )
                ) else (
                    echo 无法确定 PID %LISTENER_PID% 的进程名，尝试终止并用后台 launcher 启动
                    taskkill /PID %LISTENER_PID% /F >nul 2>&1 || echo 无法终止 PID %LISTENER_PID%
                    timeout /t 1 >nul
                    start "aiosmtpd-fg" /b "C:\fleximanage\aiosmtpd_start.cmd"
                    echo 已使用后台进程启动 aiosmtpd，日志: C:\fleximanage\aiosmtpd-run.log 和 C:\fleximanage\aiosmtpd-error.log
            )
        )
    )
        endlocal
    REM Branch end; return to main flow
    goto :eof
:install_mongodb
echo 安装 MongoDB...
where choco >nul 2>&1
if %errorlevel% NEQ 0 (
    echo 未检测到 Chocolatey，自动安装...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    echo Chocolatey 安装完成后请关闭并重新打开 PowerShell，再运行本脚本以自动安装 MongoDB。
    REM 尝试在当前会话定位 choco
    if exist "C:\ProgramData\chocolatey\bin\choco.exe" (
        set "CHOCO=C:\ProgramData\chocolatey\bin\choco.exe"
    ) else (
        for /f "delims=" %%x in ('where choco 2^>nul') do set "CHOCO=%%x"
    )
    if not defined CHOCO (
        echo 警告: Chocolatey 已安装但当前会话无法找到 choco 命令。请重启 PowerShell 后重新运行本脚本以完成 MongoDB 安装。
        REM 继续脚本，不中止
        goto :continue_after_mongo
    )
)
%CHOCO% install mongodb -y
REM Configure replica set (3 nodes ports 27017/27018/27019)
echo 正在配置 MongoDB 副本集...
set "MONGO_BASE=C:\ProgramData\MongoDB"
set "MONGO_BIN=%ProgramFiles%\MongoDB\Server\8.2\bin"
if not exist "%MONGO_BIN%\mongod.exe" (
    for /f "delims=" %%M in ('where mongod 2^>nul') do set "MONGO_BIN=%%~dpM"
)
REM Normalize MONGO_BIN: remove surrounding quotes and trim trailing backslash using CALL to delay substring expansion
set "MONGO_BIN=%MONGO_BIN:"=%"
if defined MONGO_BIN (
    call set "__LAST=%%MONGO_BIN:~-1%%"
    if "%%__LAST%%"=="\" (
        call set "MONGO_BIN=%%MONGO_BIN:~0,-1%%"
    )
)
if exist "%MONGO_BIN%\mongod.exe" (
    echo 使用检测到的 mongod 路径: %MONGO_BIN%
) else (
    echo 警告: 未能找到 mongod.exe，请确认 MongoDB 已正确安装，脚本将继续但可能无法启动实例。
)
REM If a packaged MongoDB service is present and running (likely started without --replSet), stop it so we can start dedicated replica-set instances
echo 检查是否存在系统级 MongoDB 服务（将尝试停止以便启动副本集实例）...
sc query MongoDB >nul 2>&1
if %errorlevel% EQU 0 (
    echo 检测到服务 'MongoDB'，尝试停止服务以避免端口/配置冲突...
    sc stop MongoDB >nul 2>&1
    timeout /t 3 >nul
    sc query MongoDB | findstr /I "STOPPED" >nul 2>&1
    if %errorlevel% NEQ 0 (
        echo 无法停止 MongoDB 服务，请手动停止或以管理员身份运行本脚本。继续但可能导致冲突。 >> C:\fleximanage\mongo-invocation-diagnostic.txt
    )
)
REM --- Normalize and resolve mongo client executable to avoid quoting/path issues ---
REM Remove any embedded quotes from MONGO_BIN and ensure no trailing backslash
REM (Normalization for MONGO_BIN already performed above using CALL-based expansion)
set "MONGO_EXE=%MONGO_BIN%\mongo.exe"
REM If mongo.exe not present at expected location, try to find 'mongo' or 'mongosh' on PATH
if not exist "%MONGO_EXE%" (
    for /f "delims=" %%X in ('where mongo 2^>nul') do set "MONGO_EXE=%%X"
)
if not exist "%MONGO_EXE%" (
    for /f "delims=" %%Y in ('where mongosh 2^>nul') do set "MONGO_EXE=%%Y"
)
if not exist "C:\fleximanage" mkdir "C:\fleximanage" 2>nul
set "MONGO_INV_DIAG=C:\fleximanage\mongo-invocation-diagnostic.txt"
if exist "%MONGO_INV_DIAG%" del /q "%MONGO_INV_DIAG%" >nul 2>&1
echo Resolved MONGO_BIN: %MONGO_BIN%>"%MONGO_INV_DIAG%"
echo Initial candidate MONGO_EXE: %MONGO_EXE%>>"%MONGO_INV_DIAG%"
if exist "%MONGO_EXE%" (
    echo Found mongo client at: %MONGO_EXE%>>"%MONGO_INV_DIAG%"
) else (
    echo Warning: mongo client not found at resolved locations. >>"%MONGO_INV_DIAG%"
    echo Please ensure mongo.exe or mongosh is installed and on PATH. >>"%MONGO_INV_DIAG%"
)

REM If no mongo client found, prepare a Python helper using pymongo as a fallback
if not exist "%MONGO_EXE%" (
    echo Creating Python fallback helper for MongoDB actions... >> "%MONGO_INV_DIAG%"
    if not exist "%MONGO_BIN%\..\..\" (
        REM ignore
    )
    for /f "delims=" %%P in ('where python 2^>nul') do set "PYEXE=%%P"
    if not defined PYEXE set "PYEXE=python"
    echo Ensuring pymongo is installed using %PYEXE% >> "%MONGO_INV_DIAG%"
    if not exist "%MONGO_BASE%\log" mkdir "%MONGO_BASE%\log" >nul 2>&1
    "%PYEXE%" -m pip install pymongo --no-warn-script-location > "%MONGO_BASE%\log\pymongo-install.log" 2>&1 || echo pip install pymongo failed >> "%MONGO_INV_DIAG%"
    REM write helper script using a single-line PowerShell command to avoid cmd multiline parsing inside parentheses
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Content -Path 'C:\fleximanage\mongo_rs_helper.py' -Encoding Ascii -Value (@('import sys','import json','from pymongo import MongoClient','','def ping_port(port):','    try:','        client = MongoClient(""localhost"", int(port), serverSelectionTimeoutMS=3000)','        r = client.admin.command(""ping"")','        print(json.dumps(r))','        return 0','    except Exception as e:','        import traceback; traceback.print_exc(); return 2','','def init_rs():','    cfg={""_id"":""rs"",""members"":[{""_id"":0,""host"":""localhost:27017""},{""_id"":1,""host"":""localhost:27018""},{""_id"":2,""host"":""localhost:27019""}]}','    try:','        client = MongoClient(""localhost"",27017,serverSelectionTimeoutMS=5000)','        r = client.admin.command(""replSetInitiate"", cfg)','        print(json.dumps(r))','        return 0','    except Exception as e:','        import traceback; traceback.print_exc(); return 2','','def status_rs():','    try:','        client = MongoClient(""localhost"",27017,serverSelectionTimeoutMS=5000)','        r = client.admin.command(""replSetGetStatus"")','        print(json.dumps(r))','        return 0','    except Exception as e:','        import traceback; traceback.print_exc(); return 2','','if __name__==""__main__"":','    if len(sys.argv) < 2:','        print(""usage: ping <port> | init | status"")','        sys.exit(3)','    cmd = sys.argv[1].lower()','    if cmd == ""ping"":','        sys.exit(ping_port(sys.argv[2]))','    elif cmd == ""init"":','        sys.exit(init_rs())','    elif cmd == ""status"":','        sys.exit(status_rs())','    else:','        print(""unknown command""); sys.exit(4)') -join [char]10)"
    echo Wrote python helper to C:\fleximanage\mongo_rs_helper.py >> "%MONGO_INV_DIAG%"
    set "PY_FALLBACK=1"
)
REM 启动每个 mongod 实例，使用子例程以避免复杂块解析问题
call :start_mongod 27017
call :start_mongod 27018
call :start_mongod 27019


echo 等待 MongoDB 实例启动 (15s)...
timeout /t 15 >nul
echo 启动后查看 mongod 进程列表并记录于 C:\fleximanage\mongo-processes.txt
tasklist /FI "IMAGENAME eq mongod.exe" /FO LIST > C:\fleximanage\mongo-processes.txt 2>&1
type C:\fleximanage\mongo-processes.txt
echo 初始化副本集配置（最多重试 5 次）...
REM Replica set init (up to 5 retries)
set RETRY=0
set SUCCESS=0
set INIT_RS=rs.initiate({_id: 'rs', members: [{_id: 0, host: 'localhost:27017'}, {_id: 1, host: 'localhost:27018'}, {_id: 2, host: 'localhost:27019'}]})
set "RS_DIAG=%MONGO_BASE%\log\rs-init-diagnostic.txt"
if exist "%RS_DIAG%" del /q "%RS_DIAG%" >nul 2>&1

echo 检查每个 mongod 实例的可达性（ping）...
set "PING_FAIL=0"
for %%P in (27017 27018 27019) do (
    echo 测试端口 %%P ...
    if exist "%MONGO_EXE%" (
        "%MONGO_EXE%" --port %%P --eval "printjson(db.adminCommand({ping:1}))" > "%MONGO_BASE%\log\mongo-ping-%%P.log" 2>&1
    ) else (
        if defined PYEXE (
            "%PYEXE%" "C:\fleximanage\mongo_rs_helper.py" ping %%P > "%MONGO_BASE%\log\mongo-ping-%%P.log" 2>&1
        ) else (
            echo No mongo client and no python available to perform ping > "%MONGO_BASE%\log\mongo-ping-%%P.log" 2>&1
        )
    )
    findstr /I "ok" "%MONGO_BASE%\log\mongo-ping-%%P.log" >nul 2>&1 || (
        echo 端口 %%P 的 mongod 未响应 ping，查看 %MONGO_BASE%\log\mongo-ping-%%P.log >> "%RS_DIAG%"
        echo 端口 %%P 的 mongod 未响应 ping，查看 %MONGO_BASE%\log\mongo-ping-%%P.log >> "%RS_DIAG%"
        set "PING_FAIL=1"
    )
)
if "%PING_FAIL%"=="1" (
    echo 检测到至少一个 mongod 无响应，收集日志并中止副本集初始化。>> "%RS_DIAG%"
    call :dump_mongo_logs
    type "%RS_DIAG%"
    goto :continue_after_mongo
)
:mongo_init_try
if %RETRY% GEQ 5 goto :mongo_init_failed
echo 尝试初始化副本集，尝试次数：%RETRY%
if exist "%MONGO_EXE%" (
    "%MONGO_EXE%" --port 27017 --eval "%INIT_RS%" > "%MONGO_BASE%\log\rs-init-%RETRY%.log" 2>&1
) else (
    if defined PYEXE (
        "%PYEXE%" "C:\fleximanage\mongo_rs_helper.py" init > "%MONGO_BASE%\log\rs-init-%RETRY%.log" 2>&1
    ) else (
        echo No mongo client and no python available to run rs.initiate > "%MONGO_BASE%\log\rs-init-%RETRY%.log" 2>&1
    )
)
findstr /I "ok" "%MONGO_BASE%\log\rs-init-%RETRY%.log" >nul 2>&1 && set SUCCESS=1
if %SUCCESS% EQU 1 goto :mongo_init_success
set /a RETRY+=1
timeout /t 3 >nul
goto :mongo_init_try

:mongo_init_failed
echo 错误: 无法初始化副本集，请检查日志 %MONGO_BASE%\log\rs-init-*.log
echo ===== MongoDB 副本集初始化失败诊断 ===== > "%RS_DIAG%"
echo 日志目录内容: >> "%RS_DIAG%"
dir /b "%MONGO_BASE%\log" >> "%RS_DIAG%"
echo 正在收集最近日志到 C:\fleximanage\ ... >> "%RS_DIAG%"
call :dump_mongo_logs
echo 诊断已写入并复制到 C:\fleximanage，内容如下：
type "%RS_DIAG%"
goto :continue_after_mongo

:mongo_init_success
echo MongoDB 副本集(rs) 已成功初始化并应在端口 27017,27018,27019 监听。
echo 副本集初始化日志: %MONGO_BASE%\log\rs-init-*.log
echo 另外将 rs.status() 输出写入 C:\fleximanage\mongo-rs-status.txt
if exist "%MONGO_EXE%" (
    "%MONGO_EXE%" --port 27017 --eval "printjson(rs.status())" > C:\fleximanage\mongo-rs-status.txt 2>&1 || echo 无法获取 rs.status() 输出
) else (
    if defined PYEXE (
        "%PYEXE%" "C:\fleximanage\mongo_rs_helper.py" status > C:\fleximanage\mongo-rs-status.txt 2>&1 || echo 无法获取 rs.status() 输出
    ) else (
        echo 无法获取 rs.status()：既没有 mongo/mongosh 客户端，也没有 python 可用
    )
)
goto :continue_after_mongo

REM Subroutine: start one mongod instance (arg: port)
:start_mongod
setlocal
set PORT=%1
set DBDIR=%MONGO_BASE%\data\db%PORT%
set LOGDIR=%MONGO_BASE%\log
if not exist "%DBDIR%" mkdir "%DBDIR%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if defined NSSM (
    echo 正在使用 NSSM 注册并启动 MongoDB-%PORT% 服务...
    "%NSSM%" install MongoDB-%PORT% "%MONGO_BIN%\mongod.exe" --port %PORT% --dbpath "%DBDIR%" --replSet rs --logpath "%LOGDIR%\mongod-%PORT%.log"
    "%NSSM%" set MongoDB-%PORT% Start SERVICE_AUTO_START
    "%NSSM%" start MongoDB-%PORT% 2>nul || sc start MongoDB-%PORT% 2>nul
) else (
    echo 未检测到 NSSM，使用 start /b 启动 mongod %PORT%...
    start "MongoDB-%PORT%" /b "%MONGO_BIN%\mongod.exe" --port %PORT% --dbpath "%DBDIR%" --replSet rs --logpath "%LOGDIR%\mongod-%PORT%.log" > "%LOGDIR%\mongod-%PORT%.start.log" 2>&1
)
endlocal
goto :eof
 
:: Copy latest MongoDB logs to C:\fleximanage for easier inspection
:dump_mongo_logs
    echo Dumping mongod and rs-init logs into C:\fleximanage ...
    if not exist C:\fleximanage mkdir C:\fleximanage >nul 2>&1
    set "MLOGDIR=%MONGO_BASE%\log"
    if exist "%MLOGDIR%" (
        rem copy last 200 lines of each mongod*.log and rs-init-*.log
        for %%L in ("%MLOGDIR%\mongod-*.log" "%MLOGDIR%\rs-init-*.log" "%MLOGDIR%\mongod.log") do (
            for /f "delims=" %%F in ('dir /b %%~L 2^>nul') do (
                powershell -NoProfile -Command "Get-Content -Path '%MLOGDIR%\\%%F' -Tail 200 | Out-File -FilePath 'C:\fleximanage\\mongo-%%F.tail.txt' -Encoding UTF8"
            )
        )
        echo Copied log tails to C:\fleximanage\mongo-*.tail.txt
        echo Copied log tails to C:\fleximanage\mongo-*.tail.txt >> "%RS_DIAG%"
    ) else (
        echo 未找到 MongoDB 日志目录: %MLOGDIR% >> "%RS_DIAG%"
        echo 未找到 MongoDB 日志目录: %MLOGDIR%
    )
    goto :eof
echo MongoDB 服务名一般为 MongoDB，可用如下命令管理：
echo sc start MongoDB
echo sc stop MongoDB
echo sc query MongoDB
REM Branch end; return main flow
:: label to continue when choco not available
:continue_after_mongo

REM 安装 Redis
:install_redis
echo 安装 Redis...
where choco >nul 2>&1
if %errorlevel% NEQ 0 (
    echo 未检测到 Chocolatey，自动安装...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    echo Chocolatey 安装完成后请关闭并重新打开 PowerShell，再运行本脚本以自动安装 Redis。
    REM 尝试在当前会话定位 choco
    if exist "C:\ProgramData\chocolatey\bin\choco.exe" (
        set "CHOCO=C:\ProgramData\chocolatey\bin\choco.exe"
    ) else (
        for /f "delims=" %%x in ('where choco 2^>nul') do set "CHOCO=%%x"
    )
    if not defined CHOCO (
        echo 警告: Chocolatey 已安装但当前会话无法找到 choco 命令。请重启 PowerShell 后重新运行本脚本以完成 Redis 安装。
        REM 继续脚本，不中止
        goto :continue_after_redis
    )
)
REM Ensure CHOCO is set before attempting choco install (avoid expanding to 'install ...')
if not defined CHOCO (
    if exist "C:\ProgramData\chocolatey\bin\choco.exe" (
        set "CHOCO=C:\ProgramData\chocolatey\bin\choco.exe"
    ) else (
        for /f "delims=" %%x in ('where choco 2^>nul') do set "CHOCO=%%x"
    )
)
if defined CHOCO (
    %CHOCO% install redis-64 -y
) else (
    echo 警告: 未检测到 choco，跳过 Redis 的自动安装。请手动安装或重启 shell 后重试。
)
echo Redis 服务名一般为 Redis，可用如下命令管理：
echo sc start Redis
echo sc stop Redis
echo sc query Redis
REM Branch end; return main flow
:: label to continue when choco not available
:continue_after_redis

:check_redis
    echo 检查 Redis 安装与运行状态...
    set "REDIS_LOG=C:\fleximanage\redis-diagnostic.txt"
    if exist "%REDIS_LOG%" del /q "%REDIS_LOG%">nul 2>&1
    echo Redis diagnostic > "%REDIS_LOG%"
    echo ------------------ >> "%REDIS_LOG%"
    REM Check if choco package installed (simplified return code check)
    set "CHACO_REDIS="
    if not defined CHOCO for /f "delims=" %%x in ('where choco 2^>nul') do set "CHOCO=%%x"
    if defined CHOCO (
        "%CHOCO%" list --local-only | findstr /I "redis" >nul 2>&1
        if %errorlevel% EQU 0 (
            set "CHACO_REDIS=1"
        )
    )
    if defined CHACO_REDIS (
        echo Chocolatey 报告已安装 redis 包 >> "%REDIS_LOG%"
        echo Chocolatey: 已安装 redis 包
    ) else (
        echo Chocolatey: 未在本地包列表中找到 redis 或 choco 不可用 >> "%REDIS_LOG%"
        echo Chocolatey: 未在本地包列表中找到 redis 或 choco 不可用
    )
    REM Locate redis-server executable (package name may differ)
    for /f "delims=" %%r in ('where redis-server 2^>nul') do set "REDIS_EXE=%%r"
    if not defined REDIS_EXE for /f "delims=" %%r in ('where redis-server.exe 2^>nul') do set "REDIS_EXE=%%r"
    if defined REDIS_EXE (
        echo Found redis executable: %REDIS_EXE% >> "%REDIS_LOG%"
        echo Found redis executable: %REDIS_EXE%
    ) else (
        echo 未找到 redis 可执行文件（redis-server/redis-server.exe） >> "%REDIS_LOG%"
        echo 未找到 redis 可执行文件（redis-server/redis-server.exe）
    )
    REM Check service presence (Redis / RedisService)
    sc query Redis >nul 2>&1
    if %errorlevel% EQU 0 (
        sc query Redis | findstr /I "STATE" >> "%REDIS_LOG%"
        echo Found service name: Redis >> "%REDIS_LOG%"
        echo Found service: Redis
    ) else (
        sc query RedisService >nul 2>&1
        if %errorlevel% EQU 0 (
            sc query RedisService | findstr /I "STATE" >> "%REDIS_LOG%"
            echo Found service name: RedisService >> "%REDIS_LOG%"
            echo Found service: RedisService
        ) else (
            echo 未检测到 Redis 服务（Redis 或 RedisService） >> "%REDIS_LOG%"
            echo 未检测到 Redis 服务（Redis 或 RedisService）
        )
    )
    REM Find PID on port 6379 then resolve name/path via PowerShell
    set "REDIS_PID="
    set "REDIS_PROC="
    set "REDIS_PATH="
    REM Query PowerShell for any listening TCP connection on local port 6379 and return OwningProcess|ProcessName|Path
    for /f "delims=" %%R in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $c = Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($null -ne $c) { $pid = $c.OwningProcess; $p = Get-Process -Id $pid -ErrorAction SilentlyContinue; $name = ''; $path=''; if ($null -ne $p) { $name = $p.ProcessName; try { $path = $p.Path } catch {}; if ($null -eq $path) { $path = '' } }; Write-Output ($pid.ToString() + '|' + $name + '|' + $path) } else { Write-Output '' } } catch { Write-Output '' }"') do (
        set "_psout=%%R"
    )
    if defined _psout (
        for /f "tokens=1,2,3 delims=|" %%A in ("%_psout%") do (
            set "REDIS_PID=%%A"
            set "REDIS_PROC=%%B"
            set "REDIS_PATH=%%C"
        )
    )
    if defined REDIS_PID (
        echo 端口 6379 正在监听，PID=%REDIS_PID% >> "%REDIS_LOG%"
        echo 端口 6379 正在监听，PID=%REDIS_PID%
        rem If ProcessName is empty but we have an executable path, derive a reasonable name from filename
        if not defined REDIS_PROC if defined REDIS_PATH (
            for %%F in ("%REDIS_PATH%") do set "REDIS_PROC=%%~nxF"
        )
        if defined REDIS_PROC if not "%REDIS_PROC%"=="" (
            set "REDIS_PROC=%REDIS_PROC:"=%"
            echo 占用进程: %REDIS_PROC% (PID %REDIS_PID%) >> "%REDIS_LOG%"
            echo 占用进程: %REDIS_PROC% (PID %REDIS_PID%)
            if defined REDIS_PATH (
                echo 可执行路径: %REDIS_PATH% >> "%REDIS_LOG%"
                echo 可执行路径: %REDIS_PATH%
            )
            echo %REDIS_PROC% | findstr /I "memurai redis redis-server" >nul 2>&1
            if %errorlevel% EQU 0 (
                echo 发现兼容 Redis 的服务: %REDIS_PROC% >> "%REDIS_LOG%"
                echo 发现兼容 Redis 的服务: %REDIS_PROC%
                set "REDIS_OK=1"
                if not defined REDIS_EXE if defined REDIS_PATH set "REDIS_EXE=%REDIS_PATH%"
            )
        ) else (
            echo 无法通过 PID %REDIS_PID% 查到进程名/路径或路径为空 >> "%REDIS_LOG%"
            echo 无法通过 PID %REDIS_PID% 查到进程名/路径或路径为空
        )
    ) else (
        echo 端口 6379 未被监听 >> "%REDIS_LOG%"
        echo 端口 6379 未被监听
    )
    echo Redis 检查完成，诊断文件：%REDIS_LOG%
    goto :eof

REM Service management routines
:service_manage
    set action=%1
    set svc=%2
    if "%action%"=="start" (sc start %svc%)
    if "%action%"=="stop" (sc stop %svc%)
    if "%action%"=="restart" (sc stop %svc% & sc start %svc%)
    if "%action%"=="status" (sc query %svc%)
    goto :eof

REM Helper: ensure CHOCO path available
where choco >nul 2>&1
if %errorlevel% EQU 0 (
    for /f "delims=" %%x in ('where choco') do set "CHOCO=%%x"
) else (
    set "CHOCO="
)

REM Enter main flow
goto :main_flow

REM Main flow: install and verify components sequentially
:main_flow
echo TRACE: starting main flow > C:\fleximanage\install_trace.txt
echo 自动安装全部服务...
echo TRACE: calling install_aiosmtpd >> C:\fleximanage\install_trace.txt
call :install_aiosmtpd
echo TRACE: returned from install_aiosmtpd >> C:\fleximanage\install_trace.txt
echo TRACE: calling install_redis >> C:\fleximanage\install_trace.txt
call :install_redis
echo TRACE: returned from install_redis >> C:\fleximanage\install_trace.txt
echo TRACE: calling check_redis >> C:\fleximanage\install_trace.txt
call :check_redis
echo TRACE: returned from check_redis >> C:\fleximanage\install_trace.txt
echo TRACE: calling install_mongodb >> C:\fleximanage\install_trace.txt
call :install_mongodb
echo TRACE: returned from install_mongodb >> C:\fleximanage\install_trace.txt
echo TRACE: calling install_nodejs >> C:\fleximanage\install_trace.txt
call :install_nodejs
echo TRACE: returned from install_nodejs >> C:\fleximanage\install_trace.txt
echo 全部服务及 Node.js/npm 安装流程已完成！
pause
goto :report

REM (Duplicate main menu removed to avoid confusion)

REM Install Node.js & npm subroutine
:install_nodejs
echo 安装 Node.js 和 npm...
where choco >nul 2>&1
if %errorlevel% NEQ 0 (
    echo 未检测到 Chocolatey，自动安装...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    echo Chocolatey 安装完成后请关闭并重新打开 PowerShell，再运行本脚本以自动安装 Node.js 和 npm。
    goto :eof
)
REM Ensure CHOCO variable points to a usable choco
if not defined CHOCO (
    if exist "C:\ProgramData\chocolatey\bin\choco.exe" set "CHOCO=C:\ProgramData\chocolatey\bin\choco.exe"
)
if not defined CHOCO for /f "delims=" %%x in ('where choco 2^>nul') do set "CHOCO=%%x"

%CHOCO% install nodejs-lts -y
if %errorlevel% NEQ 0 (
    echo Node.js 安装失败，请检查 Chocolatey 可用性或手动安装 Node.js
)
REM More reliable detection: locate node/npm executables then run version checks.
for /f "delims=" %%N in ('where node 2^>nul') do set "NODE_EXE=%%N"
if defined NODE_EXE (
    "%NODE_EXE%" -v >nul 2>&1 || echo 警告: 检测到 node (%NODE_EXE%) 但无法执行，请检查安装。
) else (
    echo 警告: 未能检测到 node 可执行文件，请在重启 shell 后检查安装。
)
for /f "delims=" %%M in ('where npm 2^>nul') do set "NPM_CMD=%%M"
if defined NPM_CMD (
    REM In PowerShell invoking `npm` may hit execution policy (npm.ps1)
    REM Use cmd /c to prefer npm.cmd and bypass policy scripts.
    cmd /c "\"%NPM_CMD%\" -v" >nul 2>&1 || echo 警告: 检测到 npm (%NPM_CMD%) 但运行失败；PowerShell 执行策略可能阻止 npm.ps1。请在 cmd 中运行 `npm -v` 或以管理员权限运行 PowerShell: `Set-ExecutionPolicy Bypass -Scope Process -Force` 然后重试。
) else (
    echo 警告: 未能检测到 npm 可执行文件，请在重启 shell 后检查安装。
)
goto :eof
:: report and exit
:report
echo ====== 服务状态报告 ======
sc query aiosmtpd | findstr /I "STATE"
sc query MongoDB | findstr /I "STATE"
sc query Redis | findstr /I "STATE"
echo.
echo ====== 端口监听检测 ======
netstat -ano | findstr :1025
netstat -ano | findstr :27017
netstat -ano | findstr :27018
netstat -ano | findstr :27019
netstat -ano | findstr :6379
echo.
echo 状态报告完毕。
pause

goto :eof

:end

REM (Removed :do_start_aiosmtpd; unified external aiosmtpd_start.cmd approach)
