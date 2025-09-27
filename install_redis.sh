#!/bin/bash

set -e  # Exit immediately if any command fails

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

# Create or update Redis configuration
echo "Configuring Redis..."
cat > "$REDIS_CONF_FILE" << EOF
# Redis configuration file

# Set the port
port $REDIS_PORT

# Bind to all interfaces
bind 0.0.0.0

# Run as a daemon
daemonize yes

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

# Redis server will run with this user
user $REDIS_USER on >@all -@admin ~* +@all
EOF

# Set proper permissions for configuration
chown "$REDIS_USER:$REDIS_GROUP" "$REDIS_CONF_FILE"
chmod 644 "$REDIS_CONF_FILE"

# Create init.d service script
echo "Creating init.d service script..."
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
        if kill -0 $(cat $PIDFILE) 2>/dev/null; then
            echo "$NAME is already running"
            return 0
        else
            rm -f $PIDFILE
        fi
    fi
    
    mkdir -p /var/run/redis
    chown redis:redis /var/run/redis
    
    if start-stop-daemon --start --quiet --umask 007 --pidfile $PIDFILE --chuid redis:redis --exec $DAEMON -- $DAEMON_ARGS; then
        echo "Started $DESC"
    else
        echo "Failed to start $DESC"
        return 1
    fi
}

# Stop the service
stop() {
    echo "Stopping $DESC..."
    if [ ! -f $PIDFILE ]; then
        echo "$PIDFILE does not exist, process is not running"
        return 0
    fi
    
    if start-stop-daemon --stop --quiet --retry 30 --pidfile $PIDFILE --exec $DAEMON; then
        rm -f $PIDFILE
        echo "Stopped $DESC"
    else
        echo "Failed to stop $DESC"
        return 1
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

exit 0
EOF

# Set init.d script permissions
chmod +x "/etc/init.d/redis-server"

# Enable service to start on boot
echo "Enabling service to start on boot..."
if command -v update-rc.d &> /dev/null; then
    update-rc.d redis-server defaults
elif command -v chkconfig &> /dev/null; then
    chkconfig --add redis-server
    chkconfig redis-server on
else
    echo "Warning: Cannot enable service to start on boot automatically"
    echo "You may need to enable it manually for your system"
fi

# Start Redis service
echo "Starting Redis service..."
service redis-server start

# Check service status
echo "Checking service status..."
sleep 2  # Give the service some time to start
service redis-server status

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
echo -e "Check service status: service redis-server status"
echo -e "Stop service: service redis-server stop"
echo -e "Start service: service redis-server start"
echo -e "Restart service: service redis-server restart"

echo -e "\nYou can connect to Redis using:"
echo "redis-cli -p $REDIS_PORT"
echo "Or from remote hosts: redis-cli -h your_server_ip -p $REDIS_PORT"