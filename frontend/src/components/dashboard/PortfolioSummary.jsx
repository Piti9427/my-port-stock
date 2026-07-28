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
    <section className="relative p-6 border border-[#262626] hover:border-[#38383a] rounded-2xl bg-[#121212] flex flex-col gap-6 transition-all duration-200 shadow-sm" role="region" aria-label="Portfolio summary">
      {isDrawdownBreached && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-xs animate-pulse">
          <span>🛑 DRAWDOWN LIMIT HIT — New buys suspended ({drawdownPct.toFixed(1)}% / 15%)</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-[0.72rem] font-semibold text-[#a1a1aa] uppercase tracking-wider">มูลค่ารวมพอร์ต</span>
        <strong className="portfolio-summary-value text-[2.2rem] font-bold font-mono text-[#ededed] leading-none tracking-tight tabular-nums">{formatMoney(metrics.totalValue)}</strong>
        <DataStamp source={source} timestamp={timestamp} stale={stale} />
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[#262626]">
        <div>
          <dt className="text-[0.72rem] font-medium text-[#a1a1aa] mb-1">กำไร/ขาดทุนรายวัน</dt>
          <dd className={`text-base font-semibold font-mono tabular-nums flex items-center gap-1.5 ${metrics.dayPl >= 0 ? 'semantic-positive text-emerald-400' : 'semantic-negative text-rose-400'}`}>
            {formatMoney(metrics.dayPl, { signed: true })}
            <span className="text-xs">{dayPlPct == null ? '—' : `${dayPlPct >= 0 ? '+' : ''}${dayPlPct.toFixed(2)}%`}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[0.72rem] font-medium text-[#a1a1aa] mb-1">กำไร/ขาดทุนรวม</dt>
          <dd className={`text-base font-semibold font-mono tabular-nums ${totalPl >= 0 ? 'semantic-positive text-emerald-400' : 'semantic-negative text-rose-400'}`}>{formatMoney(totalPl, { signed: true })}</dd>
        </div>
        <div>
          <dt className="text-[0.72rem] font-medium text-[#a1a1aa] mb-1">Portfolio Beta</dt>
          <dd className={`text-base font-semibold font-mono tabular-nums ${portfolioBeta > 1.2 ? 'text-rose-400' : portfolioBeta < 0.8 ? 'text-blue-400' : 'text-emerald-400'}`}>
            {portfolioBeta.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.72rem] font-medium text-[#a1a1aa] mb-1">จำนวนสถานะ</dt>
          <dd className="text-base font-semibold font-mono tabular-nums text-[#ededed]">{holdings.length}</dd>
        </div>
      </dl>
    </section>
  );
}
