import { useMemo, useState } from 'react';
import { cn } from '../lib/utils.js';
import PropTypes from 'prop-types';

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
    <div className="[display:flex] [flex-direction:column] [gap:10px]">
      {Object.entries(SWOT_LABELS).map(([key, label]) => {
        const items = Array.isArray(swot?.[key]) ? swot[key] : [];
        return (
          <section
            className="[border:1px_solid_var(--border-subtle)] [background:var(--bg-panel-solid)] [&_button]:[align-items:center] [&_button]:[background:transparent] [&_button]:[border:0] [&_button]:[color:var(--text-primary)] [&_button]:[cursor:pointer] [&_button]:[display:flex] [&_button]:[font-size:0.8rem] [&_button]:[font-weight:800] [&_button]:[justify-content:space-between] [&_button]:[padding:10px_12px] [&_button]:[width:100%] [&_ul]:[color:var(--text-secondary)] [&_ul]:[font-size:0.82rem] [&_ul]:[line-height:1.5] [&_ul]:[margin:0] [&_ul]:[padding:0_14px_12px_28px]"
            key={key}
          >
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
    <div className="[display:flex] [flex-direction:column] [gap:10px]">
      <div className="[overflow-x:auto]">
        <table className="[border-collapse:collapse] [min-width:560px] [width:100%] [&_th]:[border-bottom:1px_solid_var(--border-subtle)] [&_th]:[color:var(--text-secondary)] [&_th]:[font-size:0.78rem] [&_th]:[padding:8px] [&_th]:[text-align:right] [&_th]:[white-space:nowrap] [&_td]:[border-bottom:1px_solid_var(--border-subtle)] [&_td]:[color:var(--text-secondary)] [&_td]:[font-size:0.78rem] [&_td]:[padding:8px] [&_td]:[text-align:right] [&_td]:[white-space:nowrap] [&_th:first-child]:[text-align:left] [&_td:first-child]:[text-align:left] [&_th]:[color:var(--text-primary)] [&_th]:[font-weight:800]">
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
                <td colSpan={5}>INSUFFICIENT_DATA</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="[display:grid] [gap:8px] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [&_div]:[border:1px_solid_var(--border-subtle)] [&_div]:[background:var(--bg-panel-solid)] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:4px] [&_div]:[padding:10px] [&_span]:[color:var(--text-secondary)] [&_span]:[font-size:0.7rem] [&_span]:[text-transform:uppercase] [&_strong]:[color:var(--text-primary)] [&_strong]:font-mono [&_strong]:[font-size:0.88rem] [&_strong]:[overflow-wrap:anywhere] max-[760px]:[grid-template-columns:1fr]">
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
    <div className="[display:flex] [flex-direction:column] [gap:10px]">
      <div className="[display:grid] [gap:8px] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [&_div]:[border:1px_solid_var(--border-subtle)] [&_div]:[background:var(--bg-panel-solid)] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:4px] [&_div]:[padding:10px] [&_span]:[color:var(--text-secondary)] [&_span]:[font-size:0.7rem] [&_span]:[text-transform:uppercase] [&_strong]:[color:var(--text-primary)] [&_strong]:font-mono [&_strong]:[font-size:0.88rem] [&_strong]:[overflow-wrap:anywhere] max-[760px]:[grid-template-columns:1fr]">
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
    <div className="[&_div]:[border:1px_solid_var(--border-subtle)] [&_div]:[background:var(--bg-panel-solid)] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:4px] [&_div]:[padding:10px] [&_span]:[color:var(--text-secondary)] [&_span]:[font-size:0.7rem] [&_span]:[text-transform:uppercase] [&_strong]:[color:var(--text-primary)] [&_strong]:font-mono [&_strong]:[font-size:0.88rem] [&_strong]:[overflow-wrap:anywhere] [display:grid] [gap:8px] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[760px]:[grid-template-columns:1fr]">
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
    return (
      <pre className="mt-3.5 max-h-[400px] overflow-auto whitespace-pre-wrap border border-border-subtle bg-panel-solid p-3 font-mono text-[0.8rem] leading-normal text-text-secondary">
        {fallbackAnalysis}
      </pre>
    );
  }

  if (!hasStructuredPayload) {
    return null;
  }

  return (
    <section className="[display:flex] [flex-direction:column] [gap:12px] [margin-top:14px]" aria-label="Deep 7-Dimension SOP analysis">
      <div
        className="grid grid-cols-4 border border-border-subtle bg-panel-solid max-[760px]:grid-cols-2 [&_button]:min-h-[42px] [&_button]:cursor-pointer [&_button]:border-0 [&_button]:border-r [&_button]:border-border-subtle [&_button]:bg-transparent [&_button]:p-2 [&_button]:text-[0.76rem] [&_button]:font-bold [&_button]:text-text-secondary [&_button:last-child]:border-r-0"
        role="tablist"
        aria-label="Deep analysis sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(tab.id === activeConfig.id && 'bg-brand-dim text-brand')}
            role="tab"
            aria-selected={tab.id === activeConfig.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border border-border-subtle bg-panel-solid p-3" role="tabpanel">
        {activeConfig.id === 'swot' && <SwotAccordion swot={deepAnalysis.swot} />}
        {activeConfig.id === 'fundamentals' && <FundamentalsTab deepAnalysis={deepAnalysis} />}
        {activeConfig.id === 'technicals' && <TechnicalsTab deepAnalysis={deepAnalysis} />}
        {activeConfig.id === 'trade' && <TradePlanTab deepAnalysis={deepAnalysis} />}
      </div>
    </section>
  );
}

SwotAccordion.propTypes = {
  swot: PropTypes.object,
};

FundamentalsTab.propTypes = {
  deepAnalysis: PropTypes.object,
};

TechnicalsTab.propTypes = {
  deepAnalysis: PropTypes.object,
};

TradePlanTab.propTypes = {
  deepAnalysis: PropTypes.object,
};

DeepAnalysisTabs.propTypes = {
  deepAnalysis: PropTypes.object,
  fallbackAnalysis: PropTypes.string,
};
