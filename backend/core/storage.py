import os
import glob
import time

class StorageQuotaManager:
    def __init__(self, target_dir: str, max_size_mb: float = 50.0):
        self.target_dir = target_dir
        self.max_size_bytes = max_size_mb * 1024 * 1024
        os.makedirs(target_dir, exist_ok=True)
        print(f"💾 儲存額度管理器已啟動。目錄: {target_dir}，上限: {max_size_mb} MB")

    def get_directory_size(self) -> int:
        """計算目錄總容量大小"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(self.target_dir):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                # 排除 .gitkeep 檔案
                if not f.endswith('.gitkeep'):
                    total_size += os.path.getsize(fp)
        return total_size

    def enforce_quota(self):
        """執行容量檢查，若超額則自動循環刪除最舊的告警檔案"""
        current_size = self.get_directory_size()
        
        if current_size <= self.max_size_bytes:
            return
            
        print(f"⚠️ [儲存容量警示] 當前佔用: {current_size / (1024*1024):.2f} MB，已超出上限 {self.max_size_bytes / (1024*1024):.2f} MB。啟動自動循環清理...")
        
        # 搜集所有告警檔案，並按修改時間排序 (最舊的在前)
        files = []
        for filepath in glob.glob(os.path.join(self.target_dir, "*")):
            if not os.path.basename(filepath).endswith('.gitkeep'):
                files.append((filepath, os.path.getmtime(filepath)))
                
        # 按時間戳排序 (由舊到新)
        files.sort(key=lambda x: x[1])
        
        # 循環刪除最舊的檔案，直到容量低於上限的 80% (保留安全邊際)
        target_quota = self.max_size_bytes * 0.8
        for file_path, _ in files:
            try:
                os.remove(file_path)
                print(f"🗑️ [循環清理] 已自動刪除最舊告警檔: {os.path.basename(file_path)}")
                
                # 重新計算大小
                current_size = self.get_directory_size()
                if current_size <= target_quota:
                    print(f"🟢 [儲存清理完成] 當前佔用已降至安全範圍: {current_size / (1024*1024):.2f} MB")
                    break
            except Exception as e:
                print(f"❌ [儲存清理失敗] 無法刪除檔案 {file_path}: {e}")
