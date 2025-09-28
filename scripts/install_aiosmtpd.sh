#!/usr/bin/env bash
# aiosmtpd Mail Server Installation & Management Script (virtual environment based)
set -euo pipefail

#############################################
# Configurable variables (override via KEY=VALUE arguments)
#############################################
SERVICE_NAME="aiosmtpd"
USER="aiosmtpd"
GROUP="aiosmtpd"
PORT="1025"
INSTALL_DIR="/opt/aiosmtpd_server"
VENV_DIR="$INSTALL_DIR/venv"
LOG_DIR="/fleximanage/logs"
SCRIPT_NAME="aiosmtpd_server.py"
PYTHON_BIN="python3"
AIOSMTPD_VERSION="" # If set, pin version
UNINSTALL="0"
REINSTALL="0"
UPGRADE="0"

for arg in "$@"; do
	if [[ "$arg" == *=* ]]; then key="${arg%%=*}"; val="${arg#*=}"; export "$key"="$val" || true; fi
done

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

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"; }
info() { log "INFO: $*"; }
warn() { log "WARN: $*" >&2; }
err() { log "ERROR: $*" >&2; }
die() { err "$1"; exit 1; }

usage() {
	cat <<USAGE
Usage: sudo ./install_aiosmtpd.sh [KEY=VALUE ...]

Flags:
	UNINSTALL=1   Remove service + install dir (logs kept)
	REINSTALL=1   Recreate venv & reinstall aiosmtpd
	UPGRADE=1     Pip upgrade aiosmtpd in existing venv

Config:
	PORT=1025
	INSTALL_DIR=/opt/aiosmtpd_server
	LOG_DIR=/fleximanage/logs
	AIOSMTPD_VERSION=1.4.5
	PYTHON_BIN=python3
USAGE
}

[[ "${HELP:-0}" == 1 ]] && usage && exit 0

[[ $(id -u) -ne 0 ]] && die "Must run as root (sudo)."

IS_SYSTEMD=0
if [[ -d /run/systemd/system ]] || [[ $(ps -p 1 -o comm= 2>/dev/null) == systemd ]]; then IS_SYSTEMD=1; fi

if [[ "$UNINSTALL" == 1 ]]; then
	info "Uninstalling service $SERVICE_NAME"
	if [[ $IS_SYSTEMD -eq 1 ]]; then
		systemctl stop "$SERVICE_NAME" 2>/dev/null || true
		systemctl disable "$SERVICE_NAME" 2>/dev/null || true
		rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
		systemctl daemon-reload || true
	else
		service "$SERVICE_NAME" stop 2>/dev/null || true
		rm -f "/etc/init.d/${SERVICE_NAME}" || true
	fi
	rm -rf "$INSTALL_DIR" || true
	info "Uninstall complete. Logs at $LOG_DIR retained."
	exit 0
fi

info "Installing system dependencies..."
if command -v apt-get &>/dev/null; then
	apt-get update -y
	DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-pip python3-venv
elif command -v yum &>/dev/null; then
	yum install -y python3 python3-pip
elif command -v dnf &>/dev/null; then
	dnf install -y python3 python3-pip
else
	die "Unsupported package manager; install python3 & pip manually."
fi

getent group "$GROUP" >/dev/null 2>&1 || groupadd --system "$GROUP" || true
id "$USER" &>/dev/null || useradd --system --no-create-home --shell /bin/false -g "$GROUP" "$USER"

mkdir -p "$INSTALL_DIR" "$LOG_DIR"
chown "$USER:$GROUP" "$INSTALL_DIR" "$LOG_DIR"

if [[ "$REINSTALL" == 1 && -d "$VENV_DIR" ]]; then
	warn "REINSTALL=1 removing $VENV_DIR"
	rm -rf "$VENV_DIR"
fi

if [[ ! -d "$VENV_DIR" ]]; then
	info "Creating virtualenv"
	sudo -u "$USER" "$PYTHON_BIN" -m venv "$VENV_DIR"
else
	info "Virtualenv exists"
fi

PIP="$VENV_DIR/bin/pip"
[[ -x "$PIP" ]] || die "pip not found at $PIP"

if [[ "$UPGRADE" == 1 ]]; then
	info "Upgrading aiosmtpd"
	sudo -u "$USER" "$PIP" install --upgrade pip
	if [[ -n "$AIOSMTPD_VERSION" ]]; then
		sudo -u "$USER" "$PIP" install --upgrade "aiosmtpd==${AIOSMTPD_VERSION}"
	else
		sudo -u "$USER" "$PIP" install --upgrade aiosmtpd
	fi
elif [[ "$REINSTALL" == 1 ]]; then
	info "Fresh install aiosmtpd"
	if [[ -n "$AIOSMTPD_VERSION" ]]; then
		sudo -u "$USER" "$PIP" install "aiosmtpd==${AIOSMTPD_VERSION}"
	else
		sudo -u "$USER" "$PIP" install aiosmtpd
	fi
