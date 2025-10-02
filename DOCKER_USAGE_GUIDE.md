# FlexiManage Docker 使用指南

## 概述

FlexiManage 是一个开源的 SD-WAN 管理平台，本文档提供了使用 Docker 运行 FlexiManage 后端服务的完整指南。

## 系统要求

### 最低配置
- **操作系统**: Linux (Ubuntu 20.04+), macOS, Windows with WSL2
- **内存**: 4GB RAM (推荐 8GB+)
- **存储**: 20GB 可用空间
- **网络**: 需要访问互联网进行依赖下载

### 必需软件
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Git**: 用于克隆代码仓库

### 端口要求
确保以下端口未被占用：
- `3000` - HTTP API 服务
- `3443` - HTTPS API 服务  
- `27017-27019` - MongoDB 副本集
- `6379` - Redis 缓存
- `8025` - SMTP4Dev (开发邮件服务)

## 快速启动

### 1. 获取代码
```bash
git clone https://github.com/Miwide-Info/fleximanage.git
cd fleximanage
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env.docker

# 根据需要编辑环境变量
nano .env.docker
```

### 3. 启动服务
```bash
# 使用启动脚本（推荐）
./start.sh

# 或手动启动
docker compose up -d
```

### 4. 验证服务
```bash
# 检查容器状态
docker compose ps

# 健康检查
curl -k https://localhost:3443/api/health
```

## 服务架构

### 核心服务

#### 1. Backend 服务
- **容器名**: `flexi-backend`
- **技术栈**: Node.js 18 + Express.js
- **端口**: 
  - `3000` - HTTP API
  - `3443` - HTTPS API (SSL/TLS)
- **健康检查**: `GET /api/health`
- **API 文档**: `https://localhost:3443/api-docs`

#### 2. MongoDB 副本集
- **Primary**: `flexi-mongo-primary:27017`
- **Secondary1**: `flexi-mongo-secondary1:27018`  
- **Secondary2**: `flexi-mongo-secondary2:27019`
- **副本集名**: `rs`
- **数据持久化**: Docker volumes

#### 3. Redis 缓存
- **容器名**: `flexi-redis`
- **端口**: `6379`
- **用途**: 会话管理、API 缓存

#### 4. SMTP4Dev (开发环境)
- **容器名**: `flexi-smtp`
- **端口**: `8025` (Web UI)
- **用途**: 邮件测试和调试

### 网络配置
- **网络名**: `flexi-network`
- **类型**: Bridge 网络
- **服务间通信**: 容器名解析

## 开发环境配置

### 1. 开发模式启动
```bash
# 启动开发环境
docker compose -f docker-compose.dev.yml up -d

# 查看实时日志
docker compose logs -f backend
```

### 2. 代码热重载
```bash
# 挂载源代码目录实现热重载
docker compose -f docker-compose.dev.yml up -d

# 进入后端容器
docker exec -it flexi-backend bash
```

### 3. 数据库管理
```bash
# 连接 MongoDB Primary
docker exec -it flexi-mongo-primary mongo

# 检查副本集状态
docker exec -it flexi-mongo-primary mongo --eval "rs.status()"

# 数据库备份
docker exec flexi-mongo-primary mongodump --db flexiwan --out /data/backup
```

## 环境变量配置

### 关键环境变量

```bash
# .env.docker 配置示例

# 应用配置
NODE_ENV=development
PORT=3000
HTTPS_PORT=3443

# 数据库配置
MONGO_URI=mongodb://mongo-primary:27017,mongo-secondary1:27017,mongo-secondary2:27017/flexiwan?replicaSet=rs

# 认证配置
JWT_SECRET=your_jwt_secret_here
DEVICE_SECRET_KEY=your_device_secret_here

# 网络配置
AGENT_BROKER=localhost:3443
CORS_WHITELIST=http://localhost:3000,https://localhost:3443

# Redis 配置
REDIS_URL=redis://redis:6379

# 邮件配置 (开发)
SMTP_HOST=smtp4dev
SMTP_PORT=25
```

