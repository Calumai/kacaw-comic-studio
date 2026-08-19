@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0index.html"
  exit /b 0
)
start "圖像定位台服務" /min node "%~dp0server.js"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4173"
endlocal
