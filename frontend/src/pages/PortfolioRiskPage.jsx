import { useState } from 'react';
import { ShieldAlert, AlertTriangle, ChevronRight, X, Clock } from 'lucide-react';

const DATA_STAMP = 'ข้อมูลจำลอง · ไม่อัปเดตแบบเรียลไทม์';

const SECTOR_DATA = [
  { sector: 'Technology', weight: 38.4, var: 4.2, limit: 35, holdings: [
    { ticker: 'NVDA', name: 'NVIDIA Corp', weight: 14.8, cost: 92.00, current: 131.50, pl: +39.5, stop: 115.00, riskThb: 24500 },
    { ticker: 'AAPL', name: 'Apple Inc', weight: 12.2, cost: 195.00, current: 210.50, pl: +7.9, stop: 195.00, riskThb: 18200 },
    { ticker: 'MSFT', name: 'Microsoft', weight: 11.4, cost: 390.00, current: 425.00, pl: +8.9, stop: 400.00, riskThb: 15600 },
  ]},
  { sector: 'Healthcare', weight: 18.6, var: 1.8, limit: 25, holdings: [
    { ticker: 'LLY', name: 'Eli Lilly', weight: 10.2, cost: 740.00, current: 810.00, pl: +9.4, stop: 780.00, riskThb: 21000 },
    { ticker: 'UNH', name: 'UnitedHealth', weight: 8.4, cost: 490.00, current: 528.00, pl: +7.7, stop: 500.00, riskThb: 12600 },
  ]},
  { sector: 'Financials', weight: 16.2, var: 1.4, limit: 20, holdings: [
    { ticker: 'JPM', name: 'JPMorgan Chase', weight: 9.8, cost: 188.00, current: 215.00, pl: +14.3, stop: 200.00, riskThb: 14700 },
    { ticker: 'V', name: 'Visa Inc', weight: 6.4, cost: 268.00, current: 285.00, pl: +6.3, stop: 272.00, riskThb: 8960 },
  ]},
  { sector: 'Consumer Disc.', weight: 12.8, var: 1.6, limit: 20, holdings: [
    { ticker: 'AMZN', name: 'Amazon', weight: 8.2, cost: 195.00, current: 225.00, pl: +15.3, stop: 205.00, riskThb: 16400 },
    { ticker: 'TSLA', name: 'Tesla', weight: 4.6, cost: 172.00, current: 185.00, pl: +7.5, stop: 170.00, riskThb: 9200 },
  ]},
  { sector: 'Energy', weight: 8.2, var: 0.9, limit: 15, holdings: [
    { ticker: 'XOM', name: 'ExxonMobil', weight: 8.2, cost: 105.00, current: 112.00, pl: +6.6, stop: 103.00, riskThb: 7380 },
  ]},
  { sector: 'Cash / Fixed', weight: 5.8, var: 0, limit: 100, holdings: [] },
];

const TOTAL_PORT_THB = 8_540_000;
const MAX_DRAWDOWN_RISK_THB = TOTAL_PORT_THB * 0.068;


function TreemapBlock({ sector, onSelect, selected }) {
  const isOver = sector.weight > sector.limit;
  const isWarn = !isOver && sector.weight / sector.limit >= 0.85;
  const widthPct = sector.weight;

  return (
    <button
      className={`treemap-block ${isOver ? 'treemap-over' : ''} ${isWarn ? 'treemap-warn' : ''} ${selected ? 'treemap-selected' : ''}`}
      style={{ flexBasis: `${Math.max(widthPct, 6)}%` }}
      onClick={() => onSelect(sector)}
      title={`${sector.sector}: ${sector.weight}%`}
      aria-pressed={selected}
    >
      <div className="treemap-label">
        <span className="treemap-sector">{sector.sector}</span>
        <span className="treemap-pct">{sector.weight}%</span>
      </div>
      {(isOver || isWarn) && (
        <div className="treemap-alert-icon">
          <AlertTriangle size={12} />
        </div>
      )}
      <div
        className="treemap-fill"
        style={{ '--fill-color': isOver ? 'var(--fin-loss)' : isWarn ? 'var(--fin-warning)' : 'var(--fin-profit)' }}
      />
    </button>
  );
}

function limit(sector) { return sector.limit; }

