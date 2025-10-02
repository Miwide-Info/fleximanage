# FlexiManage 开发文档

## 项目概述

FlexiManage 是一个开源的 SD-WAN 管理平台，提供设备管理、网络配置、用户认证等核心功能。本文档为开发者提供完整的开发指南。

## 技术栈

### 后端技术栈
- **运行时**: Node.js 18.x
- **框架**: Express.js 4.x
- **数据库**: MongoDB 4.4 (副本集)
- **缓存**: Redis 7.x
- **认证**: JWT (JSON Web Tokens)
- **API 规范**: OpenAPI 3.0
- **容器化**: Docker & Docker Compose

### 前端技术栈
- **框架**: React 18.x
- **路由**: React Router 6.x
- **状态管理**: React Context + Hooks
- **UI 组件**: Bootstrap 5 + React Bootstrap
- **HTTP 客户端**: Axios
- **构建工具**: Create React App (CRA)

### 开发工具
- **代码质量**: ESLint, Prettier
- **测试**: Jest, Supertest
- **API 测试**: Postman, curl
- **版本控制**: Git
- **CI/CD**: GitLab CI (配置中)

## 项目结构

```
fleximanage/
├── backend/                    # 后端服务
│   ├── api/                   # OpenAPI 规范
│   ├── controllers/           # API 控制器
│   ├── services/              # 业务逻辑服务
│   ├── models/                # 数据模型
│   ├── routes/                # 路由定义
│   ├── middleware/            # 中间件
│   ├── utils/                 # 工具函数
│   ├── configs.js             # 配置管理
│   ├── expressserver.js       # Express 服务器
│   └── package.json           # 依赖管理
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   ├── pages/             # 页面组件
│   │   ├── services/          # API 服务
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── utils/             # 工具函数
│   │   └── App.js             # 应用入口
│   ├── public/                # 静态资源
│   └── package.json           # 前端依赖
├── scripts/                    # 构建和部署脚本
├── docker-compose.yml          # Docker 编排文件
├── Dockerfile                  # Docker 构建文件
└── README.md                   # 项目说明
```

## 开发环境搭建

### 1. 系统要求
```bash
# 必需软件
- Node.js 18.x
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.x

# 推荐工具
- Visual Studio Code
- Postman (API 测试)
- MongoDB Compass (数据库管理)
```

### 2. 项目克隆和初始化
```bash
# 克隆代码库
git clone https://github.com/Miwide-Info/fleximanage.git
cd fleximanage

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install

# 返回项目根目录
cd ..
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env.development

# 编辑开发环境配置
nano .env.development
```

**开发环境变量示例**:
```bash
# .env.development
NODE_ENV=development
PORT=3000
HTTPS_PORT=3443

# 数据库配置
MONGO_URI=mongodb://mongo-primary:27017,mongo-secondary1:27017,mongo-secondary2:27017/flexiwan?replicaSet=rs

# 认证密钥
JWT_SECRET=development_jwt_secret_key
DEVICE_SECRET_KEY=development_device_secret

# CORS 配置
CORS_WHITELIST=http://localhost:3000,https://localhost:3443

# 日志级别
LOG_LEVEL=debug
```

### 4. 服务启动
```bash
# 启动开发环境 (推荐)
docker compose -f docker-compose.dev.yml up -d

# 或分别启动服务
docker compose up -d mongo-primary mongo-secondary1 mongo-secondary2 redis
cd backend && npm run dev
cd frontend && npm start
```

## 开发工作流

### 1. 代码开发流程
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发代码
# 编辑文件...

# 3. 运行测试
npm test

# 4. 代码检查
npm run lint
npm run format

# 5. 提交代码
git add .
git commit -m "feat: add new feature"

# 6. 推送分支
git push origin feature/new-feature

# 7. 创建 Pull Request
```

### 2. 热重载开发
```bash
# 后端热重载 (使用 nodemon)
cd backend
npm run dev

