#!/bin/bash

# FlexiManage Production Environment Diagnostic Script
# Usage: bash check-production.sh

echo "🔍 FlexiManage Production Environment Diagnosis..."
echo "=================================="

# 1. Check network connection
echo "1. 🌐 Checking network connection..."
if ping -c 3 manage.miwide.com &> /dev/null; then
    echo "   ✅ manage.miwide.com network connection is normal"
else
    echo "   ❌ manage.miwide.com network connection failed"
fi

# 2. Check HTTPS connection
echo "2. 🔒 Checking HTTPS connection..."
if curl -k -I -s https://manage.miwide.com:3443 | grep -q "200 OK"; then
    echo "   ✅ HTTPS connection is normal"
else
    echo "   ❌ HTTPS connection failed"
fi

# 3. Check local service status
echo "3. 🐳 Checking Docker container status..."
docker compose ps

# 4. Check frontend build
echo "4. 📦 Checking frontend build..."
if [ -d "frontend/build" ]; then
    echo "   ✅ Frontend build directory exists"
    echo "   📁 Build files:"
    ls -la frontend/build/
else
    echo "   ❌ Frontend build directory does not exist"
fi

# 5. Check backend logs
echo "5. 📋 Checking backend logs (last 10 lines)..."
docker compose logs --tail=10 backend

# 6. Check Git status
echo "6. 📝 Checking Git status..."
git status --porcelain
if [ $? -eq 0 ]; then
    echo "   ✅ Git status is normal"
else
    echo "   ❌ Git status is abnormal"
fi

echo ""
echo "=================================="
echo "💡 If the problem persists, please:"
echo "   1. Run: bash deploy-production.sh"
echo "   2. Check firewall and DNS settings"
echo "   3. Contact the system administrator"