export default function PortfolioRiskPage() {
  // Sort by weight descending so we can easily pick the highest weight as default
  const sortedSectors = [...SECTOR_DATA].sort((a, b) => b.weight - a.weight);
  
  const [selectedSector, setSelectedSector] = useState(sortedSectors[0]);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const overLimitSectors = SECTOR_DATA.filter(s => s.weight > s.limit);
  const showAlert = overLimitSectors.length > 0 && !alertDismissed;

  const handleSelect = (sector) => {
    setSelectedSector(prev => prev?.sector === sector.sector ? null : sector);
  };

  const totalRiskThb = SECTOR_DATA.flatMap(s => s.holdings).reduce((sum, h) => sum + h.riskThb, 0);

  return (
    <div className="risk-page">

      {/* Breach Alert Banner */}
      {showAlert && (
        <div className="risk-alert-banner" role="alert">
          <ShieldAlert size={16} aria-hidden="true" className="alert-icon-glyph" />
          <span>
            คำเตือนสัดส่วนการลงทุน: <strong>{overLimitSectors.map(s => s.sector).join(', ')}</strong> เกินเพดานที่ตั้งไว้
          </span>
          <button className="btn-icon" onClick={() => setAlertDismissed(true)} aria-label="Dismiss alert">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="risk-kpi-row">
        <div className="glass-panel risk-kpi-card" style={{ position: 'relative' }}>
          <div className="kpi-label">
            มูลค่าพอร์ต (THB)
            <span className="data-stamp" style={{ position: 'absolute', top: 24, right: 24 }}><Clock size={10} aria-hidden="true" />{DATA_STAMP}</span>
          </div>
          <div className="kpi-value kpi-neutral">฿{(TOTAL_PORT_THB / 1_000_000).toFixed(2)}M</div>
          <div className="kpi-sub">4 สถานะ + เงินสด</div>
        </div>
        <div className="glass-panel risk-kpi-card">
          <div className="kpi-label">มูลค่าความเสี่ยงรวม (VaR 1-day, 95%)</div>
          <div className="kpi-value kpi-loss">฿{(MAX_DRAWDOWN_RISK_THB / 1000).toFixed(0)}K</div>
          <div className="kpi-sub">{((MAX_DRAWDOWN_RISK_THB / TOTAL_PORT_THB) * 100).toFixed(1)}% ของพอร์ต</div>
        </div>
        <div className="glass-panel risk-kpi-card">
          <div className="kpi-label">ความเสี่ยงสูงสุดต่อไม้ (THB)</div>
          <div className="kpi-value kpi-warning">฿25,000</div>
          <div className="kpi-sub">จำกัดความเสี่ยงสูงสุดที่ตั้งไว้</div>
        </div>
        <div className="glass-panel risk-kpi-card">
          <div className="kpi-label">สัดส่วนเงินสด</div>
          <div className="kpi-value kpi-neutral">5.8%</div>
          <div className="kpi-sub">฿{(TOTAL_PORT_THB * 0.058 / 1000).toFixed(0)}K คงเหลือ</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="risk-main-grid">

        {/* Treemap Panel */}
        <div className="glass-panel risk-treemap-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-heading">การกระจายความเสี่ยงรายกลุ่ม</h2>
              <p className="panel-subtext">คลิกกลุ่มอุตสาหกรรมเพื่อดูหุ้นในพอร์ต (สีแดง = เกินเพดานที่ตั้งไว้)</p>
            </div>
            <div className="treemap-legend">
              <span className="legend-item legend-ok">อยู่ในเกณฑ์ปกติ</span>
              <span className="legend-item legend-warn">ใกล้ชนเพดาน (&gt;85%)</span>
              <span className="legend-item legend-over">เกินเพดาน</span>
            </div>
          </div>

          {/* Treemap */}
          <div className="treemap-container" role="group" aria-label="Sector allocation heatmap">
            {SECTOR_DATA.map(s => (
              <TreemapBlock
                key={s.sector}
                sector={s}
                onSelect={handleSelect}
                selected={selectedSector?.sector === s.sector}
              />
            ))}
          </div>

          {/* Sector Bars */}
          <div className="sector-bars">
            {SECTOR_DATA.map(s => {
              const pct = Math.min((s.weight / s.limit) * 100, 100);
              const isOver = s.weight > s.limit;
              const isWarn = !isOver && pct >= 85;
              const barColor = isOver ? 'var(--fin-loss)' : isWarn ? 'var(--fin-warning)' : 'var(--fin-profit)';
              return (
                <button
                  key={s.sector}
                  className={`sector-bar-row ${selectedSector?.sector === s.sector ? 'sector-bar-active' : ''}`}
                  onClick={() => handleSelect(s)}
                >
                  <div className="sector-bar-name">{s.sector}</div>
                  <div className="sector-bar-track">
                    <div className="sector-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                    <div className="sector-bar-limit-marker" style={{ left: '100%' }} />
                  </div>
                  <div className="sector-bar-meta">
                    <span style={{ color: barColor }} className="sector-weight-val">{s.weight}%</span>
                    <span className="sector-limit-val">/ เพดาน {s.limit}%</span>
                  </div>
                  <ChevronRight size={14} aria-hidden="true" className="sector-bar-chevron" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="risk-right-col">

          {/* Drilldown */}
          {selectedSector ? (
            <div className="glass-panel risk-drilldown">
              <div className="panel-header">
                <div>
                  <h3 className="panel-heading">{selectedSector.sector}</h3>
                  <p className="panel-subtext">{selectedSector.holdings.length} รายการ · {selectedSector.weight}% ของพอร์ต</p>
                </div>
              </div>
              {selectedSector.holdings.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">💵</div><div>เป็นเงินสด - ไม่มีหุ้น</div></div>
              ) : (
                <div className="drilldown-table-wrap">
                  <table className="drilldown-table">
                    <thead>
                      <tr>
                        <th>ชื่อหุ้น</th>
                        <th>สัดส่วน %</th>
                        <th>P/L %</th>
                        <th>จุดตัด</th>
                        <th>ความเสี่ยง (THB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSector.holdings.map(h => (
                        <tr key={h.ticker}>
                          <td>
                            <div className="ticker-cell">
                              <div className="ticker-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--brand-primary)' }}>{h.ticker.slice(0,2)}</div>
                              <div>
                                <div className="ticker-symbol">{h.ticker}</div>
                                <div className="ticker-name">{h.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="price-mono">{h.weight}%</td>
                          <td className="price-mono" style={{ color: h.pl >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)' }}>
                            {h.pl >= 0 ? '+' : ''}{h.pl}%
                          </td>
                          <td className="price-mono">฿{h.stop.toFixed(2)}</td>
                          <td className="price-mono" style={{ color: h.riskThb > 20000 ? 'var(--fin-warning)' : 'var(--text-primary)' }}>
                            ฿{h.riskThb.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel risk-drilldown risk-drilldown-empty">
              <div className="empty-state">
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6 }}>
                  เลือกกลุ่มอุตสาหกรรมจากแผนภูมิด้านซ้าย<br />เพื่อดูรายการหุ้นและจุดตัดขาดทุน
                </div>
              </div>
            </div>
          )}

          {/* Stop-Loss Summary */}
          <div className="glass-panel risk-stops">
            <div className="panel-header">
              <span className="panel-heading">จุดตัดขาดทุนที่ทำงานอยู่</span>
              <span className="panel-badge" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--fin-loss)' }}>
                ฿{(totalRiskThb / 1000).toFixed(0)}K ความเสี่ยงรวม
              </span>
            </div>
            <div className="stops-list">
              {SECTOR_DATA.flatMap(s => s.holdings)
                .sort((a, b) => b.riskThb - a.riskThb)
                .slice(0, 6)
                .map(h => (
                  <div key={h.ticker} className="stop-row">
                    <div className="stop-ticker">{h.ticker}</div>
                    <div className="stop-details">
                      <span className="stop-price price-mono">จุดตัด: ฿{h.stop.toFixed(2)}</span>
                      <span className="stop-risk price-mono" style={{ color: h.riskThb > 20000 ? 'var(--fin-warning)' : 'var(--text-secondary)' }}>
                        ฿{h.riskThb.toLocaleString()}
                      </span>
                    </div>
                    <div className="stop-bar-track" aria-hidden="true">
                      <div
                        className="stop-bar-fill"
                        style={{
                          width: `${Math.min((h.riskThb / 25000) * 100, 100)}%`,
                          background: h.riskThb >= 25000 ? 'var(--fin-loss)' : h.riskThb > 18000 ? 'var(--fin-warning)' : 'var(--fin-profit)',
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
