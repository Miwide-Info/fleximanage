#!/bin/bash

# Unified Installer and Manager for aiosmtpd, MongoDB, Redis
# Purpose: detect dependencies, install, run, status check, stop the three core services

set -e

# Check for root
if [ "$(id -u)" -ne 0 ]; then
    echo "Please run this script as root"
    exit 1
fi

# Dependency check
check_dep() {
    for cmd in "$@"; do
        if ! command -v "$cmd" &>/dev/null; then
            echo "缺少依赖: $cmd"
            exit 1
        fi
    done
}
check_dep python3 pip wget jq ss netstat

# Install aiosmtpd
install_aiosmtpd() {
    echo "安装 aiosmtpd..."
    # Refer to main logic in install_aiosmtpd.sh (not included here)
    # ...existing code...
}

# Install MongoDB
install_mongodb() {
    echo "安装 MongoDB..."
    # Refer to main logic in install_mongodb.sh (not included here)
    # ...existing code...
}

# Install Redis
install_redis() {
    echo "安装 Redis..."
    # Refer to main logic in install_redis.sh (not included here)
    # ...existing code...
}

# Service management function
service_manage() {
    case "$1" in
        start|stop|restart|status)
            service "$2" "$1"
            ;;
        *)
            echo "Usage: $0 service <start|stop|restart|status> <service-name>"
            ;;
    esac
}

# Main menu
case "$1" in
    install_aiosmtpd) install_aiosmtpd ;;
    install_mongodb) install_mongodb ;;
    install_redis) install_redis ;;
    service) service_manage "$2" "$3" ;;
    *)
    echo "Usage: $0 {install_aiosmtpd|install_mongodb|install_redis|service <start|stop|restart|status> <service-name>}"
        ;;
esac
