#!/bin/bash

# BUG终结智创营知识平台 - 部署脚本

echo "🚀 开始部署 BUG终结智创营知识平台后端..."

# 检查 Node.js 是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 MongoDB 是否已安装
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB 未安装，请先安装 MongoDB"
    exit 1
fi

# 检查 PM2 是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 安装依赖
echo "📦 安装依赖包..."
npm install

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，使用默认配置"
    echo "请确保 MongoDB 运行在默认端口 27017"
fi

# 创建上传目录
echo "📁 创建上传目录..."
mkdir -p uploads/images
mkdir -p uploads/documents
mkdir -p uploads/others

# 检查 MongoDB 是否运行
echo "🔍 检查 MongoDB 状态..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "🚀 启动 MongoDB..."
    sudo systemctl start mongod || mongod --fork --logpath /var/log/mongodb.log
fi

# 启动应用
echo "🚀 启动应用..."
if pm2 list | grep -q "bug-platform-backend"; then
    echo "📝 重启现有应用..."
    pm2 restart bug-platform-backend
else
    echo "📝 启动新应用..."
    pm2 start app.js --name "bug-platform-backend"
fi

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup | tail -1 | bash

echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 应用状态:"
pm2 status
echo ""
echo "🌐 API 地址: http://localhost:3000"
echo "📚 API 文档: http://localhost:3000/api"
echo "🔍 健康检查: http://localhost:3000/health"
echo ""
echo "📋 管理员账户:"
echo "   邮箱: admin@bugcamp.com"
echo "   密码: Admin123456"
echo "   ⚠️  请立即修改默认密码！"
echo ""
echo "📝 常用命令:"
echo "   查看日志: pm2 logs bug-platform-backend"
echo "   重启应用: pm2 restart bug-platform-backend"
echo "   停止应用: pm2 stop bug-platform-backend"
echo "   监控资源: pm2 monit"
