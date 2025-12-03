@echo off
chcp 65001 >nul
echo ====================================
echo   仓库管理系统 - 前端服务启动
echo ====================================
echo.

cd frontend

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

echo 正在启动前端服务...
echo 前端访问地址: http://localhost:5173
echo.
echo 启动完成后，请在浏览器访问: http://localhost:5173
echo 默认账号: admin / admin123
echo.
echo 按 Ctrl+C 可以停止服务
echo.

call npm run dev

pause

