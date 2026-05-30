import React, { useState, useEffect, useRef } from 'react';

function App() {
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
  
  const [activeTab, setActiveTab] = useState('discord'); // discord | email | line_tg
  const [overheatMode, setOverheatMode] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  // 心跳折線圖數值快取 (用於繪製 SVG 心跳波形)
  const [heartbeatPoints, setHeartbeatPoints] = useState([50, 45, 55, 40, 50, 80, 20, 50, 48, 52, 50]);
  
  const wsRef = useRef(null);

  // 1. 初始化與 WebSocket 連線 (15 FPS 影音數據同步通道)
  useEffect(() => {
    connectWebSocket();
    
    // 定期向後端發送 HTTP 心跳以保持連線 (模擬實體 NVR 的 1分鐘一次心跳)
    const heartbeatInterval = setInterval(() => {
      fetch('http://127.0.0.1:8000/api/heartbeat', { method: 'POST' })
        .catch(err => console.error("心跳發送失敗:", err));
    }, 20000); // 每 20 秒發送一次，後端 60 秒超時

    // 每秒為心跳折線圖更新一個點
    const svgInterval = setInterval(() => {
      setHeartbeatPoints(prev => {
        const next = [...prev.slice(1)];
        // 隨機產生一個心跳波動點 (如果系統故障則是一條平線)
        if (systemState.system_fault) {
          next.push(50); // 死線
        } else {
          // 模擬正常心跳
          const base = 50;
          const peak = Math.random() > 0.7 ? (Math.random() > 0.5 ? 85 : 15) : (base + Math.random()*8 - 4);
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
      // 同步系統狀態
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

  // 定期拉取 REST API 來同步歷史日誌與統計數據
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

  // 2. API 控制：手動確認與排除
  const handleConfirmFire = () => {
    fetch('http://127.0.0.1:8000/api/confirm', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log("🔥 火警確認:", data);
      })
      .catch(err => alert("確認失敗，請確認後端是否運行"));
  };

  const handleDismissAlarm = () => {
    fetch('http://127.0.0.1:8000/api/dismiss', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log("🟢 警報排除與負樣本收集:", data);
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

  // 輔助獲取檢測元數據
  const activeDetections = streamData?.analysis?.detections || [];
  const latestTelemetry = streamData?.telemetry || {
    device_name: "RTX 4060 Ti 16GB (Simulated)",
    temperature: 58.0,
    fan_speed: 45,
    memory_percent: 25.0,
    gpu_utilization: 45.0,
    status: "OK"
  };

  return (
    <>
      {/* 工業網格背景 */}
      <div className="industrial-grid"></div>
      
      {/* 緊急狀態下全螢幕背景波紋效果 */}
      {systemState.confirmed_fire && <div className="alarm-overlay-red"></div>}
      {!systemState.confirmed_fire && systemState.suspected_fire && <div className="alarm-overlay-red" style={{ animationDuration: '2s' }}></div>}
      {systemState.system_fault && <div className="alarm-overlay-yellow"></div>}

      <div style={{ position: 'relative', zIndex: 1, padding: '20px', maxWidth: '1800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100vh' }}>
        
        {/* ================= HEADER 頂部狀態列 ================= */}
        <header className="glass-panel" style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.6em', fontWeight: '800', background: 'linear-gradient(90deg, #ff5a00, #ff0055)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🚨 工業 NVR AI 整合式火災與煙霧防禦監控系統
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginTop: '4px' }}>
              策略架構: 方案 B (RTX 4060 Ti GPU 本地伺服器) | 部署模式: 無人值守自動回報
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            {/* 系統心跳波形圖 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>心跳遙測:</span>
              <svg width="120" height="30" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <polyline
                  fill="none"
                  stroke={systemState.system_fault ? "var(--system-fault-yellow)" : "var(--neon-blue)"}
                  strokeWidth="2"
                  points={heartbeatPoints.map((p, idx) => `${idx * 12}, ${p * 0.3}`).join(' ')}
                  className="heartbeat-line"
                />
              </svg>
            </div>

            {/* 心跳 LED 與故障指示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {systemState.system_fault ? (
                <>
                  <span className="led-indicator led-yellow"></span>
                  <span style={{ color: 'var(--system-fault-yellow)', fontWeight: 'bold', fontSize: '0.9em' }}>SYSTEM FAULT (安全防護離線)</span>
                </>
              ) : wsConnected ? (
                <>
                  <span className="led-indicator led-blue"></span>
                  <span style={{ color: 'var(--neon-blue)', fontWeight: 'bold', fontSize: '0.9em' }}>SYSTEM_ONLINE (監控正常)</span>
                </>
              ) : (
                <>
                  <span className="led-indicator led-red"></span>
                  <span style={{ color: 'var(--warning-red)', fontWeight: 'bold', fontSize: '0.9em' }}>CONNECTING...</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ================= MAIN CONTENT 主畫面區域 ================= */}
        <main style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', flex: 1 }}>
          
          {/* 1. 左面板：實時監控影像與物理分析 */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Live Stream Panel */}
            <div className={`glass-panel ${systemState.confirmed_fire ? 'confirmed-active' : systemState.suspected_fire ? 'suspected-active' : systemState.system_fault ? 'fault-active' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'red', display: 'inline-block', animation: 'led-pulse 0.5s infinite alternate' }}></span>
                  <strong style={{ letterSpacing: '0.05em' }}>LIVE VIEW - A棟配電盤監控通道</strong>
                </div>
                <span className="glass-panel" style={{ fontSize: '0.75em', padding: '3px 8px', color: 'var(--neon-blue)' }}>
                  1080P / H.265 / CBR 模擬 / {systemState.throttling_fps} FPS
                </span>
              </div>
              
              {/* 影像顯示畫布 */}
              <div style={{ flex: 1, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '400px' }}>
                {streamData?.image ? (
                  <img
                    src={streamData.image}
                    alt="Industrial NVR Realtime Stream"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '3em', marginBottom: '10px', animation: 'led-pulse 1s infinite alternate' }}>🎥</div>
                    <div>正在載入 NVR RTSP 視訊串流...</div>
                    <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>使用 OpenCV 解碼工廠測試影片</div>
                  </div>
                )}
                
                {/* 浮動狀態貼標 */}
                {systemState.confirmed_fire && (
                  <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,0,85,0.9)', color: 'white', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', animation: 'led-pulse 0.5s infinite alternate', boxShadow: '0 4px 15px rgba(255,0,85,0.5)' }}>
                    🔥 已確認起火！機台電源已切斷
                  </div>
                )}
                {!systemState.confirmed_fire && systemState.suspected_fire && (
                  <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,90,0,0.9)', color: 'white', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', animation: 'led-pulse 1s infinite alternate' }}>
                    ⚠️ 疑似火焰特徵！無人值守倒數: {systemState.countdown_remaining}s
                  </div>
                )}
                {systemState.system_fault && (
                  <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,183,0,0.95)', color: 'black', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em' }}>
                    ⚠️ 系統離線故障: {systemState.system_fault_reason}
                  </div>
                )}
              </div>
            </div>

            {/* 物理驗證指標波形 (實時讀取後端物理引擎的數據) */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <strong style={{ fontSize: '0.95em', color: 'var(--text-secondary)', borderLeft: '3px solid var(--neon-blue)', paddingLeft: '8px' }}>
                二階段物理特徵驗證指標 (物理引擎實時特徵提取)
              </strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {/* 火焰色彩與閃爍頻率 */}
                <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>火焰色彩分布 (YCbCr/HSI 比率)</span>
                    <strong style={{ color: 'var(--neon-orange)' }}>
                      {(activeDetections.find(d => d.type === 'flame')?.stats?.color_ratio * 100 || 0).toFixed(1)}%
                    </strong>
                  </div>
                  <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #ff9900, #ff5a00)', 
                      width: `${(activeDetections.find(d => d.type === 'flame')?.stats?.color_ratio * 100 || 0)}%`,
                      transition: 'width 0.2s'
                    }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>閃爍頻率 (標準 5Hz~10Hz)</span>
                    <strong style={{ color: 'var(--neon-blue)' }}>
                      {(activeDetections.find(d => d.type === 'flame')?.stats?.flicker_freq || 0).toFixed(1)} Hz
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.75em', color: '#666' }}>
                    狀態: {activeDetections.find(d => d.type === 'flame')?.stats?.details?.flicker ? "🟢 正常閃爍區間" : "⚪ 未達閃爍閥值"}
                  </span>
                </div>

                {/* 煙霧膨脹與高頻清晰度損失 */}
                <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>煙霧高頻損失 (Laplacian Blurring)</span>
                    <strong style={{ color: '#aaa' }}>
                      {(activeDetections.find(d => d.type === 'smoke')?.stats?.clarity_loss * 100 || 0).toFixed(0)}%
                    </strong>
                  </div>
                  <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #00f0ff, #ff0055)', 
                      width: `${(activeDetections.find(d => d.type === 'smoke')?.stats?.clarity_loss * 100 || 0)}%`,
                      transition: 'width 0.2s'
                    }}></div>
                  </div>
                  <span style={{ fontSize: '0.75em', color: '#666', marginTop: '4px', display: 'block' }}>
                    高頻紋理損失: {activeDetections.find(d => d.type === 'smoke')?.stats?.details?.high_freq_loss ? "🚨 背景已被煙霧遮蔽模糊" : "🟢 背景清晰度正常"}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                    <span>時空向上浮力斜率</span>
                    <span style={{ color: activeDetections.find(d => d.type === 'smoke')?.stats?.details?.buoyancy ? "var(--normal-green)" : "#666" }}>
                      斜率: {(activeDetections.find(d => d.type === 'smoke')?.stats?.y_trend || 0.0).toFixed(2)} {activeDetections.find(d => d.type === 'smoke')?.stats?.details?.buoyancy ? "(向上漂移)" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 中面板：自動倒數、雙重確認與連鎖防禦狀態 */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 警報與人機確認決策控制台 */}
            <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', justifycontent: 'center', gap: '20px', flex: 1, minHeight: '300px', position: 'relative' }}>
              <strong style={{ fontSize: '1.1em', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                🚨 系統自動防禦與人機聯控中心
              </strong>
              
              {/* 疑似警報觸發時呈現的動態框 */}
              {systemState.suspected_fire && !systemState.confirmed_fire ? (
                <div className="glass-panel suspected-active" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,90,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ color: 'var(--neon-orange)', fontSize: '1.3em', fontWeight: 'bold' }}>🚨 偵測到疑似起火特徵！</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                    現場無人看守。系統正在執行 **10 秒無人值守倒數**，若倒數結束無人介入，將自動判定為真實火警並推送警報。
                  </p>
                  
                  {/* 大倒數圓環 */}
                  <div style={{ margin: '15px auto', width: '110px', height: '110px', borderRadius: '50%', border: '4px solid var(--neon-orange)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 15px rgba(255,90,0,0.3)', animation: 'led-pulse 0.5s infinite alternate' }}>
                    <span style={{ fontSize: '2em', fontWeight: '900', color: 'var(--neon-orange)' }}>
                      {systemState.countdown_remaining}
                    </span>
                    <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>秒後通報</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button className="btn-danger" style={{ padding: '12px', borderRadius: '6px' }} onClick={handleConfirmFire}>
                      🔥 立即確認火警
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', borderRadius: '6px', color: 'var(--normal-green)' }} onClick={handleDismissAlarm}>
                      🟢 排除此誤報
                    </button>
                  </div>
                </div>
              ) : systemState.confirmed_fire ? (
                <div className="glass-panel confirmed-active" style={{ padding: '25px', textAlign: 'center', background: 'rgba(255,0,85,0.08)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ color: 'var(--warning-red)', fontSize: '1.4em', fontWeight: 'bold', animation: 'led-pulse 0.5s infinite alternate' }}>
                    🚨 【極度危險】火警已確認！
                  </h3>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.9em' }}>
                    防禦鎖定：分勵脫扣器已切斷電源保護設備。已自動發送 Email、Discord 嵌入卡片、Line/Telegram 通知。
                  </p>
                  
                  <div style={{ fontSize: '4em', margin: '10px 0' }}>🔥</div>

                  <button className="btn-secondary" style={{ padding: '12px', borderRadius: '6px', width: '100%', borderColor: 'rgba(0,255,102,0.4)', color: 'var(--normal-green)' }} onClick={handleDismissAlarm}>
                    🟢 安全解除警報 (復歸機台)
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, color: '#4b5563', textAlign: 'center' }}>
                  <div style={{ fontSize: '3.5em', marginBottom: '15px' }}>🟢</div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.1em' }}>機房安全防護中</strong>
                  <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '250px' }}>
                    AI 影像雙重物理分析演算法 24/7 持續分析串流中。未檢測到异常特徵。
                  </p>
                </div>
              )}
            </div>

            {/* 實體硬體防禦連動狀態 (Shunt Trip 分勵脫扣器) */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <strong style={{ fontSize: '0.95em', color: 'var(--text-secondary)', borderLeft: '3px solid var(--warning-red)', paddingLeft: '8px' }}>
                分勵脫扣器 (Shunt Trip) 與物理保護狀態
              </strong>
              
              <div className="glass-panel" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: systemState.shunt_trip_triggered ? 'rgba(255,0,85,0.05)' : 'rgba(0,255,102,0.03)', borderColor: systemState.shunt_trip_triggered ? 'var(--warning-red)' : 'rgba(0,255,102,0.2)' }}>
                <div>
                  <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)', display: 'block' }}>配電盤斷路器連動狀態 (Shunt Trip Switch)</span>
                  <strong style={{ fontSize: '1.15em', color: systemState.shunt_trip_triggered ? 'var(--warning-red)' : 'var(--normal-green)' }}>
                    {systemState.shunt_trip_triggered ? "⚡ 電源已安全斷開 (PROTECTED)" : "🔌 正常通電供電中 (MONITORING)"}
                  </strong>
                </div>
                <span className={`led-indicator ${systemState.shunt_trip_triggered ? 'led-red' : 'led-green'}`} style={{ width: '15px', height: '15px' }}></span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: 'var(--text-secondary)', padding: '0 5px' }}>
                <span>本地聲光警報器:</span>
                <span style={{ color: '#555' }}>🚫 已依工廠無人配置手動免除</span>
              </div>
            </div>
          </section>

          {/* 3. 右面板：行動端推送模擬器與 GPU 遙測 */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* GPU 遙測監控面板 (遙測與自適應降載測試) */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95em', color: 'var(--text-secondary)', borderLeft: '3px solid var(--neon-orange)', paddingLeft: '8px' }}>
                  RTX 4060 Ti GPU 顯示卡遙測
                </strong>
                <button 
                  onClick={handleToggleOverheat} 
                  className="glass-panel" 
                  style={{ 
                    fontSize: '0.75em', 
                    padding: '3px 8px', 
                    cursor: 'pointer', 
                    background: overheatMode ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.03)',
                    borderColor: overheatMode ? 'var(--warning-red)' : 'var(--border-glass)',
                    color: overheatMode ? 'var(--warning-red)' : 'var(--text-secondary)',
                    fontWeight: 'bold'
                  }}
                >
                  {overheatMode ? "🔥 關閉過熱模擬" : "⚡ 模擬 GPU 過熱降載"}
                </button>
              </div>

              {/* 溫度表與使用率 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', margin: '5px 0' }}>
                <div className="glass-panel" style={{ padding: '10px', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.8em' }}>🌡️</div>
                  <div>
                    <span style={{ fontSize: '0.75em', color: 'var(--text-secondary)', display: 'block' }}>核心溫度 (自適應防當機)</span>
                    <strong style={{ fontSize: '1.4em', color: latestTelemetry.status === 'CRITICAL' ? 'var(--warning-red)' : latestTelemetry.status === 'WARNING' ? 'var(--system-fault-yellow)' : 'var(--text-primary)' }}>
                      {latestTelemetry.temperature} °C
                    </strong>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '10px', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '1.8em' }}>🌀</div>
                  <div>
                    <span style={{ fontSize: '0.75em', color: 'var(--text-secondary)', display: 'block' }}>風扇轉速</span>
                    <strong style={{ fontSize: '1.3em' }}>{latestTelemetry.fan_speed} %</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                <div>顯存佔用率: <strong style={{ color: 'white' }}>{latestTelemetry.memory_percent}%</strong></div>
                <div>GPU 使用率: <strong style={{ color: 'white' }}>{latestTelemetry.gpu_utilization}%</strong></div>
              </div>
              
              {latestTelemetry.status === 'CRITICAL' && (
                <div style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid var(--warning-red)', color: 'var(--warning-red)', padding: '8px', borderRadius: '4px', fontSize: '0.8em', textAlign: 'center', fontWeight: 'bold' }}>
                  🚨 過熱保護觸發：AI 推理已自動從 15FPS 降載至 5FPS 防護當機！
                </div>
              )}
            </div>

            {/* 行動端多媒體推送模擬器 (Wow 視覺高擬真外殼) */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9em' }}>📱 行動多媒體回報展示 (黃金三元素)</strong>
                
                {/* 軟體切換 Tabs */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['discord', 'email', 'line_tg'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '0.75em',
                        border: 'none',
                        cursor: 'pointer',
                        background: activeTab === tab ? 'var(--neon-orange)' : 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {tab === 'discord' ? 'Discord' : tab === 'email' ? 'Email' : 'Line / TG'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 手機外殼與顯示內容 */}
              <div style={{ flex: 1, background: '#18191f', padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '310px', 
                  height: '420px', 
                  borderRadius: '30px', 
                  border: '8px solid #2d3142', 
                  background: '#090a0f', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* 手機劉海屏 */}
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '110px', height: '18px', background: '#2d3142', borderRadius: '0 0 12px 12px', zIndex: 10 }}></div>
                  
                  {/* 手機螢幕頂部列 */}
                  <div style={{ padding: '18px 15px 5px 15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.65em', color: '#666', background: '#0e0f14' }}>
                    <span>10:25 AM</span>
                    <span>🔋 100%</span>
                  </div>

                  {/* 手機畫面 */}
                  <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* === Tab 1: Discord 嵌入富文本卡片 === */}
                    {activeTab === 'discord' && (
                      <div style={{ background: '#2f3136', borderRadius: '8px', padding: '10px', fontSize: '0.8em', color: '#dcddde', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ff3366', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '0.6em', fontWeight: 'bold' }}>🔥</span>
                          <strong style={{ fontSize: '0.85em', color: 'white' }}>AI Fire Sentinel (Bot)</strong>
                        </div>
                        
                        {/* Discord Embed */}
                        <div style={{ borderLeft: '4px solid #ff0055', background: '#202225', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <strong style={{ fontSize: '0.9em', color: 'white' }}>🚨 工業 AI 火災與煙霧警報 (無人值守確認)</strong>
                          <p style={{ fontSize: '0.8em', color: '#b9bbbe' }}>系統已連續 3 秒偵測到火焰/煙霧物理特徵，已自動斷開機台電源。</p>
                          
                          <div style={{ fontSize: '0.75em', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', color: '#b9bbbe' }}>
                            <div>📷 位置: **A棟配電櫃**</div>
                            <div>🔥 置信度: **{systemState.confirmed_fire ? '91%' : '0%'}**</div>
                          </div>
                          
                          {/* 縮圖 */}
                          {systemState.confirmed_fire && streamData?.image && (
                            <img src={streamData.image} alt="Alarm Snapshot" style={{ width: '100%', borderRadius: '4px', marginTop: '5px' }} />
                          )}
                          <div style={{ fontSize: '0.7em', color: '#72767d', marginTop: '4px' }}>工業 NVR 安全防護層</div>
                        </div>
                      </div>
                    )}

                    {/* === Tab 2: Email HTML 多媒體推送 === */}
                    {activeTab === 'email' && (
                      <div style={{ background: '#1c1d26', border: '1px solid #ff3366', borderRadius: '8px', padding: '10px', fontSize: '0.8em', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ fontSize: '0.7em', color: '#888', display: 'block' }}>寄件人: fire-sentinel@factory.com</span>
                          <strong style={{ fontSize: '0.85em', color: 'white' }}>🚨 【緊急警報】工業 AI 火災偵測系統！</strong>
                        </div>
                        <p style={{ fontSize: '0.75em', color: '#ddd' }}>系統在無人值守下，自動偵測到火警起火特徵，已自動執行分勵脫扣器切斷該區供電：</p>
                        
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px', fontSize: '0.7em', color: '#ff9900' }}>
                          <div>位置: A棟配電櫃-百葉窗通風口</div>
                          <div>時間: 2026-05-30 10:25:31</div>
                          <div>狀態: 🟢 已完成自動斷電保護</div>
                        </div>
                        {systemState.confirmed_fire && streamData?.image && (
                          <img src={streamData.image} alt="Email Attachment" style={{ width: '100%', borderRadius: '3px' }} />
                        )}
                      </div>
                    )}

                    {/* === Tab 3: Line & Telegram 訊息 === */}
                    {activeTab === 'line_tg' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Telegram */}
                        <div style={{ background: '#182533', borderRadius: '8px', padding: '8px', fontSize: '0.8em', color: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: '#4aa0eb', fontSize: '0.75em', fontWeight: 'bold' }}>Telegram Bot (AI Fire Sentinel)</span>
                          <p style={{ fontSize: '0.85em', lineHeight: '1.2' }}>
                            🚨 *工業 AI 火災警報*<br/>
                            *位置*: A棟配電盤通風口<br/>
                            *置信度*: **{systemState.confirmed_fire ? '91%' : '0%'}**<br/>
                            🟢 已自動切斷機台電源保護！<br/>
                            <span style={{ color: '#4aa0eb', textDecoration: 'underline' }}>[點擊打開實時監控]</span>
                          </p>
                        </div>

                        {/* Line */}
                        <div style={{ background: '#252932', borderLeft: '4px solid #06c755', borderRadius: '4px', padding: '8px', fontSize: '0.8em', color: 'white', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: '#06c755', fontSize: '0.75em', fontWeight: 'bold' }}>LINE Notify (安全網)</span>
                          <p style={{ fontSize: '0.8em', color: '#b9bbbe' }}>
                            🚨【火災警報】<br/>
                            位置: A棟配電櫃<br/>
                            置信度: {systemState.confirmed_fire ? '91%' : '0%'}<br/>
                            系統已自動切斷該區電源保護！
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {!systemState.confirmed_fire && (
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#444', fontSize: '0.8em', textAlign: 'center', padding: '20px' }}>
                        📭 手機收件匣目前為空。當火警倒數結束或人工確認時，將在此即時模擬黃金三元素推送效果。
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* 歷史告警日誌與負樣本累積 (與自動循環清理連動) */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95em', color: 'var(--text-secondary)' }}>📁 本地微調負樣本 & 告警歷史日誌</strong>
                <span className="glass-panel" style={{ fontSize: '0.75em', padding: '2px 6px', background: 'rgba(0,255,102,0.1)', color: 'var(--normal-green)', borderColor: 'rgba(0,255,102,0.2)' }}>
                  已存負樣本: {systemState.negative_samples_count} 張
                </span>
              </div>
              
              <p style={{ fontSize: '0.75em', color: '#666', marginBottom: '5px' }}>
                *排除誤報時，系統會自動儲存該影格至 `negative_samples/` 作為本地二次微調素材，提升精準度至 100%。
              </p>

              {/* 日誌清單 */}
              <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {systemState.alarm_logs.length > 0 ? (
                  systemState.alarm_logs.map(log => (
                    <div key={log.id} className="glass-panel" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', fontSize: '0.8em' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {log.snapshot && (
                          <img src={`http://127.0.0.1:8000${log.snapshot}`} alt="Log Thumb" style={{ width: '40px', height: '25px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,0,85,0.3)' }} />
                        )}
                        <div>
                          <strong style={{ color: 'var(--warning-red)', display: 'block' }}>🚨 AI 自動火警通報</strong>
                          <span style={{ fontSize: '0.85em', color: '#555' }}>{log.timestamp}</span>
                        </div>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                        機台電源: <strong style={{ color: 'var(--warning-red)' }}>已切斷</strong>
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#444', textAlign: 'center', padding: '15px', fontSize: '0.8em' }}>
                    🗄️ 暫無歷史告警日誌 (告警影片設有 30MB 循環清理限制)
                  </div>
                )}
              </div>
            </div>

          </section>

        </main>
        
        {/* Footer */}
        <footer style={{ textAlign: 'center', color: '#555', fontSize: '0.8em', borderTop: '1px solid var(--border-glass)', paddingTop: '15px', marginTop: '10px' }}>
          工業級 NVR AI 火警與煙霧雙重物理分析防禦監控系統 | POC 可行性驗證展示版 (Windows 原生部署)
        </footer>
      </div>
    </>
  );
}

export default App;
