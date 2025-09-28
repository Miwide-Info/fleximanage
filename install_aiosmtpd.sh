#!/usr/bin/env bash
echo "[DEPRECATED WARNING] This script has been moved to scripts/install_aiosmtpd.sh. Please invoke that path instead." >&2

# aiosmtpd Mail Server Installation & Management Script (virtual environment based)
# 功能: 安装/更新 aiosmtpd, 创建 systemd 或 sysv(init.d) 服务, 开机自启, 监听默认端口 1025
# NOTE: Comments already in English elsewhere; keeping one Chinese summary line per requirement from user (code stays English).

set -euo pipefail

#############################################
# Configurable variables (can override via KEY=VALUE before/after script name)
#############################################
SERVICE_NAME="aiosmtpd"          # Service unit / init.d script name
USER="aiosmtpd"                  # System user running the service
GROUP="aiosmtpd"                 # System group
PORT="1025"                      # SMTP listen port
INSTALL_DIR="/opt/aiosmtpd_server"
VENV_DIR="$INSTALL_DIR/venv"
LOG_DIR="/fleximanage/logs"      # Central logs directory (shared by project)
SCRIPT_NAME="aiosmtpd_server.py" # Python server script filename
PYTHON_BIN="python3"             # Python interpreter
AIOSMTPD_VERSION=""             # If set, install exact version (e.g. 1.4.5). Otherwise latest.

# Action flags (override: UNINSTALL=1, REINSTALL=1, UPGRADE=1)
UNINSTALL="0"
REINSTALL="0"
UPGRADE="0"

#############################################
# Parse KEY=VALUE style arguments
#############################################
for arg in "$@"; do
    if [[ "$arg" == *=* ]]; then
        key="${arg%%=*}"; val="${arg#*=}"; export "$key"="$val" || true
    fi
done

# Re-read in case user exported externally
SERVICE_NAME=${SERVICE_NAME}
USER=${USER}
GROUP=${GROUP}
PORT=${PORT}
INSTALL_DIR=${INSTALL_DIR}
VENV_DIR=${VENV_DIR}
LOG_DIR=${LOG_DIR}
SCRIPT_NAME=${SCRIPT_NAME}
PYTHON_BIN=${PYTHON_BIN}
AIOSMTPD_VERSION=${AIOSMTPD_VERSION}
UNINSTALL=${UNINSTALL}
REINSTALL=${REINSTALL}
UPGRADE=${UPGRADE}

#############################################
# Logging helpers
#############################################
log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"; }
info() { log "INFO: $*"; }
warn() { log "WARN: $*" >&2; }
err()  { log "ERROR: $*" >&2; }
die()  { err "$1"; exit 1; }

usage() {
    cat <<USAGE
Usage: sudo ./install_aiosmtpd.sh [KEY=VALUE ...]

Actions (flags):
    UNINSTALL=1          Remove service + install directory (keeps logs)
    REINSTALL=1          Force recreate venv & reinstall aiosmtpd
    UPGRADE=1            Pip install --upgrade aiosmtpd inside existing venv

Config overrides:
    PORT=1025            Listening port
    INSTALL_DIR=/opt/aiosmtpd_server
    LOG_DIR=/fleximanage/logs
    AIOSMTPD_VERSION=1.4.5  Pin specific version
    PYTHON_BIN=python3

Examples:
    sudo ./install_aiosmtpd.sh PORT=2525
    sudo ./install_aiosmtpd.sh UPGRADE=1
    sudo ./install_aiosmtpd.sh UNINSTALL=1
    sudo ./install_aiosmtpd.sh REINSTALL=1 AIOSMTPD_VERSION=1.4.5
USAGE
}

if [[ "${HELP:-0}" == "1" ]]; then usage; exit 0; fi

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
        die "This script must be run as root (sudo)."
fi

# Detect init system
IS_SYSTEMD=0
if [[ -d /run/systemd/system ]] || [[ $(ps -p 1 -o comm= 2>/dev/null) == systemd ]]; then
    IS_SYSTEMD=1
