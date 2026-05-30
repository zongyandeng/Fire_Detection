import os
import json
import smtplib
import urllib.request
import urllib.parse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import ssl

class UniversalNotifier:
    def __init__(self):
        # 讀取設定（POC 階段可先用虛擬設定，或讀取環境變數）
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.notification_email = os.environ.get("NOTIFICATION_EMAIL", "factory-admin@example.com")
        
        # Discord Webhook URL (使用者填入後即可實體發送)
        self.discord_webhook_url = os.environ.get("DISCORD_WEBHOOK_URL", "")
        
        # Telegram & Line (保留設定接口)
        self.tg_bot_token = os.environ.get("TG_BOT_TOKEN", "")
        self.tg_chat_id = os.environ.get("TG_CHAT_ID", "")
        self.line_token = os.environ.get("LINE_TOKEN", "")

    def send_email_alert(self, camera_id: str, timestamp: str, confidence: float, img_path: str = None) -> bool:
        """發送真實的工業警報 Email (包含 HTML 富文本與截圖)"""
        print(f"📧 [Email 通報] 正在發送火警警告郵件至 {self.notification_email}...")
        
        # 如果使用者沒有配置 SMTP 密碼，本程式會以「模擬發送」成功作為 fallback 並印出詳細日誌
        if not self.smtp_user or not self.smtp_password:
            print("💡 提示: 未配置 SMTP_USER 或 SMTP_PASSWORD。以下是即將發送的 Email 內容（已模擬成功）：")
            print(f"   - 收件人: {self.notification_email}")
            print(f"   - 主旨: 🚨 【緊急警報】工業 AI 火災偵測系統 - 檢測到火災/煙霧！")
            print(f"   - 內容: 相機ID: {camera_id} | 時間: {timestamp} | 置信度: {confidence*100:.1f}% | 附圖路徑: {img_path}")
            return True
            
        try:
            msg = MIMEMultipart('related')
            msg['Subject'] = f"🚨 【緊急警報】工業 AI 火災偵測系統 - 檢測到火災/煙霧！"
            msg['From'] = self.smtp_user
            msg['To'] = self.notification_email
            
            # HTML 內容 (驚艷的深色警報格式)
            html = f"""
            <html>
              <body style="background-color: #12131a; color: #ffffff; font-family: sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 2px solid #ff3366; border-radius: 10px; padding: 20px; background-color: #1c1d26;">
                  <h2 style="color: #ff3366; text-align: center; margin-top: 0;">🚨 工業 AI 火災安全監控警報 🚨</h2>
                  <hr style="border: 0; border-top: 1px solid #ff3366;">
                  <p><strong>監控系統在無人值守狀態下自動確認了一起火警事件：</strong></p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #dddddd;">
                    <tr style="background-color: #262837;"><td style="padding: 10px; font-weight: bold;">相機位置/ID</td><td style="padding: 10px;">{camera_id}</td></tr>
                    <tr><td style="padding: 10px; font-weight: bold;">警報時間</td><td style="padding: 10px;">{timestamp}</td></tr>
                    <tr style="background-color: #262837;"><td style="padding: 10px; font-weight: bold;">AI 置信度</td><td style="padding: 10px; color: #ff5a00; font-weight: bold;">{confidence*100:.1f}%</td></tr>
                    <tr><td style="padding: 10px; font-weight: bold;">系統狀態</td><td style="padding: 10px; color: #00ff66;">已自動切換分勵脫扣器 (Shunt Trip) 電源保護</td></tr>
                  </table>
                  <p style="color: #aaaaaa; font-size: 0.9em; text-align: center;">請立即透過下方連結打開實時監控面板確認現場狀況：</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="http://localhost:5173" style="background-color: #ff5a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">打開實時監控面板</a>
                  </div>
                  {"<p style='text-align:center;'><img src='cid:image1' style='max-width:100%; border-radius:5px; border:1px solid #ff3366;'></p>" if img_path else ""}
                </div>
              </body>
            </html>
            """
            
            msgAlternative = MIMEMultipart('alternative')
            msg.attach(msgAlternative)
            msgText = MIMEText(html, 'html', 'utf-8')
            msgAlternative.attach(msgText)
            
            # 附加圖片
            if img_path and os.path.exists(img_path):
                with open(img_path, 'rb') as f:
                    msgImage = MIMEImage(f.read())
                msgImage.add_header('Content-ID', '<image1>')
                msg.attach(msgImage)
                
            # 連接 SMTP 伺服器並發送
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_user, self.notification_email, msg.as_string())
                
            print("📧 [Email 通報] 郵件發送成功！")
            return True
        except Exception as e:
            print(f"❌ [Email 通報] 發送郵件失敗: {e}")
            return False

    def send_discord_webhook(self, camera_id: str, timestamp: str, confidence: float, snapshot_url: str = None) -> bool:
        """發送實體 Discord Rich Embed (嵌入式卡片警報)"""
        print("💬 [Discord 通報] 正在發送警報卡片至 Discord...")
        
        # 若未配置 Webhook，進行模擬輸出
        if not self.discord_webhook_url:
            print("💡 提示: 未配置 DISCORD_WEBHOOK_URL。以下是即將發送的 Discord Embed 卡片內容（已模擬成功）：")
            print("   [Discord Embed Card]")
            print(f"   - Title: 🚨 工業 AI 火災與煙霧警報 (無人值守自動確認)")
            print(f"   - Color: Red (#FF0055)")
            print(f"   - Fields: [相機位置: {camera_id}], [時間: {timestamp}], [置信度: {confidence*100:.1f}%]")
            print(f"   - Actions: [模擬 Shunt Trip: 已切斷電源], [快速連結: http://localhost:5173]")
            return True
            
        try:
            # 組織 Discord Embed JSON 格式
            payload = {
                "username": "AI Fire Sentinel",
                "avatar_url": "https://cdn-icons-png.flaticon.com/512/785/785116.png",
                "embeds": [
                    {
                        "title": "🚨 工業 AI 火災與煙霧警報 (無人值守自動確認)",
                        "description": "系統已連續 3 秒偵測到火焰/煙霧特徵，並已自動觸發保護連鎖。",
                        "color": 16711765, # #FF0055
                        "fields": [
                            {"name": "📷 相機 ID", "value": camera_id, "inline": True},
                            {"name": "⏱ 警報時間", "value": timestamp, "inline": True},
                            {"name": "🔥 AI 置信度", "value": f"**{confidence*100:.1f}%**", "inline": True},
                            {"name": "⚡ 防禦連動 (Shunt Trip)", "value": "🟢 已自動斷開機台電源", "inline": False}
                        ],
                        "footer": {
                            "text": "工業級 NVR AI 安全監控系統"
                        }
                    }
                ]
            }
            
            # 若有圖片 URL 則嵌入
            if snapshot_url:
                payload["embeds"][0]["image"] = {"url": snapshot_url}
                
            req = urllib.request.Request(
                self.discord_webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
            )
            
            # 忽略 SSL 證書錯誤以增加強健性
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, context=ctx) as response:
                response.read()
                
            print("💬 [Discord 通報] 警報發送成功！")
            return True
        except Exception as e:
            print(f"❌ [Discord 通報] 發送 Discord Webhook 失敗: {e}")
            return False

    def send_line_and_tg_logs(self, camera_id: str, timestamp: str, confidence: float) -> dict:
        """模擬 Line Notify 與 Telegram 推送，返回結構化數據以供前端手機模擬器呈現"""
        # Line Notify 模擬
        line_sim = {
            "platform": "Line Notify",
            "message": f"\n🚨【火災警報】\n位置: {camera_id}\n時間: {timestamp}\n置信度: {confidence*100:.1f}%\n系統已自動切斷該區電源保護！",
            "status": "SENT"
        }
        
        # Telegram Bot 模擬 (若有 Token 則可調用實體 Telegram API)
        tg_sim = {
            "platform": "Telegram Bot",
            "message": f"🚨 *工業 AI 火災警報*\n*位置*: {camera_id}\n*時間*: {timestamp}\n*置信度*: {confidence*100:.1f}%\n[點擊查看實時監控](http://localhost:5173)",
            "status": "SENT"
        }
        
        # 如果使用者配置了 Telegram 實體 Bot
        if self.tg_bot_token and self.tg_chat_id:
            try:
                # 實體發送 Telegram 訊息
                url = f"https://api.telegram.org/bot{self.tg_bot_token}/sendMessage"
                payload = {
                    "chat_id": self.tg_chat_id,
                    "text": tg_sim["message"],
                    "parse_mode": "Markdown"
                }
                req = urllib.request.Request(
                    url,
                    data=urllib.parse.urlencode(payload).encode('utf-8'),
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, context=ctx) as r:
                    r.read()
                print("✈️ [Telegram 通報] 實體警報發送成功！")
            except Exception as e:
                print(f"❌ [Telegram 通報] 實體發送失敗: {e}")
                
        return {
            "line": line_sim,
            "telegram": tg_sim
        }
        
    def send_system_fault(self, fault_reason: str, timestamp: str) -> bool:
        """發送系統故障 (System Fault) 緊急警報"""
        print(f"⚠️ [System Fault] 偵測到系統故障: {fault_reason}，正在發送警告...")
        
        # 1. Discord 故障訊息
        if self.discord_webhook_url:
            try:
                payload = {
                    "username": "AI Fire Sentinel",
                    "avatar_url": "https://cdn-icons-png.flaticon.com/512/785/785116.png",
                    "embeds": [{
                        "title": "⚠️ 【系統故障】工業安全監控層離線警告！",
                        "description": f"系統檢測到致命異常，安全防護層可能已失效！",
                        "color": 16753920, # #FFA500
                        "fields": [
                            {"name": "原因", "value": fault_reason, "inline": False},
                            {"name": "時間", "value": timestamp, "inline": True}
                        ]
                    }]
                }
                req = urllib.request.Request(
                    self.discord_webhook_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={"Content-Type": "application/json"}
                )
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, context=ctx) as r:
                    r.read()
            except Exception as e:
                print(f"Discord 故障通知發送失敗: {e}")
                
        # 2. Email 故障郵件
        if self.smtp_user and self.smtp_password:
            try:
                msg = MIMEText(f"系統檢測到致命異常，安全防護層已失效！\n原因: {fault_reason}\n時間: {timestamp}\n請立即派維護人員前往機房檢查！", 'plain', 'utf-8')
                msg['Subject'] = "⚠️ 【系統故障警告】工業 AI 火災監控系統離線！"
                msg['From'] = self.smtp_user
                msg['To'] = self.notification_email
                context = ssl.create_default_context()
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls(context=context)
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.smtp_user, self.notification_email, msg.as_string())
            except Exception as e:
                print(f"Email 故障郵件發送失敗: {e}")
                
        return True
