@echo off
title 工業級 NVR AI 火災與煙霧防禦監控系統 - 啟動腳本
color 0A

echo ===================================================
echo   🚨 工業級 NVR AI 火災與煙霧防禦監控系統 🚨
echo   部署模式: Windows 原生集中式 GPU 伺服器 (方案 B)
echo ===================================================
echo.

:: 偵測當前目錄
set BASE_DIR=%~dp0..
cd /d "%BASE_DIR%"

echo 1. 正在背景啟動 FastAPI 後端推理引擎...
start /b cmd /c "python backend/main.py > backend_service.log 2>&1"
timeout /t 3 > nul

echo 2. 正在背景啟動 React Vite 前端監控面板...
cd frontend
start /b cmd /c "npm run dev > ..\frontend_service.log 2>&1"
timeout /t 5 > nul

echo 3. 系統啟動成功！正在打開即時安全儀表板...
start http://localhost:5173

echo ===================================================
echo   🟢 監控系統已在背景 24/7 持續執行中。
echo   - 後端 API & WebSocket 埠: 8000
echo   - 前端 Web 儀表板埠: 5173
echo   - 關閉此視窗將停止本地服務
echo ===================================================
echo.
pause
