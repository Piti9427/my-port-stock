import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Target, Check, BarChart3, AlertTriangle, RotateCcw, Clock } from 'lucide-react';
import PixelTradingFloor from '../components/PixelTradingFloor';
import { useAuth } from '@clerk/react';
import { fetchWithAuth } from '../lib/api';

/* ─── Sparkline component (pure SVG) ───────────────────────── */
const Sparkline = React.memo(function Sparkline({ data, positive }) {
  if (!Array.isArray(data) || data.length < 2) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  const w = 80,
    h = 32,
    pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color = positive ? 'var(--fin-profit)' : 'var(--fin-loss)';
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

/* ─── Scenario Planner Drawer ─────────────────────────────── */
function ScenarioPlannerDrawer({ ticker, onClose, getToken }) {
  const [supports, setSupports] = useState({ s1: '', s2: '', s3: '' });
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [held, setHeld] = useState(100);
  const [avgCost, setAvgCost] = useState(110);
  const [addAmt, setAddAmt] = useState(10000);
  const [saveStatus, setSaveStatus] = useState('');

  const handleReset = useCallback(() => {
    setSupports({ s1: '', s2: '', s3: '' });
    setStopLoss('');
    setTarget('');
    setHeld(100);
    setAvgCost(110);
    setAddAmt(10000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const rows = useMemo(() => {
    const levels = [
      { label: 'S1', price: parseFloat(supports.s1) },
      { label: 'S2', price: parseFloat(supports.s2) },
      { label: 'S3', price: parseFloat(supports.s3) },
    ].filter((l) => l.price > 0);

    const sl = parseFloat(stopLoss);
    const tgt = parseFloat(target);

    return levels.map(({ label, price }) => {
      const sharesAdded = addAmt > 0 ? Math.floor(addAmt / price) : 0;
      const totalShares = held + sharesAdded;
      const newAvg = totalShares > 0 ? (held * avgCost + sharesAdded * price) / totalShares : avgCost;
      const profitPct = tgt > 0 ? ((tgt - newAvg) / newAvg) * 100 : null;
      const profitBaht = tgt > 0 ? (tgt - newAvg) * totalShares : null;
      const maxLoss = sl > 0 ? (newAvg - sl) * totalShares : null;
      const rr = tgt > 0 && sl > 0 && price > 0 ? (tgt - price) / (price - sl) : null;

      return {
        label,
        price,
        sharesAdded,
        newAvg,
        profitPct,
        profitBaht,
        maxLoss,
        rr,
      };
    });
  }, [supports, stopLoss, target, held, avgCost, addAmt]);

  const validation = useMemo(() => {
    const s1 = parseFloat(supports.s1);
    const s2 = parseFloat(supports.s2);
    const s3 = parseFloat(supports.s3);
    const sl = parseFloat(stopLoss);
    const tgt = parseFloat(target);

    const supportOrderInvalid = (Number.isFinite(s1) && Number.isFinite(s2) && s1 < s2) || (Number.isFinite(s2) && Number.isFinite(s3) && s2 < s3);
    const targetStopInvalid = Number.isFinite(tgt) && Number.isFinite(sl) && tgt <= sl;
    const negativePosition = held < 0 || avgCost < 0 || addAmt < 0;
    const missingPlan = rows.length === 0;

    return {
      supportOrderInvalid,
      targetStopInvalid,
      negativePosition,
      missingPlan,
      canSave: !supportOrderInvalid && !targetStopInvalid && !negativePosition && !missingPlan,
    };
  }, [supports, stopLoss, target, held, avgCost, addAmt, rows.length]);

  const rrClass = (rr) => {
    if (!rr) return '';
    if (rr >= 2) return 'rr-good';
    if (rr >= 1) return 'rr-warn';
    return 'rr-bad';
  };

  const handleSavePlan = async () => {
    const firstRow = rows[0];
    if (!firstRow) return;
    setSaveStatus('Saving...');
    try {
      const token = await getToken();
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ticker,
          entry: firstRow.price,
          target: parseFloat(target),
          stop_loss: parseFloat(stopLoss),
          risk_reward: firstRow.rr,
          shares: firstRow.sharesAdded,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status === 'INSUFFICIENT_DATA') {
        throw new Error(payload.error_details || payload.error || 'Journal persistence unavailable');
      }
      setSaveStatus('Saved');
    } catch (error) {
      setSaveStatus(error.message);
    }
  };

  return (
    <>
      <div className="scenario-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="scenario-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-header">
          <div>
            <div id="drawer-title" className="drawer-title">
              {ticker} — Scenario Planner
            </div>
            <div className="drawer-subtitle">ถัวเฉลี่ย & วางแผนแนวรับ</div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close scenario planner">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* Current Position */}
          <div>
            <div className="form-section-title">สถานะปัจจุบัน</div>
            <div className="current-status">
              <div className="stat-box">
                <div className="stat-label">
                  <label htmlFor="input-held">จำนวนหุ้นที่มี</label>
                </div>
                <input
                  id="input-held"
                  className="form-input"
                  type="number"
                  value={held}
                  onChange={(e) => setHeld(+e.target.value)}
                  min="0"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="stat-box">
                <div className="stat-label">
                  <label htmlFor="input-avgcost">ราคาเฉลี่ย (฿)</label>
                </div>
                <input
                  id="input-avgcost"
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={avgCost}
                  onChange={(e) => setAvgCost(+e.target.value)}
                  min="0"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="stat-box">
                <div className="stat-label">
                  <label htmlFor="input-addamt">งบซื้อเพิ่ม (฿)</label>
                </div>
                <input
                  id="input-addamt"
                  className="form-input"
                  type="number"
                  step="100"
                  value={addAmt}
                  onChange={(e) => setAddAmt(+e.target.value)}
                  min="0"
                  onFocus={(e) => e.target.select()}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                  <button type="button" className="quick-fill-btn" onClick={() => setAddAmt(5000)}>
                    ฿5k
                  </button>
                  <button type="button" className="quick-fill-btn" onClick={() => setAddAmt(10000)}>
                    ฿10k
                  </button>
                  <button type="button" className="quick-fill-btn" onClick={() => setAddAmt(25000)}>
                    ฿25k
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Support Levels */}
          <div>
            <div className="form-section-title">จุดรับที่ AI แนะนำ</div>
            <div className="support-grid">
              {['s1', 's2', 's3'].map((k, i) => (
                <div key={k} className="form-group">
                  <label htmlFor={`input-${k}`} className="form-label">
                    แนวรับ {i + 1} (฿)
                  </label>
                  <input
                    id={`input-${k}`}
                    className="form-input"
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${(120 - i * 5).toFixed(2)}`}
                    value={supports[k]}
                    onChange={(e) => setSupports((p) => ({ ...p, [k]: e.target.value }))}
                    min="0"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              ))}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="input-sl" className="form-label">
                  จุดตัดขาดทุน (฿)
                </label>
                <input
                  id="input-sl"
                  className="form-input"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 105.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  min="0"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="form-group">
                <label htmlFor="input-target" className="form-label">
                  ราคาเป้าหมาย (฿)
                </label>
                <input
                  id="input-target"
                  className="form-input"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 140.00"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  min="0"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          </div>

          {/* Scenario Table */}
          {rows.length > 0 && (
            <div>
              <div className="form-section-title">วิเคราะห์แผนการเทรด</div>
              <div className="scenario-table-wrap">
                <table className="scenario-table">
                  <thead>
                    <tr>
                      <th>ระดับ</th>
                      <th>จุดเข้า ฿</th>
                      <th>หุ้นที่เพิ่ม+</th>
                      <th title="ทุนเฉลี่ยใหม่หลังรวมหุ้นที่ซื้อเพิ่ม" style={{ cursor: 'help' }}>
                        ทุนเฉลี่ยใหม่ ⓘ
                      </th>
                      <th>กำไร %</th>
                      <th title="ความเสี่ยงขาดทุนสูงสุดเมื่อถึงจุดตัดขาดทุน" style={{ cursor: 'help' }}>
                        ขาดทุนสูงสุด ⓘ
                      </th>
                      <th title="Risk/Reward Ratio = (Target - Entry) / (Entry - Stop Loss)" style={{ cursor: 'help' }}>
                        R/R ⓘ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label}>
                        <td>
                          <span className="support-badge">{r.label}</span>
                        </td>
                        <td>฿{r.price.toFixed(2)}</td>
                        <td>{r.sharesAdded}</td>
                        <td>฿{r.newAvg.toFixed(2)}</td>
                        <td>
                          {r.profitPct != null ? (
                            <span
                              style={{
                                color: r.profitPct >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)',
                                fontWeight: 600,
                              }}
                            >
                              {r.profitPct >= 0 ? '+' : ''}
                              {r.profitPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {r.maxLoss != null ? (
                            <span style={{ color: 'var(--fin-loss)' }}>-฿{r.maxLoss.toFixed(0)}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {r.rr != null ? (
                            <span className={`rr-badge ${rrClass(r.rr)}`}>1:{r.rr.toFixed(1)}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon" style={{ marginBottom: '12px' }}>
                <BarChart3 size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
              </div>
              <p>กรอกข้อมูลแนวรับด้านบนเพื่อดูตารางวิเคราะห์แผนการเทรด</p>
            </div>
          )}
        </div>

        <div className="drawer-footer">
          {!validation.canSave && (
            <div className="validation-summary" role="alert">
              {validation.supportOrderInvalid && <div>แนวรับต้องเรียงจาก S1 สูงสุดไป S3 ต่ำสุด</div>}
              {validation.targetStopInvalid && <div>ราคาเป้าหมายต้องสูงกว่าจุดตัดขาดทุน</div>}
              {validation.negativePosition && <div>จำนวนหุ้น ราคาเฉลี่ย และงบซื้อเพิ่มต้องไม่ติดลบ</div>}
              {validation.missingPlan && <div>กรอกแนวรับอย่างน้อย 1 จุดก่อนบันทึกแผน</div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn-secondary"
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 16px',
              }}
              title="Reset form"
            >
              <RotateCcw size={16} />
            </button>
            <button className="btn-analyze" style={{ flex: 1 }} disabled={!validation.canSave || saveStatus === 'Saving...'} onClick={handleSavePlan}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Check size={16} strokeWidth={2.5} />
                ยืนยันแผนและบันทึกลง Journal
              </span>
            </button>
          </div>
          {saveStatus && (
            <div
              style={{
                color: saveStatus === 'Saved' ? 'var(--fin-profit)' : 'var(--fin-warning)',
                fontSize: '0.8rem',
                marginTop: '8px',
                textAlign: 'center',
              }}
            >
              {saveStatus}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Verdict Card ────────────────────────────────────────── */
function VerdictCard({ analysis }) {
  if (!analysis) return null;
  const verdict = analysis.decision_snapshot?.verdict || 'Analysis';
  const cardClass = verdict.toLowerCase().includes('buy')
    ? 'buy'
    : verdict.toLowerCase().includes('sell') || verdict.toLowerCase().includes('trim')
      ? 'sell'
      : verdict.toLowerCase().includes('wait') || verdict.toLowerCase().includes('hold')
        ? 'warn'
        : 'buy';

  return (
    <div className={`glass-card verdict-card ${cardClass}`}>
      <div className="verdict-ticker">{analysis.packet?.ticker || analysis.ticker}</div>
      {analysis.packet?.current_price_source?.price && (
        <div className="verdict-price">฿{parseFloat(analysis.packet.current_price_source.price).toFixed(2)}</div>
      )}
      <div className="verdict-verdict-label">คำตัดสิน AI</div>
      <div
        className="verdict-verdict-value"
        style={{
          color: cardClass === 'buy' ? 'var(--fin-profit)' : cardClass === 'sell' ? 'var(--fin-loss)' : 'var(--fin-warning)',
        }}
      >
        {verdict}
        {analysis.decision_snapshot?.score ? ` · ${analysis.decision_snapshot.score}/10` : ''}
      </div>
      {analysis.decision_snapshot?.one_line_reason && <div className="verdict-text">{analysis.decision_snapshot.one_line_reason}</div>}
      {analysis.analysis && !analysis.decision_snapshot && <div className="verdict-text">{analysis.analysis}</div>}
    </div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────── */
export default function DashboardPage() {
  const location = useLocation();
  const incomingTicker = location.state?.ticker;

  const [selectedTicker, setSelectedTicker] = useState(incomingTicker || 'NVDA');
  const [decisionMode, setDecisionMode] = useState('Swing Trade');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScenario, setShowScenario] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  // New states for API Binding & Hardening
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [manualQuote, setManualQuote] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  useEffect(() => {
    if (incomingTicker) setSelectedTicker(incomingTicker);
  }, [incomingTicker]);

  const { getToken } = useAuth();

  // Fetch Watchlist
  useEffect(() => {
    fetchWithAuth('/api/holdings', getToken)
      .then((data) => setWatchlist(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingWatchlist(false));
  }, [getToken]);

  const portfolioMetrics = useMemo(() => {
    const rows = Array.isArray(watchlist) ? watchlist : [];
    const totalValue = rows.reduce((sum, row) => sum + Number(row.shares || 0) * Number(row.price || 0), 0);
    const totalCost = rows.reduce((sum, row) => sum + Number(row.shares || 0) * Number(row.avg_cost || 0), 0);
    const totalPl = totalValue && totalCost ? totalValue - totalCost : null;
    const dayPl = rows.reduce((sum, row) => sum + Number(row.shares || 0) * Number(row.change || 0), 0);

    return {
      totalValue,
      dayPl,
      dayPlPct: totalValue > 0 ? (dayPl / totalValue) * 100 : null,
      totalPl,
    };
  }, [watchlist]);

  const formatThb = (value) => (Number.isFinite(value) && value > 0 ? `฿${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—');

  const handleAnalyze = useCallback(
    async (manualPrice = null) => {
      if (!selectedTicker || loading) return;
      setLoading(true);
      setAnalysis(null);
      setAnalyzeError(null);
      setShowQuoteInput(false);

      try {
        const payload = {
          ticker: selectedTicker.toUpperCase(),
          decision_mode: decisionMode,
        };
        if (manualPrice && typeof manualPrice === 'string') payload.manual_price = manualPrice;

        // 15s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (data.status === 'INSUFFICIENT_DATA') {
          setAnalysis(data);
          setShowQuoteInput(true);
        } else if (!res.ok) {
          setAnalyzeError(data.error || 'API Error: Failed to analyze ticker.');
        } else {
          setAnalysis(data);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setAnalyzeError('Request timed out after 15 seconds. The API might be slow.');
        } else {
          setAnalyzeError('Connection failed — check network or backend server.');
        }
      }
      setLoading(false);
    },
    [selectedTicker, loading, decisionMode]
  );

  const handleRowClick = (ticker) => {
    setSelectedTicker(ticker);
    setActiveRow(ticker);
  };

  return (
    <div className="dashboard-page">
      {/* ── Header ── */}
      <header className="glass-panel dashboard-header">
        <div className="header-metrics">
          <div className="metric-item">
            <span className="metric-label">มูลค่ารวมพอร์ต</span>
            <span className="metric-value">{formatThb(portfolioMetrics.totalValue)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">กำไร/ขาดทุนรายวัน</span>
            <span className={`metric-value ${portfolioMetrics.dayPl >= 0 ? 'profit' : 'loss'}`}>
              {Number.isFinite(portfolioMetrics.dayPl)
                ? `${portfolioMetrics.dayPl >= 0 ? '+' : ''}${formatThb(Math.abs(portfolioMetrics.dayPl))}`
                : '—'}
            </span>
            <span className="metric-change" style={{ color: portfolioMetrics.dayPl >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)' }}>
              {portfolioMetrics.dayPlPct == null ? '—' : `${portfolioMetrics.dayPlPct >= 0 ? '+' : ''}${portfolioMetrics.dayPlPct.toFixed(2)}%`}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">กำไร/ขาดทุนรวม</span>
            <span className={`metric-value ${portfolioMetrics.totalPl >= 0 ? 'profit' : 'loss'}`}>
              {portfolioMetrics.totalPl == null
                ? '—'
                : `${portfolioMetrics.totalPl >= 0 ? '+' : '-'}${formatThb(Math.abs(portfolioMetrics.totalPl))}`}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">เงินสดคงเหลือ</span>
            <span className="metric-value">—</span>
          </div>
        </div>
        <span className="data-stamp" style={{ marginLeft: 'auto' }}>
          <Clock size={10} aria-hidden="true" />
          Supabase holdings + market data gateway
        </span>
      </header>

      {/* ── Watchlist ── */}
      <section className="glass-panel watchlist-panel">
        <div className="panel-header">
          <span className="panel-title">ภาพรวมตลาดและพอร์ตโฟลิโอ</span>
          <span className="data-stamp">
            <Clock size={10} aria-hidden="true" />
            Supabase holdings + market data gateway
          </span>
        </div>
        <div className="watchlist-table">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>ราคาปัจจุบัน</th>
                <th>เปลี่ยนแปลง</th>
                <th>แนวโน้ม 7 วัน</th>
                <th>เครื่องมือวางแผน</th>
              </tr>
            </thead>
            <tbody>
              {loadingWatchlist ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={`skel-${i}`}>
                      <td>
                        <div
                          className="skeleton"
                          style={{
                            width: '100px',
                            height: '24px',
                            borderRadius: '4px',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          className="skeleton"
                          style={{
                            width: '60px',
                            height: '20px',
                            borderRadius: '4px',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          className="skeleton"
                          style={{
                            width: '50px',
                            height: '20px',
                            borderRadius: '4px',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          className="skeleton"
                          style={{
                            width: '80px',
                            height: '32px',
                            borderRadius: '4px',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          className="skeleton"
                          style={{
                            width: '60px',
                            height: '24px',
                            borderRadius: '4px',
                          }}
                        />
                      </td>
                    </tr>
                  ))
              ) : watchlist.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: 0 }}>
                    <div className="empty-state" role="status">
                      <div className="empty-title">Insufficient data</div>
                      <div className="empty-copy">Connect Supabase data or run analysis before this panel can calculate.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                watchlist.map((row) => (
                  <tr
                    key={row.ticker}
                    className={`watchlist-row${activeRow === row.ticker ? ' active-row' : ''}`}
                    onClick={() => handleRowClick(row.ticker)}
                  >
                    <td>
                      <div className="ticker-cell">
                        <div
                          className="ticker-icon"
                          style={{
                            background: row.bg,
                            fontWeight: 'bold',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {row.ticker.charAt(0)}
                        </div>
                        <div>
                          <div className="ticker-symbol">{row.ticker}</div>
                          <div className="ticker-name">{row.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="price-mono">{Number.isFinite(Number(row.price)) ? `฿${Number(row.price).toFixed(2)}` : '—'}</span>
                    </td>
                    <td>
                      {Number.isFinite(Number(row.changePct)) ? (
                        <span className={`change-pill ${row.change >= 0 ? 'up' : 'down'}`}>
                          {row.change >= 0 ? '▲' : '▼'} {Math.abs(Number(row.changePct)).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="price-mono" style={{ color: 'var(--text-muted)' }}>
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      <Sparkline data={row.spark} positive={row.change >= 0} />
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{
                          width: 'auto',
                          padding: '5px 12px',
                          fontSize: '0.75rem',
                          marginTop: 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(row.ticker);
                          setShowScenario(true);
                        }}
                        aria-label={`วางแผนเทรด ${row.ticker}`}
                      >
                        วางแผน
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── AI Terminal Panel ── */}
      <aside className="ai-panel">
        <div className="glass-panel ai-input-section">
          <div className="ai-label">สถานีวิเคราะห์ AI</div>
          <input
            className="ticker-input"
            type="text"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
            placeholder="กรอกชื่อย่อหุ้น…"
            maxLength={10}
          />
          <select className="mode-select" value={decisionMode} onChange={(e) => setDecisionMode(e.target.value)}>
            <option value="Quick Trade">เทรดเร็ว (Quick Trade)</option>
            <option value="Swing Trade">เทรดรอบ (Swing Trade)</option>
            <option value="Long-Term/Core">ลงทุนระยะยาว (Long-Term/Core)</option>
            <option value="Existing Position / Exit Review">รีวิวพอร์ตเดิม (Position/Exit Review)</option>
          </select>
          <button
            className="btn-analyze"
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <div className="loader" /> กำลังวิเคราะห์…
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" strokeWidth={0} />
                สั่งวิเคราะห์ด้วย AI
              </>
            )}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowScenario(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Target size={16} />
            เปิดเครื่องมือวางแผน
          </button>
        </div>

        <PixelTradingFloor />

        {showQuoteInput && (
          <div
            className="glass-card"
            style={{
              padding: '16px',
              border: '1px solid var(--fin-warning)',
              marginTop: '16px',
            }}
          >
            <h4
              style={{
                color: 'var(--fin-warning)',
                marginTop: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={16} /> ยืนยันราคา (Price Gate)
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ระบบไม่พบข้อมูลราคาแหล่งที่สองสำหรับหุ้นไทย โปรดกรอกราคาปัจจุบันจาก Streaming เพื่อยืนยัน (Tier 1 Source)
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 34.50"
                value={manualQuote}
                onChange={(e) => setManualQuote(e.target.value)}
                min="0"
                step="0.01"
              />
              <button className="btn-analyze" onClick={() => handleAnalyze(manualQuote)} disabled={!manualQuote || loading}>
                {loading ? 'กำลังส่ง...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        )}

        {analysis && !analysis.error && analysis.status !== 'INSUFFICIENT_DATA' && <VerdictCard analysis={analysis} />}

        {analyzeError && (
          <div
            className="glass-card verdict-card error"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '16px',
              marginTop: '16px',
            }}
          >
            <AlertTriangle size={16} color="var(--fin-loss)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p
                style={{
                  color: 'var(--fin-loss)',
                  fontSize: '0.875rem',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {analyzeError}
              </p>
              <button
                className="btn-secondary"
                style={{
                  marginTop: '12px',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                }}
                onClick={() => handleAnalyze()}
              >
                <RotateCcw size={12} style={{ marginRight: '4px', display: 'inline' }} /> ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}

        {analysis && analysis.error && !analyzeError && (
          <div
            className="glass-card verdict-card error"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
            }}
          >
            <AlertTriangle size={16} color="var(--fin-loss)" />
            <p
              style={{
                color: 'var(--fin-loss)',
                fontSize: '0.875rem',
                margin: 0,
              }}
            >
              {analysis.error}
            </p>
          </div>
        )}

        {!analysis && !loading && (
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              Select or enter a ticker to begin analysis.
            </p>
          </div>
        )}
      </aside>

      {/* ── Scenario Planner ── */}
      {showScenario && <ScenarioPlannerDrawer ticker={selectedTicker} onClose={() => setShowScenario(false)} getToken={getToken} />}
    </div>
  );
}
