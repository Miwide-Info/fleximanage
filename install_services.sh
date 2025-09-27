#!/bin/bash

# Unified Installer and Manager for aiosmtpd, MongoDB, Redis
# 功能：检测依赖、安装、运行、状态检测、关闭三大服务

set -e

# 检查是否为 root
if [ "$(id -u)" -ne 0 ]; then
    echo "请以 root 权限运行本脚本"
    exit 1
fi

# 检查依赖
check_dep() {
    for cmd in "$@"; do
        if ! command -v "$cmd" &>/dev/null; then
            echo "缺少依赖: $cmd"
            exit 1
        fi
    done
}
check_dep python3 pip wget jq ss netstat

# 安装 aiosmtpd
install_aiosmtpd() {
    echo "安装 aiosmtpd..."
    # 参考 install_aiosmtpd.sh 主要逻辑
    # ...existing code...
}

# 安装 MongoDB
install_mongodb() {
    echo "安装 MongoDB..."
    # 参考 install_mongodb.sh 主要逻辑
    # ...existing code...
}

# 安装 Redis
install_redis() {
    echo "安装 Redis..."
    # 参考 install_redis.sh 主要逻辑
    # ...existing code...
}

# 服务管理函数
service_manage() {
    case "$1" in
        start|stop|restart|status)
            service "$2" "$1"
            ;;
        *)
            echo "用法: $0 service <start|stop|restart|status> <服务名>"
            ;;
    esac
}

# 主菜单
case "$1" in
    install_aiosmtpd) install_aiosmtpd ;;
    install_mongodb) install_mongodb ;;
    install_redis) install_redis ;;
    service) service_manage "$2" "$3" ;;
    *)
        echo "用法: $0 {install_aiosmtpd|install_mongodb|install_redis|service <start|stop|restart|status> <服务名>}"
        ;;
esac
