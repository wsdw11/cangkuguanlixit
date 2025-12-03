@echo off
chcp 65001 >nul
echo ====================================
echo   仓库管理系统 - 安装依赖
echo ====================================
echo.
echo 正在安装后端依赖...
echo 这可能需要几分钟，请耐心等待...
echo.

cd backend
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ 后端依赖安装失败！
    echo 请检查网络连接或尝试使用国内镜像：
    echo npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)

echo.
echo ✅ 后端依赖安装完成！
echo.
echo 正在安装前端依赖...
echo 这可能需要几分钟，请耐心等待...
echo.

cd ../frontend
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ 前端依赖安装失败！
    echo 请检查网络连接或尝试使用国内镜像：
    echo npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)

echo.
echo ✅ 前端依赖安装完成！
echo.
echo ====================================
echo   所有依赖安装完成！
echo ====================================
echo.
echo 下一步：
echo 1. 确保 backend 文件夹中有 .env 文件
echo 2. 双击"启动后端.bat"启动后端服务
echo 3. 双击"启动前端.bat"启动前端服务
echo 或者直接双击"一键启动.bat"
echo.
pause

