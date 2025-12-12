@echo off
chcp 65001 >nul
echo ====================================
echo   上传代码到 GitHub
echo ====================================
echo.

cd /d %~dp0

echo 检查 Git 状态...
git status

echo.
echo 是否要上传到 GitHub？
echo 1. 如果还没添加远程仓库，请先执行：
echo    git remote add origin https://github.com/你的用户名/仓库名.git
echo.
echo 2. 如果已经添加，直接按任意键继续上传...
pause

echo.
echo 添加所有文件...
git add .

echo.
echo 请输入提交信息（描述这次修改）:
set /p commit_msg="提交信息: "

if "%commit_msg%"=="" (
    set commit_msg=更新代码
)

echo.
echo 提交代码...
git commit -m "%commit_msg%"

echo.
echo 推送到 GitHub...
git push

if %errorlevel% equ 0 (
    echo.
    echo ✅ 上传成功！
) else (
    echo.
    echo ❌ 上传失败！
    echo.
    echo 可能的原因：
    echo 1. 还没添加远程仓库
    echo 2. 需要登录 GitHub（使用 Personal Access Token）
    echo 3. 网络问题
    echo.
    echo 请检查错误信息并重试
)

echo.
pause