fi

# Handle UNINSTALL early
if [[ "$UNINSTALL" == "1" ]]; then
    info "UNINSTALL=1 requested. Stopping & removing service..."
    if [[ $IS_SYSTEMD -eq 1 ]]; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
        rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
        systemctl daemon-reload || true
    else
        service "$SERVICE_NAME" stop 2>/dev/null || true
        rm -f "/etc/init.d/${SERVICE_NAME}" || true
    fi
    if [[ -d "$INSTALL_DIR" ]]; then
        rm -rf "$INSTALL_DIR"
        info "Removed $INSTALL_DIR"
    fi
    info "Uninstall complete. Logs retained at $LOG_DIR (not removed)."
    exit 0
fi

info "Installing system dependencies (python + venv tools)..."
if command -v apt-get &> /dev/null; then
        apt-get update -y
        DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-pip python3-venv
elif command -v yum &> /dev/null; then
        yum install -y python3 python3-pip
elif command -v dnf &> /dev/null; then
    dnf install -y python3 python3-pip
else
        die "Cannot determine package manager; install Python3 & pip manually and re-run."
fi

# Ensure group
if ! getent group "$GROUP" >/dev/null 2>&1; then
    info "Creating group: $GROUP"
    groupadd --system "$GROUP" || true
fi

# Create dedicated user if missing
if ! id "$USER" &>/dev/null; then
        info "Creating dedicated user: $USER"
        useradd --system --no-create-home --shell /bin/false -g "$GROUP" "$USER"
fi

# Idempotent directory creation
info "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR" && chown "$USER:$GROUP" "$INSTALL_DIR"

# Log directory (shared) may already exist
info "Ensuring log directory: $LOG_DIR"
mkdir -p "$LOG_DIR"
chown "$USER:$GROUP" "$LOG_DIR"

if [[ "$REINSTALL" == "1" && -d "$VENV_DIR" ]]; then
    warn "REINSTALL=1: removing existing virtualenv $VENV_DIR"
    rm -rf "$VENV_DIR"
fi

# Create Python virtual environment if absent
if [[ ! -d "$VENV_DIR" ]]; then
    info "Creating Python virtual environment..."
    sudo -u "$USER" "$PYTHON_BIN" -m venv "$VENV_DIR"
else
    info "Virtualenv already exists: $VENV_DIR"
fi

PIP="$VENV_DIR/bin/pip"
if [[ ! -x "$PIP" ]]; then
    die "pip not found in virtualenv ($PIP)."
fi

if [[ "$UPGRADE" == "1" ]]; then
    info "UPGRADE=1: upgrading pip + aiosmtpd"
    sudo -u "$USER" "$PIP" install --upgrade pip
    if [[ -n "$AIOSMTPD_VERSION" ]]; then
        sudo -u "$USER" "$PIP" install --upgrade "aiosmtpd==${AIOSMTPD_VERSION}"
    else
        sudo -u "$USER" "$PIP" install --upgrade aiosmtpd
    fi
elif [[ "$REINSTALL" == "1" ]]; then
    info "Installing aiosmtpd (fresh)"
    if [[ -n "$AIOSMTPD_VERSION" ]]; then
        sudo -u "$USER" "$PIP" install "aiosmtpd==${AIOSMTPD_VERSION}"
    else
        sudo -u "$USER" "$PIP" install aiosmtpd
    fi
else
    # Install only if not present
    if ! sudo -u "$USER" "$VENV_DIR/bin/python" -c "import aiosmtpd" 2>/dev/null; then
        info "Installing aiosmtpd (not found in venv)"
        if [[ -n "$AIOSMTPD_VERSION" ]]; then
            sudo -u "$USER" "$PIP" install "aiosmtpd==${AIOSMTPD_VERSION}"
        else
            sudo -u "$USER" "$PIP" install aiosmtpd
        fi
    else
        info "aiosmtpd already installed; skip (use UPGRADE=1 to force upgrade)."
    fi
