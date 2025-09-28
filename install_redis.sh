#!/bin/bash
echo "[DEPRECATED WARNING] This script has been moved to scripts/install_redis.sh. Please invoke that path instead." >&2

set -e  # Exit immediately if any command fails

# Detect init system (systemd vs sysv) early
IS_SYSTEMD=0
if [[ -d /run/systemd/system ]] || [[ $(ps -p 1 -o comm= 2>/dev/null) == systemd ]]; then
    IS_SYSTEMD=1
fi

# Configuration variables
REDIS_PORT="6379"
REDIS_USER="redis"
REDIS_GROUP="redis"
REDIS_DIR="/var/lib/redis"
REDIS_LOG_DIR="/var/log/redis"
REDIS_CONF_DIR="/etc/redis"
REDIS_CONF_FILE="${REDIS_CONF_DIR}/redis.conf"

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please run with sudo."
    exit 1
fi

# Detect package manager and install Redis
echo "Installing Redis server..."
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y redis-server
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y epel-release
    yum install -y redis
elif command -v dnf &> /dev/null; then
    # Fedora
    dnf install -y redis
else
    echo "Cannot determine package manager, please install Redis manually"
    exit 1
fi

# Ensure redis group exists (some minimal images may miss it even after package install)
if ! getent group "$REDIS_GROUP" >/dev/null 2>&1; then
    echo "Creating group: $REDIS_GROUP"
    groupadd --system "$REDIS_GROUP" || true
fi

# Create Redis user and group if they don't exist
if ! id "$REDIS_USER" &>/dev/null; then
    echo "Creating dedicated user: $REDIS_USER"
    useradd --system --no-create-home --shell /bin/false "$REDIS_USER"
fi

# Create necessary directories
echo "Creating Redis directories..."
mkdir -p "$REDIS_DIR"
mkdir -p "$REDIS_LOG_DIR"
mkdir -p "$REDIS_CONF_DIR"

# Set proper permissions
chown "$REDIS_USER:$REDIS_GROUP" "$REDIS_DIR"
chown "$REDIS_USER:$REDIS_GROUP" "$REDIS_LOG_DIR"

# Backup original configuration if it exists
if [ -f "$REDIS_CONF_FILE" ]; then
    cp "$REDIS_CONF_FILE" "${REDIS_CONF_FILE}.bak"
    echo "Backed up original configuration to ${REDIS_CONF_FILE}.bak"
fi

echo "Configuring Redis..."

# Decide daemonize & supervised mode
if [[ $IS_SYSTEMD -eq 1 ]]; then
    DAEMONIZE="no"          # systemd expects foreground process
    SUPERVISED="systemd"
else
    DAEMONIZE="yes"         # traditional sysv / simple container scenario
    SUPERVISED="no"
fi

cat > "$REDIS_CONF_FILE" << EOF
# Redis configuration file

# Set the port
port $REDIS_PORT

# Bind to all interfaces
bind 0.0.0.0

# IPv6 is disabled by binding to 0.0.0.0

# Run as a daemon (set to 'no' under systemd environments)
daemonize ${DAEMONIZE}

# Supervision mode	supervised ${SUPERVISED}

# PID file
pidfile /var/run/redis/redis-server.pid

# Log file
logfile $REDIS_LOG_DIR/redis-server.log

# Database directory
dir $REDIS_DIR

# Set memory limit (adjust as needed)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Enable AOF persistence
appendonly yes
appendfilename "appendonly.aof"

# Security (uncomment and set password if needed)
# requirepass your_secure_password

# Client timeouts
timeout 0
tcp-keepalive 300

# Log level (options: debug, verbose, notice, warning)
loglevel notice

# Number of databases
databases 16

# Snapshotting (persistence)
save 900 1
save 300 10
save 60 10000

# Other performance settings
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb

# Redis ACL example user (keep original semantics; adjust if needed)
user $REDIS_USER on >@all -@admin ~* +@all
EOF

