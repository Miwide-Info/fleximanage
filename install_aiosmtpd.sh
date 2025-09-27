#!/bin/bash

# aiosmtpd Mail Server Installation and Configuration Script (using virtual environment)
# Function: Install aiosmtpd, create system service, set auto-start on boot, listen on port 1025

set -e  # Exit immediately if any command fails

# Configuration variables
SERVICE_NAME="aiosmtpd"
USER="aiosmtpd"
GROUP="aiosmtpd"
PORT="1025"
INSTALL_DIR="/opt/aiosmtpd_server"
VENV_DIR="$INSTALL_DIR/venv"
LOG_DIR="/fleximanage/logs"
SCRIPT_NAME="aiosmtpd_server.py"

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root. Please run with sudo."
    exit 1
fi

# Install necessary dependencies
echo "Installing necessary system dependencies..."
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y python3 python3-pip python3-venv
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y python3 python3-pip
elif command -v dnf &> /dev/null; then
    # Fedora
    dnf install -y python3 python3-pip
else
    echo "Cannot determine package manager, please install Python3 and pip3 manually"
    exit 1
fi

# Create dedicated user and group
if ! id "$USER" &>/dev/null; then
    echo "Creating dedicated user: $USER"
    useradd --system --no-create-home --shell /bin/false "$USER"
fi

# Create installation directory
echo "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
chown "$USER:$GROUP" "$INSTALL_DIR"

# Create log directory
echo "Creating log directory: $LOG_DIR"
mkdir -p "$LOG_DIR"
chown "$USER:$GROUP" "$LOG_DIR"

# Create Python virtual environment
echo "Creating Python virtual environment..."
sudo -u "$USER" python3 -m venv "$VENV_DIR"

# Install aiosmtpd in virtual environment
echo "Installing aiosmtpd in virtual environment..."
sudo -u "$USER" "$VENV_DIR/bin/pip" install aiosmtpd

# Create server script
echo "Creating aiosmtpd server script..."
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

# Set script permissions
chmod +x "$INSTALL_DIR/$SCRIPT_NAME"
chown "$USER:$GROUP" "$INSTALL_DIR/$SCRIPT_NAME"

# Create init.d service script
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

# Define variables
NAME="$SERVICE_NAME"
USER="$USER"
GROUP="$GROUP"
INSTALL_DIR="$INSTALL_DIR"
VENV_DIR="$VENV_DIR"
SCRIPT="$INSTALL_DIR/$SCRIPT_NAME"
PIDFILE="/var/run/\$NAME.pid"
LOGFILE="$LOG_DIR/aiosmtpd.log"
ERRFILE="$LOG_DIR/aiosmtpd-error.log"

# Get function from functions library
. /lib/lsb/init-functions

# Start the service
start() {
    echo "Starting \$NAME..."
    start-stop-daemon --start --background --make-pidfile --pidfile \$PIDFILE \\
        --chuid \$USER:\$GROUP --chdir \$INSTALL_DIR \\
        --exec \$VENV_DIR/bin/python3 -- \$SCRIPT \\
        >> \$LOGFILE 2>> \$ERRFILE
    echo "Service \$NAME started"
}

# Stop the service
stop() {
    echo "Stopping \$NAME..."
    if ! start-stop-daemon --stop --quiet --pidfile \$PIDFILE --user \$USER --retry 5; then
        log_daemon_msg "PID file not found or process dead, searching by name..."
        local pids
        pids=\$(pgrep -f "\$SCRIPT" -u "\$USER")
        if [ -n "\$pids" ]; then
            log_daemon_msg "Found running process(es) with PID(s): \$pids. Terminating..."
            kill \$pids
            # Wait for process to die
            for i in {1..10}; do
                if ! pgrep -f "\$SCRIPT" -u "\$USER" > /dev/null; then
                    break
                fi
                sleep 0.5
            done
            if pgrep -f "\$SCRIPT" -u "\$USER" > /dev/null; then
                log_daemon_msg "Process did not terminate gracefully, sending KILL..."
                kill -9 \$pids
            fi
        else
            log_daemon_msg "No running process found."
        fi
    fi
    rm -f \$PIDFILE
    log_end_msg 0
}

# Restart the service
restart() {
    stop
    sleep 2
    start
}

case "\$1" in
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
        status_of_proc -p \$PIDFILE \$VENV_DIR/bin/python3 \$NAME && exit 0 || exit \$?
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
EOF

# Set init.d script permissions
chmod +x "/etc/init.d/$SERVICE_NAME"

# Enable service to start on boot
echo "Enabling service to start on boot..."
if command -v update-rc.d &> /dev/null; then
    update-rc.d "$SERVICE_NAME" defaults
elif command -v chkconfig &> /dev/null; then
    chkconfig --add "$SERVICE_NAME"
    chkconfig "$SERVICE_NAME" on
else
    echo "Warning: Cannot enable service to start on boot automatically"
    echo "You may need to enable it manually for your system"
fi

# Start service
echo "Starting $SERVICE_NAME service..."
service "$SERVICE_NAME" start

# Check service status
echo "Checking service status..."
sleep 2  # Give the service some time to start
service "$SERVICE_NAME" status

# Check port listening status
echo "Checking port listening status..."
if command -v ss &> /dev/null; then
    if ss -tuln | grep ":$PORT"; then
        echo "Port $PORT is listening"
    else
        echo "Port $PORT is not listening, please check service status and logs"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln | grep ":$PORT"; then
        echo "Port $PORT is listening"
    else
        echo "Port $PORT is not listening, please check service status and logs"
    fi
else
    echo "Cannot check port listening status, please verify manually"
fi

# Provide service management commands
echo -e "\nInstallation complete! Service has been set to start automatically on boot."
echo -e "View service logs: tail -f $LOG_DIR/aiosmtpd.log"
echo -e "Check service status: service $SERVICE_NAME status"
echo -e "Stop service: service $SERVICE_NAME stop"
echo -e "Start service: service $SERVICE_NAME start"
echo -e "Restart service: service $SERVICE_NAME restart"

# Test instructions
echo -e "\nTest if server is working properly:"
echo "echo 'Test email content' | mail -s 'Test Subject' -S smtp=localhost:$PORT recipient@example.com"