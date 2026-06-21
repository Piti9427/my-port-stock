import { useMemo, useState } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { usePortfolio } from '../hooks/usePortfolio';
import { DEFAULT_SECTOR_LIMIT, buildPortfolioRisk } from '../components/risk/riskCalculations';

const DATA_STAMP = 'Supabase holdings + market data gateway';

function sectorDrilldownSubtitle(sector) {
  if (sector.weight > sector.limit) return 'Highest breach risk';
  return 'Highest current allocation';
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return 'Unknown';
  return `฿${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'Unknown';
  return `${Number(value).toFixed(1)}%`;
}

function missingStopCopy(count) {
  if (count === 0) return 'All positions have stop-loss data';
  if (count === 1) return '1 position missing stop-loss';
  return `${count} positions missing stop-loss`;
}

function riskBudgetTone(risk) {
  if (risk.missingStopCount > 0 || risk.knownRisk > risk.riskBudget) return 'kpi-loss';
  if (risk.riskBudgetPct >= 80) return 'kpi-warning';
  return 'kpi-neutral';
}

export default function PortfolioRiskPage() {
  const { getToken } = useAuth();
  const [selectedSector, setSelectedSector] = useState(null);
  const { holdings, isStale, loading, status, refetch } = usePortfolio({ getToken });

  const risk = useMemo(() => buildPortfolioRisk(holdings), [holdings]);

  const activeSector = useMemo(() => {
    if (selectedSector) {
      return risk.sectors.find((sector) => sector.sector === selectedSector) || risk.sectors[0] || null;
    }
    return risk.overLimit[0] || risk.sectors[0] || null;
  }, [risk.sectors, risk.overLimit, selectedSector]);

  const unavailable = status === 'ERROR' || status === 'UNAUTHORIZED' || status === 'INSUFFICIENT_DATA';

  const sectorTreemapContent = (() => {
    if (loading) {
      return (
        <div className="empty-state" style={{ padding: '48px 24px' }}>
          Loading portfolio risk...
        </div>
      );
    }
    if (unavailable) {
      return (
        <div className="empty-state">
          <div className="empty-title">Insufficient data</div>
          <div className="empty-copy">Connect Supabase data or run analysis before this panel can calculate.</div>
          <button className="btn-secondary" onClick={refetch}>
            Retry
          </button>
        </div>
      );
    }
    if (risk.sectors.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-title">เพิ่มหุ้นในพอร์ตเพื่อดูความเสี่ยง</div>
          <div className="empty-copy">ยังไม่มี Supabase holdings สำหรับบัญชีนี้ จึงยังคำนวณ sector, stop-loss, และ risk budget ไม่ได้</div>
        </div>
      );
    }
    return (
      <div className="sector-bars">
        {risk.sectors.map((sector) => {
          const pct = Math.min((sector.weight / sector.limit) * 100, 100);
          const isOver = sector.weight > sector.limit;
          const barColor = isOver ? 'var(--fin-loss)' : 'var(--fin-profit)';
          const active = activeSector?.sector === sector.sector;

          return (
            <button
              key={sector.sector}
              type="button"
              className={`sector-bar-row ${active ? 'sector-bar-active' : ''}`}
              onClick={() => setSelectedSector(sector.sector)}
              aria-pressed={active}
              aria-label={`${sector.sector}: ${sector.weight.toFixed(1)} percent of portfolio, limit ${sector.limit} percent, ${sector.statusLabel}`}
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
                <span className="sector-risk-label sr-only">{sector.statusLabel}</span>
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
              {isStale && <span aria-label="Stale data"> / Stale</span>}
            </span>
          </div>
          <div className="kpi-value kpi-neutral">{risk.totalValue > 0 ? formatCurrency(risk.totalValue) : '—'}</div>
          <div className="kpi-sub">{holdings.length} สถานะจาก Supabase</div>
        </div>
        <div className="glass-panel risk-kpi-card">
          <div className="kpi-label">กลุ่มที่เกินเพดาน</div>
          <div className={`kpi-value ${risk.overLimit.length > 0 ? 'kpi-loss' : 'kpi-neutral'}`}>{risk.overLimit.length}</div>
          <div className="kpi-sub">เพดานเริ่มต้น {DEFAULT_SECTOR_LIMIT}% ต่อ sector</div>
        </div>
        <div className="glass-panel risk-kpi-card risk-budget-card">
          <div className="kpi-label">Risk Budget</div>
          <div className={`kpi-value ${riskBudgetTone(risk)}`}>
            Known risk {formatCurrency(risk.knownRisk)} / {formatCurrency(risk.riskBudget)}
          </div>
          <div
            className="risk-budget-track"
            role="progressbar"
            aria-label="Risk budget used"
            aria-valuemin={0}
            aria-valuenow={Math.round(risk.knownRisk)}
            aria-valuemax={risk.riskBudget}
          >
            <div className="risk-budget-fill" style={{ transform: `scaleX(${risk.riskBudgetPct / 100})` }} />
          </div>
          <div className="kpi-sub">{missingStopCopy(risk.missingStopCount)}</div>
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
          <section className="risk-drilldown" aria-label={`${activeSector.sector} holdings`}>
            <div className="panel-heading">Showing: {activeSector.sector}</div>
            <div className="panel-subtext">{sectorDrilldownSubtitle(activeSector)}</div>
            <div className="risk-table-wrap">
              <table className="risk-holdings-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Value</th>
                    <th>Weight%</th>
                    <th>Stop Distance</th>
                    <th>THB Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSector.holdings.map((holding) => (
                    <tr key={holding.id || holding.ticker} className={holding.thbRisk === null ? 'risk-row-missing' : ''}>
                      <td>{holding.ticker}</td>
                      <td>{formatCurrency(holding.value)}</td>
                      <td>{formatPercent(holding.weight)}</td>
                      <td>{holding.stopDistancePct === null ? 'Unknown' : formatPercent(holding.stopDistancePct)}</td>
                      <td>{holding.thbRisk === null ? 'Unknown' : formatCurrency(holding.thbRisk)}</td>
                      <td>{holding.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