# Set proper permissions for configuration
chown "$REDIS_USER:$REDIS_GROUP" "$REDIS_CONF_FILE"
chmod 644 "$REDIS_CONF_FILE"

if [[ $IS_SYSTEMD -eq 0 ]]; then
    # Create init.d script only in non-systemd environments
    echo "Creating init.d service script (sysv)..."
    cat > "/etc/init.d/redis-server" << 'EOF'
#!/bin/sh
### BEGIN INIT INFO
# Provides:          redis-server
# Required-Start:    $network $remote_fs $syslog
# Required-Stop:     $network $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Redis data structure server
# Description:       Redis is an open source, advanced key-value store.
### END INIT INFO

# Define variables
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
DAEMON=/usr/bin/redis-server
DAEMON_ARGS=/etc/redis/redis.conf
NAME=redis-server
DESC="Redis data structure server"
PIDFILE=/var/run/redis/redis-server.pid

# Get function from functions library
. /lib/lsb/init-functions

# Start the service
start() {
    echo "Starting $DESC..."
    if [ -f $PIDFILE ]; then
        oldpid=$(cat $PIDFILE 2>/dev/null || true)
        if [ -n "$oldpid" ] && kill -0 "$oldpid" 2>/dev/null; then
            if command -v redis-cli >/dev/null 2>&1 && redis-cli -p 6379 ping 2>/dev/null | grep -q PONG; then
                echo "$NAME already running (pid $oldpid)"
                return 0
            else
                echo "Stale pidfile found (pid $oldpid not responding); removing"
                rm -f "$PIDFILE"
            fi
        else
            rm -f "$PIDFILE"
        fi
    fi

    # If another redis-server exists without pidfile, treat as stale and try graceful shutdown
    existing_pid=$(pgrep -xo redis-server 2>/dev/null || true)
    if [ -n "$existing_pid" ] && [ ! -f $PIDFILE ]; then
        echo "Found running redis-server (pid $existing_pid) without pidfile; attempting graceful recycle"
        if command -v redis-cli >/dev/null 2>&1; then
            redis-cli -p 6379 shutdown 2>/dev/null || true
            sleep 1
        fi
        if kill -0 "$existing_pid" 2>/dev/null; then
            kill "$existing_pid" 2>/dev/null || true
            sleep 1
        fi
    fi
    
    mkdir -p /var/run/redis
    chown redis:redis /var/run/redis
    
    if start-stop-daemon --start --quiet --umask 007 --pidfile $PIDFILE --chuid redis:redis --exec $DAEMON -- $DAEMON_ARGS; then
        # Wait for pidfile + process
        for i in 1 2 3 4 5 6 7 8 9 10; do
            if [ -f $PIDFILE ] && kill -0 $(cat $PIDFILE 2>/dev/null) 2>/dev/null; then
                echo "Started $DESC (pid $(cat $PIDFILE))"
                return 0
            fi
            sleep 0.5
        done
        echo "Start attempt timed out (no healthy pidfile)"; return 1
    else
        echo "Failed to invoke $DAEMON"
        return 1
    fi
}

