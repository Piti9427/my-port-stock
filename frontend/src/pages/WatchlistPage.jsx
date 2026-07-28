import { useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Trash2, RotateCcw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '@/lib/utils';

const SIGNAL_META = {
  'buy-zone': { label: 'Buy Zone', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  accumulate: { label: 'Accumulate', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  wait: { label: 'Wait', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  monitor: { label: 'Monitor', color: 'text-neutral-400', bg: 'bg-neutral-800' },
  avoid: { label: 'Avoid', color: 'text-rose-400', bg: 'bg-rose-500/10' },
};

const DATA_STAMP = 'Supabase holdings + market data gateway';

function UndoToast({ ticker, message = null, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <output
      className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl flex items-center gap-3 text-xs"
      aria-live="polite"
    >
      <span className="flex items-center gap-1.5">
        <Trash2 size={13} aria-hidden="true" className="text-rose-400" />
        {message || (
          <>
            Removed <strong>{ticker}</strong> from watchlist
          </>
        )}
      </span>
      <button
        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold inline-flex items-center gap-1 transition-colors"
        onClick={onUndo}
        aria-label={`Undo removal of ${ticker}`}
      >
        <RotateCcw size={12} aria-hidden="true" />
        Undo
      </button>
      <button className="p-1 text-neutral-400 hover:text-neutral-200" onClick={onDismiss} aria-label="Dismiss notification">
        ✕
      </button>
    </output>
  );
}

UndoToast.propTypes = {
  ticker: PropTypes.string.isRequired,
  message: PropTypes.node,
  onUndo: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default function WatchlistPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSignal, setActiveSignal] = useState('ALL');
  const [toast, setToast] = useState(null);
  const pendingDeleteRef = useRef(null);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth('/api/watchlists', getToken).catch(() => fetchWithAuth('/api/watchlist', getToken));
      setItems(Array.isArray(data) ? data : data?.watchlist || []);
    } catch (err) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleDelete = (item) => {
    pendingDeleteRef.current = item;
    setItems((prev) => prev.filter((i) => (i.id || i.ticker) !== (item.id || item.ticker)));

    const timer = setTimeout(async () => {
      if (pendingDeleteRef.current?.ticker === item.ticker) {
        try {
          await fetchWithAuth(`/api/watchlists/${item.id || item.ticker}`, getToken, { method: 'DELETE' });
        } catch {
          setItems((prev) => [...prev, item]);
        }
        pendingDeleteRef.current = null;
      }
    }, 4000);

    setToast({ ticker: item.ticker, timer });
  };

  const handleUndo = () => {
    if (toast?.timer) clearTimeout(toast.timer);
    if (pendingDeleteRef.current) {
      setItems((prev) => [...prev, pendingDeleteRef.current]);
      pendingDeleteRef.current = null;
    }
    setToast(null);
  };

  const filtered = items.filter((item) => {
    if (activeSignal === 'ALL') return true;
    return (item.aiSignal || item.signal || 'monitor') === activeSignal;
  });

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full bg-neutral-950 text-neutral-100">
      <header className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-neutral-100">Watchlist & Scanners</h2>
          <p className="text-xs text-neutral-400 mt-1">Track target entries, invalidation triggers, and decision mode filters.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="data-stamp text-xs text-neutral-500 font-mono inline-flex items-center gap-1">
            <Clock size={12} />
            {DATA_STAMP}
          </span>
        </div>
      </header>

      <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'buy-zone', 'monitor', 'accumulate'].map((sig) => {
            const label = sig === 'ALL' ? 'All' : SIGNAL_META[sig]?.label || sig;
            const isActive = activeSignal === sig;
            return (
              <button
                key={sig}
                type="button"
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  isActive ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                )}
                onClick={() => setActiveSignal(sig)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading watchlist...</div>
        ) : error ? (
          <EmptyState
            title="Insufficient data"
            description="Connect Supabase data or run analysis before this panel can calculate."
            action={{ label: 'Retry', onClick: fetchWatchlist }}
          />
        ) : items.length === 0 ? (
          <EmptyState title="Your watchlist is empty" description="Add tickers to track signals, alerts, and setups." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No tickers match this filter" description="Try selecting a different signal filter." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                <tr>
                  <th className="p-3">Ticker</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Signal</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Setup</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filtered.map((item) => {
                  const sigKey = item.aiSignal || item.signal || 'monitor';
                  const meta = SIGNAL_META[sigKey] || SIGNAL_META.monitor;
                  return (
                    <tr
                      key={item.ticker}
                      className="hover:bg-neutral-800/40 cursor-pointer transition-colors"
                      aria-label={item.ticker}
                      onClick={() => navigate(`/ticker/${item.ticker}`)}
                    >
                      <td className="p-3 font-bold text-neutral-100">{item.ticker}</td>
                      <td className="p-3 text-neutral-400">{item.sector || '—'}</td>
                      <td className="p-3">
                        <span className={cn('px-2 py-0.5 text-[0.7rem] font-bold rounded', meta.bg, meta.color)}>{meta.label}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-neutral-200">฿{item.price || item.last_price || '—'}</td>
                      <td className="p-3 text-neutral-300">{item.setup || item.notes || '—'}</td>
                      <td className="p-3 text-right">
                        <button
                          className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          aria-label={`Delete ${item.ticker}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toast && <UndoToast ticker={toast.ticker} message={null} onUndo={handleUndo} onDismiss={() => setToast(null)} />}
    </div>
  );
}
