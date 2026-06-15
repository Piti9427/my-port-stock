import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Award, Activity, Clock, BarChart3 } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';

const DATA_STAMP = 'Supabase journal data';

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    fetchWithAuth('/api/journal', getToken)
      .then((data) => setTrades(data.trades || []))
      .catch(() => {
        setTrades([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const [searchParams, setSearchParams] = useSearchParams();
  const tickerFilter = searchParams.get('ticker') || 'ALL';
  const modeFilter = searchParams.get('mode') || 'ALL';

  const closedTrades = useMemo(() => trades.filter((t) => String(t.status || '').toUpperCase() === 'CLOSED'), [trades]);

  const filteredClosedTrades = useMemo(() => {
    return closedTrades.filter((trade) => {
      const tickerOk = tickerFilter === 'ALL' || trade.ticker === tickerFilter;
      const modeOk = modeFilter === 'ALL' || trade.mode === modeFilter;
      return tickerOk && modeOk;
    });
  }, [closedTrades, tickerFilter, modeFilter]);

  const stats = useMemo(() => {
    const total = filteredClosedTrades.length;
    const winners = filteredClosedTrades.filter((t) => Number(t.profit) > 0).length;
    const losers = total - winners;
    const totalPl = filteredClosedTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0);
    const winRate = total > 0 ? Math.round((winners / total) * 100) : null;
    const avgWin =
      winners > 0 ? filteredClosedTrades.filter((t) => Number(t.profit) > 0).reduce((sum, t) => sum + Number(t.profit || 0), 0) / winners : 0;
    const avgLoss =
      losers > 0 ? Math.abs(filteredClosedTrades.filter((t) => Number(t.profit) < 0).reduce((sum, t) => sum + Number(t.profit || 0), 0) / losers) : 0;

    return { total, winners, losers, totalPl, winRate, avgWin, avgLoss };
  }, [filteredClosedTrades]);

  return (
    <div className="analytics-page">
      <header className="glass-panel analytics-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Performance Analytics</h1>
          <span className="data-stamp" style={{ marginLeft: 'auto' }}>
            <Clock size={10} aria-hidden="true" />
            Supabase journal data
          </span>
        </div>
        {!loading && !error && closedTrades.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="header-metrics">
              <div className="metric">
                <span className="metric-label">Total Trades</span>
                <span className="metric-value">{stats.total}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Win Rate</span>
                <span className="metric-value">{stats.winRate == null ? '—' : `${stats.winRate}%`}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Avg Return</span>
                <span className="metric-value">฿{stats.avgWin.toFixed(0)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <select
                className="input-field"
                style={{ padding: '6px', fontSize: '0.85rem' }}
                value={tickerFilter}
                onChange={(e) =>
                  setSearchParams((prev) => {
                    prev.set('ticker', e.target.value);
                    return prev;
                  })
                }
              >
                <option value="ALL">All Tickers</option>
                {[...new Set(closedTrades.map((t) => t.ticker))].map((ticker) => (
                  <option key={ticker} value={ticker}>
                    {ticker}
                  </option>
                ))}
              </select>
              <select
                className="input-field"
                style={{ padding: '6px', fontSize: '0.85rem' }}
                value={modeFilter}
                onChange={(e) =>
                  setSearchParams((prev) => {
                    prev.set('mode', e.target.value);
                    return prev;
                  })
                }
              >
                <option value="ALL">All Modes</option>
                {[...new Set(closedTrades.map((t) => t.mode).filter(Boolean))].map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <div className="empty-state">Loading analytics...</div>
      ) : error ? (
        <div className="empty-state" role="status" style={{ marginTop: '24px' }}>
          <div className="empty-title">Insufficient data</div>
          <div className="empty-copy">Connect Supabase data or run analysis before this panel can calculate.</div>
          <button className="btn-secondary" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : filteredClosedTrades.length === 0 ? (
        <div className="empty-state" role="status" style={{ marginTop: '24px' }}>
          <div className="empty-title">Insufficient data</div>
          <div className="empty-copy">{closedTrades.length === 0 ? 'ไม่มี trade ที่ปิดแล้วใน Supabase' : 'ไม่มี trade ที่ตรงกับ filter นี้'}</div>
        </div>
      ) : (
        <div className="analytics-stats-row" style={{ marginTop: '24px' }}>
          <div className="glass-panel analytics-stat">
            <TrendingUp size={18} style={{ color: 'var(--fin-profit)', marginBottom: 10 }} />
            <div className="kpi-label">อัตราการชนะ</div>
            <div className="kpi-value kpi-profit">{stats.winRate == null ? '—' : `${stats.winRate}%`}</div>
            <div className="kpi-sub">
              {stats.winners}/{stats.total} ไม้ที่ปิดแล้ว
            </div>
          </div>
          <div className="glass-panel analytics-stat">
            <Award size={18} style={{ color: 'var(--brand-primary)', marginBottom: 10 }} />
            <div className="kpi-label">กำไร/ขาดทุนที่รับรู้แล้ว</div>
            <div className={`kpi-value ${stats.totalPl >= 0 ? 'kpi-profit' : 'kpi-loss'}`}>
              {stats.total === 0 ? '—' : `${stats.totalPl >= 0 ? '+' : ''}฿${stats.totalPl.toLocaleString()}`}
            </div>
            <div className="kpi-sub">เฉพาะไม้ที่ปิดสถานะแล้ว</div>
          </div>
          <div className="glass-panel analytics-stat">
            <Activity size={18} aria-hidden="true" style={{ color: 'var(--fin-warning)', marginBottom: 10 }} />
            <div className="kpi-label">กำไรเฉลี่ย / ขาดทุนเฉลี่ย</div>
            <div className="kpi-value kpi-neutral">{stats.total === 0 ? '—' : `฿${stats.avgWin.toFixed(0)} / ฿${stats.avgLoss.toFixed(0)}`}</div>
            <div className="kpi-sub">คำนวณจาก journal ที่ปิดแล้ว</div>
          </div>
          <div className="glass-panel analytics-stat">
            <TrendingDown size={18} aria-hidden="true" style={{ color: 'var(--fin-loss)', marginBottom: 10 }} />
            <div className="kpi-label">ขาดทุนสะสมสูงสุด (Max Drawdown)</div>
            <div className="kpi-value kpi-neutral">—</div>
            <div className="kpi-sub">ต้องมี equity snapshots ก่อนคำนวณ</div>
          </div>
        </div>
      )}

      {!loading && !error && filteredClosedTrades.length > 0 && (
        <>
          <div className="glass-panel analytics-equity-panel" style={{ marginTop: '24px' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-heading">กราฟการเติบโตของพอร์ต (Equity Curve)</h2>
                <p className="panel-subtext">
                  รอข้อมูลมูลค่าพอร์ตย้อนหลังจาก Supabase
                  <span className="data-stamp">
                    <Clock size={10} aria-hidden="true" />
                    {DATA_STAMP}
                  </span>
                </p>
              </div>
            </div>
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <BarChart3 size={32} aria-hidden="true" style={{ opacity: 0.3 }} />
              <div>Insufficient data for equity curve</div>
            </div>
          </div>

          <div className="glass-panel analytics-history" style={{ marginTop: '24px' }}>
            <div className="panel-header">
              <span className="panel-heading">ประวัติการเทรดที่ปิดแล้ว</span>
            </div>
            <div className="watchlist-table">
              <table>
                <thead>
                  <tr>
                    <th>ชื่อหุ้น</th>
                    <th>โหมด</th>
                    <th>วันเข้าซื้อ</th>
                    <th>วันปิดสถานะ</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClosedTrades.map((t) => (
                    <tr key={t.id || `${t.ticker}-${t.created_at}`} className="watchlist-row">
                      <td>{t.ticker}</td>
                      <td>{t.mode || '—'}</td>
                      <td>{t.date || t.created_at || '—'}</td>
                      <td>{t.closed_at || '—'}</td>
                      <td className={Number(t.profit) >= 0 ? 'kpi-profit' : 'kpi-loss'}>{Number(t.profit || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
