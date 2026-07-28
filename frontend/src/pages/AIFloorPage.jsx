import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useAgentEvents } from '../hooks/useAgentEvents';
import { cn, cssVars } from '../lib/utils';

// Agent configuration
const AGENT_CONFIG = {
  cio: {
    name: 'CIO',
    x: 320,
    y: 150,
    sprite: '/src/ai-floor/assets/cio.png',
    row: 0,
  },
  'fundamental-auditor': {
    name: 'Fundamental',
    x: 120,
    y: 100,
    sprite: '/src/ai-floor/assets/analysts.png',
    row: 0,
  },
  'quant-technician': {
    name: 'Quant',
    x: 520,
    y: 100,
    sprite: '/src/ai-floor/assets/analysts.png',
    row: 1,
  },
  'macro-strategist': {
    name: 'Macro',
    x: 150,
    y: 350,
    sprite: '/src/ai-floor/assets/analysts.png',
    row: 2,
  },
  'portfolio-risk-manager': {
    name: 'Risk',
    x: 490,
    y: 350,
    sprite: '/src/ai-floor/assets/analysts.png',
    row: 3,
  },
  'catalyst-hunter': {
    name: 'Catalyst',
    x: 320,
    y: 280,
    sprite: '/src/ai-floor/assets/analysts.png',
    row: 4,
  },
};

function themeColor(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

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
        backgroundColor: themeColor('--bg-panel-solid'),
        resolution: globalThis.devicePixelRatio || 1,
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
          const actualFrame =
            texture.width >= (config.row + 1) * 32 ? frame : new PIXI.Rectangle(0, 0, Math.min(32, texture.width), Math.min(32, texture.height));

          const t = new PIXI.Texture({
            source: texture.source,
            frame: actualFrame,
          });

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
          graphics.fill(themeColor(id === 'cio' ? '--data-agent-cio' : '--data-agent-fundamental'));
          graphics.x = config.x;
          graphics.y = config.y;
          app.stage.addChild(graphics);
          spritesRef.current[id] = graphics;
        }
      }
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, {
          children: true,
          texture: false,
          baseTexture: false,
        });
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
          sprite.alpha = stateInfo.state === 'EXITED' && id !== 'cio' ? 0 : 0.6;
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
      appRef.current?.ticker?.remove(animateSprites);
    };
  }, [agentStates]);

  return (
    <div
      ref={containerRef}
      className="flex aspect-[4/3] h-full min-h-[260px] w-full items-center justify-center max-[900px]:min-h-[220px] max-[640px]:min-h-[190px] [&_canvas]:block [&_canvas]:aspect-[4/3] [&_canvas]:!h-auto [&_canvas]:max-h-full [&_canvas]:max-w-full [&_canvas]:!w-full"
    />
  );
}

