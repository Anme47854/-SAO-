@echo off
title SAO-UI Demo Launcher
cd /d "%~dp0"
echo ============================================
echo    SAO-UI Demo Launcher
echo ============================================
echo.
echo [check] Node.js version:
node -v >nul 2>&1
if errorlevel 1 goto noNode
call npm -v
echo.
if exist node_modules goto start
echo [1/2] First run: installing dependencies ...
echo        If it is slow, try:  npm config set registry https://registry.npmmirror.com
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto installFail
:start
echo.
echo [2/2] Starting dev server (browser opens automatically) ...
echo       Keep this window open. Press Ctrl+C to stop.
echo.
call npm run dev
pause
exit /b 0

:noNode
echo.
echo [ERROR] Node.js was not found. Please install Node.js LTS 16+:
echo         https://nodejs.org/zh-cn
echo   Then run this file again.
pause
exit /b 1

:installFail
echo.
echo [ERROR] npm install failed. Details written to npm-install-error.log
call npm install --no-audit --no-fund > npm-install-error.log 2>&1
echo.
echo Tips:
echo   1. Check Node:     node -v
echo   2. Try mirror:     npm config set registry https://registry.npmmirror.com
echo   3. Delete node_modules and retry
pause
exit /b 1