# Stop the service
stop() {
    echo "Stopping $DESC..."
    target_pid=""
    if [ -f $PIDFILE ]; then
        target_pid=$(cat $PIDFILE 2>/dev/null || true)
    fi
    if [ -z "$target_pid" ] || ! kill -0 "$target_pid" 2>/dev/null; then
        # Try discovery
        target_pid=$(pgrep -xo redis-server 2>/dev/null || true)
        if [ -z "$target_pid" ]; then
            echo "No running redis-server found"
            [ -f $PIDFILE ] && rm -f $PIDFILE || true
            return 0
        fi
        echo "Using discovered pid $target_pid"
    fi

    # Graceful shutdown preference
    if command -v redis-cli >/dev/null 2>&1; then
        redis-cli -p 6379 shutdown 2>/dev/null || true
        sleep 1
    fi
    if kill -0 "$target_pid" 2>/dev/null; then
        kill "$target_pid" 2>/dev/null || true
    fi
    # Wait loop
    for i in 1 2 3 4 5 6 7 8 9 10; do
        if kill -0 "$target_pid" 2>/dev/null; then
            sleep 0.5
        else
            echo "Stopped $DESC"
            rm -f $PIDFILE 2>/dev/null || true
            return 0
        fi
    done
    echo "Process $target_pid still alive, sending KILL"
    kill -KILL "$target_pid" 2>/dev/null || true
    sleep 0.5
    if kill -0 "$target_pid" 2>/dev/null; then
        echo "Failed to stop $DESC (pid $target_pid)"
        return 1
    else
        echo "Force-stopped $DESC"
        rm -f $PIDFILE 2>/dev/null || true
        return 0
    fi
}

# Restart the service
restart() {
    stop
    sleep 2
    start
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status_of_proc -p $PIDFILE $DAEMON $NAME && exit 0 || exit $?
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

start() {
    echo "Starting $DESC..."
    # Validate stale pidfile
    if [ -f $PIDFILE ]; then
        oldpid=$(cat $PIDFILE 2>/dev/null || true)
        if [ -n "$oldpid" ] && kill -0 "$oldpid" 2>/dev/null; then
            if command -v redis-cli >/dev/null 2>&1 && redis-cli -p 6379 ping 2>/dev/null | grep -q PONG; then
                echo "$NAME already running (pid $oldpid)"; return 0
            fi
            echo "Stale pidfile (pid $oldpid) removing"
        fi
        rm -f "$PIDFILE" 2>/dev/null || true
    fi

    # Recycle existing orphan process
    orphan=$(pgrep -xo redis-server 2>/dev/null || true)
    if [ -n "$orphan" ]; then
        echo "Recycling existing redis-server pid $orphan"
        command -v redis-cli >/dev/null 2>&1 && redis-cli -p 6379 shutdown 2>/dev/null || true
        kill "$orphan" 2>/dev/null || true
        for i in 1 2 3 4 5; do
            kill -0 "$orphan" 2>/dev/null && sleep 1 || break
        done
    fi

    mkdir -p /var/run/redis; chown redis:redis /var/run/redis || true
    # Launch (daemonize=yes from config so it should fork)
    su -s /bin/sh -c "$DAEMON $DAEMON_ARGS" redis || { echo "Launch failed"; return 1; }

    # Wait for pidfile
    for i in 1 2 3 4 5 6 7 8 9 10; do
        if [ -f $PIDFILE ]; then
            npid=$(cat $PIDFILE 2>/dev/null || true)
            if [ -n "$npid" ] && kill -0 "$npid" 2>/dev/null; then
                echo "Started $DESC (pid $npid)"; return 0
            fi
        fi
        sleep 0.5
    done
    echo "Failed to start (no pidfile)"; return 1
}

stop() {
    echo "Stopping $DESC..."
    pid=""
    [ -f $PIDFILE ] && pid=$(cat $PIDFILE 2>/dev/null || true)
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
        pid=$(pgrep -xo redis-server 2>/dev/null || true)
    fi
    if [ -z "$pid" ]; then
        echo "No running redis-server"; rm -f $PIDFILE 2>/dev/null || true; return 0
    fi
    command -v redis-cli >/dev/null 2>&1 && redis-cli -p 6379 shutdown 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    for i in 1 2 3 4 5 6 7 8; do
        kill -0 "$pid" 2>/dev/null && sleep 0.5 || { echo "Stopped $DESC"; rm -f $PIDFILE 2>/dev/null || true; return 0; }
    done
    echo "Sending KILL to $pid"; kill -KILL "$pid" 2>/dev/null || true
    kill -0 "$pid" 2>/dev/null && { echo "Failed to stop $DESC"; return 1; }
    echo "Force-stopped $DESC"; rm -f $PIDFILE 2>/dev/null || true; return 0
}

restart() { stop; sleep 1; start; }

case "$1" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status)
    if [ -f $PIDFILE ] && kill -0 $(cat $PIDFILE 2>/dev/null) 2>/dev/null; then
        echo "$DESC is running (pid $(cat $PIDFILE))"; exit 0
    else
        echo "$DESC is NOT running"; exit 3
    fi
    ;;
  *) echo "Usage: $0 {start|stop|restart|status}"; exit 2 ;;
