@echo off
title SAO-UI EXE Builder
cd /d "%~dp0"
echo ============================================
echo    SAO Menu EXE Builder (single portable exe)
echo ============================================
echo.
if exist node_modules goto install
echo [1/3] Installing dependencies (first run, may take a while) ...
echo        If download is slow:  npm config set registry https://registry.npmmirror.com
call npm install
if errorlevel 1 goto fail
goto build
:install
echo [1/3] Updating dependencies (npm install) ...
call npm install
if errorlevel 1 goto fail
:build
echo [2/3] Building web app (dist/index.html + dist/menu.html) ...
call npm run build
if errorlevel 1 goto fail
echo [3/3] Packaging Windows portable EXE ...
echo        First run downloads Electron runtime (~100MB), please wait.
call npm run dist:win
if errorlevel 1 goto fail
echo.
echo ============================================
echo    DONE!  Portable EXE is in:
echo        %cd%\release\
echo    Launch it directly, no installation needed.
echo ============================================
pause
exit /b 0
:fail
echo.
echo [ERROR] Build failed. Please read the messages above.
echo   Common causes:
echo     1. No network or slow network (use npm mirror, then retry)
echo     2. Antivirus blocked Electron download
echo     3. Node.js too old (need 16+)
pause
exit /b 1