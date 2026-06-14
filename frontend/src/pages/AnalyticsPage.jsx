import { useState } from 'react';
import { TrendingUp, TrendingDown, Award, Activity, Clock } from 'lucide-react';

const DATA_STAMP = 'Manual data · No live feed';

const EQUITY_CURVE = [
  { date: '2026-01', value: 5_000_000 },
  { date: '2026-02', value: 5_320_000 },
  { date: '2026-03', value: 5_180_000 },
  { date: '2026-04', value: 5_760_000 },
  { date: '2026-05', value: 6_120_000 },
  { date: '2026-06', value: 8_540_000 },
];

const CLOSED_TRADES = [
  {
    ticker: 'TSLA',
    mode: 'Quick Trade',
    open: '2026-04-02',
    close: '2026-04-09',
    plPct: +9.2,
    plThb: 46_000,
    verdict: 'Buy',
    score: 7.4,
  },
  {
    ticker: 'META',
    mode: 'Swing Trade',
    open: '2026-03-15',
    close: '2026-04-01',
    plPct: +14.8,
    plThb: 88_500,
    verdict: 'Buy',
    score: 8.1,
  },
  {
    ticker: 'AMZN',
    mode: 'Swing Trade',
    open: '2026-03-01',
    close: '2026-03-14',
    plPct: -5.6,
    plThb: -27_300,
    verdict: 'Buy',
    score: 6.2,
  },
  {
    ticker: 'GOOGL',
    mode: 'Core',
    open: '2026-02-10',
    close: '2026-03-05',
    plPct: +18.3,
    plThb: 143_000,
    verdict: 'Buy',
    score: 8.8,
  },
  {
    ticker: 'NFLX',
    mode: 'Quick Trade',
    open: '2026-01-20',
    close: '2026-01-28',
    plPct: -3.1,
    plThb: -12_400,
    verdict: 'Buy',
    score: 5.9,
  },
  {
    ticker: 'NVDA',
    mode: 'Swing Trade',
    open: '2026-01-05',
    close: '2026-01-19',
    plPct: +22.6,
    plThb: 181_000,
    verdict: 'Buy',
    score: 9.0,
  },
];

const TOTAL_CLOSED = CLOSED_TRADES.length;
const WINNERS = TOTAL_CLOSED > 0 ? CLOSED_TRADES.filter((t) => t.plPct > 0).length : 0;
const LOSERS = TOTAL_CLOSED - WINNERS;
const WIN_RATE = TOTAL_CLOSED > 0 ? ((WINNERS / TOTAL_CLOSED) * 100).toFixed(0) : '—';
const TOTAL_PL_THB = CLOSED_TRADES.reduce((s, t) => s + t.plThb, 0);
const AVG_WIN = WINNERS > 0 ? CLOSED_TRADES.filter((t) => t.plPct > 0).reduce((s, t) => s + t.plPct, 0) / WINNERS : 0;
const AVG_LOSS = LOSERS > 0 ? Math.abs(CLOSED_TRADES.filter((t) => t.plPct < 0).reduce((s, t) => s + t.plPct, 0) / LOSERS) : 0;
const winRateNum = TOTAL_CLOSED > 0 ? WINNERS / TOTAL_CLOSED : 0;
const EXPECTANCY = (winRateNum * AVG_WIN - (1 - winRateNum) * AVG_LOSS).toFixed(2);

// Compute sparkline path from data
function buildEquityPath(data) {
  const w = 700,
    h = 200,
    pad = 24;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals),
    max = Math.max(...vals);
  const xStep = (w - pad * 2) / (data.length - 1);
  const yScale = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const pts = data.map((d, i) => `${pad + i * xStep},${yScale(d.value)}`);
  const areaBottom = `${pad + (data.length - 1) * xStep},${h - pad} ${pad},${h - pad}`;
  return {
    line: 'M ' + pts.join(' L '),
    area: 'M ' + pts.join(' L ') + ' L ' + areaBottom + ' Z',
    points: data.map((d, i) => ({
      x: pad + i * xStep,
      y: yScale(d.value),
      label: d.date,
      value: d.value,
    })),
  };
}

