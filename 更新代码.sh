#!/bin/bash

# 仓库管理系统 - 更新代码脚本
# 使用方法: chmod +x 更新代码.sh && ./更新代码.sh

set -e

echo "=========================================="
echo "  仓库管理系统 - 更新代码"
echo "=========================================="
echo ""

PROJECT_DIR="/opt/warehouse-management"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# 如果使用 Git，拉取最新代码
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull
    echo "✅ 代码更新完成"
else
    echo "⚠️  未检测到 Git，请手动更新代码"
fi

# 更新后端依赖
echo ""
echo "📦 更新后端依赖..."
cd $BACKEND_DIR
npm install --production

# 重新构建后端
echo ""
echo "🔨 重新构建后端..."
npm run build

# 更新前端依赖
echo ""
echo "📦 更新前端依赖..."
cd $FRONTEND_DIR
npm install

# 重新构建前端
echo ""
echo "🔨 重新构建前端..."
npm run build

# 重启服务
echo ""
echo "🔄 重启服务..."
pm2 restart warehouse-api
if pm2 list | grep -q warehouse-frontend; then
    pm2 restart warehouse-frontend
fi

# 重启 Nginx（如果使用）
if command -v nginx &> /dev/null; then
    echo "🔄 重启 Nginx..."
    sudo systemctl restart nginx
fi

echo ""
echo "=========================================="
echo "  更新完成！"
echo "=========================================="
echo ""
echo "📊 服务状态："
pm2 list
echo ""

