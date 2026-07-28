import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

function Sparkline({ data = [], positive }) {
  const values = data.map(Number).filter(Number.isFinite);
  if (values.length < 2) return <span className="text-text-secondary">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 80},${30 - ((value - min) / range) * 26}`).join(' ');

  return (
    <svg className={cn('h-8 w-20', positive ? 'text-fin-profit' : 'text-fin-loss')} viewBox="0 0 80 32" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function WatchlistPanel({ items = [], loading = false, status = 'OK', onOpenTicker, onAnalyze }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5" aria-labelledby="dashboard-watchlist-title">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="dashboard-watchlist-title" className="m-0 text-[0.95rem] font-semibold text-foreground">
            Watchlist
          </h2>
          <p className="mt-1 max-w-[64ch] text-[0.78rem] leading-[1.45] text-text-secondary">Tracked ideas with display-only market context.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
        </div>
      ) : ['INSUFFICIENT_DATA', 'UNAUTHORIZED', 'ERROR'].includes(status) ? (
        <EmptyState title="Watchlist unavailable" description="The authenticated watchlist could not be loaded." />
      ) : items.length === 0 ? (
        <EmptyState title="Your watchlist is empty" description="Add a ticker from Market Explorer." />
      ) : (
        <div className="grid border-t border-border">
          {items.slice(0, 6).map((item) => {
            const changePct = Number(item.changePct ?? item.change_pct);
            const positive = Number.isFinite(changePct) && changePct >= 0;

            const alertPrice = Number(item.alert_price ?? item.alertPrice);
            const price = Number(item.price);
            const isTriggered = price > 0 && alertPrice > 0 && Math.abs(price - alertPrice) / alertPrice <= 0.01;

            return (
              <div
                className="grid min-h-[58px] grid-cols-[minmax(120px,1.4fr)_minmax(70px,0.8fr)_minmax(60px,0.7fr)_auto] items-center gap-3 border-b border-border py-2 sm:grid-cols-[minmax(120px,1.4fr)_minmax(76px,0.8fr)_80px_68px_auto]"
                key={item.ticker}
              >
                <button
                  className="flex min-w-0 flex-col items-start border-0 bg-transparent text-left text-foreground"
                  type="button"
                  aria-label={`Open ${item.ticker} detail`}
                  onClick={() => onOpenTicker?.(item.ticker)}
                >
                  <div className="flex items-center gap-1.5">
                    <strong className="font-mono">{item.ticker}</strong>
                    {isTriggered && (
                      <span className="rounded border border-fin-warning bg-fin-warning-dim px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-fin-warning">
                        🔔 Entry Zone
                      </span>
                    )}
                  </div>
                  <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] text-text-secondary">
                    {item.name || item.sector || 'Tracked ticker'}
                  </span>
                </button>
                <span className="font-mono">{formatCurrency(price, item.ticker)}</span>
                <span className="hidden sm:block">
                  <Sparkline data={item.spark} positive={positive} />
                </span>
                <span className={cn('font-mono', positive ? 'text-fin-profit' : 'text-fin-loss')}>
                  {Number.isFinite(changePct) ? `${positive ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
                </span>
                <button
                  className="min-h-[30px] rounded-lg border border-border bg-panel-solid px-[9px] py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-foreground"
                  type="button"
                  onClick={() => onAnalyze?.(item.ticker)}
                  aria-label={`วิเคราะห์ ${item.ticker}`}
                >
                  วิเคราะห์
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
