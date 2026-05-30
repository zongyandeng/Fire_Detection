@echo off
title Industrial AI Fire Detection - Startup Script
color 0A

echo ===================================================
echo   Industrial AI Fire and Smoke Detection System
echo   Deployment: Windows On-Premise GPU Server (Scheme B)
echo ===================================================
echo.

set BASE_DIR=%~dp0..
cd /d "%BASE_DIR%"

echo [1/3] Starting FastAPI Backend Inference Engine...
start /b cmd /c "python backend/main.py > backend_service.log 2>&1"
timeout /t 3 > nul

echo [2/3] Starting React Vite Frontend Dashboard...
cd frontend
start /b cmd /c "npm run dev > ..\frontend_service.log 2>&1"
timeout /t 5 > nul

echo [3/3] System successfully started! Opening dashboard...
start http://localhost:5173

echo ===================================================
echo   System is running 24/7 in the background.
echo   - Backend API and WebSocket: Port 8000
echo   - Frontend Web Dashboard: Port 5173
echo   - Closing this window will stop local services.
echo ===================================================
echo.
pause
