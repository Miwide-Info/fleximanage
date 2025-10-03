#!/bin/bash

# FlexiManage 生产环境部署脚本
# 使用方法: bash deploy-production.sh

set -e

echo "🚀 FlexiManage 生产环境部署开始..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 安装前端依赖
echo "📦 安装前端依赖..."
cd frontend
npm install

# 3. 构建前端
echo "🔨 构建前端生产版本..."
npm run build

# 4. 返回根目录
cd ..

# 5. 重启Docker服务
echo "🔄 重启Docker服务..."
if command -v docker-compose &> /dev/null; then
    docker-compose restart backend
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose restart backend
else
    echo "❌ Docker Compose 未找到，请手动重启后端服务"
    exit 1
fi

echo "✅ 部署完成!"
echo ""
echo "🌐 请访问以下网址验证部署:"
echo "   https://manage.miwide.com:3443/devices"
echo ""
echo "💡 如果仍有问题，请检查:"
echo "   1. 防火墙设置"
echo "   2. DNS解析"
echo "   3. SSL证书"
echo "   4. 容器日志: docker compose logs backend"