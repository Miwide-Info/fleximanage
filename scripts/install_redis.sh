#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
set -e

IS_SYSTEMD=0; if [[ -d /run/systemd/system ]] || [[ $(ps -p 1 -o comm= 2>/dev/null) == systemd ]]; then IS_SYSTEMD=1; fi

REDIS_PORT="6379"
REDIS_USER="redis"
REDIS_GROUP="redis"
REDIS_DIR="/var/lib/redis"
REDIS_LOG_DIR="/var/log/redis"
REDIS_CONF_DIR="/etc/redis"
REDIS_CONF_FILE="${REDIS_CONF_DIR}/redis.conf"

if [[ $(id -u) -ne 0 ]]; then echo "Run as root (sudo)"; exit 1; fi

echo "Installing Redis..."
if command -v apt-get &>/dev/null; then
	apt-get update; apt-get install -y redis-server
elif command -v yum &>/dev/null; then
	yum install -y epel-release; yum install -y redis
elif command -v dnf &>/dev/null; then
	dnf install -y redis
else
	echo "Unsupported package manager"; exit 1
fi

getent group "$REDIS_GROUP" >/dev/null 2>&1 || groupadd --system "$REDIS_GROUP" || true
id "$REDIS_USER" &>/dev/null || useradd --system --no-create-home --shell /bin/false "$REDIS_USER"

mkdir -p "$REDIS_DIR" "$REDIS_LOG_DIR" "$REDIS_CONF_DIR"
chown "$REDIS_USER:$REDIS_GROUP" "$REDIS_DIR" "$REDIS_LOG_DIR"

[[ -f "$REDIS_CONF_FILE" ]] && cp "$REDIS_CONF_FILE" "${REDIS_CONF_FILE}.bak"

if [[ $IS_SYSTEMD -eq 1 ]]; then DAEMONIZE=no; SUPERVISED=systemd; else DAEMONIZE=yes; SUPERVISED=no; fi

cat > "$REDIS_CONF_FILE" <<EOF
port $REDIS_PORT
bind 0.0.0.0
daemonize $DAEMONIZE
supervised $SUPERVISED
pidfile /var/run/redis/redis-server.pid
logfile $REDIS_LOG_DIR/redis-server.log
dir $REDIS_DIR
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
timeout 0
tcp-keepalive 300
loglevel notice
databases 16
save 900 1
save 300 10
save 60 10000
user $REDIS_USER on >@all -@admin ~* +@all
EOF
chown "$REDIS_USER:$REDIS_GROUP" "$REDIS_CONF_FILE"; chmod 644 "$REDIS_CONF_FILE"

if [[ $IS_SYSTEMD -eq 0 ]]; then
	cat > /etc/init.d/redis-server <<'EOF'
#!/bin/sh
### BEGIN INIT INFO
# Provides:          redis-server
# Required-Start:    $network $remote_fs $syslog
# Required-Stop:     $network $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Redis data structure server
### END INIT INFO
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
DAEMON=/usr/bin/redis-server
DAEMON_ARGS=/etc/redis/redis.conf
NAME=redis-server
PIDFILE=/var/run/redis/redis-server.pid
. /lib/lsb/init-functions
start(){ echo "Starting $NAME"; [ -f $PIDFILE ] && old=$(cat $PIDFILE 2>/dev/null||true) && kill -0 "$old" 2>/dev/null && command -v redis-cli >/dev/null 2>&1 && redis-cli -p 6379 ping|grep -q PONG && { echo "$NAME already running"; return 0; } || rm -f $PIDFILE || true; mkdir -p /var/run/redis; chown redis:redis /var/run/redis; start-stop-daemon --start --quiet --umask 007 --pidfile $PIDFILE --chuid redis:redis --exec $DAEMON -- $DAEMON_ARGS || return 1; for i in 1 2 3 4 5 6 7 8 9 10; do [ -f $PIDFILE ] && kill -0 $(cat $PIDFILE 2>/dev/null) 2>/dev/null && { echo "Started"; return 0; }; sleep 0.5; done; echo "Timeout"; return 1; }
stop(){ echo "Stopping $NAME"; pid=""; [ -f $PIDFILE ] && pid=$(cat $PIDFILE 2>/dev/null||true); [ -z "$pid" ] && pid=$(pgrep -xo redis-server 2>/dev/null||true); [ -z "$pid" ] && { echo "Not running"; rm -f $PIDFILE||true; return 0; }; command -v redis-cli >/dev/null 2>&1 && redis-cli -p 6379 shutdown 2>/dev/null || true; kill "$pid" 2>/dev/null || true; for i in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null && sleep 0.5 || { echo "Stopped"; rm -f $PIDFILE||true; return 0; }; done; kill -KILL "$pid" 2>/dev/null || true; kill -0 "$pid" 2>/dev/null && { echo "Failed"; return 1; } || { echo "Force-stopped"; rm -f $PIDFILE||true; return 0; }; }
restart(){ stop; sleep 2; start; }
case "$1" in start) start;; stop) stop;; restart) restart;; status) [ -f $PIDFILE ] && kill -0 $(cat $PIDFILE 2>/dev/null) 2>/dev/null && { echo "$NAME running"; exit 0; } || { echo "$NAME NOT running"; exit 3; };; *) echo "Usage: $0 {start|stop|restart|status}"; exit 1;; esac
EOF
	chmod +x /etc/init.d/redis-server
	if command -v update-rc.d &>/dev/null; then update-rc.d redis-server defaults || true; elif command -v chkconfig &>/dev/null; then chkconfig --add redis-server || true; chkconfig redis-server on || true; fi
	service redis-server restart || service redis-server start || true
else
	[[ -f /etc/init.d/redis-server ]] && mv /etc/init.d/redis-server /etc/init.d/redis-server.disabled 2>/dev/null || true
	systemctl daemon-reload || true
	systemctl enable redis-server >/dev/null 2>&1 || true
	systemctl restart redis-server || systemctl start redis-server || true
fi

echo "Checking port..."
if command -v ss &>/dev/null; then ss -tuln | grep -q ":$REDIS_PORT" && echo "Port $REDIS_PORT listening" || echo "Port $REDIS_PORT NOT listening"; fi
command -v redis-cli &>/dev/null && (redis-cli -p $REDIS_PORT ping | grep -q PONG && echo "Redis PONG" || echo "Redis no response") || echo "redis-cli unavailable"

echo "Installation complete."
if [[ $IS_SYSTEMD -eq 1 ]]; then
	echo "Manage: systemctl status|restart|stop redis-server"
else
	echo "Manage: service redis-server status|restart|stop"
fi
echo "Config: $REDIS_CONF_FILE"
echo "Data Dir: $REDIS_DIR"
echo "Logs: $REDIS_LOG_DIR"
exit 0