### 生产环境变量
```bash
# 生产环境额外配置
NODE_ENV=production
LOG_LEVEL=info
SSL_CERT_PATH=/app/certs/certificate.pem
SSL_KEY_PATH=/app/certs/private.key

# 外部数据库
MONGO_URI=mongodb://prod-mongo1:27017,prod-mongo2:27017,prod-mongo3:27017/flexiwan?replicaSet=rs&ssl=true
MONGO_AUTH_SOURCE=admin
MONGO_USERNAME=flexiwan_user
MONGO_PASSWORD=secure_password

# 外部 Redis
REDIS_URL=redis://prod-redis:6379
REDIS_PASSWORD=redis_password
```

## API 使用指南

### 1. 认证
```bash
# 登录获取 JWT Token
curl -k -X POST https://localhost:3443/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@flexiwan.com","password":"admin"}'

# 使用 Token 访问 API
curl -k -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://localhost:3443/api/devices
```

### 2. 常用 API 端点
```bash
# 健康检查
GET /api/health

# 用户管理
POST /api/users/login          # 用户登录
GET  /api/users/profile        # 获取用户信息

# 设备管理
GET    /api/devices            # 获取设备列表
POST   /api/devices            # 注册新设备
GET    /api/devices/:id        # 获取设备详情
PUT    /api/devices/:id        # 更新设备配置
DELETE /api/devices/:id        # 删除设备

# 组织管理
GET  /api/organizations        # 获取组织列表
POST /api/organizations        # 创建组织

# Token 管理
GET  /api/tokens              # 获取 Token 列表
POST /api/tokens              # 创建新 Token
```

## 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 检查容器状态
docker compose ps

# 查看错误日志
docker compose logs backend

# 重启服务
docker compose restart backend
```

#### 2. 数据库连接问题
```bash
# 检查 MongoDB 副本集状态
docker exec flexi-mongo-primary mongo --eval "rs.status()"

# 重新初始化副本集
docker exec flexi-mongo-primary mongo --eval '
rs.initiate({
  _id: "rs",
  members: [
    { _id: 0, host: "mongo-primary:27017" },
    { _id: 1, host: "mongo-secondary1:27017" },
    { _id: 2, host: "mongo-secondary2:27017" }
  ]
})
'
```

#### 3. SSL 证书问题
```bash
# 检查证书文件
ls -la backend/bin/cert.*

# 重新生成自签证书
openssl req -x509 -newkey rsa:4096 \
  -keyout backend/bin/cert.localhost/domain.key \
  -out backend/bin/cert.localhost/certificate.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

#### 4. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3443

# 修改端口映射
# 编辑 docker-compose.yml 中的 ports 配置
```

### 日志调试

#### 1. 应用日志
```bash
# 实时查看应用日志
docker compose logs -f backend

# 查看特定时间段日志
docker compose logs backend --since="2025-01-01T00:00:00"

# 导出日志到文件
docker compose logs backend > backend.log
```

#### 2. 数据库日志
```bash
# MongoDB 日志
docker compose logs mongo-primary

# Redis 日志
docker compose logs redis
```

## 性能优化

### 1. 资源限制
```yaml
# docker-compose.yml 中添加资源限制
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### 2. 数据库优化
```bash
# MongoDB 连接池配置
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=2

# Redis 内存限制
REDIS_MAXMEMORY=256mb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### 3. 缓存配置
```bash
# Node.js 缓存设置
NODE_CACHE_TTL=600
NODE_CACHE_MAX_KEYS=1000
```

## 数据管理

### 1. 数据备份
```bash
#!/bin/bash
# backup.sh - 数据备份脚本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# MongoDB 备份
docker exec flexi-mongo-primary mongodump \
  --db flexiwan \
  --out /data/backup_$DATE

# 压缩备份
docker exec flexi-mongo-primary tar -czf \
  /data/flexiwan_backup_$DATE.tar.gz \
  -C /data backup_$DATE

# 复制到宿主机
docker cp flexi-mongo-primary:/data/flexiwan_backup_$DATE.tar.gz \
  $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR/flexiwan_backup_$DATE.tar.gz"