fi

# Create / update server script (idempotent overwrite OK)
info "Writing server script $SCRIPT_NAME"
cat > "$INSTALL_DIR/$SCRIPT_NAME" << 'EOF'
#!/usr/bin/env python3
"""
aiosmtpd server startup script
Listening on port 1025, running as a system service
"""

import asyncio
import logging
import socket
from aiosmtpd.controller import Controller

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('aiosmtpd')

class CustomHandler:
    """Custom email handler"""
    async def handle_DATA(self, server, session, envelope):
        peer = session.peer
        mail_from = envelope.mail_from
        rcpt_tos = envelope.rcpt_tos
        data = envelope.content
        
        # Log email information
        logger.info(f"Received email from {peer}")
        logger.info(f"Sender: {mail_from}")
        logger.info(f"Recipients: {rcpt_tos}")
        
        # Print first 100 characters of email content (to avoid large logs)
        content_preview = data.decode('utf-8', errors='replace')[:100]
        logger.info(f"Content preview: {content_preview}...")
        
        # Add your custom processing logic here
        # For example: store in database, forward to message queue, etc.
        
        return '250 Message accepted for delivery'

async def main():
    """Main async function"""
    # Initialize controller and handler
    handler = CustomHandler()
    
    # Listen on specified port on all network interfaces
    controller = Controller(
        handler, 
        hostname='0.0.0.0', 
        port=1025
    )
    
    # Start server
    controller.start()
    logger.info(f"aiosmtpd SMTP server started, listening on {controller.hostname}:{controller.port}")
    
    # Keep server running
    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down server...")
    finally:
        controller.stop()
        logger.info("Server stopped")

if __name__ == "__main__":
    asyncio.run(main())
EOF

chmod +x "$INSTALL_DIR/$SCRIPT_NAME" && chown "$USER:$GROUP" "$INSTALL_DIR/$SCRIPT_NAME"

# Basic port conflict check
if ss -tuln 2>/dev/null | grep -q ":$PORT"; then
    warn "Port $PORT already in use. Service start may fail."
fi

#############################################
# Service creation (systemd preferred)
#############################################
if [[ $IS_SYSTEMD -eq 1 ]]; then
    info "Detected systemd – creating unit file /etc/systemd/system/${SERVICE_NAME}.service"
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=aiosmtpd SMTP Server (port $PORT)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
Group=$GROUP
WorkingDirectory=$INSTALL_DIR
Environment=PYTHONUNBUFFERED=1 PORT=$PORT
ExecStart=$VENV_DIR/bin/python $INSTALL_DIR/$SCRIPT_NAME
Restart=on-failure
RestartSec=5
# Logs go to journald; you can view with: journalctl -u $SERVICE_NAME -f

[Install]
WantedBy=multi-user.target
UNIT
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
    systemctl restart "$SERVICE_NAME" || systemctl start "$SERVICE_NAME"
    info "systemd service deployed & (re)started."
else
    ###########################################
    # Legacy sysv init.d fallback
    ###########################################
    info "Systemd not found – using init.d script."
    echo "Creating init.d service script..."
    cat > "/etc/init.d/$SERVICE_NAME" << EOF
#!/bin/sh
### BEGIN INIT INFO
# Provides:          $SERVICE_NAME
# Required-Start:    \$network \$remote_fs \$syslog
# Required-Stop:     \$network \$remote_fs \$syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: aiosmtpd SMTP Server on port $PORT
# Description:       aiosmtpd SMTP Server listening on port $PORT
### END INIT INFO

NAME="$SERVICE_NAME"
USER="$USER"
GROUP="$GROUP"
INSTALL_DIR="$INSTALL_DIR"
VENV_DIR="$VENV_DIR"
SCRIPT="$INSTALL_DIR/$SCRIPT_NAME"
PIDFILE="/var/run/\$NAME.pid"
LOGFILE="$LOG_DIR/aiosmtpd.log"
ERRFILE="$LOG_DIR/aiosmtpd-error.log"

