@echo off
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

schtasks /create /tn "Industrial_Fire_Sentinel" /tr "\"%%START_SCRIPT%%\"" /sc onstart /ru "SYSTEM" /rl highest /f

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
