import { DataStamp } from '../ui/DataStamp.jsx';
import { cn } from '../../lib/utils.js';
import { useTranslation } from '../../i18n/useTranslation.js';

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
  const { t } = useTranslation();
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
    <section
      className="relative grid min-w-0 overflow-hidden rounded-xl border border-border bg-surface text-foreground md:grid-cols-[minmax(220px,1.2fr)_minmax(0,1.8fr)]"
      role="region"
      aria-label="Portfolio summary"
    >
      {isDrawdownBreached && (
        <div className="col-span-full m-4 mb-0 flex items-center gap-2 rounded-lg border border-fin-loss bg-fin-loss-dim px-3 py-2.5 font-mono text-xs font-semibold text-fin-loss">
          <span>🛑 DRAWDOWN LIMIT HIT — New buys suspended ({drawdownPct.toFixed(1)}% / 15%)</span>
        </div>
      )}
      <div className="flex flex-col justify-center gap-2 border-b border-border p-6 md:border-b-0 md:border-r">
        <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-text-secondary">{t('dashboard.total_value')}</span>
        <strong className="[color:var(--text-primary)] font-mono [font-size:2rem] [line-height:1.1] font-mono text-[2.2rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {formatMoney(metrics.totalValue)}
        </strong>
        <DataStamp source={source} timestamp={timestamp} stale={stale} />
      </div>
      <dl className="grid gap-px bg-border [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
        <div className="flex min-w-0 flex-col justify-center gap-2 bg-surface p-5">
          <dt className="mb-1 text-[0.72rem] font-medium text-text-secondary">{t('dashboard.daily_pl')}</dt>
          <dd
            className={cn(
              'flex items-center gap-1.5 font-mono text-base font-semibold tabular-nums',
              metrics.dayPl >= 0 ? 'text-fin-profit' : 'text-fin-loss'
            )}
          >
            {formatMoney(metrics.dayPl, { signed: true })}
            <span className="text-xs">{dayPlPct == null ? '—' : `${dayPlPct >= 0 ? '+' : ''}${dayPlPct.toFixed(2)}%`}</span>
          </dd>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 bg-surface p-5">
          <dt className="mb-1 text-[0.72rem] font-medium text-text-secondary">{t('dashboard.total_pl')}</dt>
          <dd className={cn('font-mono text-base font-semibold tabular-nums', totalPl >= 0 ? 'text-fin-profit' : 'text-fin-loss')}>
            {formatMoney(totalPl, { signed: true })}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 bg-surface p-5">
          <dt className="mb-1 text-[0.72rem] font-medium text-text-secondary">Portfolio Beta</dt>
          <dd
            className={cn(
              'font-mono text-base font-semibold tabular-nums',
              portfolioBeta > 1.2 ? 'text-fin-loss' : portfolioBeta < 0.8 ? 'text-fin-info' : 'text-fin-profit'
            )}
          >
            {portfolioBeta.toFixed(2)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 bg-surface p-5">
          <dt className="mb-1 text-[0.72rem] font-medium text-text-secondary">{t('dashboard.position_count')}</dt>
          <dd className="font-mono text-base font-semibold text-foreground tabular-nums">{holdings.length}</dd>
        </div>
      </dl>
    </section>
  );
}
