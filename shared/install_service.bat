@echo off
title 工業級 NVR AI 監控系統 - Windows 開機自啟動服務註冊工具
color 0C

echo ===================================================
echo   🛠️  Windows 開機自啟動服務安裝程式 (Task Scheduler 版) 🛠️
echo   用途: 解決工廠停電重啟後，系統無須用戶登入即可在背景自動監控
echo ===================================================
echo.

:: 檢查管理員權限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 錯誤: 請右鍵點擊此檔案，選擇「以系統管理員身分執行」！
    echo.
    pause
    exit /b
)

:: 取得 start_system.bat 的絕對路徑
set BASE_DIR=%~dp0
set START_SCRIPT=%BASE_DIR%start_system.bat

echo 正在將監控系統註冊為 Windows 開機自啟動任務...
echo 執行目標: %START_SCRIPT%
echo.

:: 使用 schtasks 建立開機自啟動任務，以最高權限 (SYSTEM) 在開機時 (ONSTART) 背景執行
schtasks /create /tn "Industrial_Fire_Sentinel" /tr "\"%START_SCRIPT%\"" /sc onstart /ru "SYSTEM" /rl highest /f

if %errorLevel% eq 0 (
    echo.
    echo ===================================================
    echo   🟢 註冊成功！系統已登錄為 Windows 系統服務。
    echo   - 任務名稱: Industrial_Fire_Sentinel
    echo   - 觸發條件: 伺服器主機通電開機時 (無須用戶登入)
    echo   - 權限層級: 系統最高權限 (SYSTEM)
    echo   - 您隨時可在 Windows 「工作排程器」中管理此任務
    echo ===================================================
) else (
    echo ❌ 註冊失敗，請檢查系統權限。
)

echo.
pause
