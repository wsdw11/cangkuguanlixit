@echo off
chcp 65001 >nul
echo ====================================
echo   仓库管理系统 - 一键启动
echo ====================================
echo.
echo 正在启动后端和前端服务...
echo.
echo 注意：会打开两个窗口
echo - 一个窗口运行后端（端口 3000）
echo - 一个窗口运行前端（端口 5173）
echo.
echo 启动完成后，请在浏览器访问: http://localhost:5173
echo 默认账号: admin / admin123
echo.
pause

start "后端服务" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "前端服务" cmd /k "cd frontend && npm run dev"

echo.
echo 服务已启动！
echo 请查看新打开的窗口确认服务状态
echo.
pause

