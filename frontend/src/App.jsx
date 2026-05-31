import React, { useState, useEffect, useRef } from 'react';

// 定義工廠 12 路攝影機資料結構
const INITIAL_CAMERAS = [
  { id: 'CAM_A_DIST_BOARD', name: 'CH1 - A棟配電櫃 (AI監控火災核心)', area: 'A棟配電櫃', status: 'ONLINE', isAI: true, type: 'Realtime' },
  { id: 'CAM_B_GENERATOR', name: 'CH2 - B棟發電機房 (溫濕度與負載)', area: 'B棟發電機房', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_C_RAW_WAREHOUSE', name: 'CH3 - C棟原料倉庫 (易燃物監測)', area: 'C棟原料倉庫', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_D_PRODUCTION_A', name: 'CH4 - D棟生產線A (機器人手臂區)', area: 'D棟生產線A', status: 'ONLINE', isAI: true, type: 'Simulated' },
  { id: 'CAM_E_PACKING', name: 'CH5 - E棟包裝與出貨區 (輸送帶)', area: 'E棟包裝與出貨區', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_F_CHEM_STORE', name: 'CH6 - F棟化學品存放倉 (防爆安全)', area: 'F棟化學品存放倉', status: 'ONLINE', isAI: true, type: 'Simulated' },
  { id: 'CAM_G_BOILER', name: 'CH7 - G棟鍋爐房 (蒸汽閥壓力監控)', area: 'G棟鍋爐房', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_H_SUBSTATION', name: 'CH8 - H棟高壓變電所 (絕緣體分析)', area: 'H棟高壓變電所', status: 'ONLINE', isAI: true, type: 'Simulated' },
  { id: 'CAM_I_OUTER_WEST', name: 'CH9 - 工廠外圍西側走廊 (周界防護)', area: '工廠外圍西側走廊', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_J_MAIN_GATE', name: 'CH10 - 工廠大門主出入口 (人車識別)', area: '工廠大門主出入口', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_K_COOLING_TOWER', name: 'CH11 - 機房冷卻水塔區 (冷水循環)', area: '機房冷卻水塔區', status: 'ONLINE', isAI: false, type: 'Simulated' },
  { id: 'CAM_L_WASTE_DISPOSAL', name: 'CH12 - 廢料處理與回收堆置區', area: '廢料處理與回收區', status: 'ONLINE', isAI: false, type: 'Simulated' }
];

function App() {
  // SPA 路由狀態：main_menu | live_view | playback | add_camera | search | settings | information | help
  const [activeView, setActiveView] = useState('main_menu');
  const [helpTab, setHelpTab] = useState('core'); // core | sop | finetune | hardware
  const [screenLayout, setScreenLayout] = useState('grid-12'); // grid-1 | grid-4 | grid-9 | grid-12
  const [selectedCameraId, setSelectedCameraId] = useState('CAM_A_DIST_BOARD');
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  
  // 編輯攝影機狀態與防手滑刪除定時器狀態
  const [editingCamera, setEditingCamera] = useState(null);
  const [deleteConfirmCamId, setDeleteConfirmCamId] = useState(null);
  const deleteTimerRef = useRef(null);

  // 電視牆自訂通道與插槽狀態
  const [activeSlots, setActiveSlots] = useState(INITIAL_CAMERAS.map(c => c.id));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  // 電視牆自動輪巡、分頁與圖片模式狀態
  const [tourPage, setTourPage] = useState(0);
  const [isAutoTouring, setIsAutoTouring] = useState(false);
  const [pictureMode, setPictureMode] = useState('default'); // default | vivid | infrared | thermal

  // ================= 歷史回放與重播控制相關狀態與邏輯 =================
  const [playbackTime, setPlaybackTime] = useState(37200); // 當前回回放秒數，預設 37200 秒 (即 10:20:00)
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1, 2, 4, 8, 16
  const [selectedPlaybackDate, setSelectedPlaybackDate] = useState('2026-05-30');
  const [selectedPlaybackCamId, setSelectedPlaybackCamId] = useState('CAM_A_DIST_BOARD');

  // 轉換秒數為 HH:MM:SS
  const formatSecondsToHMS = (totalSeconds) => {
    const secs = Math.floor(totalSeconds);
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // 歷史告警事件資料庫
  const PLAYBACK_EVENTS = {
    '2026-05-30': [
      { time: 37200, timeStr: '10:20:00', type: '🚨 AI 煙霧特徵預警', camId: 'CAM_A_DIST_BOARD', desc: 'A棟配電櫃檢測到微弱煙霧背景模糊', icon: '⚠️' },
      { time: 37425, timeStr: '10:23:45', type: '🔥 AI 二階段火警確認', camId: 'CAM_A_DIST_BOARD', desc: 'YOLO 核心算法高度確認火焰特徵 (95%)', icon: '🚨' },
      { time: 37531, timeStr: '10:25:31', type: '⚡ 分勵脫扣防護斷電', camId: 'CAM_A_DIST_BOARD', desc: '聯動機制啟動，切斷配電櫃主迴路電源', icon: '🔌' }
    ],
    '2026-05-29': [
      { time: 52200, timeStr: '14:30:00', type: '🟢 系統自動例行巡檢', camId: 'CAM_B_GENERATOR', desc: '發電機房各項物理指標狀態良好', icon: '✔️' },
      { time: 55800, timeStr: '15:30:00', type: '🟢 F棟防爆倉壓力釋放', camId: 'CAM_F_CHEM_STORE', desc: '防爆閥門自動微啟，壓力正常下降', icon: '✔️' }
    ],
    '2026-05-31': [
      { time: 29700, timeStr: '08:15:00', type: '🔧 NVR 系統維護重啟', camId: 'CAM_A_DIST_BOARD', desc: '後端儲存硬碟空間自動清理完成', icon: 'ℹ️' }
    ]
  };

  // 歷史回放自動計時器 (使用高幀率 requestAnimationFrame 讓播放平滑無比)
  useEffect(() => {
    let lastTime = performance.now();
    let frameId;
    
    const updateLoop = (now) => {
      if (isPlaybackPlaying) {
        const deltaSec = (now - lastTime) / 1000;
        setPlaybackTime(prev => {
          const next = prev + deltaSec * playbackSpeed;
          if (next >= 86399) {
            setIsPlaybackPlaying(false);
            return 86399;
          }
          return next;
        });
      }
      lastTime = now;
      if (isPlaybackPlaying) {
        frameId = requestAnimationFrame(updateLoop);
      }
    };

    if (isPlaybackPlaying) {
      lastTime = performance.now();
      frameId = requestAnimationFrame(updateLoop);
    }
    
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isPlaybackPlaying, playbackSpeed]);

  // 動態渲染歷史重播畫面的內容
  const renderPlaybackScreen = (camId, timeInSeconds) => {
    const isCH1Alarm = camId === 'CAM_A_DIST_BOARD' && (timeInSeconds >= 37200 && timeInSeconds <= 37800); // 10:20:00 ~ 10:30:00
    const isCH1Shutdown = camId === 'CAM_A_DIST_BOARD' && (timeInSeconds > 37531); // 10:25:31 之後
    
    if (camId === 'CAM_A_DIST_BOARD') {
      if (isCH1Shutdown) {
        return (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', color: '#ff3366', fontFamily: 'monospace' }}>
            <div className="snow-noise" style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}></div>
            <span style={{ fontSize: '48px', display: 'block', animation: 'flash-slow 1s infinite alternate' }}>⚠️</span>
            <strong style={{ fontSize: '18px', marginTop: '10px', letterSpacing: '1px' }}>NO SIGNAL - POWER CUT OFF</strong>
            <div style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', marginTop: '5px' }}>
              [聯動斷電防禦啟用：分勵脫扣器切斷電器設備電源]
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '10px' }}>
              DISCONNECTED AT 10:25:31 | CH1 BACKUP STORAGE
            </div>
          </div>
        );
      }
      
      if (isCH1Alarm) {
        // 火警重播狀態：隨秒數增長火焰與煙霧的大小
        const fireSeverity = Math.min(100, Math.max(10, ((timeInSeconds - 37200) / 331) * 100)); // 在 10:25:31 前飆到最高
        const tempVal = (35.2 + ((timeInSeconds - 37200) ** 1.3) * 0.05).toFixed(1);
        
        return (
          <div className="playback-alarm-active" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0505', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255, 51, 102, 0.8)', padding: '2px 6px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold', color: '#fff', zIndex: 10, animation: 'flash-fast 0.5s infinite alternate' }}>
              🚨 AI AUTO FIRE DETECTED
            </div>
            
            {/* OSD Bounding box */}
            <div style={{
              position: 'absolute',
              border: '2px solid var(--alarm-red)',
              width: '160px',
              height: '100px',
              top: '40px',
              left: '60px',
              boxShadow: '0 0 10px rgba(255, 51, 102, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              padding: '4px',
              fontFamily: 'monospace',
              fontSize: '9px',
              color: 'var(--alarm-red)',
              backgroundColor: 'rgba(255, 51, 102, 0.05)',
              zIndex: 5
            }}>
              <div>YOLO: FIRE ({(95 + Math.random()*4.9).toFixed(1)}%)</div>
              <div>TEMP: {tempVal}°C (CRITICAL)</div>
              <div>SMOKE: DETECTED</div>
            </div>

            {/* 模擬火焰的 CSS 渲染 */}
            <div className="playback-fire-container" style={{ position: 'absolute', bottom: 0, width: '100%', height: `${fireSeverity * 0.7}%`, background: 'linear-gradient(to top, rgba(255,68,0,0.8), rgba(255,153,0,0.4), transparent)', filter: 'blur(3px)', transition: 'height 0.3s ease', zIndex: 1 }}></div>
            <div className="playback-smoke-container" style={{ position: 'absolute', top: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 140px 90px, rgba(50,50,50,0.7), transparent 70%)', filter: 'blur(10px)', zIndex: 1 }}></div>
            
            {/* 電視監控雜訊線與配電櫃實體儀表模擬 */}
            <div style={{ color: '#fff', fontSize: '12px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left', width: '90%' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--alarm-red)' }}>A棟配電櫃 (重播中)</div>
              <div>環境溫度: <strong style={{ color: 'var(--alarm-red)' }}>{tempVal} °C</strong></div>
              <div>A相電壓: <strong>218.4 V</strong></div>
              <div>B相電壓: <strong>219.1 V</strong></div>
              <div>C相電壓: <strong style={{ color: 'var(--alarm-red)', animation: 'flash-slow 0.8s infinite alternate' }}>165.2 V (不平衡)</strong></div>
              <div>配電箱負載: <strong>89.4% (臨界過載)</strong></div>
            </div>
          </div>
        );
      }
      
      // 正常配電櫃狀態
      const normalTemp = (35.2 + Math.sin(timeInSeconds / 100) * 0.4).toFixed(1);
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0e1117', overflow: 'hidden' }}>
          <div style={{ color: '#fff', fontSize: '12px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left', width: '90%' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--info-blue)' }}>A棟配電櫃 (歷史存檔錄影)</div>
            <div>環境溫度: <strong>{normalTemp} °C</strong></div>
            <div>A相電壓: <strong>220.4 V</strong></div>
            <div>B相電壓: <strong>221.2 V</strong></div>
            <div>C相電壓: <strong>220.8 V</strong></div>
            <div>配電箱負載: <strong>42.1% (正常)</strong></div>
          </div>
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '10px', color: 'var(--normal-green)' }}>
            🟢 SYSTEM SAFE
          </div>
        </div>
      );
    }
    
    // 如果是其他常規通道，渲染與時間軸連動的動態畫面
    switch (camId) {
      case 'CAM_B_GENERATOR':
        const genLoad = (70.0 + Math.sin(timeInSeconds / 20) * 5 + Math.cos(timeInSeconds / 100) * 2).toFixed(1);
        const genTemp = (80.0 + Math.sin(timeInSeconds / 50) * 1.5).toFixed(1);
        return (
          <div style={{ color: '#10b981', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', textAlign: 'left', padding: '10px', width: '100%' }}>
            <div style={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '3px' }}>GEN-SET #02 RECORDING</div>
            <div>STATUS: <strong style={{ color: '#10b981' }}>RUNNING</strong></div>
            <div>LOAD: <strong>{genLoad} kW</strong></div>
            <div>COOLANT TEMP: <strong>{genTemp} °C</strong></div>
            <div>EXHAUST TEMP: <strong>{(340.2 + Math.sin(timeInSeconds / 30) * 4).toFixed(1)} °C</strong></div>
            <div>LINE VOLTAGE: <strong>381.4 V</strong></div>
            <div style={{ marginTop: '5px', display: 'flex', gap: '5px', alignItems: 'center' }}>
              <span className="led-indicator led-green"></span>
              <span style={{ color: '#8a94a6', fontSize: '9px' }}>PLAYBACK DATA OK</span>
            </div>
          </div>
        );
      case 'CAM_C_RAW_WAREHOUSE':
        const warehouseSecure = timeInSeconds % 100 > 95;
        return (
          <div style={{ color: '#8a94a6', position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <svg width="80%" height="80%" viewBox="0 0 100 60" style={{ opacity: 0.25 }}>
              <rect x="10" y="10" width="30" height="20" fill="none" stroke="#fff" strokeWidth="0.5" />
              <rect x="10" y="30" width="30" height="20" fill="none" stroke="#fff" strokeWidth="0.5" />
              <rect x="50" y="10" width="40" height="40" fill="none" stroke="#fff" strokeWidth="0.5" />
              <line x1="10" y1="10" x2="50" y2="10" stroke="#fff" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="40" y1="50" x2="90" y2="50" stroke="#fff" strokeWidth="0.5" strokeDasharray="2" />
            </svg>
            <div style={{ position: 'absolute', bottom: '15px', color: warehouseSecure ? '#ff3366' : '#ff9900', fontSize: '9px', fontWeight: 'bold' }}>
              {warehouseSecure ? '⚠️ [INFRARED] SCANNING PATROL...' : '⚠️ [INFRARED] CH3 ZONE SECURE'}
            </div>
          </div>
        );
      case 'CAM_D_PRODUCTION_A':
        const conveyorLeft = (timeInSeconds * 20) % 100;
        const armAngle = Math.sin(timeInSeconds * 2.5) * 20;
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#090a0c' }}>
            <div style={{ width: '80%', height: '8px', background: '#333', borderRadius: '4px', position: 'relative', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{ position: 'absolute', width: '20px', height: '100%', background: '#444', left: `${conveyorLeft}%` }}></div>
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <div style={{ width: '6px', height: '25px', background: '#ff3366', transform: `rotate(${armAngle}deg)`, transformOrigin: 'top center', transition: 'transform 0.05s linear' }}></div>
              <div style={{ width: '6px', height: '15px', background: '#333' }}></div>
            </div>
            <div style={{ fontSize: '9px', color: '#8a94a6', marginTop: '8px' }}>
              AI: FEED RATE - 85% | RECORDING PLAYBACK
            </div>
          </div>
        );
      case 'CAM_F_CHEM_STORE':
        const chemA = (14.0 + Math.sin(timeInSeconds / 200) * 0.5).toFixed(1);
        const chemB = (92.1 + Math.cos(timeInSeconds / 200) * 0.1).toFixed(1);
        return (
          <div style={{ color: '#f59e0b', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', textAlign: 'left', padding: '10px', width: '100%' }}>
            <div style={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '3px' }}>防爆化學倉重播</div>
            <div>儲罐 A (有機溶劑): <strong>{chemA}% 容量</strong></div>
            <div>儲罐 B (助燃劑): <strong>{chemB}% (HIGH)</strong></div>
            <div>環境 VOC 濃度: <strong style={{ color: '#10b981' }}>2.1 ppm (安全)</strong></div>
            <div>防爆冷卻閥門: <strong>AUTO LOCKDOWN MODE</strong></div>
            <div style={{ border: '1px solid #ff9900', color: '#ff9900', padding: '3px', borderRadius: '2px', fontSize: '9px', textAlign: 'center', marginTop: '3px', fontWeight: 'bold' }}>
              ⚡ EX-PROOF STATUS: ACTIVE
            </div>
          </div>
        );
      case 'CAM_H_SUBSTATION':
        const flashHV = timeInSeconds % 4 > 3;
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#3b82f6', position: 'relative' }}>
            <div style={{ fontSize: '30px', opacity: flashHV ? 0.3 : 1 }}>⚡</div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>HIGH VOLTAGE SUBSTATION</div>
            <div style={{ fontSize: '9px', color: '#8a94a6', marginTop: '2px' }}>
              VOLTAGE: 22.8 kV | CURRENT: 145.2 A | PF: 0.98
            </div>
          </div>
        );
      case 'CAM_G_BOILER':
        const steamPressure = (1.25 + Math.sin(timeInSeconds / 10) * 0.03).toFixed(2);
        const boilerTemp = (1050 + Math.cos(timeInSeconds / 15) * 6).toFixed(0);
        return (
          <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', padding: '10px', width: '100%' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '3px' }}>BOILER #01 DATA</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>主蒸汽壓力:</span>
              <strong style={{ color: '#f59e0b' }}>{steamPressure} MPa</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>爐膛溫度:</span>
              <strong>{boilerTemp} °C</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>給水流量:</span>
              <strong>14.2 t/h</strong>
            </div>
            <div style={{ background: '#222', borderRadius: '3px', padding: '4px', fontSize: '9px', color: '#10b981', textAlign: 'center', marginTop: '4px' }}>
              🟢 VALVE ACTUATOR: NORMAL (42.1%)
            </div>
          </div>
        );
      default:
        return (
          <div style={{ color: '#555866', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎥</span>
            <span style={{ fontSize: '10px', color: '#8a94a6' }}>CH {camId.slice(-1) || 'N'} SIMULATION OK</span>
            <span style={{ fontSize: '8px', color: '#444' }}>PLAYBACK STREAM ACTIVE</span>
          </div>
        );
    }
  };

  // 指派相機到特定電視牆插槽
  const handleAssignCameraToSlot = (slotIndex, cameraId, isAuto = false) => {
    setActiveSlots(prev => {
      const next = [...prev];
      next[slotIndex] = cameraId;
      return next;
    });
    if (slotIndex === selectedSlotIndex) {
      setSelectedCameraId(cameraId);
    }
    if (!isAuto) {
      setIsAutoTouring(false); // 手動修改插槽時，停止自動輪巡以防衝突
    }
  };

  // 重設為預設通道 (CH1 ~ CH12)
  const handleResetSlots = () => {
    const defaultCamId = INITIAL_CAMERAS[0]?.id || 'CAM_A_DIST_BOARD';
    setActiveSlots(INITIAL_CAMERAS.map(c => c.id));
    setSelectedSlotIndex(0);
    setSelectedCameraId(defaultCamId);
    setTourPage(0);
    setIsAutoTouring(false);
  };

  // 切換至下一張螢幕 (分頁或單一螢幕下一台攝影機)
  const handleNextScreen = () => {
    setActiveView('live_view');
    setIsAutoTouring(false); // 手動切換時停止自動輪巡
    if (screenLayout === 'grid-1') {
      const currentCamIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextCamIndex = (currentCamIndex + 1) % cameras.length;
      const nextCamId = cameras[nextCamIndex].id;
      handleAssignCameraToSlot(selectedSlotIndex, nextCamId);
      return;
    }
    // 原有的 4, 9 分割畫面邏輯
    const limit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
    if (limit === 12) return;
    const maxPages = Math.ceil(cameras.length / limit);
    const nextPage = (tourPage + 1) % maxPages;
    setTourPage(nextPage);
    setActiveSlots(oldSlots => {
      const newSlots = [...oldSlots];
      for (let i = 0; i < limit; i++) {
        const camIndex = (nextPage * limit + i) % cameras.length;
        newSlots[i] = cameras[camIndex].id;
      }
      return newSlots;
    });
  };

  // 切換至上一螢幕 (分頁或單一螢幕上一台攝影機)
  const handlePrevScreen = () => {
    setActiveView('live_view');
    setIsAutoTouring(false); // 手動切換時停止自動輪巡
    if (screenLayout === 'grid-1') {
      const currentCamIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const prevCamIndex = (currentCamIndex - 1 + cameras.length) % cameras.length;
      const prevCamId = cameras[prevCamIndex].id;
      handleAssignCameraToSlot(selectedSlotIndex, prevCamId);
      return;
    }
    // 原有的 4, 9 分割畫面邏輯
    const limit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
    if (limit === 12) return;
    const maxPages = Math.ceil(cameras.length / limit);
    const prevPage = (tourPage - 1 + maxPages) % maxPages;
    setTourPage(prevPage);
    setActiveSlots(oldSlots => {
      const newSlots = [...oldSlots];
      for (let i = 0; i < limit; i++) {
        const camIndex = (prevPage * limit + i) % cameras.length;
        newSlots[i] = cameras[camIndex].id;
      }
      return newSlots;
    });
  };

  // 循環切換圖片模式 (預設 -> Vivid -> Infrared -> Thermal)
  const handleCyclePictureMode = () => {
    const modes = ['default', 'vivid', 'infrared', 'thermal'];
    const currentIndex = modes.indexOf(pictureMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPictureMode(modes[nextIndex]);
    const modeNames = {
      default: '預設監控畫質',
      vivid: '高對比畫面增強 (火焰特徵強化)',
      infrared: '黑白紅外線夜視模擬',
      thermal: '紅外線熱成像探測模擬'
    };
    alert(`影像渲染切換成功：${modeNames[modes[nextIndex]]}`);
  };

  // 啟動自動電視牆畫面輪巡 (每 4 秒切換下一頁或單一畫面下一台攝影機)
  useEffect(() => {
    if (!isAutoTouring) return;
    const interval = setInterval(() => {
      if (screenLayout === 'grid-1') {
        const currentCamIndex = cameras.findIndex(c => c.id === selectedCameraId);
        const nextCamIndex = (currentCamIndex + 1) % cameras.length;
        const nextCamId = cameras[nextCamIndex].id;
        handleAssignCameraToSlot(selectedSlotIndex, nextCamId, true);
        return;
      }
      
      // 原有 4, 9 分割畫面邏輯
      const limit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
      if (limit === 12) return;
      const maxPages = Math.ceil(cameras.length / limit);
      setTourPage(prev => {
        const nextPage = (prev + 1) % maxPages;
        setActiveSlots(oldSlots => {
          const newSlots = [...oldSlots];
          for (let i = 0; i < limit; i++) {
            const camIndex = (nextPage * limit + i) % cameras.length;
            newSlots[i] = cameras[camIndex].id;
          }
          return newSlots;
        });
        return nextPage;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoTouring, screenLayout, cameras, selectedCameraId, selectedSlotIndex]);

  // 確保當 cameras 列表新增或刪減時，電視牆插槽 activeSlots 也會即時進行安全更新與過濾
  useEffect(() => {
    if (cameras.length === 0) return;
    setActiveSlots(prev => {
      const cameraIds = cameras.map(c => c.id);
      const next = prev.map(id => {
        // 如果該插槽指派的攝影機已被刪除，則自動替換為當前第一個可用的攝影機 ID
        if (!cameraIds.includes(id)) {
          return cameraIds[0];
        }
        return id;
      });
      return next;
    });
  }, [cameras]);
  
  // NVR 時間戳 (秒級即時更新)
  const [nvrTime, setNvrTime] = useState(new Date().toLocaleString('zh-TW', { hour12: false }));
  
  // 後端同步狀態
  const [streamData, setStreamData] = useState(null);
  const [systemState, setSystemState] = useState({
    suspected_fire: false,
    confirmed_fire: false,
    countdown_remaining: 0.0,
    countdown_limit: 10.0,
    yolo_confidence_threshold: 0.45,
    flicker_frequency_limit: 5.0,
    shunt_trip_enabled: true,
    shunt_trip_triggered: false,
    system_fault: false,
    system_fault_reason: "",
    negative_samples_count: 0,
    alarm_logs: [],
    throttling_fps: 15,
    throttling_policy: 'smart'
  });
  
  const [activeMobileTab, setActiveMobileTab] = useState('discord'); // discord | email | line_tg
  const [overheatMode, setOverheatMode] = useState(false);
  
  // 系統設定專用前端編輯表單與儲存成功提示
  const [settingsForm, setSettingsForm] = useState({
    countdown_limit: 10.0,
    yolo_confidence_threshold: 0.45,
    flicker_frequency_limit: 5.0,
    shunt_trip_enabled: true
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // 當 activeView 切換至 settings 時，以 systemState 的目前數值初始化編輯表單
  useEffect(() => {
    if (activeView === 'settings') {
      setSettingsForm({
        countdown_limit: systemState.countdown_limit || 10.0,
        yolo_confidence_threshold: systemState.yolo_confidence_threshold || 0.45,
        flicker_frequency_limit: systemState.flicker_frequency_limit || 5.0,
        shunt_trip_enabled: systemState.shunt_trip_enabled !== undefined ? systemState.shunt_trip_enabled : true
      });
      setSaveSuccessMsg("");
    }
  }, [activeView, systemState.countdown_limit, systemState.yolo_confidence_threshold, systemState.flicker_frequency_limit, systemState.shunt_trip_enabled]);

  const handleSaveSettings = () => {
    fetch('http://127.0.0.1:8000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setSystemState(prev => ({
          ...prev,
          countdown_limit: settingsForm.countdown_limit,
          yolo_confidence_threshold: settingsForm.yolo_confidence_threshold,
          flicker_frequency_limit: settingsForm.flicker_frequency_limit,
          shunt_trip_enabled: settingsForm.shunt_trip_enabled
        }));
        setSaveSuccessMsg("✅ 設定已成功套用至 AI 影像分析引擎與硬體防禦模組！並已儲存持久化。");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    })
    .catch(err => {
      console.error("儲存設定失敗:", err);
      alert("❌ 儲存設定失敗，請確認後端服務是否正常運作。");
    });
  };
  
  // ==================== 遙控與資訊監測新狀態 ====================
  const [isCoilTesting, setIsCoilTesting] = useState(false);
  const [coilTestProgress, setCoilTestProgress] = useState(0);
  const [coilTestResult, setCoilTestResult] = useState('unknown'); // unknown | testing | success | failed

  // 物理特徵波形歷史緩衝區（各保留30點以繪製示波器）
  const flameHistoryRef = useRef(Array.from({ length: 30 }, () => 0.0));
  const smokeHistoryRef = useRef(Array.from({ length: 30 }, () => 0.0));
  const flameCanvasRef = useRef(null);
  const smokeCanvasRef = useRef(null);

  const handleSetFanControl = (mode, speed) => {
    fetch('http://127.0.0.1:8000/api/telemetry/fan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, speed: parseInt(speed) })
    })
    .catch(err => console.error("設定風扇控制失敗:", err));
  };

  const handleSetThrottlingPolicy = (policy) => {
    fetch('http://127.0.0.1:8000/api/telemetry/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy })
    })
    .catch(err => console.error("設定降載策略失敗:", err));
  };

  const handleShuntTripControl = (action) => {
    if (action === 'trip') {
      if (!confirm("⚠️ 安全警告：此操作將強行跳閘配電櫃主電源，切斷高壓供電！\n您確定要立即發送分勵脈衝，進行手動緊急斷電防禦嗎？")) {
        return;
      }
    }
    
    if (action === 'test') {
      setIsCoilTesting(true);
      setCoilTestProgress(0);
      setCoilTestResult('testing');
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setCoilTestProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          fetch('http://127.0.0.1:8000/api/telemetry/shunt_trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test' })
          })
          .then(res => res.json())
          .then(data => {
            setIsCoilTesting(false);
            setCoilTestResult('success');
          })
          .catch(err => {
            setIsCoilTesting(false);
            setCoilTestResult('failed');
            alert("❌ 線圈脈衝檢測失敗，請檢查繼電器接腳通訊。");
          });
        }
      }, 150);
      return;
    }

    fetch('http://127.0.0.1:8000/api/telemetry/shunt_trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    .then(res => res.json())
    .then(data => {
      if (action === 'trip') {
        alert("⚡ 手動緊急跳閘完成，供電已強制切斷！");
      } else if (action === 'reset') {
        alert("🔌 分勵脫扣器已手動復歸，供電正常送電監控中。");
      }
    })
    .catch(err => alert("遠端遙控失敗，請確認後端服務是否正常。"));
  };
  // =============================================================
  
  const [wsConnected, setWsConnected] = useState(false);
  const [isPowerCycling, setIsPowerCycling] = useState(false); // 重啟 NVR 伺服器狀態
  
  // 歷史告警日誌搜尋與過濾條件 state
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('2026-05-31'); // 預設今天 2026-05-31
  const [filterKeyword, setFilterKeyword] = useState('');

  // 點擊「搜尋」按鈕後真正生效的過濾條件
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDate, setActiveDate] = useState('2026-05-31');
  const [activeKeyword, setActiveKeyword] = useState('');

  // 心跳折線圖數值快取
  const [heartbeatPoints, setHeartbeatPoints] = useState([50, 45, 55, 40, 50, 80, 20, 50, 48, 52, 50]);
  const wsRef = useRef(null);

  // 1. OSD 時間每秒更新
  useEffect(() => {
    const timer = setInterval(() => {
      setNvrTime(new Date().toLocaleString('zh-TW', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. 初始化與 WebSocket 連線
  useEffect(() => {
    connectWebSocket();
    
    // 定期向後端發送 HTTP 心跳
    const heartbeatInterval = setInterval(() => {
      fetch('http://127.0.0.1:8000/api/heartbeat', { method: 'POST' })
        .catch(err => console.error("心跳發送失敗:", err));
    }, 20000); 

    // 心跳圖波形更新
    const svgInterval = setInterval(() => {
      setHeartbeatPoints(prev => {
        const next = [...prev.slice(1)];
        if (systemState.system_fault) {
          next.push(50); // 故障死線
        } else {
          const base = 50;
          const peak = Math.random() > 0.75 ? (Math.random() > 0.5 ? 82 : 18) : (base + Math.random()*10 - 5);
          next.push(peak);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(heartbeatInterval);
      clearInterval(svgInterval);
    };
  }, [systemState.system_fault]);

  const connectWebSocket = () => {
    console.log("🔌 嘗試連接後端 WebSocket...");
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/stream');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 WebSocket 連線成功！");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStreamData(data);
      
      // 更新示波器歷史緩衝區 (30點歷史)
      const activeDets = data.analysis?.detections || [];
      const flameDet = activeDets.find(d => d.type === 'flame');
      const smokeDet = activeDets.find(d => d.type === 'smoke');
      
      // 火焰閃爍頻率歷史
      const currentFlameVal = flameDet ? flameDet.stats?.flicker_freq || 0.0 : 0.0;
      flameHistoryRef.current = [...flameHistoryRef.current.slice(1), currentFlameVal];
      
      // 煙霧背景清晰度損失歷史
      const currentSmokeVal = smokeDet ? smokeDet.stats?.clarity_loss || 0.0 : 0.0;
      smokeHistoryRef.current = [...smokeHistoryRef.current.slice(1), currentSmokeVal];

      if (data.state) {
        setSystemState(prev => ({
          ...prev,
          suspected_fire: data.state.suspected_fire,
          confirmed_fire: data.state.confirmed_fire,
          countdown_remaining: data.state.countdown_remaining,
          countdown_limit: data.state.countdown_limit !== undefined ? data.state.countdown_limit : prev.countdown_limit,
          yolo_confidence_threshold: data.state.yolo_confidence_threshold !== undefined ? data.state.yolo_confidence_threshold : prev.yolo_confidence_threshold,
          flicker_frequency_limit: data.state.flicker_frequency_limit !== undefined ? data.state.flicker_frequency_limit : prev.flicker_frequency_limit,
          shunt_trip_enabled: data.state.shunt_trip_enabled !== undefined ? data.state.shunt_trip_enabled : prev.shunt_trip_enabled,
          shunt_trip_triggered: data.state.shunt_trip_triggered,
          system_fault: data.state.system_fault,
          system_fault_reason: data.state.system_fault_reason,
          throttling_policy: data.state.throttling_policy || prev.throttling_policy
        }));
      }
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket 已中斷。3秒後自動重連...");
      setWsConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket 錯誤:", err);
      ws.close();
    };
  };

  // 3. 定期拉取 REST API
  useEffect(() => {
    const fetchState = () => {
      fetch('http://127.0.0.1:8000/api/state')
        .then(res => res.json())
        .then(data => {
          setSystemState(prev => ({
            ...prev,
            negative_samples_count: data.negative_samples_count,
            alarm_logs: data.alarm_logs,
            throttling_fps: data.throttling_fps,
            throttling_policy: data.throttling_policy || prev.throttling_policy,
            countdown_limit: data.countdown_limit !== undefined ? data.countdown_limit : prev.countdown_limit,
            yolo_confidence_threshold: data.yolo_confidence_threshold !== undefined ? data.yolo_confidence_threshold : prev.yolo_confidence_threshold,
            flicker_frequency_limit: data.flicker_frequency_limit !== undefined ? data.flicker_frequency_limit : prev.flicker_frequency_limit,
            shunt_trip_enabled: data.shunt_trip_enabled !== undefined ? data.shunt_trip_enabled : prev.shunt_trip_enabled
          }));
        })
        .catch(err => console.error("拉取系統狀態失敗:", err));
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  // ==================== 實時 Canvas 示波器繪製 Effect ====================
  useEffect(() => {
    if (activeView !== 'information') return;

    let animationFrameId;
    
    const drawScope = () => {
      // 1. 繪製火焰示波器
      const flameCanvas = flameCanvasRef.current;
      if (flameCanvas) {
        const rect = flameCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        flameCanvas.width = rect.width * dpr;
        flameCanvas.height = rect.height * dpr;
        
        const ctx = flameCanvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const w = rect.width;
        const h = rect.height;
        
        // 背景塗黑
        ctx.fillStyle = '#06080b';
        ctx.fillRect(0, 0, w, h);
        
        // 繪製網格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 25) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        
        // 繪製 5Hz - 10Hz 的黃金判定區間帶
        const getFlameY = (val) => {
          const minVal = 0;
          const maxVal = 12; // 最大 12Hz
          const ratio = (val - minVal) / (maxVal - minVal);
          return h - 15 - ratio * (h - 30);
        };
        
        const y5 = getFlameY(5);
        const y10 = getFlameY(10);
        ctx.fillStyle = 'rgba(255, 102, 0, 0.06)';
        ctx.fillRect(0, y10, w, y5 - y10);
        
        ctx.strokeStyle = 'rgba(255, 102, 0, 0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y5); ctx.lineTo(w, y5);
        ctx.moveTo(0, y10); ctx.lineTo(w, y10);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255, 102, 0, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText('🔥 明火判定特徵黃金頻率帶 (5Hz - 10Hz)', 10, y5 - 5);
        
        // 繪製火焰閃爍頻率折線
        const pts = flameHistoryRef.current || [];
        if (pts.length > 1) {
          ctx.beginPath();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ff5533';
          ctx.shadowColor = 'rgba(255, 85, 51, 0.4)';
          ctx.shadowBlur = 8;
          
          for (let i = 0; i < pts.length; i++) {
            const x = (i / (pts.length - 1)) * (w - 30) + 15;
            const y = getFlameY(pts[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // 重置
          
          // 繪製下方漸層填滿
          ctx.lineTo((w - 15), h);
          ctx.lineTo(15, h);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, 'rgba(255, 85, 51, 0.08)');
          grad.addColorStop(1, 'rgba(255, 85, 51, 0.0)');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }
      
      // 2. 繪製煙霧示波器
      const smokeCanvas = smokeCanvasRef.current;
      if (smokeCanvas) {
        const rect = smokeCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        smokeCanvas.width = rect.width * dpr;
        smokeCanvas.height = rect.height * dpr;
        
        const ctx = smokeCanvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const w = rect.width;
        const h = rect.height;
        
        // 背景塗黑
        ctx.fillStyle = '#06080b';
        ctx.fillRect(0, 0, w, h);
        
        // 繪製網格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 25) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        
        const getSmokeY = (val) => {
          const minVal = 0;
          const maxVal = 1.0;
          const ratio = (val - minVal) / (maxVal - minVal);
          return h - 15 - ratio * (h - 30);
        };
        
        // 繪製 60% 清晰度損失警報線
        const yAlarm = getSmokeY(0.6);
        ctx.strokeStyle = 'rgba(0, 162, 255, 0.2)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, yAlarm); ctx.lineTo(w, yAlarm);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(0, 162, 255, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText('☁️ 煙霧背景模糊臨界警告線 (60%)', 10, yAlarm - 5);
        
        // 繪製煙霧清晰度損失折線
        const pts = smokeHistoryRef.current || [];
        if (pts.length > 1) {
          ctx.beginPath();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#00bbff';
          ctx.shadowColor = 'rgba(0, 187, 255, 0.4)';
          ctx.shadowBlur = 8;
          
          for (let i = 0; i < pts.length; i++) {
            const x = (i / (pts.length - 1)) * (w - 30) + 15;
            const y = getSmokeY(pts[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // 重置
          
          // 繪製下方漸層填滿
          ctx.lineTo((w - 15), h);
          ctx.lineTo(15, h);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, 'rgba(0, 187, 255, 0.08)');
          grad.addColorStop(1, 'rgba(0, 187, 255, 0.0)');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }
      
      animationFrameId = requestAnimationFrame(drawScope);
    };
    
    // 啟動動畫
    drawScope();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeView]);

  // 4. API 控制：手動確認與排除
  const handleConfirmFire = () => {
    fetch('http://127.0.0.1:8000/api/confirm', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log("🔥 火警手動確認完成！");
      })
      .catch(err => alert("確認失敗，請確認後端服務是否在運行。"));
  };

  const handleDismissAlarm = () => {
    fetch('http://127.0.0.1:8000/api/dismiss', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log("🟢 警報排除完成，已儲存負樣本！");
        setSystemState(prev => ({
          ...prev,
          negative_samples_count: data.negative_samples_count
        }));
      })
      .catch(err => alert("排除失敗"));
  };

  const handleToggleOverheat = () => {
    const nextMode = !overheatMode;
    setOverheatMode(nextMode);
    fetch('http://127.0.0.1:8000/api/telemetry/overheat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextMode })
    }).catch(err => console.error("過熱測試 API 錯誤:", err));
  };

  // 模擬重啟 NVR 伺服器
  const handlePowerCycle = () => {
    setIsPowerCycling(true);
    setTimeout(() => {
      setIsPowerCycling(false);
      setActiveView('main_menu');
    }, 2500);
  };

  // 模擬其他攝影機的動態 Canvas 渲染輔助
  const renderSimulatedChannel = (camId) => {
    switch (camId) {
      case 'CAM_B_GENERATOR':
        return (
          <div style={{ color: '#10b981', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', textAlign: 'left', padding: '10px' }}>
            <div style={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '3px' }}>GEN-SET #02 TELEMETRY</div>
            <div>STATUS: <strong style={{ color: '#10b981' }}>RUNNING</strong></div>
            <div>LOAD: <strong>{(72.4 + Math.random()*2).toFixed(1)} kW</strong></div>
            <div>COOLANT TEMP: <strong>{(82.1 + Math.random()*0.5).toFixed(1)} °C</strong></div>
            <div>EXHAUST TEMP: <strong>345.2 °C</strong></div>
            <div>LINE VOLTAGE: <strong>381.4 V</strong></div>
            <div style={{ marginTop: '5px', display: 'flex', gap: '5px', alignItems: 'center' }}>
              <span className="led-indicator led-green"></span>
              <span style={{ color: '#8a94a6', fontSize: '9px' }}>CONTROLLER LINK OK</span>
            </div>
          </div>
        );
      case 'CAM_C_RAW_WAREHOUSE':
        return (
          <div style={{ color: '#8a94a6', position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {/* 繪製原料倉庫幾何線框模擬 */}
            <svg width="80%" height="80%" viewBox="0 0 100 60" style={{ opacity: 0.25 }}>
              <rect x="10" y="10" width="30" height="20" fill="none" stroke="#fff" strokeWidth="0.5" />
              <rect x="10" y="30" width="30" height="20" fill="none" stroke="#fff" strokeWidth="0.5" />
              <rect x="50" y="10" width="40" height="40" fill="none" stroke="#fff" strokeWidth="0.5" />
              <line x1="10" y1="10" x2="50" y2="10" stroke="#fff" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="40" y1="50" x2="90" y2="50" stroke="#fff" strokeWidth="0.5" strokeDasharray="2" />
            </svg>
            <div style={{ position: 'absolute', bottom: '15px', color: '#ff9900', fontSize: '9px', fontWeight: 'bold' }}>
              ⚠️ [INFRARED] CH3 ZONE SECURE
            </div>
          </div>
        );
      case 'CAM_D_PRODUCTION_A':
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#090a0c' }}>
            {/* 機器人手臂與輸送帶動畫模擬 */}
            <div style={{ width: '80%', height: '8px', background: '#333', borderRadius: '4px', position: 'relative', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{ position: 'absolute', width: '20px', height: '100%', background: '#444', animation: 'conveyor-run 2s infinite linear' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <div style={{ width: '6px', height: '25px', background: '#ff3366', animation: 'arm-move 1.5s infinite alternate' }}></div>
              <div style={{ width: '6px', height: '15px', background: '#333' }}></div>
            </div>
            <div style={{ fontSize: '9px', color: '#8a94a6', marginTop: '8px' }}>
              AI: CONVEYOR FEEDING RATE - 85% | CAM ACTIVE
            </div>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes conveyor-run {
                0% { left: -20px; }
                100% { left: 100%; }
              }
              @keyframes arm-move {
                0% { transform: rotate(15deg); }
                100% { transform: rotate(-15deg); }
              }
            `}} />
          </div>
        );
      case 'CAM_F_CHEM_STORE':
        return (
          <div style={{ color: '#f59e0b', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', textAlign: 'left', padding: '10px' }}>
            <div style={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '3px' }}>防爆化學倉監控</div>
            <div>儲罐 A (有機溶劑): <strong>14.2% 容量</strong></div>
            <div>儲罐 B (助燃劑): <strong>92.1% (HIGH)</strong></div>
            <div>環境 VOC 濃度: <strong style={{ color: '#10b981' }}>2.1 ppm (安全)</strong></div>
            <div>防爆冷卻閥門: <strong>AUTO LOCKDOWN MODE</strong></div>
            <div style={{ border: '1px solid #ff9900', color: '#ff9900', padding: '3px', borderRadius: '2px', fontSize: '9px', textAlign: 'center', marginTop: '3px', fontWeight: 'bold' }}>
              ⚡ EX-PROOF STATUS: ACTIVE
            </div>
          </div>
        );
      case 'CAM_H_SUBSTATION':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#3b82f6', position: 'relative' }}>
            <div style={{ fontSize: '30px', animation: 'flash-slow 1s infinite alternate' }}>⚡</div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>HIGH VOLTAGE MAIN FEEDER</div>
            <div style={{ fontSize: '9px', color: '#8a94a6', marginTop: '2px' }}>
              VOLTAGE: 22.8 kV | CURRENT: 145.2 A | PF: 0.98
            </div>
          </div>
        );
      case 'CAM_G_BOILER':
        return (
          <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', padding: '10px' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '3px' }}>BOILER #01 ANALYZER</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>主蒸汽壓力:</span>
              <strong style={{ color: '#f59e0b' }}>{(1.25 + Math.random()*0.02).toFixed(2)} MPa</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>爐膛溫度:</span>
              <strong>{(1050 + Math.random()*5).toFixed(0)} °C</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>給水流量:</span>
              <strong>14.2 t/h</strong>
            </div>
            <div style={{ background: '#222', borderRadius: '3px', padding: '4px', fontSize: '9px', color: '#10b981', textAlign: 'center', marginTop: '4px' }}>
              🟢 VALVE ACTUATOR: NORMAL (42.1%)
            </div>
          </div>
        );
      default:
        return (
          <div style={{ color: '#555866', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎥</span>
            <span style={{ fontSize: '10px', color: '#8a94a6' }}>CH {camId.slice(-1) || 'N'} SIMULATION OK</span>
            <span style={{ fontSize: '8px', color: '#444' }}>MONITORING ACTIVE</span>
          </div>
        );
    }
  };

  const activeDetections = streamData?.analysis?.detections || [];
  const latestTelemetry = streamData?.telemetry || {
    device_name: "RTX 4060 Ti (NVR Simulated)",
    temperature: 54.0,
    fan_speed: 40,
    memory_percent: 22.0,
    gpu_utilization: 42.0,
    status: "OK"
  };

  // 當重啟模擬時，渲染加載
  if (isPowerCycling) {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', color: '#ff3366', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
        <div style={{ fontSize: '40px', fontWeight: 'bold', letterSpacing: '2px', animation: 'flash-fast 0.6s infinite alternate' }}>🚨 SYSTEM POWER CYCLING 🚨</div>
        <div style={{ width: '300px', height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#ff3366', width: '100%', animation: 'power-bar 2.5s linear' }}></div>
        </div>
        <div style={{ color: '#8a94a6', fontFamily: 'monospace' }}>REBOOTING NVR AI LINUX DAEMON... PLEASE WAIT</div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes power-bar {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}} />
      </div>
    );
  }

  // 解析當前正要編輯的攝影機的通道與自訂名稱
  const parsedEditInfo = (() => {
    let ch = 'CH13';
    let customName = '';
    if (editingCamera) {
      const nameParts = editingCamera.name.split(' - ');
      ch = nameParts[0] || 'CH13';
      customName = nameParts[1] || '';
    }
    return { ch, customName };
  })();

  return (
    <>
      <div className="industrial-grid"></div>
      
      {/* 警報防禦全域覆蓋紅框閃爍 */}
      {systemState.confirmed_fire && <div className="alarm-overlay-red"></div>}
      {!systemState.confirmed_fire && systemState.suspected_fire && <div className="alarm-overlay-red" style={{ animationDuration: '1.5s', border: '5px solid var(--alarm-yellow)' }}></div>}
      {systemState.system_fault && <div className="alarm-overlay-yellow"></div>}

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nvr-bg)', position: 'relative', zIndex: 1 }}>
        
        {/* ================= NVR 頂部系統欄 ================= */}
        <header className="nvr-header">
          <div className="nvr-brand">
            <span style={{ fontSize: '20px' }}>🏭</span>
            <div>
              <div className="nvr-logo-text">TP-LINK VIGI | 工業級 NVR AI 智慧火災防護防禦控制台</div>
              <div style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', marginTop: '2px' }}>
                安全防禦核心: 雙重特徵驗證 AI 演算法 | 分勵脫扣器 (Shunt Trip) 自動防護系統
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* 心跳遙測 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>AI 遙測心跳:</span>
              <svg width="90" height="20" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '2px', border: '1px solid var(--nvr-border)' }}>
                <polyline
                  fill="none"
                  stroke={systemState.system_fault ? "var(--alarm-yellow)" : "var(--info-blue)"}
                  strokeWidth="1.5"
                  points={heartbeatPoints.map((p, idx) => `${idx * 9}, ${p * 0.2}`).join(' ')}
                />
              </svg>
            </div>

            {/* 連線狀態指標 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              {systemState.system_fault ? (
                <>
                  <span className="led-indicator led-yellow"></span>
                  <span style={{ color: 'var(--alarm-yellow)', fontWeight: 'bold' }}>SYSTEM FAULT (連線異常)</span>
                </>
              ) : wsConnected ? (
                <>
                  <span className="led-indicator led-green"></span>
                  <span style={{ color: 'var(--normal-green)', fontWeight: 'bold' }}>MONITORING ONLINE</span>
                </>
              ) : (
                <>
                  <span className="led-indicator led-red"></span>
                  <span style={{ color: 'var(--alarm-red)', fontWeight: 'bold' }}>CONNECTING...</span>
                </>
              )}
            </div>

            {/* 系統時間 */}
            <div style={{ fontFamily: 'monospace', color: '#fff', fontSize: '12px', background: '#1c1e24', padding: '4px 8px', borderRadius: '3px', border: '1px solid var(--nvr-border)' }}>
              📅 {nvrTime}
            </div>
          </div>
        </header>

        {/* ================= 主工作視窗 ================= */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* 左側邊欄：獨立功能 SPA 切換按鈕 (照片下半部功能的整合) */}
          <nav style={{ width: '80px', backgroundColor: '#0b0c0e', borderRight: '2px solid var(--nvr-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0', gap: '15px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <button 
                title="主選單 (Main Menu)" 
                onClick={() => setActiveView('main_menu')} 
                className={`nvr-btn ${activeView === 'main_menu' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                🏠
              </button>
              
              <div style={{ width: '30px', height: '2px', background: 'var(--nvr-border)', margin: '5px 0' }}></div>

              <button 
                title="實時監控 (Live View)" 
                onClick={() => { setActiveView('live_view'); }} 
                className={`nvr-btn ${activeView === 'live_view' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                📺
              </button>
              <button 
                title="歷史回放 (Playback)" 
                onClick={() => setActiveView('playback')} 
                className={`nvr-btn ${activeView === 'playback' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                📂
              </button>
              <button 
                title="新增攝影機 (Add Camera)" 
                onClick={() => setActiveView('add_camera')} 
                className={`nvr-btn ${activeView === 'add_camera' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                ➕
              </button>
              <button 
                title="搜尋與日誌 (Search)" 
                onClick={() => setActiveView('search')} 
                className={`nvr-btn ${activeView === 'search' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                🔍
              </button>
              <button 
                title="遙測與資訊 (Information)" 
                onClick={() => setActiveView('information')} 
                className={`nvr-btn ${activeView === 'information' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                📊
              </button>
              <button 
                title="系統設定 (Settings)" 
                onClick={() => setActiveView('settings')} 
                className={`nvr-btn ${activeView === 'settings' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                ⚙️
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <button 
                title="操作說明 (Help)" 
                onClick={() => setActiveView('help')} 
                className={`nvr-btn ${activeView === 'help' ? 'active' : ''}`}
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px' }}
              >
                ❓
              </button>
              
              <button 
                title="關機 / 重啟 NVR" 
                onClick={handlePowerCycle} 
                className="nvr-btn"
                style={{ width: '50px', height: '50px', borderRadius: '8px', padding: 0, fontSize: '20px', backgroundColor: 'rgba(255, 51, 102, 0.1)', borderColor: 'var(--alarm-red)' }}
              >
                🛑
              </button>
            </div>
          </nav>

          {/* 右側主要顯示區域：根據 activeView 來切換 */}
          <main style={{ flex: 1, backgroundColor: '#090a0c', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* 全域警報橫幅指示 (當有疑似或正式起火時，頂部顯示，符合工業實用安全通知) */}
            {(systemState.suspected_fire || systemState.confirmed_fire) && (
              <div style={{ 
                padding: '12px 20px', 
                backgroundColor: systemState.confirmed_fire ? 'var(--alarm-red)' : 'var(--alarm-yellow)', 
                color: systemState.confirmed_fire ? '#fff' : '#000',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 'bold',
                animation: 'flash-fast 1s infinite alternate',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🚨</span>
                  <span>
                    {systemState.confirmed_fire 
                      ? '【火災警報確認】A棟配電櫃已確認起火！分勵脫扣器切斷該區供電保護，多軌回報已發送！' 
                      : `【疑似火災預警】A棟配電櫃偵測到疑似火災物理特徵！無人值守自動倒數通報剩餘: ${systemState.countdown_remaining}s`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleConfirmFire} className="nvr-btn" style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '4px 12px', fontSize: '12px' }}>
                    🔥 立即人工確認
                  </button>
                  <button onClick={handleDismissAlarm} className="nvr-btn" style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '4px 12px', fontSize: '12px' }}>
                    🟢 安全解除警報
                  </button>
                </div>
              </div>
            )}

            {/* ================= SPA 畫面 1: 主選單 (Main Menu - 完美復刻照片選單) ================= */}
            {activeView === 'main_menu' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '25px', justifyContent: 'center', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '20px 0' }}>

                {/* 復刻照片下半部：核心大按鈕選單 (Settings 紅框效果) */}
                <div className="nvr-panel" style={{ width: '100%', padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '8px', color: 'var(--nvr-text-muted)', fontSize: '12px' }}>
                    ⚙️ 核心系統功能 (Core Function Menu)
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                    <div className="nvr-main-btn" onClick={() => setActiveView('live_view')}>
                      <span className="icon">📺</span>
                      <span>實時監控</span>
                    </div>
                    <div className="nvr-main-btn" onClick={() => setActiveView('playback')}>
                      <span className="icon">📂</span>
                      <span>回放畫面</span>
                    </div>
                    <div className="nvr-main-btn" onClick={() => setActiveView('add_camera')}>
                      <span className="icon">➕</span>
                      <span>新增攝影機</span>
                    </div>
                    <div className="nvr-main-btn" onClick={() => setActiveView('search')}>
                      <span className="icon">🔍</span>
                      <span>事件日誌</span>
                    </div>
                    
                    {/* 照片中重點紅色框線 focus 的 Settings 按鈕 */}
                    <div className="nvr-main-btn focus-active" onClick={() => setActiveView('settings')}>
                      <span className="icon">⚙️</span>
                      <span style={{ color: 'var(--alarm-red)' }}>系統設定</span>
                    </div>

                    <div className="nvr-main-btn" onClick={() => setActiveView('information')}>
                      <span className="icon">📊</span>
                      <span>遙測與特徵</span>
                    </div>
                    <div className="nvr-main-btn" onClick={() => setActiveView('help')}>
                      <span className="icon">❓</span>
                      <span>操作說明</span>
                    </div>
                  </div>
                </div>

                {/* 工廠快速資訊欄 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', width: '100%' }}>
                  <div className="nvr-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', display: 'block' }}>分勵脫扣器安全狀態</span>
                      <strong style={{ color: systemState.shunt_trip_triggered ? 'var(--alarm-red)' : 'var(--normal-green)' }}>
                        {systemState.shunt_trip_triggered ? '⚡ 已切斷電源 (PROTECTED)' : '🔌 供電正常 (MONITORING)'}
                      </strong>
                    </div>
                    <span className={`led-indicator ${systemState.shunt_trip_triggered ? 'led-red' : 'led-green'}`}></span>
                  </div>

                  <div className="nvr-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', display: 'block' }}>累積負樣本 (用於微調)</span>
                      <strong>{systemState.negative_samples_count} 張圖片</strong>
                    </div>
                    <span>📁</span>
                  </div>

                  <div className="nvr-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', display: 'block' }}>GPU 推理負載 (自適應)</span>
                      <strong style={{ color: latestTelemetry.status === 'CRITICAL' ? 'var(--alarm-red)' : '#fff' }}>
                        {latestTelemetry.temperature} °C ({systemState.throttling_fps} FPS)
                      </strong>
                    </div>
                    <span>🌀</span>
                  </div>
                </div>

              </div>
            )}

            {/* ================= SPA 畫面 2: 實時監控 (Live View - 8至12路電視牆) ================= */}
            {activeView === 'live_view' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                
                {/* 核心工作排版：左側通道與插槽配置面板，右側電視牆 */}
                <div style={{ flex: 1, display: 'flex', gap: '15px', overflow: 'hidden' }}>
                  
                  {/* 左側電視牆通道管理器 (專業工控面板樣式) */}
                  <div className="nvr-panel" style={{ width: '280px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
                    <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--nvr-text)', display: 'block' }}>📺 電視牆插槽配置</strong>
                      <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>自訂多分割畫面監看通道</span>
                    </div>

                    {/* 插槽選取器 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', fontWeight: 'bold' }}>1. 點選指定視窗 (Slot)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: screenLayout === 'grid-1' ? '1fr' : '1fr 1fr', gap: '6px' }}>
                        {activeSlots.map((cameraId, idx) => {
                          const limit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
                          if (screenLayout === 'grid-1' && idx !== selectedSlotIndex) {
                            return null;
                          }
                          if (screenLayout !== 'grid-1' && idx >= limit) {
                            return null;
                          }
                          const isSel = selectedSlotIndex === idx;
                          const camName = cameras.find(c => c.id === cameraId)?.name.split(' - ')[0] || `CH${idx+1}`;
                          return (
                            <button
                              key={`slot-btn-${idx}`}
                              onClick={() => {
                                setSelectedSlotIndex(idx);
                                if (screenLayout === 'grid-1') {
                                  setSelectedCameraId(activeSlots[idx]);
                                }
                              }}
                              className={`nvr-btn ${isSel ? 'active' : ''}`}
                              style={{ fontSize: '11px', padding: '5px', height: '32px' }}
                            >
                              {isSel ? '🎯' : '🔲'} 視窗 {idx + 1} ({camName})
                            </button>
                          );
                        })}
                      </div>
                      </div>

                      <div style={{ borderBottom: '1px dashed var(--nvr-border)' }}></div>

                      {/* 攝影機通道指派清單 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                        <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', fontWeight: 'bold' }}>2. 選擇攝影機通道進行分配</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '350px' }}>
                          {cameras.map(cam => {
                            // 檢查此攝影機是否已被指派，指派在哪幾個插槽
                            const assignedSlots = [];
                            if (screenLayout === 'grid-1') {
                              if (activeSlots[selectedSlotIndex] === cam.id) {
                                assignedSlots.push(selectedSlotIndex + 1);
                              }
                            } else {
                              const limit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
                              activeSlots.slice(0, limit).forEach((id, idx) => {
                                if (id === cam.id) assignedSlots.push(idx + 1);
                              });
                            }

                            return (
                              <button
                                key={`assign-cam-${cam.id}`}
                                onClick={() => handleAssignCameraToSlot(selectedSlotIndex, cam.id)}
                                className="nvr-btn"
                                style={{
                                  fontSize: '11px',
                                  justifyContent: 'flex-start',
                                  padding: '8px 10px',
                                  borderColor: assignedSlots.length > 0 ? 'var(--info-blue)' : 'var(--nvr-border)',
                                  backgroundColor: assignedSlots.length > 0 ? 'rgba(59, 130, 246, 0.05)' : 'var(--nvr-btn-bg)',
                                  textAlign: 'left'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '10px', flexShrink: 0 }}>🎥</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name.split(' - ')[0]}</span>
                                  </div>
                                  {assignedSlots.length > 0 && (
                                    <span style={{ fontSize: '9px', background: 'var(--info-blue)', color: '#fff', padding: '1px 4px', borderRadius: '2px', flexShrink: 0 }}>
                                      視窗 {assignedSlots.join(',')}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>


                    </div>

                  {/* 右側監控網格區域 */}
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden', border: '2px solid var(--nvr-border)', borderRadius: '4px' }}>
                    
                    {/* 使用 React 狀態產生的電視牆網格 */}
                    <div className={`camera-grid ${screenLayout}`}>
                      
                      {(() => {
                        if (screenLayout === 'grid-1') {
                          // grid-1: 僅顯示目前選中的那一路
                          const cam = cameras.find(c => c.id === selectedCameraId) || cameras[0];
                          const isCH1Alarm = cam.id === 'CAM_A_DIST_BOARD' && (systemState.confirmed_fire || systemState.suspected_fire);
                          const isSystemFaultCell = cam.id === 'CAM_A_DIST_BOARD' && systemState.system_fault;
                          
                          return (
                            <div 
                              key={cam.id}
                              onClick={() => {
                                // 在 grid-1 下，再點一次可切換回多路（預設回到 grid-12）
                                setScreenLayout('grid-12');
                              }}
                              className={`camera-cell selected ${isCH1Alarm ? 'alarm-active' : ''} ${isSystemFaultCell ? 'fault-active' : ''}`}
                            >
                              <div className="camera-static"></div>
                              
                              {/* OSD 頂部左側：支援點擊與下拉選單 */}
                              <div className="camera-osd top-left" style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                <span style={{ fontWeight: 'bold', background: 'rgba(0, 0, 0, 0.5)', padding: '2px 6px', borderRadius: '3px' }}>
                                  視窗 {selectedSlotIndex + 1}
                                </span>
                                <span style={{ textShadow: '1px 1px 2px #000', fontSize: '11px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {cam.name.split(' - ')[1] || cam.name}
                                </span>
                                <select
                                  value={cam.id}
                                  onChange={(e) => {
                                    handleAssignCameraToSlot(selectedSlotIndex, e.target.value);
                                  }}
                                  style={{
                                    background: 'rgba(22, 24, 29, 0.95)',
                                    border: '1px solid var(--nvr-border)',
                                    color: 'var(--nvr-text)',
                                    fontSize: '10px',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    marginLeft: '2px',
                                    pointerEvents: 'auto'
                                  }}
                                >
                                  {cameras.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name.split(' - ')[0] /* CH1, CH2等 */}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="camera-osd top-right">
                                {pictureMode !== 'default' && (
                                  <span style={{
                                    backgroundColor: pictureMode === 'vivid' ? 'var(--info-blue)' :
                                                    pictureMode === 'infrared' ? 'var(--nvr-text-muted)' : 'var(--alarm-red)',
                                    padding: '1px 4px',
                                    borderRadius: '2px',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    marginRight: '5px'
                                  }}>
                                    {pictureMode.toUpperCase()}
                                  </span>
                                )}
                                {cam.isAI && <span style={{ backgroundColor: 'rgba(255, 51, 102, 0.7)', padding: '1px 4px', borderRadius: '2px', fontSize: '9px' }}>AI ACTIVE</span>}
                                <span style={{ color: '#10b981' }}>● REC</span>
                              </div>
                              
                              {/* OSD 底部標籤：時間與物理引擎簡短狀態 */}
                              <div className="camera-osd bottom-left">{nvrTime}</div>
                              <div className="camera-osd bottom-right" style={{ fontSize: '10px' }}>
                                {cam.id === 'CAM_A_DIST_BOARD' 
                                  ? (systemState.confirmed_fire ? '🔥 ALARM TRIGGERED' : systemState.suspected_fire ? '⚠️ DETECTING FIRE...' : '🟢 SAFE') 
                                  : '🟢 NORMAL'}
                              </div>

                              {/* 渲染真實影像 (CH1) 或 模擬影像 (CH2~12) */}
                              <div style={{ 
                                width: '100%', 
                                height: '100%', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                overflow: 'hidden',
                                filter: pictureMode === 'vivid' ? 'contrast(1.35) saturate(1.2)' :
                                        pictureMode === 'infrared' ? 'grayscale(1) contrast(1.2) brightness(0.95)' :
                                        pictureMode === 'thermal' ? 'grayscale(1) invert(1) sepia(1) hue-rotate(200deg) saturate(3.5) contrast(1.4)' : 'none'
                              }}>
                                {cam.id === 'CAM_A_DIST_BOARD' ? (
                                  streamData?.image ? (
                                    <img
                                      src={streamData.image}
                                      alt="Realtime Cam Stream"
                                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                  ) : (
                                    <div style={{ color: 'var(--nvr-text-muted)', textAlign: 'center', fontSize: '12px' }}>
                                      <span style={{ fontSize: '24px', display: 'block', animation: 'flash-slow 1s infinite alternate' }}>🎥</span>
                                      正在讀取 A棟配電櫃 RTSP 串流...
                                    </div>
                                  )
                                ) : (
                                  renderSimulatedChannel(cam.id)
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          // 4, 9, 12 等多分割螢幕，按 slots 渲染
                          const layoutLimit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
                          const slotsToRender = activeSlots.slice(0, layoutLimit);
                          
                          return slotsToRender.map((cameraId, slotIndex) => {
                            const cam = cameras.find(c => c.id === cameraId) || cameras[0];
                            const isSlotSelected = selectedSlotIndex === slotIndex;
                            const isCH1Alarm = cam.id === 'CAM_A_DIST_BOARD' && (systemState.confirmed_fire || systemState.suspected_fire);
                            const isSystemFaultCell = cam.id === 'CAM_A_DIST_BOARD' && systemState.system_fault;
                            
                            return (
                              <div 
                                key={`slot-${slotIndex}-${cam.id}`}
                                onClick={() => {
                                  setSelectedSlotIndex(slotIndex);
                                  setSelectedCameraId(cam.id);
                                  // 雙擊或再次點擊已選中的 slot 可以放大成單螢幕 (grid-1)
                                  if (isSlotSelected) {
                                    setScreenLayout('grid-1');
                                  }
                                }}
                                className={`camera-cell ${isSlotSelected ? 'selected' : ''} ${isCH1Alarm ? 'alarm-active' : ''} ${isSystemFaultCell ? 'fault-active' : ''}`}
                              >
                                <div className="camera-static"></div>
                                
                                {/* OSD 頂部左側：支援點擊與下拉選單 */}
                                <div className="camera-osd top-left" style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                  <span style={{ fontWeight: 'bold', background: 'rgba(0, 0, 0, 0.5)', padding: '2px 6px', borderRadius: '3px' }}>
                                    視窗 {slotIndex + 1}
                                  </span>
                                  <span style={{ textShadow: '1px 1px 2px #000', fontSize: '11px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cam.name.split(' - ')[1] || cam.name}
                                  </span>
                                  <select
                                    value={cam.id}
                                    onChange={(e) => {
                                      handleAssignCameraToSlot(slotIndex, e.target.value);
                                    }}
                                    style={{
                                      background: 'rgba(22, 24, 29, 0.95)',
                                      border: '1px solid var(--nvr-border)',
                                      color: 'var(--nvr-text)',
                                      fontSize: '10px',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      outline: 'none',
                                      marginLeft: '2px',
                                      pointerEvents: 'auto'
                                    }}
                                  >
                                    {cameras.map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.name.split(' - ')[0] /* CH1, CH2等 */}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="camera-osd top-right">
                                  {pictureMode !== 'default' && (
                                    <span style={{
                                      backgroundColor: pictureMode === 'vivid' ? 'var(--info-blue)' :
                                                      pictureMode === 'infrared' ? 'var(--nvr-text-muted)' : 'var(--alarm-red)',
                                      padding: '1px 4px',
                                      borderRadius: '2px',
                                      fontSize: '9px',
                                      fontWeight: 'bold',
                                      marginRight: '5px'
                                    }}>
                                      {pictureMode.toUpperCase()}
                                    </span>
                                  )}
                                  {cam.isAI && <span style={{ backgroundColor: 'rgba(255, 51, 102, 0.7)', padding: '1px 4px', borderRadius: '2px', fontSize: '9px' }}>AI ACTIVE</span>}
                                  <span style={{ color: '#10b981' }}>● REC</span>
                                </div>
                                
                                {/* OSD 底部標籤：時間與物理引擎簡短狀態 */}
                                <div className="camera-osd bottom-left">{nvrTime}</div>
                                <div className="camera-osd bottom-right" style={{ fontSize: '10px' }}>
                                  {cam.id === 'CAM_A_DIST_BOARD' 
                                    ? (systemState.confirmed_fire ? '🔥 ALARM TRIGGERED' : systemState.suspected_fire ? '⚠️ DETECTING FIRE...' : '🟢 SAFE') 
                                    : '🟢 NORMAL'}
                                </div>

                                {/* 渲染真實影像 (CH1) 或 模擬影像 (CH2~12) */}
                                <div style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  display: 'flex', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  overflow: 'hidden',
                                  filter: pictureMode === 'vivid' ? 'contrast(1.35) saturate(1.2)' :
                                          pictureMode === 'infrared' ? 'grayscale(1) contrast(1.2) brightness(0.95)' :
                                          pictureMode === 'thermal' ? 'grayscale(1) invert(1) sepia(1) hue-rotate(200deg) saturate(3.5) contrast(1.4)' : 'none'
                                }}>
                                  {cam.id === 'CAM_A_DIST_BOARD' ? (
                                    streamData?.image ? (
                                      <img
                                        src={streamData.image}
                                        alt="Realtime Cam Stream"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                      />
                                    ) : (
                                      <div style={{ color: 'var(--nvr-text-muted)', textAlign: 'center', fontSize: '12px' }}>
                                        <span style={{ fontSize: '24px', display: 'block', animation: 'flash-slow 1s infinite alternate' }}>🎥</span>
                                        正在讀取 A棟配電櫃 RTSP 串流...
                                      </div>
                                    )
                                  ) : (
                                    renderSimulatedChannel(cam.id)
                                  )}
                                </div>
                              </div>
                            );
                          });
                        }
                      })()}
                      
                    </div>
 
                  </div>
 
                </div>

                {/* 底部電視牆控制控制列 (與照片一致) */}
                <div className="nvr-panel" style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setScreenLayout('grid-1')} className={`nvr-btn ${screenLayout === 'grid-1' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>1-Screen</button>
                    <button onClick={() => setScreenLayout('grid-4')} className={`nvr-btn ${screenLayout === 'grid-4' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>4-Screen</button>
                    <button onClick={() => setScreenLayout('grid-9')} className={`nvr-btn ${screenLayout === 'grid-9' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>9-Screen</button>
                    <button onClick={() => setScreenLayout('grid-12')} className={`nvr-btn ${screenLayout === 'grid-12' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>12-Screen</button>

                    {/* 精緻的實施分割線與快捷控制列 */}
                    <div style={{ width: '1px', background: 'var(--nvr-border)', height: '20px', margin: '0 8px' }}></div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={handlePrevScreen} 
                        disabled={screenLayout === 'grid-12'}
                        className="nvr-btn" 
                        style={{ 
                          fontSize: '11px', 
                          padding: '6px 10px',
                          opacity: screenLayout === 'grid-12' ? 0.4 : 1,
                          cursor: screenLayout === 'grid-12' ? 'not-allowed' : 'pointer'
                        }}
                        title="上一分頁螢幕"
                      >
                        ◁ 上一頁
                      </button>
                      <button 
                        onClick={handleNextScreen} 
                        disabled={screenLayout === 'grid-12'}
                        className="nvr-btn" 
                        style={{ 
                          fontSize: '11px', 
                          padding: '6px 10px',
                          opacity: screenLayout === 'grid-12' ? 0.4 : 1,
                          cursor: screenLayout === 'grid-12' ? 'not-allowed' : 'pointer'
                        }}
                        title="下一分頁螢幕"
                      >
                        ▷ 下一頁
                      </button>
                      <button 
                        onClick={() => {
                          if (screenLayout === 'grid-12') {
                            alert("提示：12分割電視牆已滿版顯示全部通道，無需輪巡。請先切換至 單螢幕、4分割 或 9分割 畫面後啟動輪巡！");
                            return;
                          }
                          setIsAutoTouring(p => !p);
                        }} 
                        className={`nvr-btn ${isAutoTouring ? 'active' : ''}`}
                        style={{ 
                          fontSize: '11px', 
                          padding: '6px 10px',
                          border: isAutoTouring ? '1px solid var(--normal-green)' : '1px solid var(--nvr-border)',
                          boxShadow: isAutoTouring ? '0 0 5px rgba(16, 185, 129, 0.3)' : 'none',
                          color: isAutoTouring ? 'var(--normal-green)' : 'inherit',
                          fontWeight: isAutoTouring ? 'bold' : 'normal'
                        }}
                        title="啟動/停止自動畫面輪巡輪播"
                      >
                        🔄 {isAutoTouring ? '輪巡中 (ON)' : '自動輪巡'}
                      </button>
                      <button 
                        onClick={handleCyclePictureMode} 
                        className="nvr-btn" 
                        style={{ 
                          fontSize: '11px', 
                          padding: '6px 10px',
                          border: pictureMode !== 'default' ? '1px solid var(--alarm-red)' : '1px solid var(--nvr-border)',
                          boxShadow: pictureMode !== 'default' ? '0 0 5px rgba(255, 51, 102, 0.3)' : 'none',
                          color: pictureMode !== 'default' ? 'var(--alarm-red)' : 'inherit',
                          fontWeight: pictureMode !== 'default' ? 'bold' : 'normal'
                        }}
                        title="循環切換全電視牆圖片渲染濾鏡"
                      >
                        🎨 {pictureMode === 'default' ? '圖片模式' : pictureMode.toUpperCase()}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>提示：雙擊畫面可放大；底欄可即時控制輪巡分頁與圖片濾鏡</span>
                    <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ fontSize: '12px', borderColor: 'var(--nvr-border-focus)' }}>
                      返回主選單 🏠
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ================= SPA 畫面 3: 歷史回放 (Playback) ================= */}
            {activeView === 'playback' && (
              <div className="nvr-panel" style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>📂</span>
                    <strong style={{ fontSize: '16px' }}>歷史錄影與火警雙特徵告警重播控制台 (NVR Playback Control)</strong>
                  </div>
                  <button onClick={() => { setIsPlaybackPlaying(false); setActiveView('main_menu'); }} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', flex: 1 }}>
                  {/* 左側：控制參數與當日日誌 */}
                  <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label className="nvr-label">📅 選擇回放日期</label>
                      <input 
                        type="date" 
                        value={selectedPlaybackDate} 
                        onChange={(e) => {
                          setSelectedPlaybackDate(e.target.value);
                          // 自動將時間跳至該日第一個事件，若無則設為早上 8 點
                          const evts = PLAYBACK_EVENTS[e.target.value];
                          if (evts && evts.length > 0) {
                            setPlaybackTime(evts[0].time);
                          } else {
                            setPlaybackTime(28800); // 08:00:00
                          }
                          setIsPlaybackPlaying(false);
                        }} 
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (err) {}
                        }}
                        className="nvr-input" 
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    
                    <div>
                      <label className="nvr-label">🎥 選擇監控通道</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                        {cameras.map(cam => {
                          const isAssigned = selectedPlaybackCamId === cam.id;
                          return (
                            <button 
                              key={cam.id} 
                              onClick={() => {
                                setSelectedPlaybackCamId(cam.id);
                                // 切換相機時暫停播放，以防視覺混亂
                                setIsPlaybackPlaying(false);
                              }}
                              className={`nvr-btn ${isAssigned ? 'active' : ''}`}
                              style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '6px 10px', width: '100%' }}
                            >
                              <span style={{ marginRight: '6px' }}>{isAssigned ? '⏺' : '🎥'}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name.split(' - ')[0]} - {cam.name.split(' - ')[1] || cam.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--nvr-border)', paddingTop: '12px' }}>
                      <label className="nvr-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📌 當日歷史事件日誌</span>
                        <span style={{ fontSize: '9px', background: 'var(--alarm-red)', color: '#fff', padding: '1px 4px', borderRadius: '2px', display: selectedPlaybackDate === '2026-05-30' ? 'inline' : 'none' }}>AI CONFIRMED</span>
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px', marginTop: '6px' }}>
                        {PLAYBACK_EVENTS[selectedPlaybackDate]?.map((evt, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setPlaybackTime(evt.time);
                              setSelectedPlaybackCamId(evt.camId);
                              setIsPlaybackPlaying(true);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: selectedPlaybackCamId === evt.camId && playbackTime >= evt.time && playbackTime < evt.time + 300
                                ? '1px solid var(--alarm-red)' 
                                : '1px solid var(--nvr-border)',
                              borderRadius: '3px',
                              padding: '8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              transition: 'all 0.2s',
                              boxShadow: selectedPlaybackCamId === evt.camId && playbackTime >= evt.time && playbackTime < evt.time + 300
                                ? '0 0 5px rgba(255, 51, 102, 0.15)'
                                : 'none'
                            }}
                            className="playback-event-item"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', alignItems: 'center' }}>
                              <span style={{ color: evt.icon === '🚨' || evt.icon === '🔥' ? 'var(--alarm-red)' : 'inherit' }}>{evt.icon} {evt.type}</span>
                              <span style={{ color: 'var(--info-blue)', fontFamily: 'monospace', fontSize: '10px' }}>{evt.timeStr}</span>
                            </div>
                            <div style={{ color: 'var(--nvr-text-muted)', fontSize: '10px', lineHeight: '1.3' }}>
                              {evt.desc}
                            </div>
                          </div>
                        ))}
                        {(!PLAYBACK_EVENTS[selectedPlaybackDate] || PLAYBACK_EVENTS[selectedPlaybackDate].length === 0) && (
                          <div style={{ color: 'var(--nvr-text-muted)', fontSize: '11px', textAlign: 'center', padding: '20px 10px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                            🗄️ 該日無告警歷史事件記錄
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右側：回放畫面與時間軸 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* 高擬真重播螢幕 */}
                    <div style={{ flex: 1, background: '#000', border: '2px solid var(--nvr-border)', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '350px', overflow: 'hidden' }}>
                      
                      {renderPlaybackScreen(selectedPlaybackCamId, playbackTime)}
                      
                      {/* 右上角 OSD 時間與日期 */}
                      <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '3px', fontSize: '12px', fontFamily: 'monospace', color: '#fff', zIndex: 10, backdropFilter: 'blur(3px)', letterSpacing: '0.5px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                        📅 {selectedPlaybackDate} &nbsp;&nbsp; ⏰ {formatSecondsToHMS(playbackTime)}
                      </div>

                      {/* 左上角播放狀態標籤 */}
                      <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '3px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10, color: '#fff', backdropFilter: 'blur(3px)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                        <span className="led-indicator led-green" style={{ display: isPlaybackPlaying ? 'inline-block' : 'none', margin: 0 }}></span>
                        <span className="led-indicator led-yellow" style={{ display: !isPlaybackPlaying ? 'inline-block' : 'none', margin: 0, animation: 'none' }}></span>
                        <strong>{isPlaybackPlaying ? `重播中 (${playbackSpeed}.0x SPEED)` : '重播暫停 (PAUSED)'}</strong>
                      </div>

                      {/* 電視監控掃描線效果 (增強 Wow Factor!) */}
                      <div className="camera-static" style={{ opacity: 0.03, pointerEvents: 'none', zIndex: 8 }}></div>
                    </div>

                    {/* NVR 24小時時間軸滑塊與控制面板 */}
                    <div className="nvr-panel" style={{ padding: '15px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--nvr-text-muted)', marginBottom: '5px', padding: '0 2px' }}>
                        <span>00:00</span>
                        <span>04:00</span>
                        <span>08:00</span>
                        <span>12:00</span>
                        <span>16:00</span>
                        <span>20:00</span>
                        <span>24:00</span>
                      </div>
                      
                      <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
                        {/* 歷史事件高亮標記區段 (10:20 - 10:30) */}
                        {selectedPlaybackDate === '2026-05-30' && (
                          <div 
                            style={{
                              position: 'absolute',
                              left: `${(37200 / 86400) * 100}%`,
                              width: `${(600 / 86400) * 100}%`,
                              height: '8px',
                              backgroundColor: 'rgba(255, 51, 102, 0.45)',
                              borderLeft: '1px solid var(--alarm-red)',
                              borderRight: '1px solid var(--alarm-red)',
                              borderRadius: '2px',
                              top: '8px',
                              zIndex: 1,
                              pointerEvents: 'none',
                              boxShadow: '0 0 8px rgba(255, 51, 102, 0.4)'
                            }}
                            title="AI 雙特徵火警告警錄影區段 (10:20:00 - 10:30:00)"
                          ></div>
                        )}
                        <input 
                          type="range" 
                          min="0" 
                          max="86399" 
                          value={Math.floor(playbackTime)} 
                          onChange={(e) => {
                            setPlaybackTime(Number(e.target.value));
                            setIsPlaybackPlaying(false); // 拖曳時自動暫停，讓使用者平穩檢視畫面
                          }}
                          className="nvr-timeline-slider"
                          style={{ 
                            width: '100%', 
                            accentColor: 'var(--nvr-border-focus)',
                            position: 'relative',
                            zIndex: 2,
                            cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.05)',
                            height: '6px',
                            borderRadius: '3px',
                            outline: 'none'
                          }} 
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                        {/* 控制按鈕 */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={() => {
                              setPlaybackTime(prev => Math.max(0, prev - 10));
                            }} 
                            className="nvr-btn" 
                            style={{ fontSize: '11px', padding: '6px 12px' }}
                            title="倒退 10 秒"
                          >
                            ⏪ -10s
                          </button>
                          
                          <button 
                            onClick={() => setIsPlaybackPlaying(!isPlaybackPlaying)} 
                            className={`nvr-btn ${isPlaybackPlaying ? 'active' : ''}`}
                            style={{ 
                              fontSize: '11px', 
                              padding: '6px 16px', 
                              fontWeight: 'bold',
                              borderColor: isPlaybackPlaying ? 'var(--normal-green)' : 'var(--nvr-border)',
                              boxShadow: isPlaybackPlaying ? '0 0 5px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                          >
                            {isPlaybackPlaying ? '⏸ 暫停重播' : '▶ 啟動重播'}
                          </button>
                          
                          <button 
                            onClick={() => {
                              setPlaybackTime(prev => Math.min(86399, prev + 10));
                            }} 
                            className="nvr-btn" 
                            style={{ fontSize: '11px', padding: '6px 12px' }}
                            title="前進 10 秒"
                          >
                            ⏩ +10s
                          </button>
                          
                          <div style={{ width: '1px', background: 'var(--nvr-border)', height: '18px', margin: '0 8px' }}></div>
                          
                          <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)' }}>重播倍率:</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 4, 8, 16].map(speed => (
                              <button 
                                key={speed} 
                                onClick={() => setPlaybackSpeed(speed)} 
                                className={`nvr-btn ${playbackSpeed === speed ? 'active' : ''}`}
                                style={{ 
                                  fontSize: '10px', 
                                  padding: '4px 8px',
                                  fontWeight: playbackSpeed === speed ? 'bold' : 'normal'
                                }}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 當前狀態與時間顯示 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {selectedPlaybackDate === '2026-05-30' && playbackTime >= 37200 && playbackTime <= 37800 && (
                            <span 
                              style={{ 
                                background: 'rgba(255, 51, 102, 0.15)', 
                                border: '1px solid var(--alarm-red)', 
                                color: 'var(--alarm-red)', 
                                padding: '3px 8px', 
                                borderRadius: '3px', 
                                fontSize: '11px', 
                                fontWeight: 'bold',
                                animation: 'flash-slow 0.8s infinite alternate' 
                              }}
                            >
                              🚨 火警告警區段重播中
                            </span>
                          )}
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace', background: '#0e1117', border: '1px solid var(--nvr-border)', padding: '5px 12px', borderRadius: '3px' }}>
                            ⏱️ 當前時間戳: <span style={{ color: 'var(--info-blue)', fontSize: '14px' }}>{formatSecondsToHMS(playbackTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SPA 畫面 4: 新增攝影機 (Add Camera) ================= */}
            {activeView === 'add_camera' && (
              <div className="nvr-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', overflow: 'visible' }}>
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '16px' }}>
                    {editingCamera ? `📝 編輯與更新工廠攝影機通道 (${parsedEditInfo.ch})` : '➕ 新增與管理工廠攝影機通道 (Camera Provisioning)'}
                  </strong>
                    <button onClick={() => { setEditingCamera(null); setActiveView('main_menu'); }} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                  </div>

                  <form 
                    key={editingCamera ? editingCamera.id : 'add'}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target;
                      const name = form.camName.value;
                      const ch = form.camCh.value;
                      const area = form.camArea.value || '未定義區域';
                      const isAI = form.camAI.checked;
                      const rtsp = form.camRtsp.value;
                      const format = form.camFormat.value;
                      
                      if (editingCamera) {
                        setCameras(prev => prev.map(cam => {
                          if (cam.id === editingCamera.id) {
                            return {
                              ...cam,
                              name: `${ch} - ${name}`,
                              area: area,
                              isAI: isAI,
                              rtsp: rtsp,
                              format: format
                            };
                          }
                          return cam;
                        }));
                        alert(`成功更新攝影機：${ch} - ${name}！`);
                        setEditingCamera(null);
                      } else {
                        const newCamId = `CAM_CUSTOM_${Date.now()}`;
                        const newCam = {
                          id: newCamId,
                          name: `${ch} - ${name}`,
                          area: area,
                          status: 'ONLINE',
                          isAI: isAI,
                          type: 'Simulated',
                          rtsp: rtsp,
                          format: format
                        };
                        
                        setCameras(prev => [...prev, newCam]);
                        alert(`成功新增攝影機：${ch} - ${name}！已即時同步至電視牆。`);
                      }
                      form.reset();
                    }} 
                    style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label className="nvr-label">攝影機通道 (CH)</label>
                        <select name="camCh" className="nvr-input" defaultValue={parsedEditInfo.ch}>
                          {Array.from({ length: 16 }, (_, i) => `CH${i + 1}`).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="nvr-label">攝影機自訂名稱</label>
                        <input name="camName" type="text" placeholder="例如：I棟成品倉庫西北角" className="nvr-input" defaultValue={parsedEditInfo.customName} required />
                      </div>
                    </div>

                    <div>
                      <label className="nvr-label">RTSP 視訊串流網址 (RTSP Stream Link)</label>
                      <input name="camRtsp" type="text" placeholder="rtsp://admin:password@192.168.1.100:554/h264/ch1/main/av_stream" className="nvr-input" defaultValue={editingCamera?.rtsp || 'rtsp://admin:password@192.168.1.100:554/h264/ch1/main/av_stream'} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label className="nvr-label">部署工廠區域</label>
                        <input name="camArea" type="text" placeholder="例如：成品包裝區" className="nvr-input" defaultValue={editingCamera ? editingCamera.area : ''} />
                      </div>

                      <div>
                        <label className="nvr-label">視訊編碼格式</label>
                        <select name="camFormat" className="nvr-input" defaultValue={editingCamera?.format || 'H.265 (智慧壓縮 - 推薦)'}>
                          <option value="H.265 (智慧壓縮 - 推薦)">H.265 (智慧壓縮 - 推薦)</option>
                          <option value="H.264">H.264</option>
                          <option value="MJPEG">MJPEG</option>
                        </select>
                      </div>
                    </div>

                    <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)' }}>
                      <label className="nvr-label" style={{ color: '#fff', fontSize: '13px' }}>🧠 啟用 AI 二階段特徵分析功能</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input name="camAI" type="checkbox" defaultChecked={editingCamera ? editingCamera.isAI : true} /> 火焰 YOLO 核心檢測
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input name="camSmoke" type="checkbox" defaultChecked={editingCamera ? editingCamera.isAI : true} /> 煙霧背景模糊檢測
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input name="camHuman" type="checkbox" defaultChecked={false} /> 人車入侵辨識
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button type="submit" className="nvr-btn" style={{ flex: 1, padding: '12px', border: '1px solid var(--nvr-border-focus)', fontSize: '13px', fontWeight: 'bold' }}>
                        {editingCamera ? '💾 儲存並更新相機配置' : '💾 儲存並啟用此相機通道'}
                      </button>
                      {editingCamera && (
                        <button 
                          type="button" 
                          onClick={() => setEditingCamera(null)} 
                          className="nvr-btn" 
                          style={{ padding: '12px 20px', borderColor: 'var(--nvr-border)', fontSize: '13px' }}
                        >
                          ❌ 取消編輯
                        </button>
                      )}
                    </div>
                  </form>

                {/* 攝影機列表與刪減管理 */}
                <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--nvr-text)', display: 'block' }}>📹 目前已啟用攝影機清單 (已登記 {cameras.length} 台)</strong>
                    <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>支援即時刪減，電視牆將自動過濾被移除之通道</span>
                  </div>
                  <div style={{ width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--nvr-border)', color: 'var(--nvr-text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>通道/名稱</th>
                          <th>區域</th>
                          <th>AI功能</th>
                          <th>連線狀態</th>
                          <th style={{ textAlign: 'right' }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cameras.map(cam => (
                          <tr key={cam.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px', color: '#fff', fontWeight: 'bold' }}>{cam.name}</td>
                            <td>{cam.area}</td>
                            <td>
                              <span style={{
                                backgroundColor: cam.isAI ? 'rgba(255, 51, 102, 0.15)' : 'rgba(255,255,255,0.05)',
                                color: cam.isAI ? 'var(--alarm-red)' : 'var(--nvr-text-muted)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '10px'
                              }}>
                                {cam.isAI ? 'AI 雙特徵' : '常規視訊'}
                              </span>
                            </td>
                            <td>
                              <span className="led-indicator led-green" style={{ marginRight: '6px' }}></span>
                              <span style={{ color: 'var(--normal-green)' }}>ONLINE</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {cam.id === 'CAM_A_DIST_BOARD' ? (
                                <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', fontStyle: 'italic' }}>系統核心鎖定</span>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <button
                                    onClick={() => {
                                      setEditingCamera(cam);
                                      const mainEl = document.querySelector('main');
                                      if (mainEl) {
                                        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
                                      }
                                    }}
                                    className="nvr-btn"
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      marginRight: '8px',
                                      borderColor: editingCamera?.id === cam.id ? 'var(--nvr-border-focus)' : 'var(--nvr-border)',
                                      boxShadow: editingCamera?.id === cam.id ? '0 0 5px rgba(255, 51, 102, 0.3)' : 'none',
                                      color: editingCamera?.id === cam.id ? 'var(--nvr-border-focus)' : 'inherit'
                                    }}
                                  >
                                    📝 編輯
                                  </button>

                                  {deleteConfirmCamId === cam.id ? (
                                    <button
                                      onClick={() => {
                                        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
                                        setDeleteConfirmCamId(null);
                                        
                                        if (confirm(`⚠️ 安全警告：您確定要永久刪除攝影機「${cam.name}」嗎？\n此操作將即時把該通道移出電視牆，且不可復原！`)) {
                                          setCameras(prev => prev.filter(c => c.id !== cam.id));
                                          if (editingCamera?.id === cam.id) {
                                            setEditingCamera(null);
                                          }
                                        }
                                      }}
                                      className="nvr-btn"
                                      style={{
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        backgroundColor: 'var(--alarm-red)',
                                        borderColor: 'var(--alarm-red)',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        animation: 'flash-fast 0.5s infinite alternate'
                                      }}
                                    >
                                      ⚠️ 再次點選以確認！
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
                                        setDeleteConfirmCamId(cam.id);
                                        
                                        deleteTimerRef.current = setTimeout(() => {
                                          setDeleteConfirmCamId(null);
                                        }, 5000);
                                      }}
                                      className="nvr-btn"
                                      style={{
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        backgroundColor: 'rgba(255, 51, 102, 0.08)',
                                        borderColor: 'rgba(255, 51, 102, 0.3)',
                                        color: 'var(--alarm-red)'
                                      }}
                                    >
                                      🗑️ 刪除
                                     </button>
                                   )}
                                 </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ================= SPA 畫面 5: 搜尋與日誌 (Search) ================= */}
            {activeView === 'search' && (() => {
              // 在渲染前先過濾日誌
              const filteredLogs = systemState.alarm_logs.filter(log => {
                // 1. 事件分類篩選
                if (activeCategory === 'shunt_trip' && !log.shunt_trip) {
                  return false;
                }
                if (activeCategory === 'fire_auto' && log.shunt_trip === false) {
                  // 如果只看火警，則必須是告警日誌
                }
                if (activeCategory === 'fault') {
                  return false; // 目前系統日誌皆為火警相關，故此分類查無資料
                }

                // 2. 日期篩選
                if (activeDate) {
                  if (!log.timestamp.startsWith(activeDate)) {
                    return false;
                  }
                }

                // 3. 關鍵字篩選 (不分大小寫)
                if (activeKeyword) {
                  const kw = activeKeyword.toLowerCase();
                  const camIdMatch = log.camera_id.toLowerCase().includes(kw);
                  const timestampMatch = log.timestamp.toLowerCase().includes(kw);
                  const idMatch = `#${log.id}`.includes(kw);
                  if (!camIdMatch && !timestampMatch && !idMatch) {
                    return false;
                  }
                }

                return true;
              });

              return (
                <div className="nvr-panel" style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '16px' }}>🔍 歷史告警日誌與微調負樣本搜尋 (Event Logs Search)</strong>
                    <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                  </div>

                  {/* 搜尋過濾條件 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px 120px', gap: '15px', alignItems: 'flex-end' }}>
                    <div>
                      <label className="nvr-label">事件分類</label>
                      <select 
                        className="nvr-input" 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="all">所有事件 (火警與故障)</option>
                        <option value="fire_auto">🚨 AI 自動火警通報</option>
                        <option value="shunt_trip">⚡ 分勵脫扣器切斷電源</option>
                        <option value="fault">⚠️ 系統故障/心跳中斷</option>
                      </select>
                    </div>
                    <div>
                      <label className="nvr-label">查詢起訖時間</label>
                      <input 
                        type="date" 
                        className="nvr-input" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.target.showPicker();
                          } catch (err) {}
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div>
                      <label className="nvr-label">部署通道區域</label>
                      <input 
                        type="text" 
                        placeholder="輸入關鍵字如：A棟" 
                        className="nvr-input" 
                        value={filterKeyword}
                        onChange={(e) => setFilterKeyword(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setActiveCategory(filterCategory);
                        setActiveDate(filterDate);
                        setActiveKeyword(filterKeyword);
                      }} 
                      className="nvr-btn" 
                      style={{ width: '100%', height: '38px', borderColor: 'var(--nvr-border-focus)' }}
                    >
                      搜尋 🔍
                    </button>
                    <button 
                      onClick={() => {
                        setFilterCategory('all');
                        setFilterDate('2026-05-31');
                        setFilterKeyword('');
                        setActiveCategory('all');
                        setActiveDate('2026-05-31');
                        setActiveKeyword('');
                      }} 
                      className="nvr-btn" 
                      style={{ width: '100%', height: '38px', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                    >
                      重設 🔄
                    </button>
                  </div>

                  {/* 篩選條件狀態展示 */}
                  <div style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', display: 'flex', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '4px' }}>
                    <span>已套用篩選 ── 分類: <strong>{activeCategory === 'all' ? '全部' : activeCategory === 'fire_auto' ? '自動火警通報' : activeCategory === 'shunt_trip' ? '分勵脫扣斷電' : '系統故障'}</strong></span>
                    <span>日期: <strong>{activeDate || '無限制'}</strong></span>
                    <span>關鍵字: <strong>{activeKeyword || '無限制'}</strong></span>
                    <span style={{ marginLeft: 'auto', color: 'var(--info-blue)' }}>找到 <strong>{filteredLogs.length}</strong> 筆符合條件的日誌</span>
                  </div>

                  {/* 日誌結果表格 (與原本的日誌完美同步) */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--nvr-border)', color: 'var(--nvr-text-muted)' }}>
                          <th style={{ padding: '10px' }}>編號</th>
                          <th>事件時間</th>
                          <th>事件類型</th>
                          <th>部署通道</th>
                          <th>特徵信賴度</th>
                          <th>分勵脫扣斷電</th>
                          <th>告警截圖備份</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log, idx) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--nvr-border)' }}>
                              <td style={{ padding: '10px' }}>#{log.id}</td>
                              <td>{log.timestamp}</td>
                              <td style={{ color: log.shunt_trip ? 'var(--alarm-red)' : 'var(--alarm-yellow)', fontWeight: 'bold' }}>
                                {log.shunt_trip ? '🚨 AI 自動火警通報' : '⚠️ AI 疑似火警預警'}
                              </td>
                              <td>{log.camera_id}</td>
                              <td>{(log.confidence * 100).toFixed(1)}%</td>
                              <td style={{ color: log.shunt_trip ? 'var(--alarm-red)' : 'var(--nvr-text-muted)' }}>
                                {log.shunt_trip ? '⚡ 已斷開 (DISCONNECTED)' : '🔌 未聯動'}
                              </td>
                              <td>
                                {log.snapshot && (
                                  <a 
                                    href={`http://127.0.0.1:8000${log.snapshot}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ color: 'var(--info-blue)', textDecoration: 'underline' }}
                                  >
                                    查看 JPG 影像
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--nvr-text-muted)' }}>
                              🗄️ 查無符合條件的告警歷史事件記錄
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })()}

            {/* ================= SPA 畫面 6: 遙測與物理特徵資訊 (Information) ================= */}
            {activeView === 'information' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', overflowY: 'auto', paddingRight: '5px' }}>
                
                {/* 頂部資訊條 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌀 遙測資訊與工業安全防禦中心 <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>Telemetry & Active Defense</span>
                  </span>
                  <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 12px', fontSize: '11px' }}>返回主選單 🏠</button>
                </div>

                {/* 響應式自適應網格版面 (防擠壓，在大螢幕會雙欄並排，在窄視窗會自動垂直排列) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', width: '100%' }}>
                  
                  {/* ================= 左側控制區 ================= */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 卡片一：GPU 核心健康遙測與自適應降載保護 */}
                    <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(9, 10, 12, 0.45)', backdropFilter: 'blur(10px)' }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>🌀 GPU 顯示卡狀態與自適應降載保護</strong>
                        <button 
                          onClick={handleToggleOverheat}
                          className="nvr-btn"
                          style={{ fontSize: '10px', padding: '3px 8px', backgroundColor: overheatMode ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255,255,255,0.05)', borderColor: overheatMode ? 'var(--alarm-red)' : 'var(--nvr-border)', color: overheatMode ? 'var(--alarm-red)' : '#fff' }}
                        >
                          {overheatMode ? '🔥 關閉核心過熱模擬' : '⚡ 模擬顯示卡過熱降載'}
                        </button>
                      </div>

                      {/* 四格即時遙測 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="nvr-panel" style={{ padding: '10px 15px', background: '#06080b', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', display: 'block', marginBottom: '2px' }}>GPU 核心溫度</span>
                          <strong style={{ fontSize: '20px', color: latestTelemetry.status === 'CRITICAL' ? 'var(--alarm-red)' : latestTelemetry.status === 'WARNING' ? 'var(--alarm-yellow)' : '#fff' }}>
                            {latestTelemetry.temperature} °C
                          </strong>
                        </div>
                        <div className="nvr-panel" style={{ padding: '10px 15px', background: '#06080b', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', display: 'block', marginBottom: '2px' }}>核心風扇轉速</span>
                          <strong style={{ fontSize: '20px', color: 'var(--info-blue)' }}>{latestTelemetry.fan_speed} %</strong>
                        </div>
                        <div className="nvr-panel" style={{ padding: '10px 15px', background: '#06080b', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', display: 'block', marginBottom: '2px' }}>GPU 晶片使用率</span>
                          <strong style={{ fontSize: '18px', color: 'rgba(255,255,255,0.85)' }}>{latestTelemetry.gpu_utilization} %</strong>
                        </div>
                        <div className="nvr-panel" style={{ padding: '10px 15px', background: '#06080b', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', display: 'block', marginBottom: '2px' }}>顯示記憶體佔用</span>
                          <strong style={{ fontSize: '18px', color: 'rgba(255,255,255,0.85)' }}>{latestTelemetry.memory_percent} %</strong>
                        </div>
                      </div>

                      {/* 降載狀態與策略 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>降載運作狀態:</span>
                          <strong style={{ color: latestTelemetry.status === 'CRITICAL' ? 'var(--alarm-red)' : 'var(--normal-green)' }}>
                            {latestTelemetry.status === 'CRITICAL' ? `🚨 降載運作中 (${systemState.throttling_fps} FPS 保護核心)` : `🟢 正常運作 (${systemState.throttling_fps} FPS 滿載分析)`}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span>自適應降載策略:</span>
                          <div style={{ display: 'inline-flex', gap: '3px', background: '#090a0c', padding: '2px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {[
                              { id: 'smart', name: '🧠 智慧平衡' },
                              { id: 'safe', name: '🛡️ 安全防護' },
                              { id: 'performance', name: '⚡ 效能優先' }
                            ].map(p => (
                              <button 
                                key={p.id}
                                onClick={() => handleSetThrottlingPolicy(p.id)}
                                className={`nvr-btn ${systemState.throttling_policy === p.id ? 'active' : ''}`}
                                style={{ fontSize: '9px', padding: '2px 6px', fontWeight: systemState.throttling_policy === p.id ? 'bold' : 'normal' }}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 卡片二：強冷風扇手動遙控 */}
                    <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(9, 10, 12, 0.45)', backdropFilter: 'blur(10px)' }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>🌀 遙測強冷風扇手動遙控 (Manual Override)</strong>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => handleSetFanControl('auto', 45)} 
                            className={`nvr-btn ${latestTelemetry.fan_mode !== 'manual' ? 'active' : ''}`}
                            style={{ fontSize: '9px', padding: '2px 8px' }}
                          >
                            自動 (Auto)
                          </button>
                          <button 
                            onClick={() => handleSetFanControl('manual', latestTelemetry.fan_speed)} 
                            className={`nvr-btn ${latestTelemetry.fan_mode === 'manual' ? 'active' : ''}`}
                            style={{ fontSize: '9px', padding: '2px 8px' }}
                          >
                            手動 (Manual)
                          </button>
                        </div>
                      </div>

                      {/* 滑桿控制 */}
                      <div style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: 'var(--nvr-text-muted)' }}>手動強制風扇轉速：</span>
                          <strong style={{ color: latestTelemetry.fan_mode === 'manual' ? 'var(--info-blue)' : 'var(--nvr-text-muted)' }}>
                            {latestTelemetry.fan_speed} % {latestTelemetry.fan_mode === 'manual' ? '(強制送風強冷中)' : '(自動管理中)'}
                          </strong>
                        </div>
                        <input 
                          type="range" 
                          min="35" 
                          max="100" 
                          value={latestTelemetry.fan_mode === 'manual' ? latestTelemetry.fan_speed : 45} 
                          disabled={latestTelemetry.fan_mode !== 'manual'}
                          onChange={(e) => handleSetFanControl('manual', e.target.value)}
                          style={{ 
                            width: '100%', 
                            cursor: latestTelemetry.fan_mode === 'manual' ? 'pointer' : 'not-allowed',
                            accentColor: 'var(--info-blue)',
                            opacity: latestTelemetry.fan_mode === 'manual' ? 1.0 : 0.4
                          }} 
                        />
                        <span style={{ fontSize: '9px', color: 'var(--nvr-text-muted)', fontStyle: 'italic' }}>
                          ※ 廠務提示：手動將強冷風扇開大 (85% 以上)，可快速為 GPU 核心排熱模擬降溫，進而自動重置自適應降載。
                        </span>
                      </div>
                    </div>

                    {/* 卡片三：斷路器分勵脫扣器防禦控制 */}
                    <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(255, 51, 102, 0.02)', border: '1px solid rgba(255, 51, 102, 0.1)', backdropFilter: 'blur(10px)' }}>
                      <div style={{ borderBottom: '1px solid rgba(255,51,102,0.15)', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--alarm-red)', display: 'flex', alignItems: 'center', gap: '6px' }}>⚡ 斷路器分勵脫扣器安全狀態與手動防禦</strong>
                      </div>

                      {/* 繼電器狀態條 */}
                      <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: systemState.shunt_trip_triggered ? 'rgba(255, 51, 102, 0.08)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${systemState.shunt_trip_triggered ? 'var(--alarm-red)' : 'rgba(16, 185, 129, 0.2)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: systemState.shunt_trip_triggered ? 'var(--alarm-red)' : 'var(--normal-green)' }}>
                            {systemState.shunt_trip_triggered ? '⚡ 脫扣器已斷電釋放 (PROTECTED)' : '🔌 繼電器通電監控中 (MONITORING)'}
                          </span>
                          {/* 顯示自檢健康狀態 */}
                          {!isCoilTesting && coilTestResult === 'success' && (
                            <span style={{ fontSize: '10px', color: 'var(--normal-green)', animation: 'flash-slow 1s infinite alternate', fontWeight: 'bold' }}>
                              🟢 脫扣線圈健康 OK
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', marginTop: '4px' }}>
                          分勵脫扣器與 A棟高壓配電櫃完成實體電路串接。當 AI 確認火警時，毫秒級自動切斷供電以防二次災害。
                        </p>
                      </div>

                      {/* 手動聯動控制按鈕群 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => handleShuntTripControl('trip')}
                            disabled={systemState.shunt_trip_triggered}
                            className="nvr-btn"
                            style={{ 
                              flex: 1, 
                              padding: '10px', 
                              backgroundColor: systemState.shunt_trip_triggered ? 'rgba(255,51,102,0.1)' : 'rgba(255, 51, 102, 0.2)', 
                              borderColor: 'var(--alarm-red)', 
                              color: '#fff', 
                              fontWeight: 'bold',
                              fontSize: '11px',
                              animation: systemState.shunt_trip_triggered ? 'none' : 'flash-slow 1.5s infinite alternate',
                              cursor: systemState.shunt_trip_triggered ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ⚡ 手動緊急跳閘斷電
                          </button>
                          
                          {systemState.shunt_trip_triggered && (
                            <button 
                              onClick={() => handleShuntTripControl('reset')}
                              className="nvr-btn"
                              style={{ 
                                flex: 1, 
                                padding: '10px', 
                                backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                                borderColor: 'var(--normal-green)', 
                                color: '#fff', 
                                fontWeight: 'bold',
                                fontSize: '11px'
                              }}
                            >
                              🔌 遠端重送電復歸
                            </button>
                          )}
                        </div>

                        {/* 自檢按鈕與進度列 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button 
                            onClick={() => handleShuntTripControl('test')}
                            disabled={isCoilTesting}
                            className="nvr-btn"
                            style={{ 
                              padding: '8px', 
                              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                              borderColor: 'rgba(255,255,255,0.15)', 
                              fontSize: '11px',
                              cursor: isCoilTesting ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isCoilTesting ? '🛠️ 線圈脈衝自檢中...' : '🛠️ 執行遠端脫扣線圈自檢 (Dry Run)'}
                          </button>
                          
                          {isCoilTesting && (
                            <div style={{ width: '100%', height: '6px', background: '#000', borderRadius: '3px', overflow: 'hidden', marginTop: '2px' }}>
                              <div style={{ height: '100%', background: 'var(--info-blue)', width: `${coilTestProgress}%`, transition: 'width 0.15s ease' }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ================= 右側示波器與物理特徵 ================= */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 火焰特徵示波器卡片 */}
                    <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(9, 10, 12, 0.45)', backdropFilter: 'blur(10px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--alarm-red)', display: 'flex', alignItems: 'center', gap: '6px' }}>🔥 火焰物理特徵實時示波器 (Flame Frequency Scope)</strong>
                        <span style={{ fontSize: '11px', color: 'var(--alarm-red)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                          CH1 Freq: {(activeDetections.find(d => d.type === 'flame')?.stats?.flicker_freq || 0.0).toFixed(1)} Hz
                        </span>
                      </div>

                      {/* 示波器 Canvas 容器 - 寬度 100% 自適應 */}
                      <div style={{ width: '100%', height: '150px', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <canvas 
                          ref={flameCanvasRef} 
                          style={{ width: '100%', height: '100%', display: 'block' }} 
                        />
                      </div>

                      {/* 物理數值 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '11px', padding: '5px 10px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
                        <div>火焰色彩佔用率 (HSI比率): <strong style={{ color: '#fff' }}>{(activeDetections.find(d => d.type === 'flame')?.stats?.color_ratio * 100 || 0).toFixed(1)}%</strong></div>
                        <div>火焰光敏閃爍不規則度: <strong style={{ color: '#fff' }}>{(activeDetections.find(d => d.type === 'flame')?.stats?.irregularity || 0.0).toFixed(1)}</strong></div>
                      </div>
                    </div>

                    {/* 煙霧特徵示波器卡片 */}
                    <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(9, 10, 12, 0.45)', backdropFilter: 'blur(10px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--info-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>☁️ 煙霧背景清晰度損失實時示波器 (Clarity Loss Scope)</strong>
                        <span style={{ fontSize: '11px', color: 'var(--info-blue)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                          CH1 Loss: {(activeDetections.find(d => d.type === 'smoke')?.stats?.clarity_loss * 100 || 0.0).toFixed(0)}%
                        </span>
                      </div>

                      {/* 示波器 Canvas 容器 - 寬度 100% 自適應 */}
                      <div style={{ width: '100%', height: '150px', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <canvas 
                          ref={smokeCanvasRef} 
                          style={{ width: '100%', height: '100%', display: 'block' }} 
                        />
                      </div>

                      {/* 物理數值 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '11px', padding: '5px 10px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px' }}>
                        <div>高頻模糊梯度損失: <strong style={{ color: '#fff' }}>{(activeDetections.find(d => d.type === 'smoke')?.stats?.clarity_loss * 100 || 0).toFixed(1)}%</strong></div>
                        <div>煙霧時空漂移向上斜率: <strong style={{ color: '#fff' }}>{(activeDetections.find(d => d.type === 'smoke')?.stats?.y_trend || 0.0).toFixed(2)}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SPA 畫面 7: 系統設定 (Settings) ================= */}
            {activeView === 'settings' && (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                
                {/* 左側：AI 演算法與硬體防禦連動參數 */}
                <div className="nvr-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '16px' }}>⚙️ AI 檢測與硬體防禦連動設定 (NVR & Shunt Trip Link)</strong>
                    <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                  </div>

                  {/* 顯示成功儲存 Toast 提示 */}
                  {saveSuccessMsg && (
                    <div style={{ 
                      padding: '12px 15px', 
                      backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                      color: 'var(--normal-green)', 
                      border: '1px solid var(--normal-green)', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      animation: 'flash-slow 1s alternate infinite'
                    }}>
                      {saveSuccessMsg}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label className="nvr-label">🚨 無人值守自動判定起火倒數時間</label>
                      <select 
                        className="nvr-input"
                        value={settingsForm.countdown_limit}
                        onChange={(e) => setSettingsForm({ ...settingsForm, countdown_limit: parseFloat(e.target.value) })}
                      >
                        <option value={10}>10 秒 (黃金搶救時間 - POC預設)</option>
                        <option value={30}>30 秒</option>
                        <option value={60}>60 秒</option>
                        <option value={120}>120 秒</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label className="nvr-label">YOLO 明火置信度門檻 (Confidence)</label>
                        <input 
                          type="number" 
                          step="0.05" 
                          min="0.10"
                          max="0.95"
                          value={settingsForm.yolo_confidence_threshold}
                          onChange={(e) => setSettingsForm({ ...settingsForm, yolo_confidence_threshold: parseFloat(e.target.value) || 0.45 })}
                          className="nvr-input" 
                        />
                      </div>
                      <div>
                        <label className="nvr-label">火焰閃爍頻率閾值 (Flicker Limit)</label>
                        <input 
                          type="number" 
                          step="0.5" 
                          min="1.0"
                          max="15.0"
                          value={settingsForm.flicker_frequency_limit}
                          onChange={(e) => setSettingsForm({ ...settingsForm, flicker_frequency_limit: parseFloat(e.target.value) || 5.0 })}
                          className="nvr-input" 
                        />
                      </div>
                    </div>

                    <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                        <input 
                          type="checkbox" 
                          checked={settingsForm.shunt_trip_enabled}
                          onChange={(e) => setSettingsForm({ ...settingsForm, shunt_trip_enabled: e.target.checked })}
                        /> 啟用分勵脫扣器 (Shunt Trip) 自動切斷電源防護
                      </label>
                      <p style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', marginTop: '5px', paddingLeft: '22px' }}>
                        ※ 安全聲明：啟用後，若無人值守倒數歸零，NVR 將直接對繼電器輸出訊號，強制切斷配電櫃總閘，防範火勢蔓延。
                      </p>
                    </div>

                    <button 
                      onClick={handleSaveSettings}
                      className="nvr-btn" 
                      style={{ 
                        marginTop: '10px', 
                        padding: '12px', 
                        backgroundColor: 'var(--nvr-border-focus)', 
                        borderColor: 'var(--nvr-border-focus)', 
                        color: '#fff', 
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      💾 儲存並套用 AI 與硬體防禦連動參數
                    </button>
                  </div>
                </div>

                {/* 右側：行動端多軌推送模擬器 (整合原本的手機殼與通報) */}
                <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
                  <strong style={{ fontSize: '14px', borderBottom: '1px solid var(--nvr-border)', paddingBottom: '5px' }}>
                    📱 行動回報多媒體推送展示模擬器 (黃金三元素)
                  </strong>

                  {/* 切換通知類型按鈕 */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['discord', 'email', 'line_tg'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveMobileTab(tab)}
                        className={`nvr-btn ${activeMobileTab === tab ? 'active' : ''}`}
                        style={{ fontSize: '11px', padding: '4px 10px', flex: 1 }}
                      >
                        {tab === 'discord' ? 'Discord Webhook' : tab === 'email' ? 'Email HTML' : 'Line / Telegram'}
                      </button>
                    ))}
                  </div>

                  {/* 手機外殼 */}
                  <div style={{ flex: 1, background: '#1c1e24', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', borderRadius: '4px', border: '1px solid var(--nvr-border)' }}>
                    <div style={{ 
                      width: '270px', 
                      height: '350px', 
                      borderRadius: '20px', 
                      border: '6px solid #2d3142', 
                      background: '#090a0f', 
                      boxShadow: '0 8px 20px rgba(0,0,0,0.6)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {/* 劉海 */}
                      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '90px', height: '14px', background: '#2d3142', borderRadius: '0 0 8px 8px', zIndex: 10 }}></div>
                      
                      {/* 手機內容區 */}
                      <div style={{ flex: 1, padding: '12px 10px 10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#fff', marginTop: '10px' }}>
                        
                        {/* Discord Webhook */}
                        {activeMobileTab === 'discord' && (
                          <div style={{ background: '#2f3136', borderRadius: '6px', padding: '8px', color: '#dcddde' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                              <span>🤖</span>
                              <strong>AI Fire Sentinel (Bot)</strong>
                            </div>
                            <div style={{ borderLeft: '3px solid #ff3366', background: '#202225', padding: '6px', borderRadius: '2px' }}>
                              <strong style={{ fontSize: '11px', color: '#fff' }}>🚨 工業 AI 火警與煙霧通報</strong>
                              <p style={{ fontSize: '10px', color: '#b9bbbe', marginTop: '3px' }}>
                                A棟配電櫃百葉窗偵測到火焰物理特徵！
                              </p>
                              {systemState.confirmed_fire && streamData?.image && (
                                <img src={streamData.image} alt="Discord Snapshot" style={{ width: '100%', borderRadius: '2px', marginTop: '5px' }} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Email HTML */}
                        {activeMobileTab === 'email' && (
                          <div style={{ background: '#1c1d26', border: '1px solid #ff3366', borderRadius: '6px', padding: '8px' }}>
                            <div style={{ borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '4px', fontSize: '10px', color: 'var(--nvr-text-muted)' }}>
                              寄件人: secure-sentinel@factory.com
                            </div>
                            <strong style={{ color: '#fff', fontSize: '10px', display: 'block' }}>🚨 【緊急警報】工業 AI 火災防範！</strong>
                            <p style={{ fontSize: '9px', color: '#ccc', marginTop: '4px' }}>
                              配電櫃已自動觸發分勵脫扣器切斷電源供電。
                            </p>
                            {systemState.confirmed_fire && streamData?.image && (
                              <img src={streamData.image} alt="Email Attachment" style={{ width: '100%', borderRadius: '2px', marginTop: '4px' }} />
                            )}
                          </div>
                        )}

                        {/* Line / TG */}
                        {activeMobileTab === 'line_tg' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ background: '#182533', borderRadius: '6px', padding: '6px' }}>
                              <span style={{ color: '#4aa0eb', fontSize: '10px', fontWeight: 'bold' }}>Telegram Security Channel</span>
                              <p style={{ fontSize: '10px', marginTop: '2px' }}>
                                🚨 *火災緊急警報*<br/>
                                位置: A棟配電櫃<br/>
                                狀態: 🔌 已自動斷電保護！
                              </p>
                            </div>
                            <div style={{ background: '#252932', borderLeft: '3px solid #06c755', borderRadius: '4px', padding: '6px' }}>
                              <span style={{ color: '#06c755', fontSize: '10px', fontWeight: 'bold' }}>LINE Notify</span>
                              <p style={{ fontSize: '10px', marginTop: '2px' }}>
                                🚨【火災警報】A棟配電櫃已執行安全防範斷電！
                              </p>
                            </div>
                          </div>
                        )}

                        {!systemState.confirmed_fire && (
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--nvr-text-muted)', fontSize: '10px', textAlign: 'center', padding: '10px' }}>
                            📭 收件匣暫無新警報。當 AI 判定為真实火警時，在此即時顯示黃金三元素通知。
                          </div>
                        )}

                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ================= SPA 畫面 8: 操作說明 (Help) ================= */}
            {activeView === 'help' && (
              <div className="nvr-panel" style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ❓ 工廠消防 SOP 操作指引與 AI 排除誤報說明 (Operation Guide)
                  </strong>
                  <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 12px', fontSize: '12px' }}>返回主選單 🏠</button>
                </div>

                {/* 四大分頁頁籤 */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  {[
                    { id: 'core', label: '📖 系統核心運作', desc: '雙重驗證特徵機制' },
                    { id: 'sop', label: '🚨 火警應變 SOP', desc: '狀態機應變流程' },
                    { id: 'finetune', label: '🧠 AI 誤報微調', desc: '人在迴圈微調白皮書' },
                    { id: 'hardware', label: '🔌 設備與自檢維護', desc: '硬體健康與自檢' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setHelpTab(tab.id)}
                      className={`nvr-btn ${helpTab === tab.id ? 'active' : ''}`}
                      style={{ 
                        flex: 1, 
                        padding: '10px 15px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: helpTab === tab.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                        borderColor: helpTab === tab.id ? 'var(--nvr-border-focus)' : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.2s ease',
                        borderRadius: '4px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: helpTab === tab.id ? 'var(--nvr-border-focus)' : '#fff' }}>{tab.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)' }}>{tab.desc}</span>
                    </button>
                  ))}
                </div>

                {/* 分頁內容區 */}
                <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {/* 分頁 1: 系統核心運作 */}
                  {helpTab === 'core' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="nvr-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--info-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🌀 雙重特徵驗證引擎 (Dual-Feature Verification)</span>
                          <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'normal' }}>AI 深度學習 + 實體物理特徵</span>
                        </h4>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', margin: '0 0 15px 0' }}>
                          本系統採用獨創的「AI 雙重特徵驗證引擎」，徹底為您解決傳統工廠視訊火警監控中常見的「電焊火花、反光、強光、動態異物」引起的誤報問題。當系統偵測到可能之威脅時，需同時通過以下雙重安全門檻：
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div style={{ padding: '15px', background: 'rgba(9, 10, 12, 0.4)', borderRadius: '4px', border: '1px solid rgba(255, 69, 0, 0.15)' }}>
                            <strong style={{ color: 'var(--alarm-red)', display: 'block', fontSize: '13px', marginBottom: '8px' }}>🔥 明火雙重特徵檢測核心</strong>
                            <ol style={{ paddingLeft: '18px', fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                              <li><strong>YOLOv8 深度神經網路：</strong>即時定位明火邊界框（預設信賴度門檻: 45%）。</li>
                              <li><strong>實體閃爍頻率分析 (Flicker Frequency)：</strong>捕捉火焰特有的光敏閃爍特徵。真實明火之 Flickering 頻率多落於 <strong>5.0 ~ 15.0 Hz</strong> 之間。若頻率不符，系統判定為誤報（如固定紅光或非閃爍反光）。</li>
                            </ol>
                          </div>
                          
                          <div style={{ padding: '15px', background: 'rgba(9, 10, 12, 0.4)', borderRadius: '4px', border: '1px solid rgba(0, 191, 255, 0.15)' }}>
                            <strong style={{ color: 'var(--info-blue)', display: 'block', fontSize: '13px', marginBottom: '8px' }}>☁️ 煙霧雙重特徵檢測核心</strong>
                            <ol style={{ paddingLeft: '18px', fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                              <li><strong>煙霧背景清晰度分析：</strong>定位高頻模糊特徵與清晰度損失比率（Clarity Loss，門檻 &gt; 30%）。</li>
                              <li><strong>時空向上漂移斜率：</strong>利用時序光流法 (Optical Flow) 追蹤特徵點。真實煙霧具備特有的向上、向四周擴散漂移軌跡。若偵測物體向下墜落或橫向高速移動，系統將自動排除。</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="nvr-panel" style={{ padding: '15px 20px', background: 'rgba(255, 255, 255, 0.01)', borderColor: 'rgba(255,255,255,0.03)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🧠</span>
                        <div style={{ color: 'var(--nvr-text-muted)', lineHeight: '1.5' }}>
                          <strong>技術白皮書提醒：</strong>若您要調整 YOLO 置信度或閃爍頻率閾值，請至「系統設定 ⚙️」分頁進行微調，所有更改將即時寫入後端推理核心，並完成硬碟持久化儲存。
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 分頁 2: 火警應變 SOP */}
                  {helpTab === 'sop' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
                        
                        {/* 左側三階段 SOP */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <div className="nvr-panel" style={{ padding: '15px', background: 'rgba(255, 153, 51, 0.03)', borderColor: 'rgba(255, 153, 51, 0.15)' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <span style={{ background: 'var(--alarm-yellow)', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>1</span>
                              <div>
                                <strong style={{ color: 'var(--alarm-yellow)', display: 'block', fontSize: '13px', marginBottom: '4px' }}>第一階段：疑似火警預警（動態倒數計時）</strong>
                                <p style={{ fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>
                                  當 AI 檢測與物理特徵雙重驗證通過時，控制台切換為<strong>「疑似火警 🚨」</strong>狀態，啟動無人值守倒數計時（預設 <strong>10 秒</strong>）。此時系統已同步透過 <strong>FastAPI 多軌多媒體通知模組</strong> 推送告警訊息至 Discord、Email、Line 與 Telegram。
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="nvr-panel" style={{ padding: '15px', background: 'rgba(255, 51, 102, 0.04)', borderColor: 'rgba(255, 51, 102, 0.15)' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <span style={{ background: 'var(--alarm-red)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>2</span>
                              <div>
                                <strong style={{ color: 'var(--alarm-red)', display: 'block', fontSize: '13px', marginBottom: '4px' }}>第二階段：無人值守自動跳閘（自動防禦連動）</strong>
                                <p style={{ fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>
                                  若倒數計時歸零且無人干預，系統自動判定為真實火警。若在設定中啟用了<strong>「分勵脫扣器自動斷電連動」</strong>，NVR 會即時送出繼電器脈衝信號，<strong>強行切斷 A棟高壓配電櫃總閘電源</strong>，防範火勢因電氣短路蔓延。同時系統會擷取該畫面的備份存檔。
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="nvr-panel" style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <span style={{ background: 'var(--normal-green)', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>3</span>
                              <div>
                                <strong style={{ color: 'var(--normal-green)', display: 'block', fontSize: '13px', marginBottom: '4px' }}>第三階段：現場確認、處置與誤報排除</strong>
                                <p style={{ fontSize: '12px', margin: 0, color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>
                                  值班人員應穿戴防毒面具，帶乾粉/二氧化碳滅火器（切忌用水）前往 A棟 現場。
                                  <br />
                                  - <strong>若為真實火災：</strong>立即撥打 119 通報消防局，啟動全廠疏散。
                                  <br />
                                  - <strong>若確認為誤報：</strong>在控制台按下「排除此誤報」按鈕，系統將自動復歸斷路器、清除警報狀態，並自動採集誤報樣本。
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 右側流程摘要小面板 */}
                        <div className="nvr-panel" style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                          <strong style={{ fontSize: '12px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '5px' }}>⚡ 毫秒級自動跳閘優勢</strong>
                          <div style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', lineHeight: '1.4' }}>
                            在工廠火災中，<strong>70% 以上的二次災害是由電氣火災蔓延所致</strong>。當高壓配電櫃起火時，水噴灑或火勢延燒會引發大範圍短路與爆炸。
                            <br /><br />
                            自動分勵脫扣跳閘能在火警確認的<strong>首個 100 毫秒內</strong>阻斷電流，有效杜絕二次災害發生。
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* 分頁 3: AI 誤報微調 */}
                  {helpTab === 'finetune' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div className="nvr-panel" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.02)', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--normal-green)', fontSize: '14px' }}>🧠 人在迴圈 (Human-in-the-Loop) AI 自適應學習與二次微調白皮書</h4>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', margin: '0 0 15px 0' }}>
                          沒有任何 AI 模型能夠 100% 避免誤報，因為不同工廠的背景光影、機械動態、電焊火花各有不同。本系統實作了<strong>「人在迴圈負樣本採集機制」</strong>，讓值班人員能主動協助 AI 在本地進行二次微調（Fine-tuning），使該工廠環境之誤報率趨近於 0%。
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                          
                          {/* 負樣本採集流程 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <strong style={{ fontSize: '12px', color: '#fff' }}>📁 負樣本自動採集與存檔</strong>
                            <div style={{ padding: '12px', background: '#090a0f', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                              當值班操作員在警報期間點選<strong>「排除此誤報」</strong>時：
                              <ol style={{ paddingLeft: '15px', margin: '5px 0 0 0', lineHeight: '1.5' }}>
                                <li>系統會自動將該誤報畫面（包含標籤與物理遙測數值）擷取。</li>
                                <li>自動儲存至伺服器專屬路徑：
                                  <br />
                                  <code style={{ color: 'var(--normal-green)', fontFamily: 'monospace', display: 'block', margin: '4px 0', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', wordBreak: 'break-all' }}>
                                    /backend/data/negative_samples/neg_YYYYMMDD_HHMMSS.jpg
                                  </code>
                                </li>
                                <li>後端系統的負樣本計數器會自動 +1，並在儀表板即時同步顯示。</li>
                              </ol>
                            </div>
                          </div>

                          {/* 本地二次微調實務手冊 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <strong style={{ fontSize: '12px', color: '#fff' }}>🛠️ 本地二次微調（Fine-tuning）實務指南</strong>
                            <div style={{ padding: '12px', background: '#090a0f', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '11px', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span>收集足夠的負樣本（建議達 <strong>30 ~ 50 張</strong>）後，廠區 IT 人員可手動執行後端二次微調腳本，以更新 YOLOv8 明火權重模型：</span>
                              <div style={{ background: '#030406', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                <span style={{ position: 'absolute', right: '10px', top: '5px', fontSize: '9px', color: 'var(--nvr-text-muted)' }}>Bash</span>
                                <code style={{ color: 'var(--info-blue)', fontFamily: 'monospace', display: 'block', whiteSpace: 'pre-wrap', fontSize: '10px' }}>
                                  # 執行本地 YOLOv8 二次訓練<br />
                                  python core/retrain.py --data config.yaml --epochs 15 --batch 8 --negatives ./data/negative_samples/
                                </code>
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--nvr-text-muted)', fontStyle: 'italic' }}>
                                ※ 備註：微調完成後，腳本會自動將新模型覆蓋至 `backend/data/models/yolov8n.pt`。NVR 系統檢測引擎會在毫秒級自動重新載入新模型，無須重啟伺服器。
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* 分頁 4: 設備與自檢維護 */}
                  {helpTab === 'hardware' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        
                        {/* GPU 自適應降載與維護 */}
                        <div className="nvr-panel" style={{ padding: '18px', background: 'rgba(255,255,255,0.02)' }}>
                          <strong style={{ color: 'var(--info-blue)', display: 'block', fontSize: '13px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                            🌀 GPU 顯示卡狀態與自適應降載保護 (Throttling)
                          </strong>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                            為確保系統在工廠高溫環境下 24 小時不間斷穩定運作，系統內建 GPU 核心溫度檢測核心：
                          </p>
                          <ul style={{ paddingLeft: '18px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <li><strong>過熱臨界判定：</strong>當 GPU 核心溫度<strong>大於 82 °C</strong> 時，系統狀態切換為 WARNING 或 CRITICAL。</li>
                            <li><strong>自適應降載：</strong>為防止 GPU 熱當機，系統會主動將影像分析幀率（FPS）降至低點（智慧平衡: 5 FPS；安全防護: 2 FPS），降低顯示晶片算力負載。</li>
                            <li><strong>手動強冷送風：</strong>若要快速排熱，操作員可在「遙測資訊與安全防禦中心」將風扇模式改為<strong>手動 (Manual)</strong>，滑動控制桿強開至 <strong>85% ~ 100%</strong> 強制送風，能快速為核心降溫以重置降載狀態。</li>
                          </ul>
                        </div>

                        {/* 脫扣器自檢與心跳超時 */}
                        <div className="nvr-panel" style={{ padding: '18px', background: 'rgba(255, 51, 102, 0.01)', borderColor: 'rgba(255, 51, 102, 0.05)' }}>
                          <strong style={{ color: 'var(--alarm-red)', display: 'block', fontSize: '13px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                            ⚡ 分勵脫扣器脈衝自檢與心跳監測
                          </strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <strong style={{ fontSize: '11px', color: '#fff', display: 'block', marginBottom: '3px' }}>1. 遠端脫扣線圈自檢 (Dry Run)</strong>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.4' }}>
                                為確保分勵線圈無燒毀、無斷路，操作員可點選<strong>「執行遠端脫扣線圈自檢 (Dry Run)」</strong>。後端會對線圈輸出微小的低功率高頻毫秒級自檢脈衝，僅做阻抗檢測而<strong>不會造成實體斷路器跳閘跳電</strong>。
                              </p>
                            </div>
                            
                            <div>
                              <strong style={{ fontSize: '11px', color: '#fff', display: 'block', marginBottom: '3px' }}>2. 60 秒心跳中斷監控 (System Fault)</strong>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.4' }}>
                                前置 NVR 採集模組或 I/O 繼電器會每分鐘向後端發送心跳訊號。若<strong>超過 60 秒</strong>未收到心跳，系統判定連線故障（連線中斷），自動發送離線警報，並於電視牆主畫面上方顯示警告橫幅。
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              </div>
            )}

          </main>
        </div>

        {/* Footer */}
        <footer style={{ height: '30px', backgroundColor: '#0b0c0e', borderTop: '2px solid var(--nvr-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', color: 'var(--nvr-text-muted)' }}>
          工業級 NVR AI 智慧火警與煙霧雙重特徵驗證防禦系統 | 台灣工廠專用電視牆版 V2.0
        </footer>
      </div>
    </>
  );
}

export default App;
