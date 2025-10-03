#!/bin/bash

# Device Registration Monitoring Script
echo "🔍 Device registration monitoring script starting..."
echo "================================"

while true; do
    echo ""
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - Checking device registration status"
    echo "--------------------------------"
    
    # Check number of devices
    device_count=$(docker exec flexi-mongo-primary mongo flexiwan --quiet --eval "db.devices.find().count()")
    echo "📱 Current number of registered devices: $device_count"
    
    if [ "$device_count" -gt 0 ]; then
        echo "📋 Device Details:"
        docker exec flexi-mongo-primary mongo flexiwan --quiet --eval "db.devices.find({}, {name: 1, machineId: 1, isApproved: 1, hostname: 1, isConnected: 1, createdAt: 1}).pretty()"
    else
        echo "⏳ Waiting for device registration..."
    fi
    
    echo "--------------------------------"
    sleep 10
done