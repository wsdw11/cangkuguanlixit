# 仓库管理系统

一个功能完整的仓库管理系统，支持入库、出库、借还、位置管理、流向追踪、库存预警等功能。

## 功能特性

- ✅ **入库操作** - 支持手动和扫码两种模式
- ✅ **出库操作** - 支持手动和扫码两种模式
- ✅ **物品位置管理** - 管理物品存放位置
- ✅ **物品借还模块** - 完整的借还流程管理
- ✅ **物品流向追踪** - 记录所有物品的流转历史
- ✅ **库存存量管理** - 实时库存查询和统计
- ✅ **存量不足预警** - 自动检测低库存并提醒
- ✅ **用户登录系统** - JWT认证，支持管理员和普通用户
- ✅ **扫码枪支持** - 支持扫码枪快速录入

## 技术栈

### 后端
- Node.js + Express
- TypeScript
- SQLite 数据库
- JWT 认证
- bcryptjs 密码加密

### 前端
- React 18
- TypeScript
- Ant Design UI组件库
- Vite 构建工具
- React Router 路由

## 项目结构

```
warehouse-management/
├── backend/              # 后端API
│   ├── src/
│   │   ├── routes/      # 路由定义
│   │   ├── middleware/  # 中间件
│   │   └── database.ts  # 数据库配置
│   └── package.json
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/   # 通用组件
│   │   ├── services/    # API服务
│   │   └── contexts/    # 上下文
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd warehouse-management
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd ../frontend
npm install
```

4. **配置环境变量**

在 `backend` 目录下创建 `.env` 文件：
```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
DB_PATH=./warehouse.db
```

5. **启动后端服务**
```bash
cd backend
npm run dev
```

后端服务将在 http://localhost:3000 启动

6. **启动前端服务**
```bash
cd frontend
npm run dev
```

前端应用将在 http://localhost:5173 启动

### 默认账号

系统首次运行会自动创建默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

**⚠️ 重要：首次登录后请立即修改密码！**

## 使用说明

### 扫码功能

系统支持扫码枪快速录入，使用方法：

1. **扫码模式切换**
   - 在入库/出库/借还页面，点击"切换到扫码模式"按钮
   - 扫码模式会自动识别扫码枪输入

2. **扫码操作**
   - 使用扫码枪扫描物品编码，系统自动识别物品
   - 使用扫码枪扫描位置编码，系统自动识别位置
   - 输入数量后即可完成操作

### 主要功能模块

1. **物品管理** - 添加、编辑、删除物品信息
2. **位置管理** - 管理仓库位置信息
3. **库存管理** - 查看当前库存状态
4. **入库操作** - 物品入库登记
5. **出库操作** - 物品出库登记
6. **借还管理** - 物品借出和归还
7. **流向追踪** - 查看物品流转历史
8. **用户管理** - 管理员可创建新用户

## 部署到云服务器

### 1. 准备服务器

确保服务器已安装 Node.js 和 npm

### 2. 上传代码

将项目代码上传到服务器

### 3. 安装依赖

```bash
# 后端
cd backend
npm install
npm run build

# 前端
cd ../frontend
npm install
npm run build
```

### 4. 配置环境变量

在服务器上创建 `.env` 文件并配置

### 5. 启动服务

**使用 PM2 管理进程（推荐）**

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start dist/index.js --name warehouse-api

# 启动前端（使用nginx或serve）
cd frontend
pm2 serve dist --name warehouse-frontend --port 5173
```

**或使用 systemd 服务**

创建 `/etc/systemd/system/warehouse-api.service`:
```ini
[Unit]
Description=Warehouse Management API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

### 6. 配置 Nginx（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据库

系统使用 SQLite 数据库，数据库文件默认保存在 `backend/warehouse.db`

### 数据库备份

```bash
# 备份数据库
cp backend/warehouse.db backend/warehouse.db.backup

# 恢复数据库
cp backend/warehouse.db.backup backend/warehouse.db
```

## 开发

### 后端开发

```bash
cd backend
npm run dev  # 开发模式，自动重启
```

### 前端开发

```bash
cd frontend
npm run dev  # 开发服务器
```

## 注意事项

1. **安全性**
   - 生产环境务必修改 JWT_SECRET
   - 修改默认管理员密码
   - 定期备份数据库

2. **性能优化**
   - 大量数据时考虑使用 MySQL/PostgreSQL
   - 添加数据库索引优化查询
   - 使用 Redis 缓存热点数据

3. **功能扩展**
   - 可以添加报表统计功能
   - 可以添加导出Excel功能
   - 可以添加消息通知功能

## 许可证

MIT License

## 支持

如有问题，请提交 Issue 或联系开发者。

# cangkuguanlixit
# cangkuguanlixit
