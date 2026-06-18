import { useMemo, useState } from 'react';

const TABS = [
  { id: 'swot', label: 'สรุป & SWOT' },
  { id: 'fundamentals', label: 'งบการเงิน & ปัจจัยพื้นฐาน' },
  { id: 'technicals', label: 'สัญญาณเทคนิคอล' },
  { id: 'trade', label: 'แผนเทรด SOP' },
];

const SWOT_LABELS = {
  strengths: 'Strengths',
  weaknesses: 'Weaknesses',
  opportunities: 'Opportunities',
  threats: 'Threats',
};

function displayValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return `${value.toLocaleString()}${suffix}`;
  return value;
}

function displayPercent(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `${(numeric * 100).toFixed(1)}%`;
}

function SwotAccordion({ swot }) {
  const [open, setOpen] = useState({
    strengths: true,
    weaknesses: true,
    opportunities: true,
    threats: true,
  });

  return (
    <div className="deep-analysis-stack">
      {Object.entries(SWOT_LABELS).map(([key, label]) => {
        const items = Array.isArray(swot?.[key]) ? swot[key] : [];
        return (
          <section className="deep-analysis-accordion" key={key}>
            <button type="button" onClick={() => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))}>
              <span>{label}</span>
              <span>{open[key] ? 'Hide' : 'Show'}</span>
            </button>
            {open[key] && <ul>{items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>INSUFFICIENT_DATA</li>}</ul>}
          </section>
        );
      })}
    </div>
  );
}

function FundamentalsTab({ deepAnalysis }) {
  const financials = Array.isArray(deepAnalysis?.financials) ? deepAnalysis.financials : [];
  const balanceSheet = deepAnalysis?.balance_sheet || {};

  return (
    <div className="deep-analysis-stack">
      <div className="deep-analysis-table-wrap">
        <table className="deep-analysis-table">
          <thead>
            <tr>
              <th>Quarter</th>
              <th>Revenue</th>
              <th>Net Income</th>
              <th>OCF</th>
              <th>FCF Margin</th>
            </tr>
          </thead>
          <tbody>
            {financials.length > 0 ? (
              financials.slice(0, 4).map((row) => (
                <tr key={row.date}>
                  <td>{displayValue(row.date)}</td>
                  <td>{displayValue(row.revenue)}</td>
                  <td>{displayValue(row.net_income)}</td>
                  <td>{displayValue(row.operating_cash_flow)}</td>
                  <td>{displayPercent(row.fcf_margin)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">INSUFFICIENT_DATA</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="deep-analysis-metric-grid">
        <div>
          <span>Cash</span>
          <strong>{displayValue(balanceSheet.cash)}</strong>
        </div>
        <div>
          <span>Total Debt</span>
          <strong>{displayValue(balanceSheet.total_debt)}</strong>
        </div>
        <div>
          <span>Debt / Equity</span>
          <strong>{displayValue(balanceSheet.debt_to_equity)}</strong>
        </div>
      </div>
    </div>
  );
}

function TechnicalsTab({ deepAnalysis }) {
  const weekly = deepAnalysis?.weekly_technicals || {};
  const daily = deepAnalysis?.daily_technicals || {};

  return (
    <div className="deep-analysis-stack">
      <div className="deep-analysis-metric-grid">
        <div>
          <span>W1 Close</span>
          <strong>{displayValue(weekly.close)}</strong>
        </div>
        <div>
          <span>W1 EMA 200</span>
          <strong>{displayValue(weekly.ema200)}</strong>
        </div>
        <div>
          <span>W1 MA 50</span>
          <strong>{displayValue(weekly.ma50)}</strong>
        </div>
        <div>
          <span>W1 EMA 20</span>
          <strong>{displayValue(weekly.ema20)}</strong>
        </div>
        <div>
          <span>Golden Filter</span>
          <strong>{weekly.golden_filter_pass === true ? 'Pass' : weekly.golden_filter_pass === false ? 'Fail' : '-'}</strong>
        </div>
        <div>
          <span>D1 RSI 14</span>
          <strong>{displayValue(daily.rsi_14)}</strong>
        </div>
        <div>
          <span>D1 ZVR</span>
          <strong>{displayValue(daily.zvr_ratio)}</strong>
        </div>
        <div>
          <span>D1 Pullback</span>
          <strong>{daily.pullback_active === true ? 'Active' : daily.pullback_active === false ? 'Inactive' : '-'}</strong>
        </div>
      </div>
    </div>
  );
}

function TradePlanTab({ deepAnalysis }) {
  const plan = deepAnalysis?.trade_plan || {};
  const rows = [
    ['Thesis', plan.thesis],
    ['Entry Zone', plan.entry_zone],
    ['Stop-Loss', plan.stop_loss],
    ['Target 1', plan.target_1],
    ['Target 2', plan.target_2],
    ['R/R', plan.rr_ratio],
  ];

  return (
    <div className="deep-analysis-ticket">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{displayValue(value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function DeepAnalysisTabs({ deepAnalysis, fallbackAnalysis }) {
  const [activeTab, setActiveTab] = useState('swot');
  const hasStructuredPayload = Boolean(deepAnalysis);
  const activeConfig = useMemo(() => TABS.find((tab) => tab.id === activeTab) || TABS[0], [activeTab]);

  if (!hasStructuredPayload && fallbackAnalysis) {
    return <pre className="deep-analysis-fallback">{fallbackAnalysis}</pre>;
  }

  if (!hasStructuredPayload) {
    return null;
  }

  return (
    <section className="deep-analysis-tabs" aria-label="Deep 7-Dimension SOP analysis">
      <div className="deep-analysis-tab-list" role="tablist" aria-label="Deep analysis sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeConfig.id ? 'active' : ''}
            role="tab"
            aria-selected={tab.id === activeConfig.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="deep-analysis-tab-panel" role="tabpanel">
        {activeConfig.id === 'swot' && <SwotAccordion swot={deepAnalysis.swot} />}
        {activeConfig.id === 'fundamentals' && <FundamentalsTab deepAnalysis={deepAnalysis} />}
        {activeConfig.id === 'technicals' && <TechnicalsTab deepAnalysis={deepAnalysis} />}
        {activeConfig.id === 'trade' && <TradePlanTab deepAnalysis={deepAnalysis} />}
      </div>
    </section>
  );
}
