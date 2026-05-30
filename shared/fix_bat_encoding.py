import os

def fix_files():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    shared_dir = os.path.join(base_dir, "shared")
    
    start_system_path = os.path.join(shared_dir, "start_system.bat")
    install_service_path = os.path.join(shared_dir, "install_service.bat")
    
    start_system_content = """@echo off
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
start /b cmd /c "npm run dev > ..\\frontend_service.log 2>&1"
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
"""

    install_service_content = """@echo off
title Industrial AI Fire Sentinel - Windows Service Installer
color 0C

echo ===================================================
echo   Windows Auto-Start Service Installer (Task Scheduler)
echo   Purpose: Ensures automatic startup on power restoration without login.
echo ===================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please right-click this file and select "Run as administrator"!
    echo.
    pause
    exit /b
)

set BASE_DIR=%~dp0
set START_SCRIPT=%BASE_DIR%start_system.bat

echo Registering system startup task to Windows Task Scheduler...
echo Target Script: %START_SCRIPT%
echo.

schtasks /create /tn "Industrial_Fire_Sentinel" /tr "\\"%%START_SCRIPT%%\\"" /sc onstart /ru "SYSTEM" /rl highest /f

if %errorLevel% eq 0 (
    echo.
    echo ===================================================
    echo   SUCCESS! System registered as a Windows Service.
    echo   - Task Name: Industrial_Fire_Sentinel
    echo   - Trigger: On Server Boot / Power Restoration (No Login Required)
    echo   - Privilege: SYSTEM (Highest Privileges)
    echo   - You can manage this task anytime via Windows Task Scheduler.
    echo ===================================================
) else (
    echo Registration failed. Please check system permissions.
)

echo.
pause
"""

    # 強制使用 ascii 編碼寫入，不帶任何 BOM 簽章，也沒有 null byte (\x00)
    # 這能確保 100% 絕對相容 Windows CMD
    with open(start_system_path, "w", encoding="ascii", newline="\r\n") as f:
        f.write(start_system_content)
    print(f"成功以純 ASCII 編碼修正: {start_system_path}")
        
    with open(install_service_path, "w", encoding="ascii", newline="\r\n") as f:
        f.write(install_service_content)
    print(f"成功以純 ASCII 編碼修正: {install_service_path}")

if __name__ == "__main__":
    fix_files()