const eqPath = buildEquityPath(EQUITY_CURVE);

export default function AnalyticsPage() {
  const [hoveredPt, setHoveredPt] = useState(null);
  const [modeFilter, setModeFilter] = useState('All');
  const modes = ['All', 'Quick Trade', 'Swing Trade', 'Core'];
  const filteredTrades = modeFilter === 'All' ? CLOSED_TRADES : CLOSED_TRADES.filter((t) => t.mode === modeFilter);

  return (
    <div className="analytics-page">
      {/* Summary stats row */}
      <div className="analytics-stats-row">
        <div className="glass-panel analytics-stat">
          <TrendingUp size={18} style={{ color: 'var(--fin-profit)', marginBottom: 10 }} />
          <div className="kpi-label">อัตราการชนะ</div>
          <div className="kpi-value kpi-profit">{WIN_RATE}%</div>
          <div className="kpi-sub">
            {WINNERS}/{TOTAL_CLOSED} ไม้ที่ปิดแล้ว
          </div>
        </div>
        <div className="glass-panel analytics-stat">
          <Award size={18} style={{ color: 'var(--brand-primary)', marginBottom: 10 }} />
          <div className="kpi-label">กำไร/ขาดทุนที่รับรู้แล้ว</div>
          <div className={`kpi-value ${TOTAL_PL_THB >= 0 ? 'kpi-profit' : 'kpi-loss'}`}>
            {TOTAL_PL_THB >= 0 ? '+' : ''}฿{(TOTAL_PL_THB / 1000).toFixed(0)}K
          </div>
          <div className="kpi-sub">เฉพาะไม้ที่ปิดสถานะแล้ว</div>
        </div>
        <div className="glass-panel analytics-stat">
          <Activity size={18} aria-hidden="true" style={{ color: 'var(--fin-warning)', marginBottom: 10 }} />
          <div className="kpi-label">กำไรเฉลี่ย / ขาดทุนเฉลี่ย</div>
          <div className="kpi-value kpi-neutral">
            {AVG_WIN.toFixed(1)}% / {AVG_LOSS.toFixed(1)}%
          </div>
          <div className="kpi-sub">
            ค่าคาดหวัง: {Number(EXPECTANCY) >= 0 ? '+' : ''}
            {EXPECTANCY}% ต่อไม้
          </div>
        </div>
        <div className="glass-panel analytics-stat">
          <TrendingDown size={18} aria-hidden="true" style={{ color: 'var(--fin-loss)', marginBottom: 10 }} />
          <div className="kpi-label">ขาดทุนสะสมสูงสุด (Max Drawdown)</div>
          <div className="kpi-value kpi-loss">-5.6%</div>
          <div className="kpi-sub">มี.ค. 2026, เทรดรอบ AMZN</div>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="glass-panel analytics-equity-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-heading">กราฟการเติบโตของพอร์ต (Equity Curve)</h2>
            <p className="panel-subtext">
              มูลค่าพอร์ตรวมตามเวลา (THB)
              <span className="data-stamp">
                <Clock size={10} aria-hidden="true" />
                {DATA_STAMP}
              </span>
            </p>
          </div>
          {hoveredPt && (
            <div style={{ textAlign: 'right' }}>
              <div className="kpi-label">{hoveredPt.label}</div>
              <div
                className="price-mono"
                style={{
                  color: 'var(--fin-profit)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                ฿{(hoveredPt.value / 1_000_000).toFixed(2)}M
              </div>
            </div>
          )}
        </div>

        <div className="equity-chart-wrap">
          <svg viewBox="0 0 700 200" className="equity-svg" aria-label="Equity curve chart" role="img">
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--fin-profit)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--fin-profit)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((r) => (
              <line key={r} x1="24" y1={24 + (200 - 48) * r} x2="676" y2={24 + (200 - 48) * r} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {/* Area fill */}
            <path d={eqPath.area} fill="url(#equityGrad)" />
            {/* Line */}
            <path d={eqPath.line} fill="none" stroke="var(--fin-profit)" strokeWidth="2" strokeLinecap="round" />
            {/* Points */}
            {eqPath.points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill={hoveredPt?.label === pt.label ? 'var(--fin-profit)' : 'var(--bg-void)'}
                stroke="var(--fin-profit)"
                strokeWidth="2"
                className="equity-dot"
                onMouseEnter={() => setHoveredPt(pt)}
                onMouseLeave={() => setHoveredPt(null)}
                style={{ cursor: 'crosshair' }}
                aria-label={`${pt.label}: ฿${(pt.value / 1_000_000).toFixed(2)}M`}
              />
            ))}
            {/* X labels */}
            {eqPath.points.map((pt, i) => (
              <text key={i} x={pt.x} y={195} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                {pt.label}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Trade History Table */}
      <div className="glass-panel analytics-history">
        <div className="panel-header">
          <span className="panel-heading">ประวัติการเทรดที่ปิดแล้ว</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {modes.map((m) => (
              <button key={m} className="filter-chip" data-active={modeFilter === m} onClick={() => setModeFilter(m)} aria-pressed={modeFilter === m}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="watchlist-table">
          <table>
            <thead>
              <tr>
                <th>ชื่อหุ้น</th>
                <th>โหมด</th>
                <th>วันเข้าซื้อ</th>
                <th>วันปิดสถานะ</th>
                <th>คะแนน AI</th>
                <th>P/L %</th>
                <th>P/L (THB)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div style={{ opacity: 0.3, fontSize: '1.5rem' }}>📊</div>
                      <div>ยังไม่มีประวัติการเทรดสำหรับโหมดนี้</div>
                      <button className="btn-secondary" style={{ width: 'auto', marginTop: 4 }} onClick={() => setModeFilter('All')}>
                        แสดงทุกโหมด
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.ticker + t.open} className="watchlist-row">
                    <td style={{ fontWeight: 700 }}>{t.ticker}</td>
                    <td>
                      <span
                        className="panel-badge"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t.mode}
                      </span>
                    </td>
                    <td
                      style={{
                        color: 'var(--text-secondary)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.82rem',
                      }}
                    >
                      {t.open}
                    </td>
                    <td
                      style={{
                        color: 'var(--text-secondary)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.82rem',
                      }}
                    >
                      {t.close}
                    </td>
                    <td>
                      <div className="score-bar-wrap">
                        <span
                          className="price-mono"
                          style={{
                            color: t.score >= 7 ? 'var(--fin-profit)' : t.score >= 5 ? 'var(--fin-warning)' : 'var(--fin-loss)',
                          }}
                          aria-label={`AI score ${t.score} out of 10`}
                        >
                          {t.score}
                        </span>
                        <div className="score-bar-track" aria-hidden="true">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${t.score * 10}%`,
                              background: t.score >= 7 ? 'var(--fin-profit)' : t.score >= 5 ? 'var(--fin-warning)' : 'var(--fin-loss)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`change-pill ${t.plPct >= 0 ? 'up' : 'down'}`}
                        aria-label={`${t.plPct >= 0 ? 'profit' : 'loss'} ${Math.abs(t.plPct)} percent`}
                      >
                        {t.plPct >= 0 ? '+' : ''}
                        {t.plPct}%
                      </span>
                    </td>
                    <td
                      className="price-mono"
                      style={{
                        color: t.plThb >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)',
                        fontWeight: 600,
                      }}
                    >
                      {t.plThb >= 0 ? '+' : ''}฿{Math.abs(t.plThb / 1000).toFixed(0)}K
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
