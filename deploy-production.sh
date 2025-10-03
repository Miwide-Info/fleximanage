#!/bin/bash

# FlexiManage Production Environment Deployment Script
# Usage: bash deploy-production.sh

set -e

echo "🚀 Starting FlexiManage production environment deployment..."

# 1. Pull the latest code
echo "📥 Pulling the latest code..."
git pull origin main

# 2. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# 3. Build the frontend
echo "🔨 Building frontend for production..."
npm run build

# 4. Return to the root directory
cd ..

# 5. Restart Docker services
echo "🔄 Restarting Docker services..."
if command -v docker-compose &> /dev/null; then
    docker-compose restart backend
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose restart backend
else
    echo "❌ Docker Compose not found, please restart the backend service manually"
    exit 1
fi

echo "✅ Deployment complete!"
echo ""
echo "🌐 Please visit the following URL to verify the deployment:"
echo "   https://manage.miwide.com:3443/devices"
echo ""
echo "💡 If problems persist, please check:"
echo "   1. Firewall settings"
echo "   2. DNS resolution"
echo "   3. SSL certificate"
echo "   4. Container logs: docker compose logs backend"