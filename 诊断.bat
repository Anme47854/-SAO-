@echo off
cd /d "%~dp0"
set LOG=diagnose.log
echo ========================================== > %LOG%
echo SAO-UI demo diagnostic %date% %time% >> %LOG%
echo ========================================== >> %LOG%
echo [1] node -v: >> %LOG%
node -v >> %LOG% 2>&1
echo [2] npm -v: >> %LOG%
call npm -v >> %LOG% 2>&1
echo [3] node_modules exists? >> %LOG%
if exist node_modules echo YES >> %LOG%
if not exist node_modules echo NO >> %LOG%
echo [4] npm registry ping (sao-ui-beta): >> %LOG%
call npm view sao-ui-beta version >> %LOG% 2>&1
echo [5] npm install: >> %LOG%
call npm install --no-audit --no-fund >> %LOG% 2>&1
echo [6] vite version: >> %LOG%
call npx vite --version >> %LOG% 2>&1
echo [7] done >> %LOG%
echo.
echo Done. Please send the content of
echo     %cd%\%LOG%
echo to the assistant.
pause