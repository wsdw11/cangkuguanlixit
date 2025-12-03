#!/bin/bash

# 仓库管理系统 - 备份数据库脚本
# 使用方法: chmod +x 备份数据库.sh && ./备份数据库.sh

set -e

PROJECT_DIR="/opt/warehouse-management"
BACKEND_DIR="$PROJECT_DIR/backend"
BACKUP_DIR="/backup/warehouse"
DB_FILE="$BACKEND_DIR/warehouse.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 生成备份文件名
BACKUP_FILE="$BACKUP_DIR/warehouse-$(date +%Y%m%d-%H%M%S).db"

# 检查数据库文件
if [ ! -f "$DB_FILE" ]; then
    echo "❌ 数据库文件不存在: $DB_FILE"
    exit 1
fi

# 备份数据库
echo "📦 正在备份数据库..."
cp $DB_FILE $BACKUP_FILE

# 压缩备份文件
echo "🗜️  正在压缩备份..."
gzip $BACKUP_FILE

echo "✅ 备份完成: $BACKUP_FILE.gz"

# 删除7天前的备份
echo "🧹 清理旧备份（保留7天）..."
find $BACKUP_DIR -name "warehouse-*.db.gz" -mtime +7 -delete

echo "✅ 备份任务完成"

