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
  const [screenLayout, setScreenLayout] = useState('grid-12'); // grid-1 | grid-4 | grid-9 | grid-12
  const [selectedCameraId, setSelectedCameraId] = useState('CAM_A_DIST_BOARD');
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);

  // 電視牆自訂通道與插槽狀態
  const [activeSlots, setActiveSlots] = useState(INITIAL_CAMERAS.map(c => c.id));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  // 電視牆自動輪巡、分頁與圖片模式狀態
  const [tourPage, setTourPage] = useState(0);
  const [isAutoTouring, setIsAutoTouring] = useState(false);
  const [pictureMode, setPictureMode] = useState('default'); // default | vivid | infrared | thermal

  // 指派相機到特定電視牆插槽
  const handleAssignCameraToSlot = (slotIndex, cameraId) => {
    setActiveSlots(prev => {
      const next = [...prev];
      next[slotIndex] = cameraId;
      return next;
    });
    if (slotIndex === selectedSlotIndex) {
      setSelectedCameraId(cameraId);
    }
    setIsAutoTouring(false); // 手動修改插槽時，停止自動輪巡以防衝突
  };

  // 重設為預設通道 (CH1 ~ CH12)
  const handleResetSlots = () => {
    setActiveSlots(INITIAL_CAMERAS.map(c => c.id));
    setSelectedSlotIndex(0);
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
        handleAssignCameraToSlot(selectedSlotIndex, nextCamId);
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
    shunt_trip_triggered: false,
    system_fault: false,
    system_fault_reason: "",
    negative_samples_count: 0,
    alarm_logs: [],
    throttling_fps: 15
  });
  
  const [activeMobileTab, setActiveMobileTab] = useState('discord'); // discord | email | line_tg
  const [overheatMode, setOverheatMode] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isPowerCycling, setIsPowerCycling] = useState(false); // 重啟 NVR 伺服器狀態
  
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
      if (data.state) {
        setSystemState(prev => ({
          ...prev,
          suspected_fire: data.state.suspected_fire,
          confirmed_fire: data.state.confirmed_fire,
          countdown_remaining: data.state.countdown_remaining,
          shunt_trip_triggered: data.state.shunt_trip_triggered,
          system_fault: data.state.system_fault,
          system_fault_reason: data.state.system_fault_reason
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
            throttling_fps: data.throttling_fps
          }));
        })
        .catch(err => console.error("拉取系統狀態失敗:", err));
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {activeSlots.slice(0, screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12).map((cameraId, idx) => {
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
                            const limit = screenLayout === 'grid-4' ? 4 : screenLayout === 'grid-9' ? 9 : 12;
                            activeSlots.slice(0, limit).forEach((id, idx) => {
                              if (id === cam.id) assignedSlots.push(idx + 1);
                            });

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

                      {/* 重設與動作區 */}
                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                          onClick={handleResetSlots}
                          className="nvr-btn"
                          style={{ fontSize: '11px', width: '100%', background: 'rgba(255,255,255,0.05)', color: 'var(--nvr-text)' }}
                        >
                          🔄 重設為預設通道 (CH1-CH12)
                        </button>
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
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '16px' }}>📂 歷史錄影與火警告警日誌回放 (Playback Control)</strong>
                  <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '20px', flex: 1 }}>
                  {/* 通道選擇與日期 */}
                  <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label className="nvr-label">📅 選擇回放日期</label>
                      <input type="date" defaultValue="2026-05-30" className="nvr-input" />
                    </div>
                    
                    <div>
                      <label className="nvr-label">🎥 選擇監控通道</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '250px', overflowY: 'auto' }}>
                        {cameras.map(cam => (
                          <button 
                            key={cam.id} 
                            onClick={() => setSelectedCameraId(cam.id)}
                            className={`nvr-btn ${selectedCameraId === cam.id ? 'active' : ''}`}
                            style={{ fontSize: '11px', justifyContent: 'flex-start', padding: '6px 10px' }}
                          >
                            {cam.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 回放畫面模擬與時間軸 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ flex: 1, background: '#000', border: '1px solid var(--nvr-border)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '300px' }}>
                      <div style={{ color: 'var(--nvr-text-muted)', textAlign: 'center' }}>
                        <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📼</span>
                        <strong>正在載入 {cameras.find(c => c.id === selectedCameraId)?.name} 歷史錄影...</strong>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>讀取 2026-05-30 H.265 本地備份日誌檔案</div>
                      </div>
                      <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '3px', fontSize: '11px' }}>
                        ▶ PLAYBACK MODE (2.0x SPEED)
                      </div>
                    </div>

                    {/* NVR 24小時時間軸滑塊 */}
                    <div className="nvr-panel" style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--nvr-text-muted)', marginBottom: '5px' }}>
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                      </div>
                      <input type="range" min="0" max="1440" defaultValue="625" style={{ width: '100%', accentColor: 'var(--nvr-border-focus)' }} />
                      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', fontWeight: 'bold' }}>
                        當前播放時間戳：10:25:31 (模擬火警前夕錄影)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SPA 畫面 4: 新增攝影機 (Add Camera) ================= */}
            {activeView === 'add_camera' && (
              <div className="nvr-panel" style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '16px' }}>➕ 新增與管理工廠攝影機通道 (Camera Provisioning)</strong>
                  <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target;
                    const name = form.camName.value;
                    const ch = form.camCh.value;
                    const area = form.camArea.value || '未定義區域';
                    const isAI = form.camAI.checked;
                    
                    const newCamId = `CAM_CUSTOM_${Date.now()}`;
                    const newCam = {
                      id: newCamId,
                      name: `${ch} - ${name}`,
                      area: area,
                      status: 'ONLINE',
                      isAI: isAI,
                      type: 'Simulated'
                    };
                    
                    setCameras(prev => [...prev, newCam]);
                    alert(`成功新增攝影機：${ch} - ${name}！已即時同步至電視牆。`);
                    form.reset();
                  }} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label className="nvr-label">攝影機通道 (CH)</label>
                      <select name="camCh" className="nvr-input">
                        <option>CH13</option>
                        <option>CH14</option>
                        <option>CH15</option>
                        <option>CH16</option>
                      </select>
                    </div>

                    <div>
                      <label className="nvr-label">攝影機自訂名稱</label>
                      <input name="camName" type="text" placeholder="例如：I棟成品倉庫西北角" className="nvr-input" required />
                    </div>
                  </div>

                  <div>
                    <label className="nvr-label">RTSP 視訊串流網址 (RTSP Stream Link)</label>
                    <input name="camRtsp" type="text" placeholder="rtsp://admin:password@192.168.1.100:554/h264/ch1/main/av_stream" className="nvr-input" required />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label className="nvr-label">部署工廠區域</label>
                      <input name="camArea" type="text" placeholder="例如：成品包裝區" className="nvr-input" />
                    </div>

                    <div>
                      <label className="nvr-label">視訊編碼格式</label>
                      <select name="camFormat" className="nvr-input">
                        <option>H.265 (智慧壓縮 - 推薦)</option>
                        <option>H.264</option>
                        <option>MJPEG</option>
                      </select>
                    </div>
                  </div>

                  <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)' }}>
                    <label className="nvr-label" style={{ color: '#fff', fontSize: '13px' }}>🧠 啟用 AI 二階段特徵分析功能</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input name="camAI" type="checkbox" defaultChecked /> 火焰 YOLO 核心檢測
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input name="camSmoke" type="checkbox" defaultChecked /> 煙霧背景模糊檢測
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input name="camHuman" type="checkbox" /> 人車入侵辨識
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="nvr-btn" style={{ padding: '12px', border: '1px solid var(--nvr-border-focus)', fontSize: '13px', fontWeight: 'bold' }}>
                    💾 儲存並啟用此相機通道
                  </button>
                </form>

                {/* 攝影機列表與刪減管理 */}
                <div className="nvr-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--nvr-text)', display: 'block' }}>📹 目前已啟用攝影機清單 (已登記 {cameras.length} 台)</strong>
                    <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>支援即時刪減，電視牆將自動過濾被移除之通道</span>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
                                <button
                                  onClick={() => {
                                    if (confirm(`確定要刪除攝影機「${cam.name}」嗎？此操作將會即時將其移出電視牆視窗。`)) {
                                      setCameras(prev => prev.filter(c => c.id !== cam.id));
                                    }
                                  }}
                                  className="nvr-btn"
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    backgroundColor: 'rgba(255, 51, 102, 0.1)',
                                    borderColor: 'rgba(255, 51, 102, 0.3)',
                                    color: 'var(--alarm-red)'
                                  }}
                                >
                                  🗑️ 刪除
                                </button>
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
            {activeView === 'search' && (
              <div className="nvr-panel" style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '16px' }}>🔍 歷史告警日誌與微調負樣本搜尋 (Event Logs Search)</strong>
                  <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                </div>

                {/* 搜尋過濾條件 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px', gap: '15px', alignItems: 'flex-end' }}>
                  <div>
                    <label className="nvr-label">事件分類</label>
                    <select className="nvr-input">
                      <option>所有事件 (火警與故障)</option>
                      <option>🚨 AI 自動火警通報</option>
                      <option>⚡ 分勵脫扣器切斷電源</option>
                      <option>⚠️ 系統故障/心跳中斷</option>
                    </select>
                  </div>
                  <div>
                    <label className="nvr-label">查詢起訖時間</label>
                    <input type="date" className="nvr-input" defaultValue="2026-05-30" />
                  </div>
                  <div>
                    <label className="nvr-label">部署通道區域</label>
                    <input type="text" placeholder="輸入關鍵字如：A棟" className="nvr-input" />
                  </div>
                  <button onClick={() => alert("過濾日誌成功！")} className="nvr-btn" style={{ width: '100%', height: '38px' }}>
                    搜尋 🔍
                  </button>
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
                      {systemState.alarm_logs.length > 0 ? (
                        systemState.alarm_logs.map((log, idx) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid var(--nvr-border)' }}>
                            <td style={{ padding: '10px' }}>#{log.id}</td>
                            <td>{log.timestamp}</td>
                            <td style={{ color: 'var(--alarm-red)', fontWeight: 'bold' }}>🚨 AI 自動火警通報</td>
                            <td>{log.camera_id}</td>
                            <td>{(log.confidence * 100).toFixed(1)}%</td>
                            <td style={{ color: 'var(--alarm-red)' }}>{log.shunt_trip ? '⚡ 已斷開 (DISCONNECTED)' : '🔌 未聯動'}</td>
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
                            🗄️ 目前無告警歷史事件記錄 (後端檔案空間設有 30MB 循環清理限制)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ================= SPA 畫面 6: 遙測與物理特徵資訊 (Information) ================= */}
            {activeView === 'information' && (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                
                {/* 左側：GPU 遙測與自適應降載保護 */}
                <div className="nvr-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '15px' }}>🌀 GPU 顯示卡狀態與自適應降載保護</strong>
                    <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '2px 8px', fontSize: '11px' }}>主選單 🏠</button>
                  </div>

                  <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--nvr-text-muted)' }}>顯示卡核心遙測：</span>
                      <button 
                        onClick={handleToggleOverheat}
                        className="nvr-btn"
                        style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: overheatMode ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255,255,255,0.05)', borderColor: overheatMode ? 'var(--alarm-red)' : 'var(--nvr-border)' }}
                      >
                        {overheatMode ? '🔥 關閉核心過熱模擬' : '⚡ 模擬顯示卡過熱降載'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                      <div className="nvr-panel" style={{ padding: '12px', background: '#090a0c', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', display: 'block' }}>顯示卡核心溫度</span>
                        <strong style={{ fontSize: '24px', color: latestTelemetry.status === 'CRITICAL' ? 'var(--alarm-red)' : latestTelemetry.status === 'WARNING' ? 'var(--alarm-yellow)' : '#fff' }}>
                          {latestTelemetry.temperature} °C
                        </strong>
                      </div>
                      <div className="nvr-panel" style={{ padding: '12px', background: '#090a0c', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', display: 'block' }}>核心風扇轉速</span>
                        <strong style={{ fontSize: '24px' }}>{latestTelemetry.fan_speed} %</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                      <div>顯示晶片使用率: <strong>{latestTelemetry.gpu_utilization}%</strong></div>
                      <div>顯示記憶體佔用: <strong>{latestTelemetry.memory_percent}%</strong></div>
                      <div>自適應降載狀態: <strong style={{ color: latestTelemetry.status === 'CRITICAL' ? 'var(--alarm-red)' : 'var(--normal-green)' }}>
                        {latestTelemetry.status === 'CRITICAL' ? '🚨 降載運作中 (5 FPS 保護核心過熱)' : '🟢 運作正常 (15 FPS 滿載分析)'}
                      </strong></div>
                    </div>
                  </div>

                  {/* 實體保護連動控制 */}
                  <div className="nvr-panel" style={{ padding: '15px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--nvr-text-muted)', display: 'block', marginBottom: '8px' }}>⚡ 斷路器分勵脫扣器安全狀態</strong>
                    <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: systemState.shunt_trip_triggered ? 'rgba(255, 51, 102, 0.08)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${systemState.shunt_trip_triggered ? 'var(--alarm-red)' : 'rgba(16, 185, 129, 0.2)'}` }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: systemState.shunt_trip_triggered ? 'var(--alarm-red)' : 'var(--normal-green)' }}>
                        {systemState.shunt_trip_triggered ? '⚡ 脫扣器已斷電釋放 (PROTECTED)' : '🔌 繼電器通電監控中 (MONITORING)'}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', marginTop: '4px' }}>
                        分勵脫扣器 (Shunt Trip) 與 A棟高壓配電櫃完成實體電路串接。當 AI 確認火警時，毫秒級自動切斷供電。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 右側：雙重物理特徵分析引擎遙測 */}
                <div className="nvr-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px' }}>
                    <strong style={{ fontSize: '15px' }}>🧠 二階段物理特徵驗證引擎實時遙測 (CH1)</strong>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--nvr-text-muted)' }}>
                    系統提取火災火焰的色彩頻率分佈 (YCbCr / HSI 比率) 及煙霧蔓延的邊界模糊高頻特徵，避免傳統純 YOLO 的物件辨識誤報。
                  </p>

                  {/* 火焰色彩與閃爍頻率 */}
                  <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--alarm-red)', display: 'block', marginBottom: '8px' }}>🔥 火焰物理特徵提取 (Flame Color & Flicker Freq)</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span>色彩佔用率 (HSI)</span>
                          <strong>{(activeDetections.find(d => d.type === 'flame')?.stats?.color_ratio * 100 || 0).toFixed(1)}%</strong>
                        </div>
                        <div style={{ height: '5px', background: '#000', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--alarm-red)', width: `${(activeDetections.find(d => d.type === 'flame')?.stats?.color_ratio * 100 || 0)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span>閃爍主頻率 (flicker)</span>
                          <strong>{(activeDetections.find(d => d.type === 'flame')?.stats?.flicker_freq || 0).toFixed(1)} Hz</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>
                          安全區間: 5Hz ~ 10Hz 判定為真實明火
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 煙霧膨脹與高頻清晰度損失 */}
                  <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--info-blue)', display: 'block', marginBottom: '8px' }}>☁️ 煙霧背景模糊度分析 (Laplacian High Freq Blurring)</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span>背景高頻清晰度損失</span>
                          <strong>{(activeDetections.find(d => d.type === 'smoke')?.stats?.clarity_loss * 100 || 0).toFixed(0)}%</strong>
                        </div>
                        <div style={{ height: '5px', background: '#000', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--info-blue)', width: `${(activeDetections.find(d => d.type === 'smoke')?.stats?.clarity_loss * 100 || 0)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span>時空漂移向上斜率</span>
                          <strong>{(activeDetections.find(d => d.type === 'smoke')?.stats?.y_trend || 0.0).toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--nvr-text-muted)' }}>
                          煙霧向上漂移趨勢物理分析
                        </div>
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label className="nvr-label">🚨 無人值守自動判定起火倒數時間</label>
                      <select className="nvr-input">
                        <option>10 秒 (黃金搶救時間 - POC預設)</option>
                        <option>30 秒</option>
                        <option>60 秒</option>
                        <option>120 秒</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label className="nvr-label">YOLO 明火置信度門檻 (Confidence)</label>
                        <input type="number" step="0.05" defaultValue="0.45" className="nvr-input" />
                      </div>
                      <div>
                        <label className="nvr-label">火焰閃爍頻率閾值 (Flicker Limit)</label>
                        <input type="number" step="0.5" defaultValue="5.0" className="nvr-input" />
                      </div>
                    </div>

                    <div className="nvr-panel" style={{ padding: '15px', background: 'var(--nvr-panel-light)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                        <input type="checkbox" defaultChecked /> 啟用分勵脫扣器 (Shunt Trip) 自動切斷電源防護
                      </label>
                      <p style={{ fontSize: '11px', color: 'var(--nvr-text-muted)', marginTop: '5px', paddingLeft: '22px' }}>
                        ※ 安全聲明：啟用後，若無人值守倒數歸零，NVR 將直接對繼電器輸出訊號，強制切斷配電櫃總閘，防範火勢蔓延。
                      </p>
                    </div>
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
              <div className="nvr-panel" style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                <div style={{ borderBottom: '1px solid var(--nvr-border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '16px' }}>❓ 工廠消防 SOP 操作指引與 AI 排除誤報說明 (Operation Guide)</strong>
                  <button onClick={() => setActiveView('main_menu')} className="nvr-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>返回主選單 🏠</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '13px', lineHeight: '1.6' }}>
                  <div className="nvr-panel" style={{ padding: '15px', background: 'rgba(255, 51, 102, 0.05)', borderColor: 'rgba(255, 51, 102, 0.2)' }}>
                    <strong style={{ color: 'var(--alarm-red)', display: 'block', marginBottom: '5px' }}>🚨 工廠火警緊急應變流程 (SOP)</strong>
                    <ol style={{ paddingLeft: '20px' }}>
                      <li>當系統判定為火災並切斷配電櫃供電後，值班操作員應立即攜帶防毒面具前往 A棟配電櫃 進行現場確認。</li>
                      <li>確認起火後，立即撥打 119 通報消防局，並通知廠長及機房安全負責人。</li>
                      <li>利用乾粉滅火器或二氧化碳滅火器進行初期滅火，切忌用水撲滅電氣火災。</li>
                    </ol>
                  </div>

                  <div className="nvr-panel" style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <strong style={{ color: 'var(--normal-green)', display: 'block', marginBottom: '5px' }}>🧠 AI 二次微調與排除誤報機制</strong>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li>**排除誤報**：若操作員確認為誤報（例如電焊火花或紅外線反光），請點選「排除此誤報」按鈕。</li>
                      <li>**負樣本自動收集**：系統將自動擷取該影格，儲存至伺服器的 `backend/data/negative_samples` 目錄中。</li>
                      <li>**二次微調策略**：收集足夠誤報樣本後，可手動執行後端微調指令，讓 AI 完美排除此工廠區域的誤報，精準度朝 100% 遞進。</li>
                    </ul>
                  </div>
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
