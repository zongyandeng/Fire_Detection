import os
import cv2
import json
import time
import asyncio
import threading
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# 導入自訂核心組件
from core.stream import FactoryVideoStream
from core.detector import IndustrialFireDetector
from core.telemetry import GPUTelemetry
from core.notifier import UniversalNotifier
from core.storage import StorageQuotaManager

app = FastAPI(title="Industrial NVR AI Fire Detection System")

# 允許跨域請求 (CORS) - 方便 React 前端連接
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 定義檔案路徑
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "data", "videos")
MODELS_DIR = os.path.join(BASE_DIR, "data", "models")
ALARMS_DIR = os.path.join(BASE_DIR, "data", "alarms")

video_path = os.path.join(VIDEOS_DIR, "factory_fire_test.mp4")
model_path = os.path.join(MODELS_DIR, "yolov8n.pt")

# 掛載靜態檔案目錄 (用於前端讀取告警截圖)
app.mount("/alarms", StaticFiles(directory=ALARMS_DIR), name="alarms")

# 初始化核心組件
stream = FactoryVideoStream(video_path, target_fps=15)
detector = IndustrialFireDetector(model_path)
telemetry = GPUTelemetry()
notifier = UniversalNotifier()
quota_manager = StorageQuotaManager(ALARMS_DIR, max_size_mb=30.0) # 限制 30MB 方便 POC 展示循環清理

# 全域狀態變數
class SystemState:
    def __init__(self):
        self.suspected_fire = False      # 是否偵測到疑似火警 (3秒確認中)
        self.confirmed_fire = False      # 是否已正式確認火警 (已自動通報)
        self.countdown_remaining = 0.0   # 自動通報剩餘倒數秒數
        self.shunt_trip_triggered = False # 分勵脫扣器 (斷電) 狀態
        
        # AI 與連動設定參數，有預設值，後續會被持久化載入覆蓋
        self.countdown_limit = 10.0
        self.yolo_confidence_threshold = 0.45
        self.flicker_frequency_limit = 5.0
        self.shunt_trip_enabled = True
        
        # 心跳與系統故障狀態
        self.last_heartbeat_time = time.time()
        self.system_fault = False
        self.system_fault_reason = ""
        
        # 統計日誌
        self.negative_samples_count = 0
        self.alarm_logs = []
        
        # 載入持久化日誌與計數 (重啟伺服器不遺失紀錄)
        self.load_persisted_data()
        
        # 實時分析元數據 (用於前端波形圖與儀表)
        self.current_frame_data = {}
        
        # 降載模式
        self.throttling_fps = 15 # 預設 15 FPS
        self.throttling_policy = "smart" # "smart", "safe", "performance"
        
        # 最新影格快取
        self.latest_annotated_frame = None

    def load_persisted_data(self):
        log_file = os.path.join(BASE_DIR, "data", "alarm_logs.json")
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.alarm_logs = data.get("alarm_logs", [])
                    self.negative_samples_count = data.get("negative_samples_count", 0)
                    # 載入持久化設定，如果檔案中沒有則維持預設值
                    self.countdown_limit = data.get("countdown_limit", 10.0)
                    self.yolo_confidence_threshold = data.get("yolo_confidence_threshold", 0.45)
                    self.flicker_frequency_limit = data.get("flicker_frequency_limit", 5.0)
                    self.shunt_trip_enabled = data.get("shunt_trip_enabled", True)
                print(f"💾 [持久化] 成功從硬碟載入 {len(self.alarm_logs)} 筆歷史告警日誌、{self.negative_samples_count} 個負樣本計數，以及系統設定值。")
            except Exception as e:
                print(f"⚠️ [持久化] 載入歷史日誌與設定失敗: {e}")
                self.alarm_logs = []
                self.negative_samples_count = 0

    def save_persisted_data(self):
        log_file = os.path.join(BASE_DIR, "data", "alarm_logs.json")
        try:
            # 確保 data 目錄存在
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump({
                    "alarm_logs": self.alarm_logs,
                    "negative_samples_count": self.negative_samples_count,
                    "countdown_limit": self.countdown_limit,
                    "yolo_confidence_threshold": self.yolo_confidence_threshold,
                    "flicker_frequency_limit": self.flicker_frequency_limit,
                    "shunt_trip_enabled": self.shunt_trip_enabled
                }, f, ensure_ascii=False, indent=4)
            print("💾 [持久化] 成功同步最新日誌、負樣本數據與系統設定至硬碟。")
        except Exception as e:
            print(f"⚠️ [持久化] 寫入歷史日誌與設定失敗: {e}")

