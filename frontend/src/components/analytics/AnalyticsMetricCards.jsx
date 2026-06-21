import PropTypes from 'prop-types';
import { MetricCard } from '../ui/MetricCard.jsx';
import { formatMoney } from './analyticsCalculations.js';

function tradeSummary(trade, emptyLabel) {
  if (!trade) return emptyLabel;
  return `${trade.ticker} ${formatMoney(trade.profit, { sign: true })}`;
}

export function AnalyticsMetricCards({ stats }) {
  return (
    <section className="analytics-metrics-grid" aria-label="Analytics KPI cards">
      <MetricCard label="Win Rate" value={stats.winRate == null ? '—' : `${stats.winRate}%`} change={`${stats.total} closed`} />
      <MetricCard label="Avg Win/Loss Ratio" value={stats.winLossRatio == null ? '—' : `${stats.winLossRatio.toFixed(2)}x`} />
      <MetricCard
        label="Total P/L"
        value={formatMoney(stats.totalPl, { sign: true })}
        mono
        changeType={stats.totalPl >= 0 ? 'positive' : 'negative'}
      />
      <MetricCard label="Best Trade" value={tradeSummary(stats.bestTrade, '—')} mono changeType="positive" />
      <MetricCard label="Worst Trade" value={tradeSummary(stats.worstTrade, '—')} mono changeType="negative" />
    </section>
  );
}

AnalyticsMetricCards.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    winRate: PropTypes.number,
    winLossRatio: PropTypes.number,
    totalPl: PropTypes.number.isRequired,
    bestTrade: PropTypes.object,
    worstTrade: PropTypes.object,
  }).isRequired,
};
