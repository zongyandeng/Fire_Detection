# 🚨 工業級 NVR AI 整合式火災與煙霧防禦監控系統 (Industrial Fire Sentinel)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Node: v24](https://img.shields.io/badge/Node-v24-green.svg)](https://nodejs.org/)

本系統是一套專為**真實工業現場、無人值守機房、配電盤櫃等高風險資產**設計的整合式 AI 雙重偵測與防禦連鎖系統。

為在有限經費下達到最大效益，系統採用 **方案 B (本地中階 GPU 伺服器 - 如 RTX 4060 Ti 16GB)** 集中式架構。相較於散落各處且無法本地二次微調的邊緣運算盒子 (方案 A)，方案 B 可**省下 50% 以上的硬體成本**，並具備極高的偵測精度與極低的維護複雜度。

---

## 🌟 核心技術特色

本系統打破了傳統單一 AI 辨識的局限，採用 **「AI 推理 + 經典影像物理分析」** 的雙重驗證架構，專門攻克工業現場因反光衣、焊花或粉塵引發的誤報痛點。

### 1. 二階段火焰物理驗證 (Flame Double Verification)
* **色彩空間分析 (YCbCr/HSI)**：提取 Bounding Box 內高溫發光體的 YCbCr 分量，利用 $Y > Cb$ 且 $Cr > Cb$ 與飽和度/色調區間，過濾非火災發光體。
* **分形幾何圓度分析**：計算火焰輪廓的鋸齒狀不規則度，排除圓滑的黃色物件。
* **閃爍頻率追蹤 (5Hz ~ 10Hz)**：記錄疑似區域亮度擺動，計算震盪頻率，排除穩定的狀態 LED 燈或金屬反光。

### 2. 二階段煙霧物理驗證 (Smoke Double Verification)
* **拉普拉斯高頻損失分析 (Texture Blurring)**：計算局部拉普拉斯變異數。煙霧籠罩處會使背景邊緣模糊，高頻資訊損失，藉此有效區分粉塵與真實煙霧。
* **時空浮力與體積膨脹追蹤**：追蹤多幀內煙霧重心與面積變化。符合物理規律的煙霧必須呈現重心向上移（buoyancy）且面積擴散變大（expansion）的趨勢。

### 3. 三合一無人值守自動通報
* **10 秒決策倒計時**：疑似火警觸發時，系統啟動聲光警示並進入 10 秒倒數。若倒數結束無人工排除，自動判定為真實火警。
* **分勵脫扣器 (Shunt Trip) 斷電連鎖**：自動切斷故障區域機台電源，實施主動防禦防範災害擴大。
* **行動端多媒體推送 (黃金三元素)**：向行動端同時推送：**文字元數據**、**帶紅色 YOLO 框的現場截圖**，以及**實時監控串流超連結**。

---

## 🛠️ 真實工廠部署的「工業級防護細節」

為確保系統能在工廠 24/7 穩健運作，我們特別為您設計了以下細節：
* **自啟動防護 (Power Fail-Safe & Auto-Start)**：將程式打包註冊為 Windows 開機服務，伺服器若因電網不穩斷電重啟，無須用戶登入即可自動在背景重新拉起監控。
* **日夜瞬態切換過濾 (Day-Night Filter)**：當攝影機因日夜交替切換紅外線濾光片時，畫面會瞬間劇烈閃爍。系統會自動偵測全域亮度驟變並暫停判定 3 秒，徹底免除切換瞬間的誤報。
* **GPU 遙測與自適應降載保護 (Thermal Throttling)**：若工廠機房夏天散熱不良，顯示卡溫度達到 85°C 時，AI 推理會自動從 15FPS 降載至 5FPS 運行以降溫，保障「降載運作而不當機」，避免監控空窗。
* **告警容量循環覆寫清理 (Storage Quota)**：設定儲存目錄上限（如 30MB），超額時自動循環刪除最舊的告警片段，防止硬碟空間塞爆導致 Windows 崩潰。

---

## 📐 系統目錄結構

```
Fire_Detection/
├── backend/                  # FastAPI 後端 (Windows 原生運行)
│   ├── core/
│   │   ├── detector.py       # AI 推理 + 火焰/煙霧雙重特徵驗證 (含瞬態過濾)
│   │   ├── stream.py         # 15FPS 串流模擬器 (CBR 固定碼率模擬)
│   │   ├── telemetry.py      # GPU 遙測模組 (實體 NVML 與系統模擬)
│   │   ├── notifier.py       # 通用推送適配器 (Email/Discord Webhook/TG)
│   │   └── storage.py        # 告警儲存容量自動循環清理器
│   └── main.py               # FastAPI 入口與 WebSocket 服務
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── App.jsx           # 玻璃擬態極致深色監控儀表板 (含手機推送模擬器)
│   │   └── index.css         # 霓虹配色變數與警報脈衝光效
│   └── package.json
└── shared/
    ├── generate_synthetic_video.py  # 1080P/15FPS 工廠起火/煙霧模擬影片產生器
    ├── start_system.bat      # 系統一鍵啟動腳本 (背景啟動前後端)
    └── install_service.bat   # Windows 開機自啟動服務註冊工具
```

---

## ⚡ 快速開始與體驗

### 1. 安裝環境要求
* 系統環境：Windows 10 / 11 原生系統。
* 後端環境：Python 3.12 (需安裝 `fastapi`, `opencv-python`, `numpy`, `ultralytics`, `torch`, `uvicorn`, `websockets`)。
* 前端環境：Node.js v24 及以上。

### 2. 一鍵啟動與演示
1. 前往 `shared/` 目錄。
2. 雙擊執行 [start_system.bat](shared/start_system.bat) 腳本。
3. 系統將會自動在背景啟動 FastAPI 後端與 React 前端，並會自動為您打開瀏覽器網頁儀表板（預設網址為 `http://localhost:5173`）。
4. **體驗過熱降載**：在網頁儀表板上點擊「模擬 GPU 過熱降載」，可觀看 GPU 溫度升到 86°C 後，影像自動降載為 5 FPS 運作的完整過程。
5. **體驗無人值守**：等待影片播放至起火，無人操作下 10 秒倒數歸零，觀察分勵脫扣器自動斷電，以及手機模擬器彈出 Discord/Email 推送。

### 3. 開機自動執行部署
* 在工廠實體伺服器上，右鍵點擊 [install_service.bat](shared/install_service.bat) 並選擇 **「以系統管理員身分執行」**，即可將本系統登錄為 Windows 本地最高權限自啟動服務。

---

## 📄 開源授權
本專案採用 [MIT License](LICENSE) 授權。