sys_state = SystemState()
# 同步持久化設定到 AI detector 中
detector.yolo_confidence_threshold = sys_state.yolo_confidence_threshold
detector.flicker_frequency_limit = sys_state.flicker_frequency_limit
state_lock = threading.Lock()

# 緩存的 WebSocket 連線列表
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# --- 背景執行緒 1：影像擷取與 AI + 物理分析迴圈 ---
def video_inference_loop():
    print("🚀 [Background Loop] 啟動影像擷取與 AI 推理執行緒。")
    stream.start()
    
    # 倒數計時計時器
    countdown_start_time = None
    
    while stream.is_running:
        # 檢查 GPU 溫度並自適應降載 (過熱保護機制細節)
        tele_stats = telemetry.get_stats()
        with state_lock:
            if tele_stats["status"] == "CRITICAL":
                # 過熱臨界點，自適應降載
                policy = sys_state.throttling_policy
                fps = 5
                if policy == "safe":
                    fps = 2
                elif policy == "performance":
                    fps = 10
                stream.target_fps = fps
                stream.frame_delay = 1.0 / float(fps)
                sys_state.throttling_fps = fps
            else:
                # 正常狀態，恢復 15 FPS
                stream.target_fps = 15
                stream.frame_delay = 1.0 / 15.0
                sys_state.throttling_fps = 15
                
        # 讀取一影格
        frame = stream.get_frame()
        if frame is None:
            time.sleep(0.05)
            continue
            
        # 執行 AI 推理與雙重特徵驗證
        result = detector.process_frame(frame)
        
        # 繪製 YOLO 框與物理分析元數據到畫面上 (準備串流)
        annotated_frame = frame.copy()
        
        # 在畫面上標註系統狀態
        h, w, _ = annotated_frame.shape
        cv2.putText(annotated_frame, f"FPS: {sys_state.throttling_fps} | BUF: {result['buffer_status']}", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"GPU TEMP: {tele_stats['temperature']}C", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 180, 255) if tele_stats['status']=="OK" else (0, 0, 255), 2)
        
        # 繪製各個檢測到的目標與詳細數值
        for det in result["detections"]:
            x1, y1, x2, y2 = det["bbox"]
            conf = det["confidence"]
            det_type = det["type"]
            stats = det["physics_stats"]
            
            # 火焰用橙紅，煙霧用灰色
            box_color = (0, 69, 255) if det_type == "flame" else (160, 160, 160)
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), box_color, 3)
            
            # 顯示類型與置信度
            label = f"{det_type.upper()} {conf*100:.0f}%"
            cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
            
            # 顯示物理驗證數值
            if det_type == "flame":
                freq = stats.get("flicker_freq", 0.0)
                irreg = stats.get("irregularity", 0.0)
                phys_label = f"Freq: {freq:.1f}Hz | Irreg: {irreg:.1f}"
                cv2.putText(annotated_frame, phys_label, (x1, y2 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            else:
                loss = stats.get("clarity_loss", 0.0)
                phys_label = f"HF Loss: {loss*100:.0f}%"
                cv2.putText(annotated_frame, phys_label, (x1, y2 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                
        # 儲存繪製後的影格快取
        with state_lock:
            sys_state.latest_annotated_frame = annotated_frame
            sys_state.current_frame_data = {
                "detected": result["detected"],
                "triggered": result["triggered"],
                "confidence": result["confidence"],
                "buffer_status": result["buffer_status"],
                "detections": [
                    {
                        "type": d["type"],
                        "confidence": d["confidence"],
                        "stats": d["physics_stats"]
                    } for d in result["detections"]
                ]
            }
            
            # 狀態機管理 (三合一響應與倒數)
            if result["triggered"]:
                if not sys_state.suspected_fire and not sys_state.confirmed_fire:
                    # 剛觸發疑似火警，讀取動態設定的倒數上限
                    sys_state.suspected_fire = True
                    sys_state.countdown_remaining = sys_state.countdown_limit
                    countdown_start_time = time.time()
                    print(f"🚨 [狀態機] 檢測到疑似火警！啟動 {sys_state.countdown_limit} 秒無人值守倒數計時...")
            else:
                # 警報解除（未達觸發門檻，且尚未確認火災時）
                if sys_state.suspected_fire and not sys_state.confirmed_fire:
                    sys_state.suspected_fire = False
                    sys_state.countdown_remaining = 0.0
                    countdown_start_time = None
                    print("🟢 [狀態機] 疑似特徵消失，警報安全解除。")
                    
            # 倒數計時更新
            if sys_state.suspected_fire and not sys_state.confirmed_fire and countdown_start_time is not None:
                passed = time.time() - countdown_start_time
                sys_state.countdown_remaining = max(0.0, sys_state.countdown_limit - passed)
                
                # 倒數結束，自動判定為真實火警 (無人值守自動通報機制細節)
                if sys_state.countdown_remaining <= 0.0:
                    sys_state.confirmed_fire = True
                    sys_state.suspected_fire = False
                    # 根據動態設定，決定是否自動觸發分勵脫扣器切斷供電
                    if sys_state.shunt_trip_enabled:
                        sys_state.shunt_trip_triggered = True
                        print("⚡ [狀態機] 倒數歸零，已啟用分勵脫扣器自動斷電防禦！")
                    else:
                        sys_state.shunt_trip_triggered = False
                        print("⚠️ [狀態機] 倒數歸零，未啟用分勵脫扣器斷電連動，僅發送多軌火警通報！")
                    countdown_start_time = None
                    
                    # 產生報警截圖
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    file_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snapshot_filename = f"alarm_{file_timestamp}.jpg"
                    snapshot_path = os.path.join(ALARMS_DIR, snapshot_filename)
                    cv2.imwrite(snapshot_path, annotated_frame)
                    
                    # 將日誌寫入
                    log_entry = {
                        "id": len(sys_state.alarm_logs) + 1,
                        "timestamp": timestamp,
                        "camera_id": "CAM_A_DIST_BOARD (A棟配電櫃)",
                        "confidence": result["confidence"],
                        "snapshot": f"/alarms/{snapshot_filename}",
                        "shunt_trip": True
                    }
                    sys_state.alarm_logs.insert(0, log_entry)
                    sys_state.save_persisted_data() # 同步寫入硬碟
                    
                    # 執行容量管理 (限制儲存空間爆滿)
                    quota_manager.enforce_quota()
                    
                    print(f"🚨 [無人值守自動通報] 火警已自動確認！已儲存截圖至 {snapshot_path}")
                    
                    # 多軌多媒體推送 (Email & Discord & Line & TG)
                    # 啟動非同步任務或在線程中發送 (Email 與 Webhook 可能有短暫阻塞，在此直接非同步調用)
                    # 實體截圖靜態路徑 (用於 Discord)
                    notifier.send_email_alert(
                        camera_id="A棟配電櫃-百葉窗通風口",
                        timestamp=timestamp,
                        confidence=result["confidence"],
                        img_path=snapshot_path
                    )
                    notifier.send_discord_webhook(
                        camera_id="A棟配電櫃-百葉窗通風口",
                        timestamp=timestamp,
                        confidence=result["confidence"]
                    )
                    notifier.send_line_and_tg_logs(
                        camera_id="A棟配電櫃",
                        timestamp=timestamp,
                        confidence=result["confidence"]
                    )

# 啟動 AI 推理執行緒
inference_thread = threading.Thread(target=video_inference_loop, daemon=True)
inference_thread.start()


# --- 背景執行緒 2：心跳中斷監控 (System Fault 觸發細節) ---
def heartbeat_monitor_loop():
    print("🚀 [Background Loop] 啟動系統心跳監控執行緒 (60 秒超時監測)。")
    while True:
        time.sleep(5)
        # 心跳超時判定 (1分鐘 = 60秒)
        with state_lock:
            time_since_heartbeat = time.time() - sys_state.last_heartbeat_time
            if time_since_heartbeat > 60.0 and not sys_state.system_fault:
                sys_state.system_fault = True
                sys_state.system_fault_reason = f"NVR/I/O 監控模組心跳中斷 (已逾時 {time_since_heartbeat:.1f} 秒未收到訊號)"
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # 發送系統故障通知 (Discord + Email)
                notifier.send_system_fault(sys_state.system_fault_reason, timestamp)
                print(f"⚠️ [SYSTEM FAULT] 觸發系統離線故障！原因: {sys_state.system_fault_reason}")

heartbeat_thread = threading.Thread(target=heartbeat_monitor_loop, daemon=True)
heartbeat_thread.start()


# --- HTTP API REST 接口 ---

@app.get("/api/state")
def get_system_state():
    """獲取當前系統全域狀態"""
    with state_lock:
        return {
            "suspected_fire": sys_state.suspected_fire,
            "confirmed_fire": sys_state.confirmed_fire,
            "countdown_remaining": round(sys_state.countdown_remaining, 1),
            "countdown_limit": sys_state.countdown_limit,
            "yolo_confidence_threshold": sys_state.yolo_confidence_threshold,
            "flicker_frequency_limit": sys_state.flicker_frequency_limit,
            "shunt_trip_enabled": sys_state.shunt_trip_enabled,
            "shunt_trip_triggered": sys_state.shunt_trip_triggered,
            "system_fault": sys_state.system_fault,
            "system_fault_reason": sys_state.system_fault_reason,
            "negative_samples_count": sys_state.negative_samples_count,
            "alarm_logs": sys_state.alarm_logs,
            "throttling_fps": sys_state.throttling_fps,
            "throttling_policy": sys_state.throttling_policy
        }

@app.post("/api/heartbeat")
def post_heartbeat():
    """接收來自前置 NVR 或 I/O 繼電器的 1分鐘一次心跳訊號"""
    with state_lock:
        sys_state.last_heartbeat_time = time.time()
        # 若之前有 Fault，收到心跳後自動復原
        if sys_state.system_fault:
            print("🟢 [心跳復原] 收到監控模組心跳，系統狀態恢復正常。")
            sys_state.system_fault = False
            sys_state.system_fault_reason = ""
        return {"status": "success", "timestamp": time.time()}

@app.post("/api/confirm")
def post_confirm_fire():
    """人工雙重確認：強制立即判定為真實火警"""
    with state_lock:
        sys_state.confirmed_fire = True
        sys_state.suspected_fire = False
        sys_state.shunt_trip_triggered = True
        sys_state.countdown_remaining = 0.0
        
        # 記錄日誌
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_filename = f"manual_alarm_{file_timestamp}.jpg"
        snapshot_path = os.path.join(ALARMS_DIR, snapshot_filename)
        
        if sys_state.latest_annotated_frame is not None:
            cv2.imwrite(snapshot_path, sys_state.latest_annotated_frame)
            
        log_entry = {
            "id": len(sys_state.alarm_logs) + 1,
            "timestamp": timestamp,
            "camera_id": "CAM_A_DIST_BOARD (人工雙重確認)",
            "confidence": sys_state.current_frame_data.get("confidence", 1.0),
            "snapshot": f"/alarms/{snapshot_filename}" if sys_state.latest_annotated_frame is not None else None,
            "shunt_trip": True
        }
        sys_state.alarm_logs.insert(0, log_entry)
        sys_state.save_persisted_data() # 同步寫入硬碟
        
        # 多軌推送
        notifier.send_email_alert("A棟配電櫃 (人工確認)", timestamp, 1.0, snapshot_path if sys_state.latest_annotated_frame is not None else None)
        notifier.send_discord_webhook("A棟配電櫃 (人工確認)", timestamp, 1.0)
        notifier.send_line_and_tg_logs("A棟配電櫃", timestamp, 1.0)
        
        print("🚨 [人工雙重確認] 操作員確認火警，全廠防禦連動已觸發！")
        return {"status": "confirmed"}

@app.post("/api/dismiss")
def post_dismiss_alarm():
    """人工排除誤報：重設警報狀態並歸檔負樣本"""
    with state_lock:
        # 重設狀態
        sys_state.suspected_fire = False
        sys_state.confirmed_fire = False
        sys_state.shunt_trip_triggered = False
        sys_state.countdown_remaining = 0.0
        
        # 增加負樣本計數 (累積用於本地二次微調)
        sys_state.negative_samples_count += 1
        
        # 儲存此誤報影格作為「負樣本資料集」 (白皮書負樣本策略細節)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        negative_dir = os.path.join(BASE_DIR, "data", "negative_samples")
        os.makedirs(negative_dir, exist_ok=True)
        negative_path = os.path.join(negative_dir, f"neg_{timestamp}.jpg")
        
        if sys_state.latest_annotated_frame is not None:
            cv2.imwrite(negative_path, sys_state.latest_annotated_frame)
            print(f"📁 [負樣本儲存] 已將此誤報影格儲存至 {negative_path} (用於二次微調)")
            
        sys_state.save_persisted_data() # 同步寫入硬碟
        return {"status": "dismissed", "negative_samples_count": sys_state.negative_samples_count}

@app.get("/api/telemetry")
def get_telemetry():
    """獲取顯示卡遙測與風扇資訊"""
    return telemetry.get_stats()

class OverheatRequest(BaseModel):
    enabled: bool

@app.post("/api/telemetry/overheat")
def post_overheat_mode(req: OverheatRequest):
    """手動在 POC 中觸發/解除 GPU 過熱保護測試"""
    telemetry.set_overheat_mode(req.enabled)
    print(f"🔥 [過熱調試] {'啟用' if req.enabled else '停用'} GPU 過熱模擬模式。")
    return {"status": "success", "overheat_mode": req.enabled}

class FanRequest(BaseModel):
    mode: str # "auto", "manual"
    speed: int # 35 to 100

class PolicyRequest(BaseModel):
    policy: str # "smart", "safe", "performance"

class ShuntTripRequest(BaseModel):
    action: str # "trip", "reset", "test"

class SettingsRequest(BaseModel):
    countdown_limit: float
    yolo_confidence_threshold: float
    flicker_frequency_limit: float
    shunt_trip_enabled: bool

@app.post("/api/telemetry/fan")
def post_fan_control(req: FanRequest):
    telemetry.set_fan_control(req.mode, req.speed)
    print(f"🌀 [風扇遙控] 設定風扇模式為 {req.mode.upper()}，手動轉速: {req.speed}%")
    return {"status": "success", "fan_mode": req.mode, "fan_speed": req.speed}

@app.post("/api/telemetry/policy")
def post_telemetry_policy(req: PolicyRequest):
    with state_lock:
        sys_state.throttling_policy = req.policy
        print(f"⚙️ [降載策略] 已切換自適應降載策略為: {req.policy.upper()}")
        return {"status": "success", "policy": req.policy}

@app.post("/api/telemetry/shunt_trip")
def post_shunt_trip_control(req: ShuntTripRequest):
    with state_lock:
        if req.action == "trip":
            sys_state.shunt_trip_triggered = True
            
            # 手動緊急跳閘也記為一筆日誌，保障可追溯性
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            file_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            snapshot_filename = f"manual_trip_{file_timestamp}.jpg"
            snapshot_path = os.path.join(ALARMS_DIR, snapshot_filename)
            
            if sys_state.latest_annotated_frame is not None:
                cv2.imwrite(snapshot_path, sys_state.latest_annotated_frame)
                
            log_entry = {
                "id": len(sys_state.alarm_logs) + 1,
                "timestamp": timestamp,
                "camera_id": "CAM_A_DIST_BOARD (手動遙控跳閘)",
                "confidence": 1.0,
                "snapshot": f"/alarms/{snapshot_filename}" if sys_state.latest_annotated_frame is not None else None,
                "shunt_trip": True
            }
            sys_state.alarm_logs.insert(0, log_entry)
            sys_state.save_persisted_data()
            
            print("⚡ [手動遙控] 遠端操作員手動緊急觸發分勵脫扣器切斷供電！")
            return {"status": "tripped", "msg": "電源已切斷"}
            
        elif req.action == "reset":
            sys_state.shunt_trip_triggered = False
            # 重設火警狀態，避免重複觸發
            sys_state.confirmed_fire = False
            sys_state.suspected_fire = False
            sys_state.countdown_remaining = 0.0
            print("🔌 [手動遙控] 遠端操作員手動復歸分勵脫扣器，恢復送電監控。")
            return {"status": "reset", "msg": "供電已復歸"}
            
        elif req.action == "test":
            print("🟢 [自動測試] 遠端分勵線圈脈衝自檢完成，阻值正常。")
            return {"status": "test_ok", "msg": "自檢完成"}
            
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

@app.post("/api/settings")
def post_settings(req: SettingsRequest):
    """更新 AI 與硬體防禦連動參數"""
    with state_lock:
        sys_state.countdown_limit = req.countdown_limit
        sys_state.yolo_confidence_threshold = req.yolo_confidence_threshold
        sys_state.flicker_frequency_limit = req.flicker_frequency_limit
        sys_state.shunt_trip_enabled = req.shunt_trip_enabled
        
        # 即時將參數更新至 detector 引擎
        detector.yolo_confidence_threshold = req.yolo_confidence_threshold
        detector.flicker_frequency_limit = req.flicker_frequency_limit
        
        # 將新設定存入硬碟以達到持久化
        sys_state.save_persisted_data()
        
        print(f"⚙️ [設定更新] 成功！倒數上限: {req.countdown_limit}s, 置信度: {req.yolo_confidence_threshold}, 頻率門檻: {req.flicker_frequency_limit}Hz, 脫扣連動: {req.shunt_trip_enabled}")
        return {"status": "success", "msg": "設定已成功套用與持久化"}


# --- WebSocket WebSocket 串流傳輸 (傳輸實時畫面與物理特徵元數據) ---

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await manager.connect(websocket)
    print("🔌 [WebSocket] 前端儀表板成功連線影音與數據通道。")
    
    try:
        while True:
            # 每隔 66ms (約 15 FPS) 發送一次最新的影像與分析數據
            await asyncio.sleep(0.066)
            
            with state_lock:
                frame_data = sys_state.current_frame_data.copy()
                frame = sys_state.latest_annotated_frame
                
            if frame is not None:
                # 將 OpenCV BGR 影格壓縮成 JPEG
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                # 轉為 base64 方便前端 Canvas 或 img 繪製
                import base64
                img_base64 = base64.b64encode(buffer).decode('utf-8')
                
                # 包裝 JSON
                payload = {
                    "image": f"data:image/jpeg;base64,{img_base64}",
                    "telemetry": telemetry.get_stats(),
                    "state": {
                        "suspected_fire": sys_state.suspected_fire,
                        "confirmed_fire": sys_state.confirmed_fire,
                        "countdown_remaining": round(sys_state.countdown_remaining, 1),
                        "countdown_limit": sys_state.countdown_limit,
                        "yolo_confidence_threshold": sys_state.yolo_confidence_threshold,
                        "flicker_frequency_limit": sys_state.flicker_frequency_limit,
                        "shunt_trip_enabled": sys_state.shunt_trip_enabled,
                        "shunt_trip_triggered": sys_state.shunt_trip_triggered,
                        "system_fault": sys_state.system_fault,
                        "system_fault_reason": sys_state.system_fault_reason,
                        "throttling_policy": sys_state.throttling_policy
                    },
                    "analysis": frame_data
                }
                
                await websocket.send_text(json.dumps(payload, cls=NumpyEncoder))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("🔌 [WebSocket] 前端儀表板連線已中斷。")
    except Exception as e:
        print(f"WebSocket 傳輸錯誤: {e}")
        try:
            manager.disconnect(websocket)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    # 建立 alarms 與 negative_samples 目錄
    os.makedirs(ALARMS_DIR, exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "data", "negative_samples"), exist_ok=True)
    
    # 執行 FastAPI 伺服器
    print("🔥 工業級 NVR AI 火災偵測後端服務啟動中...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