# 前端热重载 (CRA 内置)
cd frontend
npm start
```

### 3. API 开发和测试
```bash
# 启动 API 服务
cd backend
npm run dev

# 测试 API 端点
curl -k https://localhost:3443/api/health

# 使用 Postman 集合
# 导入: postman/FlexiManage.postman_collection.json
```

## 代码规范

### 1. JavaScript/Node.js 规范
```javascript
// ESLint 配置 (.eslintrc.js)
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:node/recommended'
  ],
  env: {
    node: true,
    es2021: true
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-console': 'warn'
  }
};

// 函数命名规范
const getUserById = async (userId) => {
  // 使用 camelCase
  const userData = await User.findById(userId);
  return userData;
};

// 常量命名规范
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
```

### 2. React 组件规范
```javascript
// 函数组件示例
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const DeviceList = ({ organizationId, onDeviceSelect }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await deviceService.getByOrganization(organizationId);
        setDevices(response.data);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [organizationId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="device-list">
      {devices.map(device => (
        <DeviceCard 
          key={device.id} 
          device={device} 
          onClick={() => onDeviceSelect(device)}
        />
      ))}
    </div>
  );
};

DeviceList.propTypes = {
  organizationId: PropTypes.string.isRequired,
  onDeviceSelect: PropTypes.func.isRequired
};

export default DeviceList;
```

### 3. API 路由规范
```javascript
// routes/devices.js
const express = require('express');
const router = express.Router();
const DevicesController = require('../controllers/DevicesController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const deviceSchema = require('../schemas/deviceSchema');

// GET /api/devices - 获取设备列表
router.get('/', 
  authenticate,
  DevicesController.getDevices
);

// POST /api/devices - 创建设备
router.post('/', 
  authenticate,
  validate(deviceSchema),
  DevicesController.createDevice
);

// GET /api/devices/:id - 获取设备详情
router.get('/:id', 
  authenticate,
  DevicesController.getDeviceById
);

// PUT /api/devices/:id - 更新设备
router.put('/:id', 
  authenticate,
  validate(deviceSchema),
  DevicesController.updateDevice
);

// DELETE /api/devices/:id - 删除设备
router.delete('/:id', 
  authenticate,
  DevicesController.deleteDevice
);

module.exports = router;
```

## 数据库开发

### 1. MongoDB 模型定义
```javascript
// models/devices.js
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  // 基本信息
  machineId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hostname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 63
  },
  
  // 关联关系
  org: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'organizations',
    required: true,
    index: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'accounts',
    required: true
  },
  
  // 认证信息
  deviceToken: {
    type: String,
    required: true,
    index: true
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // 网络接口
  interfaces: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['WAN', 'LAN'], required: true },
    addr: String,
    gateway: String,
    isAssigned: { type: Boolean, default: false }
  }],
  
  // 版本信息
  versions: {
    agent: String,
    router: String,
    device: String
  },
  
  // 状态信息
  status: {
    type: String,
    enum: ['pending', 'running', 'stopped', 'error'],
    default: 'pending',
    index: true
  },
  isConnected: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
deviceSchema.index({ org: 1, status: 1 });
deviceSchema.index({ org: 1, isConnected: 1 });
deviceSchema.index({ deviceToken: 1 }, { unique: true });

// 虚拟字段
deviceSchema.virtual('isOnline').get(function() {
  return this.isConnected && this.status === 'running';
});

