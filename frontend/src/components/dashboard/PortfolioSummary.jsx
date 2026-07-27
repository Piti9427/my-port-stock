import { DataStamp } from '../ui/DataStamp.jsx';

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoney(value, { signed = false } = {}) {
  if (!Number.isFinite(value)) return '—';
  const absolute = Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (signed) {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}฿${absolute}`;
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}฿${absolute}`;
}

export function PortfolioSummary({ holdings = [], source = 'Supabase holdings', timestamp = null, stale = false }) {
  const metrics = holdings.reduce(
    (result, holding) => {
      const shares = numberValue(holding.shares);
      const price = numberValue(holding.price);
      const averageCost = numberValue(holding.avg_cost ?? holding.avgCost);
      const change = numberValue(holding.change);

      const rate = numberValue(holding.fx_rate || 1.0);
      const valThb = numberValue(holding.value_thb || shares * price * rate);
      const costThb = numberValue(holding.cost_thb || shares * averageCost * rate);
      const dayPlThb = numberValue(holding.day_pl_thb || shares * change * rate);

      result.totalValue += valThb;
      result.totalCost += costThb;
      result.dayPl += dayPlThb;

      const beta = numberValue(holding.beta ?? 1.0);
      result.totalWeightedBeta += beta * valThb;
      result.totalBetaWeight += valThb;

      return result;
    },
    { totalValue: 0, totalCost: 0, dayPl: 0, totalWeightedBeta: 0, totalBetaWeight: 0 }
  );

  const totalPl = metrics.totalValue - metrics.totalCost;
  const dayPlPct = metrics.totalValue > 0 ? (metrics.dayPl / metrics.totalValue) * 100 : null;
  const portfolioBeta = metrics.totalBetaWeight > 0 ? metrics.totalWeightedBeta / metrics.totalBetaWeight : 1.0;

  const drawdownPct = metrics.totalCost > 0 && totalPl < 0 ? (Math.abs(totalPl) / metrics.totalCost) * 100 : 0;
  const isDrawdownBreached = drawdownPct >= 15;

  return (
    <section className="portfolio-summary" role="region" aria-label="Portfolio summary">
      {isDrawdownBreached && (
        <div className="drawdown-banner">
          <span>🛑 DRAWDOWN LIMIT HIT — New buys suspended ({drawdownPct.toFixed(1)}% / 15%)</span>
        </div>
      )}
      <div className="portfolio-summary-primary">
        <span className="portfolio-summary-label">มูลค่ารวมพอร์ต</span>
        <strong className="portfolio-summary-value">{formatMoney(metrics.totalValue)}</strong>
        <DataStamp source={source} timestamp={timestamp} stale={stale} />
      </div>
      <dl className="portfolio-summary-metrics">
        <div>
          <dt>กำไร/ขาดทุนรายวัน</dt>
          <dd className={metrics.dayPl >= 0 ? 'semantic-positive' : 'semantic-negative'}>
            {formatMoney(metrics.dayPl, { signed: true })}
            <span>{dayPlPct == null ? '—' : `${dayPlPct >= 0 ? '+' : ''}${dayPlPct.toFixed(2)}%`}</span>
          </dd>
        </div>
        <div>
          <dt>กำไร/ขาดทุนรวม</dt>
          <dd className={totalPl >= 0 ? 'semantic-positive' : 'semantic-negative'}>{formatMoney(totalPl, { signed: true })}</dd>
        </div>
        <div>
          <dt>Portfolio Beta</dt>
          <dd style={{ color: portfolioBeta > 1.2 ? 'var(--fin-loss)' : portfolioBeta < 0.8 ? 'var(--accent-primary)' : 'var(--fin-profit)' }}>
            {portfolioBeta.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>จำนวนสถานะ</dt>
          <dd>{holdings.length}</dd>
        </div>
      </dl>
    </section>
  );
}
