@echo off
chcp 65001 >nul
echo ====================================
echo   仓库管理系统 - 后端服务启动
echo ====================================
echo.

cd backend

echo 正在检查配置文件...
if not exist ".env" (
    echo 未找到 .env 文件，正在创建...
    copy .env.example .env >nul 2>&1
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✅ 已创建 .env 文件
    ) else (
        echo PORT=3000 > .env
        echo JWT_SECRET=my-warehouse-secret-key-2024 >> .env
        echo DB_PATH=./warehouse.db >> .env
        echo ✅ 已创建 .env 文件
    )
    echo.
)

echo 正在检查依赖...
if not exist "node_modules" (
    echo 依赖未安装，正在安装...
    echo 这可能需要几分钟，请耐心等待...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖安装失败！
        echo 请检查网络连接，或运行"安装依赖.bat"
        pause
        exit /b 1
    )
    echo.
)

echo 正在启动后端服务...
echo 后端服务地址: http://localhost:3000
echo.
echo 按 Ctrl+C 可以停止服务
echo.

call npm run dev

pause

