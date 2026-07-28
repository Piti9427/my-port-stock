import { useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { BellOff, Trash2, Plus, TrendingUp, TrendingDown, Minus, RotateCcw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

const SIGNAL_META = {
  'buy-zone': {
    label: 'Buy Zone',
    className: 'bg-fin-profit-dim text-fin-profit',
  },
  accumulate: {
    label: 'Accumulate',
    className: 'bg-fin-profit-dim text-fin-profit',
  },
  wait: {
    label: 'Wait',
    className: 'bg-fin-warning-dim text-fin-warning',
  },
  monitor: {
    label: 'Monitor',
    className: 'bg-surface-hover text-text-secondary',
  },
  avoid: {
    label: 'Avoid',
    className: 'bg-fin-loss-dim text-fin-loss',
  },
};

const DATA_STAMP = 'Supabase holdings + market data gateway';

// ── Toast component ──────────────────────────────────────────
function UndoToast({ ticker, message, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <output
      className="fixed bottom-6 right-6 z-[90] flex max-w-sm items-center gap-3 rounded-md border border-border bg-panel px-4 py-3 text-sm text-foreground"
      aria-live="polite"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Trash2 size={13} aria-hidden="true" />
        {message || (
          <>
            Removed <strong>{ticker}</strong> from watchlist
          </>
        )}
      </span>
      <button
        className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-brand px-2 text-xs font-semibold text-brand"
        onClick={onUndo}
        aria-label={`Undo removal of ${ticker}`}
      >
        <RotateCcw size={12} aria-hidden="true" />
        Undo
      </button>
      <button
        className="grid size-8 place-items-center rounded-sm text-text-secondary hover:bg-surface-hover"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <Minus size={11} aria-hidden="true" />
      </button>
    </output>
  );
}

UndoToast.propTypes = {
  ticker: PropTypes.string.isRequired,
  message: PropTypes.string,
  onUndo: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default function WatchlistPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [signalFilter, setSignalFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [addError, setAddError] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchWithAuth('/api/watchlists', getToken)
      .then((data) => {
        const mapped = data.map((item) => ({
          ...item,
          last: item.price || 0,
          aiSignal: item.aiSignal || 'monitor',
          setup: item.setup || 'Tracked in watchlist',
          sector: item.sector || 'Unknown',
          alertPrice: Number(item.alertPrice ?? item.alert_price ?? 0),
          alertType: item.alertType || item.alert_type || 'above',
        }));
        setWatchlist(mapped);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [getToken]);

  useEffect(() => {
    // Initial route load intentionally owns the async loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const signals = ['All', 'buy-zone', 'accumulate', 'wait', 'monitor'];
  const filtered = signalFilter === 'All' ? watchlist : watchlist.filter((s) => s.aiSignal === signalFilter);

  // Soft-delete with undo (synced to Supabase)
  const removeFromWatchlist = (ticker) => {
    const item = watchlist.find((s) => s.ticker === ticker);
    if (!item) return;

    fetchWithAuth(`/api/watchlists/${encodeURIComponent(ticker)}`, getToken, {
      method: 'DELETE',
    })
      .then(() => {
        setWatchlist((w) => w.filter((s) => s.ticker !== ticker));
        clearTimeout(toastTimerRef.current);
        setToast({ ticker, item, message: `${ticker} removed from watchlist.` });

        toastTimerRef.current = setTimeout(() => {
          setToast(null);
        }, 5000);
      })
      .catch((err) => {
        console.error(err);
        alert(`Failed to remove ${ticker}: ${err.message}`);
      });
  };

  const handleUndo = () => {
    if (!toast) return;
    const { item } = toast;

    fetchWithAuth('/api/watchlists', getToken, {
      method: 'POST',
      body: {
        ticker: item.ticker,
        name: item.name || item.ticker,
        sector: item.sector || 'Unknown',
        setup: item.setup || 'Restored',
        alert_price: item.alertPrice || 0,
        alert_type: item.alertType || 'above',
        ai_signal: item.aiSignal || 'monitor',
      },
    })
      .then(() => {
        setWatchlist((w) => {
          if (w.some((s) => s.ticker === item.ticker)) return w;
          return [...w, item];
        });
        setToast(null);
      })
      .catch((err) => {
        console.error(err);
        alert(`Failed to restore ${item.ticker}: ${err.message}`);
      });
  };

  const dismissToast = () => setToast(null);
  const dismissAlert = (id) => setAlerts((a) => a.filter((al) => al.id !== id));

  const handleAddTicker = useCallback(() => {
    const trimmed = newTicker.trim();
    if (!trimmed) {
      setAddError('Enter a ticker symbol.');
      return;
    }
    const normalizedTicker = trimmed.toUpperCase();
    const validTicker = /^[A-Z0-9.-]{1,10}$/.test(normalizedTicker);
    if (!validTicker) {
      setAddError('Use 1-10 ticker characters: A-Z, 0-9, dot, or dash.');
      return;
    }
    if (watchlist.some((s) => s.ticker === normalizedTicker)) {
      setAddError(`${normalizedTicker} is already in your watchlist.`);
      return;
    }

    const payload = {
      ticker: normalizedTicker,
      name: normalizedTicker,
      sector: 'Unknown',
      setup: 'Newly added — run AI analysis to generate a setup.',
      alert_price: 0,
      alert_type: 'above',
      ai_signal: 'monitor',
    };

    fetchWithAuth('/api/watchlists', getToken, {
      method: 'POST',
      body: payload,
    })
      .then((res) => {
        const newItem = {
          ...payload,
          last: 0,
          change: 0,
          changePct: 0,
          volume: '—',
          alertPrice: 0,
          alertType: 'above',
          aiSignal: 'monitor',
          ...res,
        };
        setWatchlist((w) => [...w, newItem]);
        setShowAddModal(false);
        setNewTicker('');
        setAddError('');
      })
      .catch((err) => {
        console.error(err);
        setAddError(`Failed to save: ${err.message}`);
      });
  }, [newTicker, watchlist, getToken]);

  const handleModalKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setNewTicker('');
        setAddError('');
      }
      if (e.key === 'Enter') handleAddTicker();
    },
    [handleAddTicker]
  );

  useEffect(() => {
    if (!showAddModal) return undefined;
    const onKeyDown = (e) => handleModalKeyDown(e);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleModalKeyDown, showAddModal]);

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewTicker('');
    setAddError('');
  };

  function renderWatchlistRows() {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="py-10 text-center text-text-muted">
            Loading watchlists...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan={8} className="p-0">
            <EmptyState
              title="Insufficient data"
              description="Connect Supabase data or run analysis before this panel can calculate."
              action="Retry"
              onAction={loadData}
            />
          </td>
        </tr>
      );
    }
    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="p-0">
            <EmptyState
              icon={<BellOff size={24} className="opacity-40" />}
              title="No tickers match this filter"
              action="Show all"
              onAction={() => setSignalFilter('All')}
            />
          </td>
        </tr>
      );
    }
    return filtered.map((s) => {
      const sig = SIGNAL_META[s.aiSignal];
      const isUp = s.changePct >= 0;
      return (
        <tr
          key={s.ticker}
          className="cursor-pointer transition-colors hover:bg-surface-hover"
          tabIndex={0}
          onClick={() => navigate(`/ticker/${s.ticker}`)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate(`/ticker/${s.ticker}`);
            }
          }}
        >
          <td>
            <div className="[display:flex] [align-items:center] [gap:10px]">
              <div
                className="flex size-8 items-center justify-center rounded-sm bg-brand-dim text-[0.65rem] font-bold tracking-wide text-brand"
                aria-hidden="true"
              >
                {s.ticker.slice(0, 2)}
              </div>
              <div>
                <div className="[font-size:0.95rem] [font-weight:600]">{s.ticker}</div>
                <div className="[font-size:0.73rem] [color:var(--text-secondary)] [margin-top:1px]">{s.sector}</div>
              </div>
            </div>
          </td>
          <td className="font-mono [font-size:0.92rem]">{s.last > 0 ? `$${s.last.toFixed(2)}` : '—'}</td>
          <td>
            {s.last > 0 ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[0.78rem] font-semibold',
                  isUp ? 'bg-fin-profit-dim text-fin-profit' : 'bg-fin-loss-dim text-fin-loss'
                )}
              >
                {isUp ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                <span aria-label={`${isUp ? 'up' : 'down'} ${Math.abs(s.changePct).toFixed(2)} percent`}>
                  {isUp ? '+' : ''}
                  {s.changePct.toFixed(2)}%
                </span>
              </span>
            ) : (
              <span className="font-mono text-[0.92rem] text-text-muted">—</span>
            )}
          </td>
          <td className="font-mono text-[0.82rem] text-text-secondary">{s.volume}</td>
          <td>
            <span className={cn('rounded-sm px-2 py-1 text-[0.7rem] font-semibold', sig.className)}>{sig.label}</span>
          </td>
          <td className="max-w-[200px] text-[0.8rem] text-text-secondary">{s.setup}</td>
          <td>
            {s.alertPrice > 0 ? (
              <div className="flex items-center gap-1.5">
                {s.alertType === 'above' ? (
                  <TrendingUp size={12} aria-hidden="true" className="text-fin-profit" />
                ) : (
                  <TrendingDown size={12} aria-hidden="true" className="text-fin-loss" />
                )}
                <span className="font-mono text-[0.8rem] text-text-secondary" aria-label={`Alert ${s.alertType} $${s.alertPrice.toFixed(2)}`}>
                  ${s.alertPrice.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="text-[0.78rem] text-text-muted">—</span>
            )}
          </td>
          <td className="text-right">
            <button
              className="ml-auto grid size-8 place-items-center rounded-sm border border-border-subtle bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-fin-loss active:scale-95"
              onClick={(event) => {
                event.stopPropagation();
                removeFromWatchlist(s.ticker);
              }}
              aria-label={`Remove ${s.ticker} from watchlist`}
              title={`Remove ${s.ticker}`}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="grid min-h-0 flex-auto grid-cols-[minmax(0,1fr)_300px] items-start gap-4 overflow-y-auto px-7 py-6 max-[1000px]:grid-cols-1 max-[640px]:px-4">
      {/* Left: Watchlist Table */}
      <div className="[min-width:0]">
        <div className="rounded-lg border border-border bg-panel shadow-none [display:flex] [flex-direction:column]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
            <div>
              <h2 className="mb-0.5 text-[0.95rem] font-semibold text-foreground">Watchlist &amp; Scanners</h2>
              <p className="text-pretty [margin:0] [padding:var(--space-3)] [border:1px_solid_rgba(var(--status-warning-rgb),_0.36)] [color:var(--fin-warning)] [font-size:0.76rem] text-xs text-text-secondary">
                {watchlist.length} tickers tracked · AI signals refreshed on analysis
                <span className="font-mono [font-size:0.75rem] [color:var(--text-secondary)] [display:flex] [align-items:center] [gap:4px]">
                  <Clock size={10} aria-hidden="true" />
                  <span>{DATA_STAMP}</span>
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5">
                {signals.map((s) => (
                  <button
                    key={s}
                    className={cn(
                      'whitespace-nowrap rounded-sm border border-border bg-transparent px-3 py-[5px] text-xs tracking-[0.05em] text-text-secondary transition-colors hover:border-border-medium hover:text-foreground data-[active=true]:border-brand data-[active=true]:bg-brand-dim data-[active=true]:text-brand',
                      signalFilter === s && s !== 'All' && SIGNAL_META[s]?.className
                    )}
                    data-active={signalFilter === s}
                    onClick={() => setSignalFilter(s)}
                    aria-pressed={signalFilter === s}
                  >
                    {s === 'All' ? 'All' : SIGNAL_META[s]?.label}
                  </button>
                ))}
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-4 py-2 font-sans text-[0.85rem] font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
                onClick={() => setShowAddModal(true)}
                aria-label="Add ticker to watchlist"
              >
                <Plus size={15} aria-hidden="true" />
                Add ticker
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-[640px]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-border-subtle [&_td]:px-6 [&_td]:py-3.5 [&_td:last-child]:pr-6 [&_td:last-child]:text-right [&_th]:sticky [&_th]:top-0 [&_th]:border-b [&_th]:border-border-medium [&_th]:bg-panel-solid [&_th]:px-6 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.7rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-text-secondary [&_th:last-child]:pr-6 [&_th:last-child]:text-right max-[640px]:[&_table]:min-w-[620px]">
            <table>
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  <th scope="col">Last Price</th>
                  <th scope="col">Change</th>
                  <th scope="col">Volume</th>
                  <th scope="col">AI Signal</th>
                  <th scope="col">Setup Note</th>
                  <th scope="col">Alert</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>{renderWatchlistRows()}</tbody>
            </table>

            {/* Watchlist fully empty state */}
            {watchlist.length === 0 && (
              <EmptyState
                icon={<BellOff size={32} className="opacity-30" />}
                title="Your watchlist is empty"
                description="Add tickers to track signals, alerts, and setups."
                action="Add first ticker"
                onAction={() => setShowAddModal(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right: Alert Feed */}
      <div className="[display:flex] [flex-direction:column] [gap:16px] max-[1000px]:[flex-direction:row] max-[1000px]:[flex-wrap:wrap]">
        <div className="rounded-lg border border-border bg-panel shadow-none [display:flex] [flex-direction:column] max-[1000px]:[flex:1] max-[1000px]:[min-width:280px]">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
            <div>
              <h3 className="mb-0.5 text-[0.95rem] font-semibold text-foreground">Alert Feed</h3>
              <p className="text-pretty [margin:0] [padding:var(--space-3)] [border:1px_solid_rgba(var(--status-warning-rgb),_0.36)] [color:var(--fin-warning)] [font-size:0.76rem] text-xs text-text-secondary">
                AI &amp; price trigger notifications
              </p>
            </div>
            {alerts.length > 0 && (
              <span
                className="[font-size:0.7rem] [padding:3px_8px] [border-radius:var(--radius-xs)] [background:var(--fin-profit-dim)] [color:var(--fin-profit)] [font-weight:600]"
                aria-label={`${alerts.length} active alerts`}
              >
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon={<BellOff size={24} className="opacity-30" />} title="No active alerts" />
          ) : (
            <ul className="[padding:8px_16px_12px] [display:flex] [flex-direction:column] [gap:8px]">
              {alerts.map((al) => (
                <li
                  key={al.id}
                  className={cn(
                    'animate-[fadeInUp_0.3s_ease] rounded-sm border border-border-subtle bg-surface px-3.5 py-3 transition-colors',
                    al.severity === 'profit' ? 'border-fin-profit bg-fin-profit-dim' : 'border-fin-warning bg-fin-warning-dim'
                  )}
                >
                  <div className="[display:flex] [align-items:center] [gap:8px] [margin-bottom:6px]">
                    <span className="[font-weight:700] [font-size:0.82rem]">{al.ticker}</span>
                    <span className="[font-size:0.7rem] [padding:2px_7px] [border-radius:10px] [background:rgba(var(--text-inverse-rgb),_0.06)] [color:var(--text-secondary)]">
                      {al.type}
                    </span>
                    <span className="[font-size:0.72rem] [color:var(--text-secondary)] [margin-left:auto] font-mono [font-size:0.92rem]">
                      {al.time}
                    </span>
                    <button
                      className="ml-auto grid size-6 shrink-0 place-items-center rounded-sm border border-border-subtle bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-fin-loss active:scale-95"
                      onClick={() => dismissAlert(al.id)}
                      aria-label={`Dismiss alert for ${al.ticker}`}
                    >
                      <Minus size={11} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="[font-size:0.78rem] [line-height:1.5] [color:var(--text-secondary)]">{al.msg}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Stats */}
        <div className="rounded-lg border border-border bg-panel shadow-none [padding:4px_0]">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
            <span className="mb-0.5 text-[0.95rem] font-semibold text-foreground">Watchlist Summary</span>
          </div>
          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:1px] [background:var(--border-subtle)] [border-radius:0_0_var(--radius-lg)_var(--radius-lg)] [overflow:hidden]">
            <div className="[padding:14px_16px] [background:var(--bg-panel)]">
              <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">Buy Zone / Accumulate</div>
              <div className="mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15] text-fin-profit">
                {watchlist.filter((s) => ['buy-zone', 'accumulate'].includes(s.aiSignal)).length}
              </div>
            </div>
            <div className="[padding:14px_16px] [background:var(--bg-panel)]">
              <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">Wait / Monitor</div>
              <div className="mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15] text-fin-warning">
                {watchlist.filter((s) => ['wait', 'monitor'].includes(s.aiSignal)).length}
              </div>
            </div>
            <div className="[padding:14px_16px] [background:var(--bg-panel)]">
              <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">Up Today</div>
              <div className="mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15] text-fin-profit">
                {watchlist.filter((s) => s.changePct > 0).length}
              </div>
            </div>
            <div className="[padding:14px_16px] [background:var(--bg-panel)]">
              <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">Down Today</div>
              <div className="mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15] text-fin-loss">
                {watchlist.filter((s) => s.changePct < 0).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Ticker Modal */}
      {showAddModal && (
        <>
          <button
            type="button"
            className="[position:fixed] [inset:0] [z-index:40] [background:rgba(var(--black-rgb),_0.72)] [animation:fadeIn_0.2s_ease]"
            aria-label="Close add ticker dialog"
            onClick={closeAddModal}
          />
          <dialog
            open
            className="[position:fixed] [top:50%] [left:50%] [transform:translate(-50%,_-50%)] [z-index:60] [width:380px] [background:var(--bg-panel)] [border:1px_solid_var(--border-medium)] [border-radius:var(--radius-md)] [padding:24px] [animation:fadeInDown_0.25s_cubic-bezier(0.4,_0,_0.2,_1)]"
            aria-modal="true"
            aria-label="Add ticker to watchlist"
          >
            <div className="[padding:20px_24px] [border-bottom:1px_solid_var(--border-subtle)] [display:flex] [align-items:center] [justify-content:space-between] [flex-shrink:0] max-[640px]:[padding-left:16px] max-[640px]:[padding-right:16px]">
              <div>
                <div className="[font-size:1rem] [font-weight:600]">Add to Watchlist</div>
                <div className="[font-size:0.78rem] [color:var(--text-secondary)] [margin-top:2px]">Enter a ticker symbol to track</div>
              </div>
              <button
                className="grid size-8 shrink-0 place-items-center rounded-sm border border-border-subtle bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95"
                onClick={closeAddModal}
                aria-label="Close dialog"
              >
                <Minus size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 px-6 py-5">
              <label htmlFor="ticker-add-input" className="sr-only">
                Ticker symbol
              </label>
              <input
                id="ticker-add-input"
                className="mb-3 w-full rounded-md border border-border-subtle bg-panel-solid px-4 py-3 font-mono text-base font-medium uppercase tracking-wide text-foreground outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-text-secondary focus:border-brand focus:ring-2 focus:ring-brand"
                placeholder="e.g. MSFT"
                value={newTicker}
                onChange={(e) => {
                  setNewTicker(e.target.value.toUpperCase());
                  setAddError('');
                }}
                autoFocus
                autoComplete="off"
                aria-describedby={addError ? 'ticker-add-error' : undefined}
                aria-invalid={!!addError}
              />
              {addError && (
                <p
                  id="ticker-add-error"
                  className="[font-size:0.8rem] [color:var(--fin-loss)] [margin-top:4px] [animation:fadeIn_0.2s_ease-out]"
                  role="alert"
                >
                  {addError}
                </p>
              )}
              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
                onClick={handleAddTicker}
              >
                Add {newTicker || 'ticker'}
              </button>
            </div>
          </dialog>
        </>
      )}

      {/* Undo Toast */}
      {toast && <UndoToast ticker={toast.ticker} message={toast.message} onUndo={handleUndo} onDismiss={dismissToast} />}
    </div>
  );
}
