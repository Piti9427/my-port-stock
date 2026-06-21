import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

function Sparkline({ data = [], positive }) {
  const values = data.map(Number).filter(Number.isFinite);
  if (values.length < 2) return <span className="watchlist-sparkline-empty">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 80},${30 - ((value - min) / range) * 26}`).join(' ');

  return (
    <svg className={positive ? 'watchlist-sparkline positive' : 'watchlist-sparkline negative'} viewBox="0 0 80 32" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function WatchlistPanel({ items = [], loading = false, status = 'OK', onOpenTicker, onAnalyze }) {
  return (
    <section className="dashboard-watchlist" aria-labelledby="dashboard-watchlist-title">
      <div className="dashboard-section-heading">
        <div>
          <h2 id="dashboard-watchlist-title">Watchlist</h2>
          <p>Tracked ideas with display-only market context.</p>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-watchlist-loading">
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
        </div>
      ) : ['INSUFFICIENT_DATA', 'UNAUTHORIZED', 'ERROR'].includes(status) ? (
        <EmptyState title="Watchlist unavailable" description="The authenticated watchlist could not be loaded." />
      ) : items.length === 0 ? (
        <EmptyState title="Your watchlist is empty" description="Add a ticker from Market Explorer." />
      ) : (
        <div className="dashboard-watchlist-list">
          {items.slice(0, 6).map((item) => {
            const changePct = Number(item.changePct ?? item.change_pct);
            const positive = Number.isFinite(changePct) && changePct >= 0;
            return (
              <div className="dashboard-watchlist-row" key={item.ticker}>
                <button
                  className="dashboard-watchlist-ticker"
                  type="button"
                  aria-label={`Open ${item.ticker} detail`}
                  onClick={() => onOpenTicker?.(item.ticker)}
                >
                  <strong>{item.ticker}</strong>
                  <span>{item.name || item.sector || 'Tracked ticker'}</span>
                </button>
                <span className="dashboard-watchlist-price">{Number.isFinite(Number(item.price)) ? `฿${Number(item.price).toFixed(2)}` : '—'}</span>
                <Sparkline data={item.spark} positive={positive} />
                <span className={positive ? 'semantic-positive' : 'semantic-negative'}>
                  {Number.isFinite(changePct) ? `${positive ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
                </span>
                <button className="btn-secondary" type="button" onClick={() => onAnalyze?.(item.ticker)} aria-label={`วิเคราะห์ ${item.ticker}`}>
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
