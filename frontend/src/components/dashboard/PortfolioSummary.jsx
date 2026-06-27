import { DataStamp } from '../ui/DataStamp.jsx';

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoney(value, { signed = false } = {}) {
  if (!Number.isFinite(value)) return '—';
  const absolute = Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (!signed) return value > 0 ? `฿${absolute}` : '—';
  return `${value >= 0 ? '+' : '-'}฿${absolute}`;
}

export function PortfolioSummary({ holdings = [], source = 'Supabase holdings', timestamp, stale = false }) {
  const metrics = holdings.reduce(
    (result, holding) => {
      const shares = numberValue(holding.shares);
      const price = numberValue(holding.price);
      const averageCost = numberValue(holding.avg_cost ?? holding.avgCost);
      const change = numberValue(holding.change);

      result.totalValue += shares * price;
      result.totalCost += shares * averageCost;
      result.dayPl += shares * change;
      return result;
    },
    { totalValue: 0, totalCost: 0, dayPl: 0 }
  );
  const totalPl = metrics.totalValue - metrics.totalCost;
  const dayPlPct = metrics.totalValue > 0 ? (metrics.dayPl / metrics.totalValue) * 100 : null;

  return (
    <section className="portfolio-summary" role="region" aria-label="Portfolio summary">
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
          <dt>จำนวนสถานะ</dt>
          <dd>{holdings.length}</dd>
        </div>
      </dl>
    </section>
  );
}
