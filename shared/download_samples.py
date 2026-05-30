import os
import urllib.request
import ssl

def download_file(url, dest_path):
    print(f"正在從 {url} 下載...")
    try:
        # 忽略 SSL 憑證錯誤（避免工廠內網或代理伺服器阻擋）
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(url, context=ctx) as response, open(dest_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"成功下載至 {dest_path}")
        return True
    except Exception as e:
        print(f"下載失敗: {e}")
        return False

def main():
    # 定義基本目錄（相對於 shared 的上一層）
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "backend", "data", "models")
    videos_dir = os.path.join(base_dir, "backend", "data", "videos")
    
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(videos_dir, exist_ok=True)
    
    # 1. 下載 YOLOv8n 權重 (官方 assets)
    model_url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
    model_dest = os.path.join(models_dir, "yolov8n.pt")
    
    # 2. 下載測試影片 (使用一個開源的火災煙霧測試影片)
    # 此影片包含火焰與煙霧的測試場景
    video_url = "https://raw.githubusercontent.com/Hzc1997/YOLOv8-Fire-Smoke-Detection/main/test.mp4"
    video_dest = os.path.join(videos_dir, "factory_fire_test.mp4")
    
    print("=== 開始下載 AI 火災與煙霧偵測系統 POC 資源 ===")
    
    # 下載模型
    if not os.path.exists(model_dest):
        download_file(model_url, model_dest)
    else:
        print(f"模型權重已存在: {model_dest}")
        
    # 下載影片
    if not os.path.exists(video_dest):
        # 嘗試下載開源影片，若失敗可使用替代連結或由系統生成模擬串流
        success = download_file(video_url, video_dest)
        if not success:
            # 備用影片下載連結 (另一個常見的火災/煙霧測試影片)
            backup_url = "https://github.com/intel-iot-devkit/sample-videos/raw/master/fire-detection.mp4"
            print("嘗試下載備用測試影片...")
            download_file(backup_url, video_dest)
    else:
        print(f"測試影片已存在: {video_dest}")
        
    print("=== 資源下載完成 ===")

if __name__ == "__main__":
    main()