esac

exit 0
EOF

    chmod +x "/etc/init.d/redis-server"
    echo "Enabling sysv service on boot..."
    if command -v update-rc.d &> /dev/null; then
            update-rc.d redis-server defaults
    elif command -v chkconfig &> /dev/null; then
            chkconfig --add redis-server
            chkconfig redis-server on
    else
            echo "Warning: Cannot enable service automatically (no update-rc.d / chkconfig)"
    fi

    echo "Starting Redis service (sysv)..."
    if ! service redis-server start; then
        echo "Sysv start failed; attempting raw redis-server launch..."
        mkdir -p /var/run/redis; chown redis:redis /var/run/redis
        sudo -u redis /usr/bin/redis-server /etc/redis/redis.conf || true
    fi
    echo "Checking service status..."; sleep 2; service redis-server status || true
    # Fallback if status reports not running but port listens check fails later
else
    # systemd environment: use the distribution-provided systemd unit; do not keep custom init script
    if [[ -f /etc/init.d/redis-server ]]; then
        mv /etc/init.d/redis-server /etc/init.d/redis-server.disabled 2>/dev/null || true
    fi
    echo "Using systemd unit redis-server (daemonize=no supervised=systemd)"
    systemctl daemon-reload || true
    systemctl enable redis-server >/dev/null 2>&1 || true
    systemctl restart redis-server || systemctl start redis-server || true
    echo "Checking systemd service status..."; systemctl --no-pager status redis-server || true
fi

# Check port listening status
echo "Checking port listening status..."
if command -v ss &> /dev/null; then
    if ss -tuln | grep ":$REDIS_PORT"; then
        echo "Port $REDIS_PORT is listening"
    else
        echo "Port $REDIS_PORT is not listening, please check service status and logs"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln | grep ":$REDIS_PORT"; then
        echo "Port $REDIS_PORT is listening"
    else
        echo "Port $REDIS_PORT is not listening, please check service status and logs"
    fi
else
    echo "Cannot check port listening status, please verify manually"
fi

# Test Redis connection
echo "Testing Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli -p $REDIS_PORT ping | grep -q "PONG"; then
        echo "Redis is responding correctly"
    else
        echo "Redis is not responding correctly"
    fi
else
    echo "redis-cli not available, cannot test connection"
fi

# Provide service management commands
echo -e "\nInstallation complete! Redis has been configured to start automatically on boot."
echo -e "Redis configuration file: $REDIS_CONF_FILE"
echo -e "Redis data directory: $REDIS_DIR"
echo -e "Redis log directory: $REDIS_LOG_DIR"
if [[ $IS_SYSTEMD -eq 1 ]]; then
    echo -e "Check service status: systemctl status redis-server"
    echo -e "Stop service: systemctl stop redis-server"
    echo -e "Start service: systemctl start redis-server"
    echo -e "Restart service: systemctl restart redis-server"
else
    echo -e "Check service status: service redis-server status"
    echo -e "Stop service: service redis-server stop (or: redis-cli -p $REDIS_PORT shutdown)"
    echo -e "Start service: service redis-server start"
    echo -e "Restart service: service redis-server restart"
fi

echo -e "\nYou can connect to Redis using:"
echo "redis-cli -p $REDIS_PORT"
echo "Or from remote hosts: redis-cli -h your_server_ip -p $REDIS_PORT"