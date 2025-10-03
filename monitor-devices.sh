#!/bin/bash

# 设备注册监控脚本
echo "🔍 设备注册监控脚本启动..."
echo "================================"

while true; do
    echo ""
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - 检查设备注册状态"
    echo "--------------------------------"
    
    # 检查设备数量
    device_count=$(docker exec flexi-mongo-primary mongo flexiwan --quiet --eval "db.devices.find().count()")
    echo "📱 当前注册设备数量: $device_count"
    
    if [ "$device_count" -gt 0 ]; then
        echo "📋 设备详情:"
        docker exec flexi-mongo-primary mongo flexiwan --quiet --eval "db.devices.find({}, {name: 1, machineId: 1, isApproved: 1, hostname: 1, isConnected: 1, createdAt: 1}).pretty()"
    else
        echo "⏳ 等待设备注册..."
    fi
    
    echo "--------------------------------"
    sleep 10
done