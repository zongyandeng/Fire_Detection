import cv2
import time
import os

class FactoryVideoStream:
    def __init__(self, video_path: str, target_fps: int = 15):
        self.video_path = video_path
        self.target_fps = target_fps
        self.frame_delay = 1.0 / target_fps
        self.cap = None
        self.is_running = False
        
        # 檢查影片檔案是否存在
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"找不到測試影片檔案: {video_path}")
            
    def start(self):
        self.cap = cv2.VideoCapture(self.video_path)
        if not self.cap.isOpened():
            raise RuntimeError(f"無法打開影片檔案: {self.video_path}")
        self.is_running = True
        print(f"🎥 工廠影像串流已啟動。影片路徑: {self.video_path}，目標: {self.target_fps} FPS")

    def get_frame(self):
        """讀取下一影格，若到結尾則自動循環播放以模擬 24/7 RTSP 串流"""
        if not self.is_running or self.cap is None:
            return None
            
        start_time = time.time()
        ret, frame = self.cap.read()
        
        if not ret:
            # 影片播放完畢，重設至第一影格實現無限循環
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            if not ret:
                return None
                
        # 影格率精確時間同步 (CBR 穩定影格率控制)
        elapsed = time.time() - start_time
        sleep_time = self.frame_delay - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)
            
        return frame

    def stop(self):
        self.is_running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        print("🎥 工廠影像串流已停止。")
