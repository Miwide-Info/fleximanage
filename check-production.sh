#!/bin/bash

# FlexiManage 生产环境诊断脚本
# 使用方法: bash check-production.sh

echo "🔍 FlexiManage 生产环境诊断..."
echo "=================================="

# 1. 检查网络连接
echo "1. 🌐 检查网络连接..."
if ping -c 3 manage.miwide.com &> /dev/null; then
    echo "   ✅ manage.miwide.com 网络连接正常"
else
    echo "   ❌ manage.miwide.com 网络连接失败"
fi

# 2. 检查HTTPS连接
echo "2. 🔒 检查HTTPS连接..."
if curl -k -I -s https://manage.miwide.com:3443 | grep -q "200 OK"; then
    echo "   ✅ HTTPS连接正常"
else
    echo "   ❌ HTTPS连接失败"
fi

# 3. 检查本地服务状态
echo "3. 🐳 检查Docker容器状态..."
docker compose ps

# 4. 检查前端构建
echo "4. 📦 检查前端构建..."
if [ -d "frontend/build" ]; then
    echo "   ✅ 前端构建目录存在"
    echo "   📁 构建文件:"
    ls -la frontend/build/
else
    echo "   ❌ 前端构建目录不存在"
fi

# 5. 检查后端日志
echo "5. 📋 检查后端日志(最近10行)..."
docker compose logs --tail=10 backend

# 6. 检查Git状态
echo "6. 📝 检查Git状态..."
git status --porcelain
if [ $? -eq 0 ]; then
    echo "   ✅ Git状态正常"
else
    echo "   ❌ Git状态异常"
fi

echo ""
echo "=================================="
echo "💡 如果问题仍然存在，请:"
echo "   1. 运行: bash deploy-production.sh"
echo "   2. 检查防火墙和DNS设置"
echo "   3. 联系系统管理员"