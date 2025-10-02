# FlexiManage Docker 快速指南

本文档提供 FlexiManage Docker 容器化部署的快速指南。更详细的信息请参考 [Docker 使用指南](DOCKER_USAGE_GUIDE.md)。

## 🚀 快速启动

### 系统要求
- Docker 20.10+ 和 Docker Compose 2.0+
- 至少 4GB 内存
- 可用端口：3000, 3443, 6380, 8025, 1026, 27017-27019

### 启动步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/Miwide-Info/fleximanage.git
   cd fleximanage
   ```

2. **启动服务**
   ```bash
   # 使用启动脚本
   ./start.sh
   
   # 或手动启动
   docker compose up -d
   ```

3. **访问应用**
   - **管理界面**: https://manage.miwide.com:3443
   - **邮件调试**: http://localhost:8025
   - **数据库**: mongodb://localhost:27017

## 🛠️ 开发环境

开发环境提供热重载和调试支持：

```bash
# 启动开发环境
docker compose -f docker-compose.dev.yml up -d

# 查看日志
docker compose logs -f backend
```

## 📋 服务组件

| 服务 | 端口 | 说明 |
|------|------|------|
| **Backend** | 3000, 3443 | Node.js API 服务 |
| **MongoDB** | 27017-27019 | 数据库副本集 |
| **Redis** | 6380 | 缓存服务 |
| **SMTP4Dev** | 1026, 8025 | 邮件测试工具 |

### 健康检查
```bash
# API 健康状态
curl -k https://localhost:3443/api/health

# 数据库连接
docker exec mongo-primary mongosh --eval "rs.status()"
```

## 👤 用户注册

### Web 界面注册 (推荐)
1. 访问 https://manage.miwide.com:3443
2. 点击"注册"按钮
3. 填写表单信息
4. 在 http://localhost:8025 查看验证邮件
5. 点击验证链接完成注册

### API 注册
```bash
# 注册用户
curl -X POST -k "https://localhost:3443/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "testaccount",
    "userFirstName": "Test",
    "userLastName": "User",
    "email": "test@example.com",
    "password": "testpassword",
    "country": "US",
    "serviceType": "Provider"
  }'

# 查看验证邮件：http://localhost:8025
# 验证账户
curl -X POST -k "https://localhost:3443/api/users/verify-account" \
  -H "Content-Type: application/json" \
  -d '{"id": "<id>", "token": "<token>"}'
```

## 🔧 管理命令

### 日志查看
```bash
docker compose logs -f backend          # 后端日志
docker compose logs -f mongo-primary    # 数据库日志
```

### 服务管理
```bash
docker compose ps                       # 服务状态
docker compose restart backend         # 重启后端
docker compose down                     # 停止服务
```

### 容器访问
```bash
# 后端容器
docker exec -it flexi-backend sh

# 数据库
docker exec -it flexi-mongo-primary mongosh
```

### Environment Variables
Key environment variables in docker-compose.yml:
- `NODE_ENV=production`
- `MONGO_URL`: Main database connection
- `REDIS_URL`: Redis connection
- `CAPTCHA_SECRET_KEY`: Google reCAPTCHA secret (optional)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │    Backend       │
│   (React)       │────│  (Node.js/API)   │
└─────────────────┘    └──────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼───┐   ┌───▼───┐   ┌───▼──────┐
            │ MongoDB   │   │ Redis │   │ SMTP4Dev │
            │ Replica   │   │       │   │          │
            │ Set (3)   │   │       │   │          │
            └───────────┘   └───────┘   └──────────┘
```

## SSL Certificates

The backend expects SSL certificates in `backend/bin/cert.local.flexiwan.com/`:
- `certificate.pem`
- `domain.key`

For development, the system will work with HTTP on port 3000, but HTTPS is preferred.

## 🔍 故障排除

### 常见问题
```bash
# 后端无法启动
docker compose logs backend

# 数据库连接失败
docker compose ps
docker exec flexi-mongo-primary mongosh --eval "rs.status()"

# 端口冲突
# 修改 docker-compose.yml 中的端口映射
```

### 重置环境
```bash
docker compose down -v
docker system prune -f
./start.sh
```

## 📖 更多文档

- **[完整 Docker 指南](DOCKER_USAGE_GUIDE.md)** - 详细的部署和配置说明
- **[开发文档](DEVELOPMENT_GUIDE.md)** - 开发环境和代码规范
- **[技术指南](TECHNICAL_GUIDE.md)** - 系统架构和 API 文档
- **[操作指南](OPERATIONS_GUIDE.md)** - 系统管理和维护

## 📄 许可证

本项目遵循 FlexiManage 原项目的开源许可证。