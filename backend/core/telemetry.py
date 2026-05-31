import time
import random

# 嘗試導入 pynvml (NVIDIA Telemetry API)
try:
    import pynvml
    HAS_NVML = True
except ImportError:
    HAS_NVML = False

class GPUTelemetry:
    def __init__(self):
        self.nvml_initialized = False
        if HAS_NVML:
            try:
                pynvml.nvmlInit()
                self.nvml_initialized = True
                print("成功初始化 NVIDIA NVML 實體遙測監控。")
            except Exception as e:
                print(f"NVIDIA NVML 初始化失敗 (可能非 NVIDIA 驅動環境): {e}，將切換為系統遙測模擬。")
                self.nvml_initialized = False
        else:
            print("未安裝 pynvml 函式庫，將切換為系統遙測模擬。")
            
        # 模擬狀態參數 (用於展示過熱降載機制)
        self.simulated_temp = 58.0
        self.simulated_fan = 45 # %
        self.overheat_mode = False
        self.fan_mode = "auto" # "auto" or "manual"
        self.manual_fan_speed = 45
        
    def set_overheat_mode(self, enabled: bool):
        """用於手動在 POC 中觸發過熱降載保護測試"""
        self.overheat_mode = enabled

    def set_fan_control(self, mode: str, speed: int):
        """設定風扇控制模式與手動風扇轉速"""
        self.fan_mode = mode
        self.manual_fan_speed = max(35, min(100, speed))
        
    def get_stats(self):
        """獲取 GPU 遙測數據"""
        if self.nvml_initialized:
            try:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                fan = pynvml.nvmlDeviceGetFanSpeed(handle)
                
                # 記憶體資訊
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                mem_total = mem_info.total / (1024 ** 2) # MB
                mem_used = mem_info.used / (1024 ** 2) # MB
                mem_percent = (mem_used / mem_total) * 100.0
                
                # GPU 使用率
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                gpu_util = util.gpu
                
                device_name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(device_name, bytes):
                    device_name = device_name.decode('utf-8')
                    
                return {
                    "device_name": device_name,
                    "temperature": float(temp),
                    "fan_speed": float(fan),
                    "fan_mode": self.fan_mode,
                    "memory_total_mb": float(mem_total),
                    "memory_used_mb": float(mem_used),
                    "memory_percent": float(mem_percent),
                    "gpu_utilization": float(gpu_util),
                    "status": "OK" if temp < 80 else "WARNING" if temp < 85 else "CRITICAL"
                }
            except Exception as e:
                # 實體讀取失敗，降級為模擬
                pass

        # === 擬真系統遙測模擬器 (適用於 CPU/非NV顯卡環境) ===
        # 根據風扇模式決定轉速
        if self.fan_mode == "manual":
            self.simulated_fan = self.manual_fan_speed
        else:
            # 自動模式：風扇隨溫度變動
            if self.overheat_mode:
                self.simulated_fan += random.randint(3, 8)
                self.simulated_fan = min(self.simulated_fan, 100)
            else:
                target_fan = int(35 + (self.simulated_temp - 50.0) * 1.5)
                target_fan = max(35, min(100, target_fan))
                self.simulated_fan += int(np.sign(target_fan - self.simulated_fan) * random.randint(1, 3))
                self.simulated_fan = max(35, min(100, self.simulated_fan))

        # 模擬熱力學降溫/升溫物理效應
        # 基礎發熱量：取決於是否過熱模式
        heat_gen = random.uniform(2.5, 4.5) if self.overheat_mode else random.uniform(0.5, 1.2)
        
        # 散熱能力：取決於風扇轉速 (自定義散熱效能公式)
        cooling_efficiency = (self.simulated_fan / 100.0) * random.uniform(3.5, 5.0)
        
        # 溫度變化 = 發熱量 - 散熱能力
        temp_delta = heat_gen - cooling_efficiency
        self.simulated_temp += temp_delta
        
        # 確保合理上下限
        if self.fan_mode == "manual" and self.simulated_fan >= 85:
            # 強冷風扇可將溫度壓得更低
            min_temp = 42.0 if not self.overheat_mode else 68.0
            max_temp = 52.0 if not self.overheat_mode else 76.0
        else:
            min_temp = 55.0 if not self.overheat_mode else 75.0
            max_temp = 64.0 if not self.overheat_mode else 88.5
            
        self.simulated_temp = max(min_temp, min(max_temp, self.simulated_temp))
            
        mem_total = 16384.0 # 16GB VRAM (比照 RTX 4060 Ti 16GB)
        mem_used = 4210.0 + random.uniform(-10.0, 10.0) # 模擬 YOLO 推理顯存
        mem_percent = (mem_used / mem_total) * 100.0
        gpu_util = 45.0 + random.uniform(-5.0, 5.0)
        
        status = "OK"
        if self.simulated_temp >= 85.0:
            status = "CRITICAL" # 觸發降載保護
        elif self.simulated_temp >= 80.0:
            status = "WARNING"
            
        return {
            "device_name": "RTX 4060 Ti 16GB (Simulated)",
            "temperature": round(self.simulated_temp, 1),
            "fan_speed": int(self.simulated_fan),
            "fan_mode": self.fan_mode,
            "memory_total_mb": mem_total,
            "memory_used_mb": round(mem_used, 1),
            "memory_percent": round(mem_percent, 1),
            "gpu_utilization": round(gpu_util, 1),
            "status": status
        }
        
    def __del__(self):
        if self.nvml_initialized:
            try:
                pynvml.nvmlShutdown()
            except:
                pass
