import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useAgentEvents } from '../hooks/useAgentEvents';

// Agent configuration
const AGENT_CONFIG = {
  'cio': { name: 'CIO', x: 320, y: 150, sprite: '/src/ai-floor/assets/cio.png', row: 0 },
  'fundamental-auditor': { name: 'Fundamental', x: 120, y: 100, sprite: '/src/ai-floor/assets/analysts.png', row: 0 },
  'quant-technician': { name: 'Quant', x: 520, y: 100, sprite: '/src/ai-floor/assets/analysts.png', row: 1 },
  'macro-strategist': { name: 'Macro', x: 150, y: 350, sprite: '/src/ai-floor/assets/analysts.png', row: 2 },
  'portfolio-risk-manager': { name: 'Risk', x: 490, y: 350, sprite: '/src/ai-floor/assets/analysts.png', row: 3 },
  'catalyst-hunter': { name: 'Catalyst', x: 320, y: 280, sprite: '/src/ai-floor/assets/analysts.png', row: 4 },
};

function AIFloorCanvas() {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spritesRef = useRef({});
  const { agentStates } = useAgentEvents();

  useEffect(() => {
    // Initialize PixiJS
    const app = new PIXI.Application();
    appRef.current = app;

    const initPixi = async () => {
      await app.init({ 
        width: 640, 
        height: 480, 
        backgroundColor: 0x0f172a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas);
      }

      // Load background
      try {
        const bgTexture = await PIXI.Assets.load('/src/ai-floor/assets/trading_floor.png');
        const bg = new PIXI.Sprite(bgTexture);
        bg.width = 640;
        bg.height = 480;
        bg.alpha = 0.6;
        app.stage.addChild(bg);
      } catch (e) {
        console.warn('Failed to load background tilemap', e);
      }

      // Initialize agent sprites
      for (const [id, config] of Object.entries(AGENT_CONFIG)) {
        try {
          // For a real implementation with sprite sheets, we'd use PIXI.AnimatedSprite.
          // Since we might just have simple static images from the AI generation, 
          // we'll use a standard Sprite for this prototype and apply a simple bobbing animation.
          const texture = await PIXI.Assets.load(config.sprite);
          
          // If it's a sprite sheet, we'd slice it. For now, assume it's a single image 
          // or we just show the whole thing scaled down if it's a sheet.
          // To make it look okay with the generated assets, we'll clip a 32x32 area.
          const frame = new PIXI.Rectangle(config.row * 32, 0, 32, 32);
          // Fallback if the texture is smaller than the frame
          const actualFrame = texture.width >= (config.row + 1) * 32 ? frame : new PIXI.Rectangle(0, 0, Math.min(32, texture.width), Math.min(32, texture.height));
          
          const t = new PIXI.Texture({ source: texture.source, frame: actualFrame });
          
          const sprite = new PIXI.Sprite(t);
          sprite.x = config.x;
          sprite.y = config.y;
          sprite.anchor.set(0.5);
          sprite.scale.set(1.5); // Make them a bit bigger
          
          app.stage.addChild(sprite);
          spritesRef.current[id] = sprite;
        } catch (e) {
          console.warn(`Failed to load sprite for ${id}`, e);
          // Create placeholder circle
          const graphics = new PIXI.Graphics();
          graphics.circle(0, 0, 16);
          graphics.fill(id === 'cio' ? 0x3b82f6 : 0x10b981);
          graphics.x = config.x;
          graphics.y = config.y;
          app.stage.addChild(graphics);
          spritesRef.current[id] = graphics;
        }
      }

      // Animation loop
      let tick = 0;
      app.ticker.add(() => {
        tick += 0.05;
        // Apply simple animations based on React state (passed via closure/ref)
        // In a real app, we'd sync this better, but this works for the prototype
      });
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: false, baseTexture: false });
      }
    };
  }, []); // Run once on mount

  // Sync state to sprites (e.g. bounce when typing)
  useEffect(() => {
    if (!appRef.current) return;
    
    // We use a custom ticker callback that captures the current agentStates
    const animateSprites = () => {
      const time = Date.now() / 1000;
      
      for (const [id, sprite] of Object.entries(spritesRef.current)) {
        const stateInfo = agentStates[id] || { state: 'IDLE' };
        
        // Base position
        const baseX = AGENT_CONFIG[id].x;
        const baseY = AGENT_CONFIG[id].y;
        
        sprite.x = baseX;
        
        if (stateInfo.state === 'IDLE' || stateInfo.state === 'EXITED') {
          sprite.y = baseY;
          sprite.alpha = (stateInfo.state === 'EXITED' && id !== 'cio') ? 0 : 0.6;
        } else if (stateInfo.state === 'SPAWNED' || stateInfo.state === 'WALKING') {
          // Walk in from edge
          sprite.alpha = 1;
          sprite.y = baseY + Math.sin(time * 10) * 3; // Bobbing
        } else if (stateInfo.state === 'TYPING' || stateInfo.state === 'READING') {
          sprite.alpha = 1;
          sprite.y = baseY + Math.sin(time * 15) * 2; // Fast typing bob
        } else if (stateInfo.state === 'PRESENTING') {
          sprite.alpha = 1;
          sprite.y = baseY - 5; // Stand up
        } else if (stateInfo.state === 'DONE') {
          sprite.alpha = 1;
          sprite.y = baseY;
        }
      }
    };

    if (appRef.current.ticker) {
      appRef.current.ticker.add(animateSprites);
    }
    return () => {
      if (appRef.current && appRef.current.ticker) appRef.current.ticker.remove(animateSprites);
    };
  }, [agentStates]);

  return <div ref={containerRef} className="trading-floor-canvas" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} />;
}

