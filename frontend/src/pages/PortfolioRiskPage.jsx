import { useEffect, useMemo, useState } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';

const DATA_STAMP = 'Supabase holdings + market data gateway';
const DEFAULT_SECTOR_LIMIT = 35;

function sectorDrilldownSubtitle(sector) {
  if (sector.weight > sector.limit) return 'Highest breach risk';
  return 'Highest current allocation';
}

export default function PortfolioRiskPage() {
  const { getToken } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);

  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    fetchWithAuth('/api/holdings', getToken)
      .then((data) => setHoldings(Array.isArray(data) ? data : []))
      .catch(() => {
        setHoldings([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const risk = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + Number(h.shares || 0) * Number(h.price || 0), 0);
    const bySector = new Map();

    for (const holding of holdings) {
      const sector = holding.sector || 'Unknown';
      const value = Number(holding.shares || 0) * Number(holding.price || 0);
      const current = bySector.get(sector) || { sector, value: 0, holdings: [] };
      current.value += value;
      current.holdings.push(holding);
      bySector.set(sector, current);
    }

    const sectors = Array.from(bySector.values())
      .map((sector) => ({
        ...sector,
        weight: totalValue > 0 ? (sector.value / totalValue) * 100 : 0,
        limit: DEFAULT_SECTOR_LIMIT,
      }))
      .sort((a, b) => b.weight - a.weight);

    return {
      totalValue,
      sectors,
      overLimit: sectors.filter((sector) => sector.weight > sector.limit),
    };
  }, [holdings]);

  const activeSector = useMemo(() => {
    if (selectedSector) {
      return risk.sectors.find((sector) => sector.sector === selectedSector) || risk.sectors[0];
    }
    return risk.overLimit[0] || risk.sectors[0] || null;
  }, [risk.sectors, risk.overLimit, selectedSector]);

  const sectorTreemapContent = (() => {
    if (loading) {
      return (
        <div className="empty-state" style={{ padding: '48px 24px' }}>
          Loading portfolio risk...
        </div>
      );
    }
    if (error) {
      return (
        <div className="empty-state">
          <div className="empty-title">Insufficient data</div>
          <div className="empty-copy">Connect Supabase data or run analysis before this panel can calculate.</div>
          <button className="btn-secondary" onClick={loadData}>
            Retry
          </button>
        </div>
      );
    }
    if (risk.sectors.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-title">Insufficient data</div>
          <div className="empty-copy">Connect Supabase data or run analysis before this panel can calculate.</div>
        </div>
      );
    }
    return (
      <div className="sector-bars">
        {risk.sectors.map((sector) => {
          const pct = Math.min((sector.weight / sector.limit) * 100, 100);
          const isOver = sector.weight > sector.limit;
          const barColor = isOver ? 'var(--fin-loss)' : 'var(--fin-profit)';
          return (
            <button
              key={sector.sector}
              type="button"
              className="sector-bar-row"
              onClick={() => setSelectedSector(sector.sector)}
              aria-pressed={activeSector?.sector === sector.sector}
              aria-label={`${sector.sector}: ${sector.weight.toFixed(1)} percent of portfolio, limit ${sector.limit} percent`}
              style={{ textAlign: 'left', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="sector-bar-name">{sector.sector}</div>
              <div className="sector-bar-track">
                <div className="sector-bar-fill" style={{ transform: `scaleX(${pct / 100})`, background: barColor }} />
                <div className="sector-bar-limit-marker" style={{ left: '100%' }} />
              </div>
              <div className="sector-bar-meta">
                <span style={{ color: barColor }} className="sector-weight-val">
                  {sector.weight.toFixed(1)}%
                </span>
                <span className="sector-limit-val">/ เพดาน {sector.limit}%</span>
                <span className="sector-risk-label sr-only" style={{ marginLeft: 8 }}>
                  {isOver ? 'Over limit' : 'Within limit'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  })();

  return (
    <div className="risk-page">
      {risk.overLimit.length > 0 && (
        <div className="risk-alert-banner" role="alert">
          <ShieldAlert size={16} aria-hidden="true" className="alert-icon-glyph" />
          <span>
            คำเตือนสัดส่วนการลงทุน: <strong>{risk.overLimit.map((s) => s.sector).join(', ')}</strong> เกินเพดานที่ตั้งไว้
          </span>
        </div>
      )}

      <div className="risk-kpi-row">
        <div className="glass-panel risk-kpi-card" style={{ position: 'relative' }}>
          <div className="kpi-label">
            {'มูลค่าพอร์ต '}
            <span className="data-stamp" style={{ position: 'absolute', top: 24, right: 24 }}>
              <Clock size={10} aria-hidden="true" />
              {DATA_STAMP}
            </span>
          </div>
          <div className="kpi-value kpi-neutral">
            {risk.totalValue > 0 ? `฿${risk.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </div>
          <div className="kpi-sub">{holdings.length} สถานะจาก Supabase</div>
        </div>
        <div className="glass-panel risk-kpi-card">
          <div className="kpi-label">กลุ่มที่เกินเพดาน</div>
          <div className={`kpi-value ${risk.overLimit.length > 0 ? 'kpi-loss' : 'kpi-neutral'}`}>{risk.overLimit.length}</div>
          <div className="kpi-sub">เพดานเริ่มต้น {DEFAULT_SECTOR_LIMIT}% ต่อ sector</div>
        </div>
        <div className="glass-panel risk-kpi-card">
          <div className="kpi-label">ข้อมูล VaR</div>
          <div className="kpi-value kpi-neutral">—</div>
          <div className="kpi-sub">ต้องมี volatility history ก่อนคำนวณ</div>
        </div>
      </div>

      <div className="glass-panel risk-treemap-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-heading">การกระจายความเสี่ยงรายกลุ่ม</h2>
            <p className="panel-subtext">คำนวณจาก holdings จริง ไม่มีข้อมูลจำลอง</p>
          </div>
        </div>

        {sectorTreemapContent}

        {activeSector && (
          <section className="risk-drilldown" aria-label={`${activeSector.sector} holdings`} style={{ marginTop: '24px' }}>
            <div className="panel-heading">Showing: {activeSector.sector}</div>
            <div className="panel-subtext">{sectorDrilldownSubtitle(activeSector)}</div>
            <table className="risk-holdings-table" style={{ width: '100%', marginTop: '16px', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Value</th>
                  <th>Weight</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {activeSector.holdings.map((holding) => (
                  <tr key={holding.id || holding.ticker}>
                    <td>{holding.ticker}</td>
                    <td>฿{(Number(holding.shares || 0) * Number(holding.price || 0)).toLocaleString()}</td>
                    <td>{activeSector.weight.toFixed(1)}%</td>
                    <td>{activeSector.weight > activeSector.limit ? 'Over limit' : 'Within limit'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
