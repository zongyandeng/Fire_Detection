import os
import cv2
import numpy as np
import random

def generate_video(dest_path):
    print("=== 開始生成工廠配電盤火災煙霧模擬影片 ===")
    
    # 設定影片屬性
    width, height = 1920, 1080
    fps = 15
    duration_sec = 12
    total_frames = fps * duration_sec
    
    # 建立影片寫入器 (使用 MP4V 編碼)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(dest_path, fourcc, fps, (width, height))
    
    # 火焰特徵參數
    fire_start_frame = 30     # 第 2 秒起火
    smoke_start_frame = 45    # 第 3 秒起煙
    
    # 煙霧粒子列表: [{'x': x, 'y': y, 'radius': r, 'opacity': alpha}]
    smoke_particles = []
    
    # 固定隨機數種子以確保每次生成都一致
    np.random.seed(42)
    random.seed(42)
    
    for frame_idx in range(total_frames):
        # 1. 建立精美的工業機房配電盤背景 (鋼鐵灰背景)
        frame = np.ones((height, width, 3), dtype=np.uint8) * 40 # 深灰背景
        
        # 繪製金屬配電盤大箱體 (1920x1080 中間繪製一個機櫃)
        cv2.rectangle(frame, (400, 100), (1520, 980), (70, 75, 80), -1) # 機櫃本體
        cv2.rectangle(frame, (400, 100), (1520, 980), (100, 105, 110), 5) # 機櫃邊框
        
        # 繪製配電櫃上的通風口 (黑色百葉窗格，火焰會從這裡冒出)
        vent_top_left = (800, 500)
        vent_bottom_right = (1120, 700)
        cv2.rectangle(frame, vent_top_left, vent_bottom_right, (15, 15, 15), -1)
        # 百葉窗橫條
        for y in range(520, 700, 30):
            cv2.line(frame, (800, y), (1120, y), (40, 40, 40), 4)
            
        # 繪製多組彩色狀態指示燈 (綠色正常運轉、藍色液晶螢幕)
        # 綠色指示燈 (正常運轉中)
        cv2.circle(frame, (500, 200), 15, (0, 180, 0), -1) 
        cv2.circle(frame, (500, 200), 15, (0, 255, 0), 2)
        cv2.putText(frame, "RUN", (530, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # 藍色數位液晶螢幕
        cv2.rectangle(frame, (1200, 170), (1450, 300), (20, 20, 20), -1)
        cv2.rectangle(frame, (1200, 170), (1450, 300), (0, 150, 255), 2)
        # 模擬電壓數值 (220V)
        voltage = 220.0 + random.uniform(-0.5, 0.5) if frame_idx < fire_start_frame else 215.0 - (frame_idx - fire_start_frame)*0.5
        voltage = max(voltage, 0.0)
        cv2.putText(frame, f"VOLT: {voltage:.1f}V", (1220, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 180, 255), 2)
        status_txt = "SYS_OK" if frame_idx < fire_start_frame else "OVERLOAD" if frame_idx < smoke_start_frame else "FIRE_ALERT"
        status_color = (0, 255, 0) if status_txt == "SYS_OK" else (0, 165, 255) if status_txt == "OVERLOAD" else (0, 0, 255)
        cv2.putText(frame, f"STATUS: {status_txt}", (1220, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
        
        # 2. 模擬火焰生成 (起火階段)
        if frame_idx >= fire_start_frame:
            # 閃爍頻率模擬: 計算一個 base 大小隨正弦波在 6Hz 左右震盪
            # 6Hz 在 15FPS 下: 2 * pi * 6 * t => t = frame_idx / 15
            freq_hz = 6.5
            flicker = 0.8 + 0.3 * np.sin(2 * np.pi * freq_hz * (frame_idx / 15.0))
            
            # 火焰形狀: 繪製多個重疊的不規則多邊形 (外焰-橙紅、內焰-明黃)
            center_x = 960
            center_y = 600
            
            # 計算火焰動態頂點 (外焰)
            fire_height = int(120 * flicker * (1.0 + (frame_idx - fire_start_frame) / 100.0))
            fire_width = int(80 * flicker * (1.0 + (frame_idx - fire_start_frame) / 150.0))
            
            pts_outer = np.array([
                [center_x - fire_width, center_y + 30],
                [center_x - int(fire_width*0.6), center_y - int(fire_height*0.2)],
                [center_x - int(fire_width*0.2), center_y - int(fire_height*0.8)], # 火尖1
                [center_x, center_y - int(fire_height*0.5)],
                [center_x + int(fire_width*0.3), center_y - fire_height], # 火尖2 (主火尖)
                [center_x + int(fire_width*0.7), center_y - int(fire_height*0.3)],
                [center_x + fire_width, center_y + 30]
            ], np.int32)
            
            # 繪製外焰 (橙紅色)
            cv2.fillPoly(frame, [pts_outer], (0, 69, 255)) # BGR: 橙紅 (0, 69, 255)
            
            # 繪製內焰 (黃色，高溫核心)
            pts_inner = np.array([
                [center_x - int(fire_width*0.6), center_y + 30],
                [center_x - int(fire_width*0.3), center_y - int(fire_height*0.1)],
                [center_x, center_y - int(fire_height*0.5)],
                [center_x + int(fire_width*0.4), center_y - int(fire_height*0.2)],
                [center_x + int(fire_width*0.6), center_y + 30]
            ], np.int32)
            cv2.fillPoly(frame, [pts_inner], (0, 215, 255)) # BGR: 明黃 (0, 215, 255)
            
        # 3. 模擬煙霧生成 (起煙階段)
        # 煙霧是半透明灰色氣泡，向上漂移，半徑膨脹，高頻背景模糊
        if frame_idx >= smoke_start_frame:
            # 每一影格有機率在通風口頂部產生新煙霧粒子
            if frame_idx % 3 == 0:
                smoke_particles.append({
                    'x': 960 + random.randint(-40, 40),
                    'y': 480, # 從通風口上緣出發
                    'radius': 30,
                    'alpha': 0.6 # 透明度
                })
            
            # 更新現有煙霧粒子並在另一層繪製，以實現半透明混合
            overlay = frame.copy()
            for p in smoke_particles:
                # 向上浮力: y 減小
                p['y'] -= int(random.uniform(10, 15))
                # 體積膨脹: 半徑增加
                p['radius'] += int(random.uniform(4, 7))
                # 擴散稀釋: 透明度漸漸降低
                p['alpha'] -= 0.015
                
                if p['alpha'] > 0 and p['y'] > 0:
                    # 繪製灰色煙霧粒子到 overlay 上
                    # 煙霧顏色為灰色: (150, 150, 150)
                    cv2.circle(overlay, (p['x'], p['y']), int(p['radius']), (160, 160, 160), -1)
                    
                    # 實作拉普拉斯高頻細節損失（模糊背景）：
                    # 對煙霧覆蓋的局部區域進行高斯模糊
                    x_start = max(0, p['x'] - int(p['radius']))
                    x_end = min(width, p['x'] + int(p['radius']))
                    y_start = max(0, p['y'] - int(p['radius']))
                    y_end = min(height, p['y'] + int(p['radius']))
                    
                    if (x_end > x_start) and (y_end > y_start):
                        sub_img = frame[y_start:y_end, x_start:x_end]
                        # 施加高斯模糊，核大小與煙霧半徑正相關
                        ksize = int(p['radius'] // 3) * 2 + 1
                        ksize = max(5, min(ksize, 51))
                        blurred_sub = cv2.GaussianBlur(sub_img, (ksize, ksize), 0)
                        
                        # 覆蓋回原圖 (創造出「煙霧遮擋處背景變模糊」的物理效果！)
                        frame[y_start:y_end, x_start:x_end] = blurred_sub

            # 清理消失的粒子
            smoke_particles = [p for p in smoke_particles if p['alpha'] > 0 and p['y'] > 0]
            
            # 將半透明煙霧與原圖混合 (alpha 混合)
            # 這裡我們用 0.6 的權重疊加
            cv2.addWeighted(overlay, 0.4, frame, 0.6, 0, frame)
            
        # 4. 加入細微噪點以模擬 CBR 碼流與 1080P 監控畫面噪訊
        noise = np.random.normal(0, 1.5, frame.shape).astype(np.int8)
        frame = cv2.add(frame, noise, dtype=cv2.CV_8U)
        
        # 寫入影片影格
        out.write(frame)
        
    out.release()
    print(f"=== 模擬影片生成成功: {dest_path} ===")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dest = os.path.join(base_dir, "backend", "data", "videos", "factory_fire_test.mp4")
    generate_video(dest)
