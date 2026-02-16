@echo off
cd /d "%~dp0"
echo Stopping any running Node processes to free the SWC file...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo Starting app...
node server.js
pause