```

### 2. 数据恢复
```bash
#!/bin/bash
# restore.sh - 数据恢复脚本

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# 复制备份文件到容器
docker cp $BACKUP_FILE flexi-mongo-primary:/data/

# 解压备份
docker exec flexi-mongo-primary tar -xzf /data/$(basename $BACKUP_FILE) -C /data/

# 恢复数据库
docker exec flexi-mongo-primary mongorestore \
  --db flexiwan \
  --drop \
  /data/backup_*/flexiwan

echo "Restore completed from: $BACKUP_FILE"
```

## 监控和维护

### 1. 健康监控
```bash
#!/bin/bash
# health-check.sh - 系统健康检查

echo "=== FlexiManage Health Check ==="
echo "Date: $(date)"

# 检查容器状态
echo -e "\n1. Container Status:"
docker compose ps

# 检查 API 健康
echo -e "\n2. API Health:"
curl -s -k https://localhost:3443/api/health | jq .

# 检查数据库状态
echo -e "\n3. Database Status:"
docker exec flexi-mongo-primary mongo --eval "db.runCommand('ping')" --quiet

# 检查磁盘空间
echo -e "\n4. Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"

# 检查内存使用
echo -e "\n5. Memory Usage:"
free -h
```

### 2. 自动化维护
```bash
# crontab 定时任务示例

# 每天凌晨 2 点备份数据库
0 2 * * * /opt/fleximanage/scripts/backup.sh

# 每周日凌晨 3 点清理旧日志
0 3 * * 0 /opt/fleximanage/scripts/cleanup-logs.sh

# 每小时检查系统健康
0 * * * * /opt/fleximanage/scripts/health-check.sh >> /var/log/fleximanage-health.log
```

## 升级指南

### 1. 应用升级
```bash
#!/bin/bash
# upgrade.sh - 应用升级脚本

echo "Starting FlexiManage upgrade..."

# 1. 备份当前数据
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建镜像
docker compose build --no-cache backend

# 4. 滚动更新服务
docker compose up -d --no-deps backend

# 5. 验证升级
sleep 30
curl -s -k https://localhost:3443/api/health

echo "Upgrade completed!"
```

### 2. 数据库升级
```bash
# 运行数据库迁移
docker exec flexi-backend npm run migrate

# 检查数据库版本
docker exec flexi-mongo-primary mongo flexiwan --eval "db.schema_version.find()"
```

## 安全配置

### 1. 生产环境安全
```bash
# 生产环境安全配置
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 64)
DEVICE_SECRET_KEY=$(openssl rand -hex 32)

# 启用 HTTPS
SSL_ENABLED=true
SSL_CERT_PATH=/app/certs/certificate.pem
SSL_KEY_PATH=/app/certs/private.key

# 数据库认证
MONGO_AUTH_ENABLED=true
MONGO_USERNAME=flexiwan_admin
MONGO_PASSWORD=$(openssl rand -base64 32)

# Redis 密码
REDIS_PASSWORD=$(openssl rand -base64 32)
```

### 2. 防火墙配置
```bash
# UFW 防火墙规则示例
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3443/tcp  # HTTPS API
sudo ufw deny 3000/tcp   # 拒绝 HTTP (生产环境)
sudo ufw deny 27017:27019/tcp  # 拒绝直接数据库访问
```

---

## 总结

FlexiManage Docker 部署提供了完整的 SD-WAN 管理平台解决方案。通过本指南，您可以：

1. **快速部署**: 使用 Docker Compose 一键部署完整系统
2. **开发调试**: 支持代码热重载和实时调试
3. **生产部署**: 提供生产级别的配置和安全设置
4. **运维管理**: 包含监控、备份、升级等运维工具

如需技术支持，请参考：
- **GitHub Issues**: https://github.com/Miwide-Info/fleximanage/issues
- **技术文档**: 项目根目录下的 `TECHNICAL_GUIDE.md`
- **操作手册**: 项目根目录下的 `OPERATIONS_GUIDE.md`