export default function AIFloorPage() {
  const { agentStates, analysisResult, connected, lastEvent } = useAgentEvents();

  // New state for Activity Log
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!lastEvent?.message) return;
    // Event history is derived from the latest external WebSocket event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogs((prev) => {
      const newLogs = [...prev, { time: new Date().toLocaleTimeString(), msg: lastEvent.message }];
      return newLogs.slice(-20);
    });
  }, [lastEvent]);

  // Helper to count active agents
  const activeCount = Object.values(agentStates).filter((a) =>
    ['SPAWNED', 'WALKING', 'SITTING', 'TYPING', 'READING', 'PRESENTING'].includes(a.state)
  ).length;
  const targetTicker = agentStates['cio']?.ticker || '...';

  return (
    <div className="relative flex h-full min-h-0 flex-auto flex-col overflow-hidden">
      <div className="z-10 mb-4 rounded-lg border border-border bg-panel p-5 shadow-none">
        <h2 className="mb-1 text-xl">AI Trading Floor</h2>
        <p className="text-sm text-text-secondary">Real-time view of agent activity and analysis processes.</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 max-[900px]:flex-col">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Canvas Layer */}
          <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-panel p-0 shadow-none">
            <AIFloorCanvas />

            {/* DOM Overlay for Speech Bubbles */}
            <div className="[position:absolute] [inset:0] [pointer-events:none]">
              {Object.entries(agentStates).map(([id, info]) => {
                if (!info.message || info.state === 'IDLE' || info.state === 'EXITED') return null;

                // Map 640x480 coordinate space to percentage for overlay positioning
                const cfg = AGENT_CONFIG[id];
                const leftPct = (cfg.x / 640) * 100;
                const topPct = (cfg.y / 480) * 100;

                return (
                  <div
                    key={id}
                    className="pointer-events-none absolute left-[var(--agent-left)] top-[var(--agent-top)] z-10 max-w-[200px] -translate-x-1/2 translate-y-2.5 rounded-md border border-border-subtle bg-panel px-3 py-2 text-xs leading-[1.4] text-foreground transition-all after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:border-x-[6px] after:border-t-[6px] after:border-x-transparent after:border-t-border-subtle max-[640px]:max-w-[150px]"
                    style={cssVars({
                      '--agent-left': `${leftPct}%`,
                      '--agent-top': `calc(${topPct}% - 60px)`,
                    })}
                  >
                    {info.message}
                  </div>
                );
              })}
            </div>

            {/* Verdict Overlay */}
            {analysisResult && (
              <div className="[position:absolute] [top:20px] [right:20px] [z-index:20] [width:280px] [animation:fadeInDown_0.4s_var(--ease-out-quart)]">
                <div
                  className={cn(
                    'animate-[fadeIn_0.4s_ease] rounded-md border bg-panel-solid px-5 py-[18px] shadow-none',
                    analysisResult.verdict?.toLowerCase().includes('buy')
                      ? 'border-fin-profit bg-fin-profit-dim'
                      : 'border-fin-warning bg-fin-warning-dim'
                  )}
                >
                  <div className="[font-size:1.1rem] [font-weight:700] [letter-spacing:0.5px] [margin-bottom:4px]">
                    {analysisResult.ticker || targetTicker}
                  </div>
                  <div className="[font-size:0.7rem] [text-transform:uppercase] [letter-spacing:0.08em] [color:var(--text-secondary)] [margin-bottom:4px]">
                    ผลการวิเคราะห์สรุป
                  </div>
                  <div className="[font-size:1rem] [font-weight:600] [margin-bottom:12px]">{analysisResult.verdict || 'วิเคราะห์เสร็จสิ้น'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Agent Status Bar */}
          <div className="relative z-20 mt-4 flex items-center gap-6 border-t border-border-subtle bg-panel px-6 py-3 max-[640px]:flex-wrap">
            <div className="[font-size:0.72rem] [font-weight:600] [text-transform:uppercase] [letter-spacing:0.08em] [color:var(--text-secondary)] [white-space:nowrap]">
              สถานะการทำงานของ Agent
            </div>

            {!connected && <div className="text-[0.8rem] text-fin-warning">⚠️ ขาดการเชื่อมต่อกับ Event Bus</div>}

            {connected && (
              <>
                <div className="[display:flex] [gap:16px] [flex:1]">
                  {Object.entries(AGENT_CONFIG).map(([id, cfg]) => {
                    const state = agentStates[id]?.state || 'IDLE';
                    const isActive = state !== 'IDLE' && state !== 'EXITED';

                    return (
                      <div key={id} className="[display:flex] [align-items:center] [gap:6px]">
                        <div className={cn('size-2 shrink-0 rounded-full bg-text-muted transition-colors', isActive && 'bg-fin-profit')} />
                        <span className={cn('whitespace-nowrap text-xs text-text-secondary', isActive && 'text-foreground')}>{cfg.name}</span>
                      </div>
                    );
                  })}
                </div>

                {activeCount > 0 && (
                  <div className="[font-size:0.78rem] [color:var(--brand-primary)] [font-weight:500] [white-space:nowrap]">
                    กำลังวิเคราะห์ {targetTicker}... ทำงานอยู่ {activeCount}/6
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Activity Log Overlay */}
        <div className="flex w-[300px] flex-col rounded-lg border border-border bg-panel p-4 shadow-none max-[900px]:w-full">
          <h3 className="mb-3 border-b border-border-subtle pb-2 text-base">Activity Log</h3>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto" tabIndex={0} role="log" aria-label="Agent activity">
            {logs.map((log) => (
              <div key={`${log.time}-${log.msg}`} className="text-[0.85rem]">
                <span className="mr-2 text-text-secondary">[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-[0.85rem] text-text-secondary">Waiting for activity...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