. /lib/lsb/init-functions

start() {
    echo "Starting \$NAME..."
    start-stop-daemon --start --background --make-pidfile --pidfile \$PIDFILE \\
        --chuid \$USER:\$GROUP --chdir \$INSTALL_DIR \\
        --exec \$VENV_DIR/bin/python -- \$SCRIPT \\
        >> \$LOGFILE 2>> \$ERRFILE || return 1
    echo "Service \$NAME started"
}

stop() {
    echo "Stopping \$NAME..."
    if start-stop-daemon --stop --quiet --pidfile \$PIDFILE --retry 5; then
        rm -f \$PIDFILE
        return 0
    fi
    local pids
    pids=\$(pgrep -f "\$SCRIPT" -u "\$USER" || true)
    [ -z "\$pids" ] || kill \$pids 2>/dev/null || true
    sleep 1
    for i in 1 2 3; do
        pgrep -f "\$SCRIPT" -u "\$USER" >/dev/null || break
        sleep 1
    done
    if pgrep -f "\$SCRIPT" -u "\$USER" >/dev/null; then
        kill -9 \$(pgrep -f "\$SCRIPT" -u "\$USER") 2>/dev/null || true
    fi
    rm -f \$PIDFILE
    return 0
}

restart() { stop; sleep 2; start; }

case "$1" in
    start) start ;;
    stop) stop ;;
    restart) restart ;;
    status)
        if [ -f \$PIDFILE ] && kill -0 \$(cat \$PIDFILE 2>/dev/null) 2>/dev/null; then
            echo "\$NAME running (pid \$(cat \$PIDFILE))"; exit 0
        else
            echo "\$NAME not running"; exit 3
        fi
        ;;
    *) echo "Usage: $0 {start|stop|restart|status}"; exit 1 ;;
esac
exit 0
EOF
    chmod +x "/etc/init.d/$SERVICE_NAME"
    if command -v update-rc.d >/dev/null 2>&1; then
        update-rc.d "$SERVICE_NAME" defaults || true
    elif command -v chkconfig >/dev/null 2>&1; then
        chkconfig --add "$SERVICE_NAME" || true
        chkconfig "$SERVICE_NAME" on || true
    fi
    service "$SERVICE_NAME" restart || service "$SERVICE_NAME" start || true
fi

#############################################
# Post‑install summary
#############################################
sleep 2 || true
if [[ $IS_SYSTEMD -eq 1 ]]; then
    systemctl is-active --quiet "$SERVICE_NAME" && status_msg="active" || status_msg="(not active)"
    info "Service state: $status_msg (systemd)"
else
    service "$SERVICE_NAME" status || true
fi

if ss -tuln 2>/dev/null | grep -q ":$PORT"; then
    info "Port $PORT is listening"
else
    warn "Port $PORT not detected listening; check logs or: journalctl -u $SERVICE_NAME -f"
fi

cat <<SUMMARY
--------------------------------------------------
Installation / Update complete.
Service Name : $SERVICE_NAME
User / Group : $USER:$GROUP
Install Dir  : $INSTALL_DIR
Virtualenv   : $VENV_DIR
Port         : $PORT
Log Dir      : $LOG_DIR
Systemd      : $([[ $IS_SYSTEMD -eq 1 ]] && echo yes || echo no)

Manage (systemd):
    systemctl status $SERVICE_NAME
    systemctl restart $SERVICE_NAME
    journalctl -u $SERVICE_NAME -f

Manage (sysv init):
    service $SERVICE_NAME status|start|stop|restart

Uninstall:
    sudo ./install_aiosmtpd.sh UNINSTALL=1

Test send (if 'mail' installed):
    echo 'Test email body' | mail -s 'Test Subject' -S smtp=localhost:$PORT you@example.com
--------------------------------------------------
SUMMARY