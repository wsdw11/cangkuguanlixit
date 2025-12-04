#!/bin/bash

# 仓库管理系统 - 自动化部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

echo "=========================================="
echo "  仓库管理系统 - 自动化部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}提示: 建议使用 sudo 运行此脚本${NC}"
fi

# 项目路径
PROJECT_DIR="/opt/warehouse-management"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 检查 Node.js
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "正在安装 Node.js..."
    
    # 检测系统类型
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        echo -e "${RED}无法检测操作系统类型${NC}"
        exit 1
    fi
    
    if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" == "centos" ] || [ "$OS" == "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        echo -e "${RED}不支持的操作系统，请手动安装 Node.js${NC}"
        exit 1
    fi
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js 已安装: $NODE_VERSION${NC}"

# 检查项目目录
echo ""
echo "📁 检查项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  项目目录不存在: $PROJECT_DIR${NC}"
    echo "请先将项目代码上传到 $PROJECT_DIR"
    exit 1
fi
echo -e "${GREEN}✅ 项目目录存在${NC}"

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd $BACKEND_DIR
if [ ! -d "node_modules" ]; then
    npm install --production
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
else
    echo -e "${YELLOW}⚠️  依赖已存在，跳过安装${NC}"
fi

# 检查 .env 文件
echo ""
echo "⚙️  检查配置文件..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，正在创建...${NC}"
    cat > $BACKEND_DIR/.env << EOF
PORT=3000
JWT_SECRET=warehouse-secret-$(date +%s)
DB_PATH=./warehouse.db
EOF
    echo -e "${GREEN}✅ .env 文件已创建${NC}"
    echo -e "${YELLOW}⚠️  请修改 JWT_SECRET 为更安全的随机字符串${NC}"
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
fi

# 构建后端
echo ""
echo "🔨 构建后端..."
npm run build
echo -e "${GREEN}✅ 后端构建完成${NC}"

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd $FRONTEND_DIR
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
else
    echo -e "${YELLOW}⚠️  依赖已存在，跳过安装${NC}"
fi

# 构建前端
echo ""
echo "🔨 构建前端..."
npm run build
echo -e "${GREEN}✅ 前端构建完成${NC}"

# 安装 PM2
echo ""
echo "📦 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "正在安装 PM2..."
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 安装完成${NC}"
else
    echo -e "${GREEN}✅ PM2 已安装${NC}"
fi

# 启动后端服务
echo ""
echo "🚀 启动后端服务..."
cd $BACKEND_DIR
pm2 delete warehouse-api 2>/dev/null || true
pm2 start dist/index.js --name warehouse-api
pm2 save
echo -e "${GREEN}✅ 后端服务已启动${NC}"

# 配置 PM2 开机自启
echo ""
echo "⚙️  配置 PM2 开机自启..."
pm2 startup | tail -1 | sudo bash || true
echo -e "${GREEN}✅ PM2 开机自启已配置${NC}"

# 检查 Nginx
echo ""
echo "🌐 检查 Nginx..."
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx 已安装${NC}"
    
    # 创建 Nginx 配置
    NGINX_CONF="/etc/nginx/sites-available/warehouse"
    if [ ! -f "$NGINX_CONF" ]; then
        echo "创建 Nginx 配置..."
        sudo tee $NGINX_CONF > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /opt/warehouse-management/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
        
        # 启用配置（Ubuntu/Debian）
        if [ -d "/etc/nginx/sites-enabled" ]; then
            sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/warehouse
        fi
        
        # 测试配置
        sudo nginx -t
        sudo systemctl restart nginx
        echo -e "${GREEN}✅ Nginx 配置完成${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx 配置已存在${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx 未安装，跳过配置${NC}"
    echo "前端服务将使用 PM2 在端口 5173 运行"
    
    # 使用 PM2 启动前端
    cd $FRONTEND_DIR
    npm install -g serve
    pm2 delete warehouse-frontend 2>/dev/null || true
    pm2 serve dist 5173 --name warehouse-frontend --spa
    pm2 save
    echo -e "${GREEN}✅ 前端服务已启动在端口 5173${NC}"
fi

# 配置防火墙
echo ""
echo "🔥 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo -e "${GREEN}✅ UFW 防火墙已配置${NC}"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo -e "${GREEN}✅ Firewalld 防火墙已配置${NC}"
else
    echo -e "${YELLOW}⚠️  未检测到防火墙工具，请手动配置${NC}"
fi

# 显示服务状态
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "📊 服务状态："
pm2 list
echo ""
echo "🌐 访问地址："
if command -v nginx &> /dev/null; then
    echo "  - http://你的服务器IP"
    echo "  - http://你的域名（如果已配置）"
else
    echo "  - http://你的服务器IP:5173"
fi
echo ""
echo "🔑 默认登录账号："
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "📝 常用命令："
echo "  pm2 list              # 查看服务状态"
echo "  pm2 logs              # 查看日志"
echo "  pm2 restart all       # 重启所有服务"
echo "  pm2 stop all          # 停止所有服务"
echo ""
echo -e "${YELLOW}⚠️  重要提醒：${NC}"
echo "  1. 首次登录后请立即修改管理员密码"
echo "  2. 定期备份数据库文件: $BACKEND_DIR/warehouse.db"
echo "  3. 建议配置 SSL 证书（HTTPS）"
echo ""