export default function AIFloorPage() {
  const { agentStates, analysisResult, connected, lastEvent } = useAgentEvents();

  // New state for Activity Log
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (lastEvent && lastEvent.message) {
      setLogs(prev => {
        const newLogs = [...prev, { time: new Date().toLocaleTimeString(), msg: lastEvent.message }];
        return newLogs.slice(-20); // Keep last 20 logs
      });
    }
  }, [lastEvent]);

  // Helper to count active agents
  const activeCount = Object.values(agentStates).filter(a => ['SPAWNED', 'WALKING', 'SITTING', 'TYPING', 'READING', 'PRESENTING'].includes(a.state)).length;
  const targetTicker = agentStates['cio']?.ticker || '...';

  return (
    <div className="ai-floor-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div className="glass-panel" style={{ marginBottom: '16px', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>AI Trading Floor</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Real-time view of agent activity and analysis processes.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Canvas Layer */}
          <div className="trading-floor-canvas-wrap glass-panel" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}>
            <AIFloorCanvas />
            
            {/* DOM Overlay for Speech Bubbles */}
            <div className="agent-overlay">
              {Object.entries(agentStates).map(([id, info]) => {
                if (!info.message || info.state === 'IDLE' || info.state === 'EXITED') return null;
                
                // Map 640x480 coordinate space to percentage for overlay positioning
                const cfg = AGENT_CONFIG[id];
                const leftPct = (cfg.x / 640) * 100;
                const topPct = (cfg.y / 480) * 100;
                
                return (
                  <div 
                    key={id} 
                    className="speech-bubble"
                    style={{ left: `${leftPct}%`, top: `calc(${topPct}% - 60px)` }}
                  >
                    {info.message}
                  </div>
                );
              })}
            </div>
            
            {/* Verdict Overlay */}
            {analysisResult && (
              <div className="verdict-overlay">
                <div className={`glass-card verdict-card ${analysisResult.verdict?.toLowerCase().includes('buy') ? 'buy' : 'warn'}`}>
                  <div className="verdict-ticker">{analysisResult.ticker || targetTicker}</div>
                  <div className="verdict-verdict-label">ผลการวิเคราะห์สรุป</div>
                  <div className="verdict-verdict-value">{analysisResult.verdict || 'วิเคราะห์เสร็จสิ้น'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Agent Status Bar */}
          <div className="agent-status-bar" style={{ marginTop: '16px' }}>
            <div className="status-bar-label">สถานะการทำงานของ Agent</div>
            
            {!connected && (
              <div style={{ color: 'var(--fin-warning)', fontSize: '0.8rem' }}>⚠️ ขาดการเชื่อมต่อกับ Event Bus</div>
            )}
            
            {connected && (
              <>
                <div className="status-agents">
                  {Object.entries(AGENT_CONFIG).map(([id, cfg]) => {
                    const state = agentStates[id]?.state || 'IDLE';
                    let indicatorClass = 'idle';
                    if (state === 'PRESENTING' || state === 'DONE') indicatorClass = 'presenting';
                    else if (state !== 'IDLE' && state !== 'EXITED') indicatorClass = 'active';
                    
                    return (
                      <div key={id} className="status-agent-item">
                        <div className={`status-indicator ${indicatorClass}`} />
                        <span className={`status-agent-name ${indicatorClass !== 'idle' ? 'active' : ''}`}>
                          {cfg.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {activeCount > 0 && (
                  <div className="status-progress">
                    กำลังวิเคราะห์ {targetTicker}... ทำงานอยู่ {activeCount}/6
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Activity Log Overlay */}
        <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Activity Log</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waiting for activity...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
