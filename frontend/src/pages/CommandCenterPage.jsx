import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as PIXI from 'pixi.js';
import { useAgentEvents } from '../hooks/useAgentEvents';
import { Clock } from 'lucide-react';
import DeepAnalysisTabs from '../components/DeepAnalysisTabs';

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

function destroyPixiApp(app) {
  if (!app) return;
  try {
    app.destroy(true, {
      children: true,
      texture: false,
      baseTexture: false,
    });
  } catch (error) {
    console.warn('Pixi cleanup skipped after destroy error', error);
  }
}

function AIFloorCanvas({ agentStates }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spritesRef = useRef({});
  const agentStatesRef = useRef(agentStates);

  useEffect(() => {
    agentStatesRef.current = agentStates;
  }, [agentStates]);

  useEffect(() => {
    let isMounted = true;
    // Initialize PixiJS
    const app = new PIXI.Application();
    appRef.current = app;

    const initPixi = async () => {
      await app.init({
        width: 640,
        height: 480,
        backgroundColor: 0x0f172a,
        resolution: globalThis.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (isMounted && containerRef.current) {
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
          const texture = await PIXI.Assets.load(config.sprite);
          const frame = new PIXI.Rectangle(config.row * 32, 0, 32, 32);
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
          sprite.scale.set(1.5);

          app.stage.addChild(sprite);
          spritesRef.current[id] = sprite;
        } catch (e) {
          console.warn(`Failed to load sprite for ${id}`, e);
          const graphics = new PIXI.Graphics();
          graphics.circle(0, 0, 16);
          graphics.fill(id === 'cio' ? 0x3b82f6 : 0x10b981);
          graphics.x = config.x;
          graphics.y = config.y;
          app.stage.addChild(graphics);
          spritesRef.current[id] = graphics;
        }
      }
    };

    initPixi();

    return () => {
      isMounted = false;
      destroyPixiApp(appRef.current);
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!appRef.current) return;

    const animateSprites = () => {
      const time = Date.now() / 1000;
      const currentStates = agentStatesRef.current;
      for (const [id, sprite] of Object.entries(spritesRef.current)) {
        const stateInfo = currentStates[id] || { state: 'IDLE' };
        const baseX = AGENT_CONFIG[id].x;
        const baseY = AGENT_CONFIG[id].y;

        sprite.x = baseX;

        if (stateInfo.state === 'IDLE' || stateInfo.state === 'EXITED') {
          sprite.y = baseY;
          sprite.alpha = stateInfo.state === 'EXITED' && id !== 'cio' ? 0 : 0.6;
        } else if (stateInfo.state === 'SPAWNED' || stateInfo.state === 'WALKING') {
          sprite.alpha = 1;
          sprite.y = baseY + Math.sin(time * 10) * 3;
        } else if (stateInfo.state === 'TYPING' || stateInfo.state === 'READING') {
          sprite.alpha = 1;
          sprite.y = baseY + Math.sin(time * 15) * 2;
        } else if (stateInfo.state === 'PRESENTING') {
          sprite.alpha = 1;
          sprite.y = baseY - 5;
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
  }, []);

  return <div ref={containerRef} className="trading-floor-canvas" />;
}

AIFloorCanvas.propTypes = {
  agentStates: PropTypes.object.isRequired,
};

export default function CommandCenterPage() {
  const [ticker, setTicker] = useState('');
  const [searchTicker, setSearchTicker] = useState('');
  const [quoteData, setQuoteData] = useState(null);
  const [manualPrice, setManualPrice] = useState('');
  const [decisionMode, setDecisionMode] = useState('Quick Trade');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');

  const { agentStates, analysisResult } = useAgentEvents();

  const loadPrice = async () => {
    if (!searchTicker) return;

    setTicker(searchTicker);
    setFetchError('');
    setQuoteData(null);
    try {
      const res = await fetch(`/api/quote/${searchTicker}`);
      if (!res.ok) throw new Error('Failed to fetch quote');
      const data = await res.json();
      setQuoteData(data);
    } catch (err) {
      setFetchError(err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    loadPrice();
  };

  const handleAnalyze = async () => {
    if (!ticker) return;

    if (manualPrice) {
      const priceVal = Number(manualPrice);
      if (Number.isNaN(priceVal) || priceVal <= 0) {
        setAnalyzeError('Manual price must be a positive number');
        return;
      }
    }

    setAnalyzeError('');
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          decision_mode: decisionMode,
          manual_price: manualPrice ? Number(manualPrice) : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to start analysis');
      }
      // The analysis progress and results will flow through useAgentEvents
    } catch (err) {
      console.error('Analysis failed', err);
      setAnalyzeError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analysisComplete = !!analysisResult;
  const normalizedAnalysis = analysisResult?.analysis?.decision_snapshot ? analysisResult.analysis : analysisResult;
  const normalizedSnapshot = normalizedAnalysis?.decision_snapshot || normalizedAnalysis || {};
  const normalizedStatus = normalizedSnapshot.traffic_light_status || analysisResult?.status;
  const statusColor =
    normalizedStatus === 'green'
      ? 'var(--fin-success)'
      : normalizedStatus === 'yellow'
        ? 'var(--fin-warning)'
        : normalizedStatus === 'red'
          ? 'var(--fin-danger)'
          : 'gray';

  return (
    <div className="command-center-page">
      <div className="command-center-layout">
        {/* Left Pane: Live Data Feed */}
        <div className="glass-panel command-center-feed">
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Live Data Feed</h2>
            <span className="data-stamp" style={{ marginTop: '4px' }}>
              <Clock size={10} aria-hidden="true" />
              Quote packet + decision gate
            </span>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input-field"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
              placeholder="Ticker symbol..."
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '4px' }}>
              Search
            </button>
          </form>

          {fetchError && (
            <div>
              <div style={{ color: 'var(--fin-danger)' }}>{fetchError}</div>
              <button className="btn-secondary" onClick={loadPrice}>
                Retry quote
              </button>
            </div>
          )}

          {quoteData && (
            <div
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Current Price:</span> <strong>{quoteData.last_price || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>High:</span> <span>{quoteData.high || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Low:</span> <span>{quoteData.low || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Volume:</span> <span>{quoteData.volume || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Market Cap:</span> <span>{quoteData.marketCap || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Source Tiers:</span> <span>{quoteData.price_source_tiers || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gate Status:</span>
                <strong
                  style={{
                    color: quoteData.current_price_acceptance_gate === 'pass' ? 'var(--fin-success)' : 'var(--fin-danger)',
                  }}
                >
                  {quoteData.current_price_acceptance_gate || '-'}
                </strong>
              </div>
            </div>
          )}

          {quoteData && quoteData.current_price_acceptance_gate !== 'pass' && (
            <div className="gate-warning" role="alert" style={{ color: 'var(--fin-danger)', fontSize: '0.85rem' }}>
              Price gate failed. Enter manual Tier 1 price before considering execution.
            </div>
          )}

          <div style={{ marginTop: 'auto' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Decision Mode
            </label>
            <select
              className="input-field"
              value={decisionMode}
              onChange={(e) => setDecisionMode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px',
              }}
            >
              <option>Quick Trade</option>
              <option>Swing Trade</option>
              <option>Long-Term/Core</option>
              <option>Existing Position / Exit Review</option>
            </select>

            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Manual Price Override
            </label>
            <input
              className="input-field"
              type="number"
              step="0.01"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              placeholder="e.g. 150.00"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
              }}
            />
          </div>
        </div>

        {/* Right Pane: AI Floor */}
        <div className="glass-panel command-center-main">
          {/* Traffic-Light Dashboard */}
          <div className="glass-card ai-floor-summary">
            <div className="ai-floor-summary-metrics">
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>AI Floor</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Status:</span>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: statusColor,
                    boxShadow: `0 0 8px ${statusColor}`,
                  }}
                />
              </div>
              <div style={{ fontSize: '1.1rem' }}>
                Score: <strong>{normalizedSnapshot.score || '-'}</strong>
              </div>
            </div>
            <div className="ai-floor-summary-actions">
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={!ticker || isAnalyzing}
                style={{ padding: '8px 24px', fontWeight: 'bold' }}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </button>
              {analyzeError && <div style={{ color: 'var(--fin-danger)', fontSize: '0.9rem' }}>{analyzeError}</div>}
            </div>
          </div>

          {/* Canvas */}
          <div
            className="trading-floor-canvas-wrap glass-panel"
            style={{
              flex: 1,
              padding: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <AIFloorCanvas agentStates={agentStates} />

            <div className="agent-overlay">
              {Object.entries(agentStates).map(([id, info]) => {
                if (!info.message || info.state === 'IDLE' || info.state === 'EXITED') return null;
                const cfg = AGENT_CONFIG[id];
                const leftPct = (cfg.x / 640) * 100;
                const topPct = (cfg.y / 480) * 100;
                return (
                  <div
                    key={id}
                    className="speech-bubble"
                    style={{
                      left: `${leftPct}%`,
                      top: `calc(${topPct}% - 60px)`,
                    }}
                  >
                    {info.message}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Verdict Summary */}
          {analysisResult && (
            <div
              className="glass-card verdict-section"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '16px',
                background: 'rgba(var(--black-rgb),0.2)',
              }}
            >
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                Verdict:{' '}
                <span
                  style={{
                    color: (normalizedSnapshot.verdict || analysisResult.verdict)?.toLowerCase().includes('buy')
                      ? 'var(--fin-success)'
                      : 'var(--text-primary)',
                  }}
                >
                  {normalizedSnapshot.verdict || analysisResult.verdict}
                </span>
              </div>
              <div style={{ fontSize: '1rem' }}>
                <strong>Reason:</strong> {normalizedSnapshot.one_line_reason}
              </div>
              <div style={{ fontSize: '1rem' }}>
                <strong>Next Action:</strong> {normalizedSnapshot.immediate_next_action}
              </div>
              <DeepAnalysisTabs deepAnalysis={normalizedAnalysis?.deep_analysis} fallbackAnalysis={normalizedAnalysis?.analysis} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Action Buttons */}
      <div className="glass-panel command-center-actions">
        <button
          className="btn btn-success"
          disabled={!analysisComplete}
          style={{
            padding: '8px 24px',
            fontWeight: 'bold',
            background: analysisComplete ? 'var(--fin-success)' : 'gray',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: analysisComplete ? 'pointer' : 'not-allowed',
          }}
        >
          Buy
        </button>
        <button
          className="btn btn-danger"
          disabled={!analysisComplete}
          style={{
            padding: '8px 24px',
            fontWeight: 'bold',
            background: analysisComplete ? 'var(--fin-danger)' : 'gray',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: analysisComplete ? 'pointer' : 'not-allowed',
          }}
        >
          Sell
        </button>
        <button
          className="btn btn-secondary"
          disabled={!analysisComplete}
          style={{
            padding: '8px 24px',
            fontWeight: 'bold',
            background: analysisComplete ? '#4b5563' : 'gray',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: analysisComplete ? 'pointer' : 'not-allowed',
          }}
        >
          Add to Watchlist
        </button>
      </div>
    </div>
  );
}
