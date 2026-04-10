#!/bin/bash

# ==============================================================================
# AI Spy - 统一本地部署脚本 (Admin & Frontend & Backend)
# ==============================================================================

set -e

echo "🚀 开始进行 AI Spy 本机全栈部署 (含管理后台)..."

# 1. 启动周边服务 (PostgreSQL, Redis)
echo "📦 1. 启动基础设施 (PostgreSQL & Redis)..."
cd backend
docker-compose up -d
cd ..

# 2. 编译并打包普通用户端前端 (C端)
echo "🌐 2. 构建前端 (Frontend) 生产资源..."
cd frontend
npm install
npm run build
cd ..

# 3. 编译并打包管理后台端 (Admin Panel)
echo "🛡️ 3. 构建管理后台 (Admin Panel) 生产资源..."
cd admin-panel
npm install
npm run build
cd ..

# 4. 启动 Node.js 后端服务 (承载 API 与 静态资源托管)
echo "⚙️ 4. 启动后端服务 (Backend Proxy & APIs)..."
cd backend
npm install
npx prisma generate
npm run build

echo "✅ 部署完成！正在启动主服务..."
echo ""
echo "======================================================="
echo "🌟 AI Spy 本地环境已启动"
echo "-------------------------------------------------------"
echo "👉 【C端普通用户入口】: http://localhost:3000/"
echo "👉 【Admin超管后台入口】: http://localhost:3000/admin"
echo "   (测试环境默认超管防爆破密码: secret)"
echo "======================================================="
echo ""

# 清理占用 3000 端口的旧进程
kill -9 $(lsof -t -i:3000) 2>/dev/null || true

# 启动服务并挂起
npm run dev