// 中间件
deviceSchema.pre('save', function(next) {
  if (this.isModified('hostname')) {
    this.hostname = this.hostname.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('devices', deviceSchema);
```

### 2. 数据库迁移
```javascript
// migrations/001_add_device_status.js
module.exports = {
  async up(db) {
    // 添加 status 字段到现有设备
    await db.collection('devices').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'pending' } }
    );
    
    // 创建索引
    await db.collection('devices').createIndex({ status: 1 });
  },
  
  async down(db) {
    // 回滚操作
    await db.collection('devices').updateMany(
      {},
      { $unset: { status: '' } }
    );
    
    await db.collection('devices').dropIndex({ status: 1 });
  }
};
```

### 3. 数据库查询优化
```javascript
// services/DevicesService.js
class DevicesService {
  // 高效的分页查询
  static async getDevices(orgId, options = {}) {
    const { page = 1, limit = 20, status, connected } = options;
    const skip = (page - 1) * limit;
    
    const filter = { org: orgId };
    if (status) filter.status = status;
    if (connected !== undefined) filter.isConnected = connected;
    
    const [devices, total] = await Promise.all([
      Device.find(filter)
        .populate('org', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // 使用 lean() 提高性能
      Device.countDocuments(filter)
    ]);
    
    return {
      devices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // 聚合查询示例
  static async getDeviceStats(orgId) {
    const stats = await Device.aggregate([
      { $match: { org: mongoose.Types.ObjectId(orgId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          connected: {
            $sum: { $cond: [{ $eq: ['$isConnected', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          connected: 1,
          _id: 0
        }
      }
    ]);
    
    return stats;
  }
}
```

## API 开发

### 1. RESTful API 设计
```javascript
// controllers/DevicesController.js
const DevicesService = require('../services/DevicesService');
const { validationResult } = require('express-validator');

class DevicesController {
  // GET /api/devices
  static async getDevices(req, res) {
    try {
      const { org } = req.user;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        connected: req.query.connected !== undefined ? 
          req.query.connected === 'true' : undefined
      };
      
      const result = await DevicesService.getDevices(org, options);
      
      res.json({
        success: true,
        data: result.devices,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  // POST /api/devices
  static async createDevice(req, res) {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const { org, account } = req.user;
      const deviceData = {
        ...req.body,
        org,
        account
      };
      
      const device = await DevicesService.createDevice(deviceData);
      
      res.status(201).json({
        success: true,
        data: device
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Device already exists'
        });
      }
      
      console.error('Error creating device:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = DevicesController;
```

### 2. 输入验证
```javascript
// middleware/validation.js
const { body, param, query } = require('express-validator');

const deviceValidation = {
  create: [
    body('machineId')
      .isUUID()
      .withMessage('Machine ID must be a valid UUID'),
    body('hostname')
      .isLength({ min: 3, max: 63 })
      .matches(/^[a-zA-Z0-9-]+$/)
      .withMessage('Hostname must be alphanumeric with hyphens'),
    body('deviceToken')
      .isLength({ min: 32 })
      .withMessage('Device token must be at least 32 characters')
  ],
  
  update: [
    param('id').isMongoId().withMessage('Invalid device ID'),
    body('hostname').optional()
      .isLength({ min: 3, max: 63 })
      .matches(/^[a-zA-Z0-9-]+$/),
    body('status').optional()
      .isIn(['pending', 'running', 'stopped', 'error'])
  ],
  
  query: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'running', 'stopped', 'error']),
    query('connected').optional().isBoolean()
  ]
};

module.exports = { deviceValidation };
```

### 3. 错误处理
```javascript
// middleware/errorHandler.js
const errorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  // MongoDB 验证错误
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map(e => e.message).join(', ');
  }
  
  // MongoDB 重复键错误
  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern)[0];
    message = `${field} already exists`;
  }
  
  // JWT 认证错误
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  // 记录错误日志
  console.error(`Error ${statusCode}: ${message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id
  });
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;
```

## 测试开发

### 1. 单元测试
```javascript
// tests/services/DevicesService.test.js
const DevicesService = require('../../services/DevicesService');
const Device = require('../../models/devices');

jest.mock('../../models/devices');

describe('DevicesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getDevices', () => {
    it('should return paginated devices', async () => {
      const mockDevices = [
        { _id: '1', hostname: 'device1', status: 'running' },
        { _id: '2', hostname: 'device2', status: 'pending' }
      ];
      
      Device.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDevices)
      });
      
      Device.countDocuments.mockResolvedValue(2);
      
      const result = await DevicesService.getDevices('org123', { page: 1, limit: 10 });
      
      expect(result.devices).toEqual(mockDevices);
      expect(result.pagination.total).toBe(2);
      expect(Device.find).toHaveBeenCalledWith({ org: 'org123' });
    });
  });
});
```

### 2. 集成测试
```javascript
// tests/integration/devices.test.js
const request = require('supertest');
const app = require('../../expressserver');
const Device = require('../../models/devices');

describe('Devices API', () => {
  let authToken;
  
  beforeAll(async () => {
    // 登录获取认证 token
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        username: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });
  
  afterEach(async () => {
    // 清理测试数据
    await Device.deleteMany({ hostname: /^test-/ });
  });
  
  describe('GET /api/devices', () => {
    it('should return devices list', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/devices')
        .expect(401);
    });
  });
  
  describe('POST /api/devices', () => {
    it('should create new device', async () => {
      const deviceData = {
        machineId: '550e8400-e29b-41d4-a716-446655440000',
        hostname: 'test-device-1',
        deviceToken: 'test-token-123456789012345678901234567890'
      };
      
      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.hostname).toBe(deviceData.hostname);
    });
  });
});
```

### 3. 端到端测试
```javascript
// tests/e2e/device-management.test.js
const puppeteer = require('puppeteer');

describe('Device Management E2E', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  it('should login and view devices page', async () => {
    // 访问登录页面
    await page.goto('https://localhost:3443');
    
    // 登录
    await page.type('#username', 'admin@example.com');
    await page.type('#password', 'password123');
    await page.click('#login-button');
    
    // 等待跳转到设备页面
    await page.waitForSelector('.device-list');
    
    // 验证页面标题
    const title = await page.title();
    expect(title).toContain('FlexiManage - Devices');
    
    // 验证设备列表存在
    const deviceCount = await page.$$eval('.device-card', cards => cards.length);
    expect(deviceCount).toBeGreaterThanOrEqual(0);
  });
});
```

## 性能优化

### 1. 数据库查询优化
```javascript
// 使用索引优化查询
const deviceSchema = new mongoose.Schema({
  // ... 字段定义
});

// 复合索引
deviceSchema.index({ org: 1, status: 1, createdAt: -1 });
deviceSchema.index({ org: 1, isConnected: 1 });

// 使用 lean() 查询提高性能
const devices = await Device.find({ org: orgId })
  .lean()  // 返回普通 JavaScript 对象，提高性能
  .select('hostname status isConnected')  // 只选择需要的字段
  .limit(20);
```

### 2. API 响应缓存
```javascript
// middleware/cache.js
const Redis = require('redis');
const client = Redis.createClient(process.env.REDIS_URL);

const cache = (ttl = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.method}:${req.originalUrl}:${req.user.org}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // 劫持 res.json 方法
      const originalJson = res.json;
      res.json = function(data) {
        // 缓存响应数据
        client.setex(key, ttl, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

// 使用缓存中间件
router.get('/devices', cache(300), DevicesController.getDevices);
```

### 3. 前端性能优化
```javascript
// 使用 React.memo 优化组件渲染
const DeviceCard = React.memo(({ device, onClick }) => {
  return (
    <div className="device-card" onClick={() => onClick(device)}>
      <h5>{device.hostname}</h5>
      <span className={`status ${device.status}`}>
        {device.status}
      </span>
    </div>
  );
});

// 使用 useMemo 优化计算
const deviceStats = useMemo(() => {
  return devices.reduce((stats, device) => {
    stats[device.status] = (stats[device.status] || 0) + 1;
    return stats;
  }, {});
}, [devices]);

// 使用 useCallback 优化事件处理
const handleDeviceSelect = useCallback((device) => {
  setSelectedDevice(device);
  onDeviceSelect?.(device);
}, [onDeviceSelect]);
```

## 部署和发布

### 1. 构建脚本
```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "Building FlexiManage..."

# 1. 安装依赖
echo "Installing dependencies..."
cd backend && npm ci --only=production
cd ../frontend && npm ci

# 2. 构建前端
echo "Building frontend..."
npm run build

# 3. 构建 Docker 镜像
echo "Building Docker image..."
cd ..
docker build -t fleximanage:latest .

# 4. 运行测试
echo "Running tests..."
npm test

echo "Build completed successfully!"
```

### 2. 部署配置
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: fleximanage:latest
    ports:
      - "3443:3443"
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./logs:/app/logs
      - ./certs:/app/certs
    restart: unless-stopped
    depends_on:
      - mongo
      - redis
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - backend
```

### 3. CI/CD 流水线
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_REGISTRY: registry.example.com
  IMAGE_NAME: fleximanage

test:
  stage: test
  image: node:18-alpine
  services:
    - mongo:4.4
    - redis:7-alpine
  script:
    - cd backend && npm ci
    - npm run test
    - npm run lint
  coverage: '/Statements\s*:\s*(\d+(?:\.\d+)?)%/'

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/$IMAGE_NAME:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  script:
    - docker-compose -f docker-compose.prod.yml up -d
    - docker system prune -f
  only:
    - main
  when: manual
```

## 监控和调试

### 1. 应用监控
```javascript
// middleware/monitoring.js
const promClient = require('prom-client');

// 创建指标
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// 监控中间件
const monitoringMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });
  
  next();
};

module.exports = { monitoringMiddleware };
```

### 2. 日志记录
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fleximanage' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

### 3. 健康检查
```javascript
// routes/health.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redis = require('../utils/redis');

router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    services: {}
  };
  
  try {
    // 检查 MongoDB 连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.services.mongodb = 'UP';
    } else {
      health.services.mongodb = 'DOWN';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.mongodb = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  try {
    // 检查 Redis 连接
    await redis.ping();
    health.services.redis = 'UP';
  } catch (error) {
    health.services.redis = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

## 故障排除

### 1. 常见问题诊断
```bash
#!/bin/bash
# scripts/diagnose.sh

echo "FlexiManage 故障诊断工具"
echo "========================"

# 检查容器状态
echo "1. 检查容器状态:"
docker compose ps

# 检查服务日志
echo -e "\n2. 检查后端服务日志:"
docker compose logs backend --tail=50

# 检查数据库连接
echo -e "\n3. 检查数据库连接:"
docker exec mongo-primary mongo --eval "db.runCommand('ping')" --quiet

# 检查 API 健康状态
echo -e "\n4. 检查 API 健康状态:"
curl -s -k https://localhost:3443/api/health | jq .

# 检查磁盘空间
echo -e "\n5. 检查磁盘空间:"
df -h

# 检查内存使用
echo -e "\n6. 检查内存使用:"
free -h
```

### 2. 调试技巧
```javascript
// 使用调试中间件
const debugMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('User:', req.user);
  }
  next();
};

// 数据库查询调试
mongoose.set('debug', process.env.NODE_ENV === 'development');

// 使用 VS Code 调试配置
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/bin/www",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      },
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## 总结

本开发文档涵盖了 FlexiManage 项目的完整开发流程，包括：

1. **环境搭建**: Docker 化开发环境
2. **代码规范**: ESLint, Prettier 配置
3. **API 开发**: RESTful API 设计和实现
4. **数据库开发**: MongoDB 模型和查询优化
5. **测试开发**: 单元测试、集成测试、E2E 测试
6. **性能优化**: 缓存、查询优化、前端优化
7. **部署发布**: Docker 部署和 CI/CD 流水线
8. **监控调试**: 应用监控、日志记录、故障排除

遵循本文档的指导，开发者可以高效地进行 FlexiManage 项目的开发和维护工作。

如需更多技术支持，请参考项目的其他文档文件或提交 GitHub Issue。