else
	if ! sudo -u "$USER" "$VENV_DIR/bin/python" -c "import aiosmtpd" 2>/dev/null; then
		info "Installing aiosmtpd (not present)"
		if [[ -n "$AIOSMTPD_VERSION" ]]; then
			sudo -u "$USER" "$PIP" install "aiosmtpd==${AIOSMTPD_VERSION}"
		else
			sudo -u "$USER" "$PIP" install aiosmtpd
		fi
	else
		info "aiosmtpd already present (use UPGRADE=1 to force)"
	fi
fi

info "Writing server script $SCRIPT_NAME"
cat > "$INSTALL_DIR/$SCRIPT_NAME" <<'EOF'
#!/usr/bin/env python3
import asyncio, logging
from aiosmtpd.controller import Controller

logging.basicConfig(level=logging.INFO)
log = logging.getLogger('aiosmtpd')

class Handler:
		async def handle_DATA(self, server, session, envelope):
				log.info(f"Email from {session.peer} -> {envelope.rcpt_tos}")
				snippet = envelope.content.decode('utf-8', 'replace')[:100]
				log.info(f"Content (first 100B): {snippet}...")
				return '250 OK'

async def main():
		ctrl = Controller(Handler(), hostname='0.0.0.0', port=1025)
		ctrl.start()
		log.info(f"SMTP server listening on {ctrl.hostname}:{ctrl.port}")
		try:
				await asyncio.Event().wait()
		finally:
				ctrl.stop(); log.info("Server stopped")

if __name__ == '__main__':
		asyncio.run(main())
EOF
chmod +x "$INSTALL_DIR/$SCRIPT_NAME" && chown "$USER:$GROUP" "$INSTALL_DIR/$SCRIPT_NAME"

if ss -tuln 2>/dev/null | grep -q ":$PORT"; then warn "Port $PORT already in use"; fi

if [[ $IS_SYSTEMD -eq 1 ]]; then
	info "Creating systemd unit"
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

[Install]
WantedBy=multi-user.target
UNIT
	systemctl daemon-reload
	systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
	systemctl restart "$SERVICE_NAME" || systemctl start "$SERVICE_NAME"
else
	info "Creating legacy init.d script"
	cat > "/etc/init.d/$SERVICE_NAME" <<'EOF'
#!/bin/sh
### BEGIN INIT INFO
# Provides:          aiosmtpd
# Required-Start:    $network $remote_fs $syslog
# Required-Stop:     $network $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: aiosmtpd SMTP Server
### END INIT INFO

NAME="aiosmtpd"
USER="aiosmtpd"
GROUP="aiosmtpd"
INSTALL_DIR="/opt/aiosmtpd_server"
VENV_DIR="/opt/aiosmtpd_server/venv"
SCRIPT="$INSTALL_DIR/aiosmtpd_server.py"
PIDFILE="/var/run/$NAME.pid"
LOGFILE="/fleximanage/logs/aiosmtpd.log"
ERRFILE="/fleximanage/logs/aiosmtpd-error.log"
. /lib/lsb/init-functions
start(){
	echo "Starting $NAME";
	start-stop-daemon --start --background --make-pidfile --pidfile $PIDFILE --chuid $USER:$GROUP --chdir $INSTALL_DIR --exec $VENV_DIR/bin/python -- $SCRIPT >> $LOGFILE 2>> $ERRFILE || return 1
	echo "Started";}
stop(){
	echo "Stopping $NAME";
	if start-stop-daemon --stop --quiet --pidfile $PIDFILE --retry 5; then rm -f $PIDFILE; return 0; fi
	pids=$(pgrep -f "$SCRIPT" -u "$USER"||true); [ -z "$pids" ] || kill $pids 2>/dev/null || true
	rm -f $PIDFILE; }
restart(){ stop; sleep 2; start; }
case "$1" in start) start;; stop) stop;; restart) restart;; status)
	if [ -f $PIDFILE ] && kill -0 $(cat $PIDFILE 2>/dev/null) 2>/dev/null; then echo "$NAME running"; exit 0; else echo "$NAME not running"; exit 3; fi;;
	*) echo "Usage: $0 {start|stop|restart|status}"; exit 1;; esac; exit 0
EOF
	chmod +x "/etc/init.d/$SERVICE_NAME"
	if command -v update-rc.d >/dev/null 2>&1; then update-rc.d "$SERVICE_NAME" defaults || true; elif command -v chkconfig >/dev/null 2>&1; then chkconfig --add "$SERVICE_NAME" || true; chkconfig "$SERVICE_NAME" on || true; fi
	service "$SERVICE_NAME" restart || service "$SERVICE_NAME" start || true
fi

sleep 2 || true
if [[ $IS_SYSTEMD -eq 1 ]]; then
	systemctl is-active --quiet "$SERVICE_NAME" && state=active || state="(not active)"; info "Service state: $state"
else
	service "$SERVICE_NAME" status || true
fi

if ss -tuln 2>/dev/null | grep -q ":$PORT"; then info "Port $PORT listening"; else warn "Port $PORT not detected listening"; fi

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
--------------------------------------------------
SUMMARY

exit 0
