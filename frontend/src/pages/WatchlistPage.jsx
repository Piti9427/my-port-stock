import { useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { BellOff, Trash2, Plus, TrendingUp, TrendingDown, Minus, RotateCcw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';

const SIGNAL_META = {
  'buy-zone': {
    label: 'Buy Zone',
    color: 'var(--fin-profit)',
    bg: 'var(--fin-profit-dim)',
  },
  accumulate: {
    label: 'Accumulate',
    color: 'var(--fin-profit)',
    bg: 'var(--fin-profit-dim)',
  },
  wait: {
    label: 'Wait',
    color: 'var(--fin-warning)',
    bg: 'var(--fin-warning-dim)',
  },
  monitor: {
    label: 'Monitor',
    color: 'var(--text-secondary)',
    bg: 'rgba(var(--muted-rgb),0.1)',
  },
  avoid: {
    label: 'Avoid',
    color: 'var(--fin-loss)',
    bg: 'var(--fin-loss-dim)',
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
    <output className="undo-toast" aria-live="polite">
      <span className="undo-toast-msg">
        <Trash2 size={13} aria-hidden="true" />
        {message || (
          <>
            Removed <strong>{ticker}</strong> from watchlist
          </>
        )}
      </span>
      <button className="undo-toast-btn" onClick={onUndo} aria-label={`Undo removal of ${ticker}`}>
        <RotateCcw size={12} aria-hidden="true" />
        Undo
      </button>
      <button className="undo-toast-close" onClick={onDismiss} aria-label="Dismiss notification">
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
          <td
            colSpan={8}
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-muted)',
            }}
          >
            Loading watchlists...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan={8} style={{ padding: 0 }}>
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
          <td colSpan={8} style={{ padding: 0 }}>
            <EmptyState
              icon={<BellOff size={24} style={{ opacity: 0.4 }} />}
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
          className="watchlist-row"
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
            <div className="ticker-cell">
              <div
                className="ticker-icon"
                style={{
                  background: 'rgba(var(--accent-rgb),0.15)',
                  color: 'var(--brand-primary)',
                }}
                aria-hidden="true"
              >
                {s.ticker.slice(0, 2)}
              </div>
              <div>
                <div className="ticker-symbol">{s.ticker}</div>
                <div className="ticker-name">{s.sector}</div>
              </div>
            </div>
          </td>
          <td className="price-mono">{s.last > 0 ? `$${s.last.toFixed(2)}` : '—'}</td>
          <td>
            {s.last > 0 ? (
              <span className={`change-pill ${isUp ? 'up' : 'down'}`}>
                {isUp ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                <span aria-label={`${isUp ? 'up' : 'down'} ${Math.abs(s.changePct).toFixed(2)} percent`}>
                  {isUp ? '+' : ''}
                  {s.changePct.toFixed(2)}%
                </span>
              </span>
            ) : (
              <span className="price-mono" style={{ color: 'var(--text-muted)' }}>
                —
              </span>
            )}
          </td>
          <td
            className="price-mono"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
            }}
          >
            {s.volume}
          </td>
          <td>
            <span
              className="panel-badge"
              style={{
                background: sig.bg,
                color: sig.color,
                fontWeight: 600,
              }}
            >
              {sig.label}
            </span>
          </td>
          <td
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              maxWidth: '200px',
            }}
          >
            {s.setup}
          </td>
          <td>
            {s.alertPrice > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {s.alertType === 'above' ? (
                  <TrendingUp size={12} aria-hidden="true" style={{ color: 'var(--fin-profit)' }} />
                ) : (
                  <TrendingDown size={12} aria-hidden="true" style={{ color: 'var(--fin-loss)' }} />
                )}
                <span
                  className="price-mono"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label={`Alert ${s.alertType} $${s.alertPrice.toFixed(2)}`}
                >
                  ${s.alertPrice.toFixed(2)}
                </span>
              </div>
            ) : (
              <span
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                —
              </span>
            )}
          </td>
          <td style={{ textAlign: 'right' }}>
            <button
              className="btn-icon"
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
    <div className="watchlist-page">
      {/* Left: Watchlist Table */}
      <div className="watchlist-main">
        <div className="glass-panel watchlist-full-panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="panel-heading">Watchlist &amp; Scanners</h2>
              <p className="panel-subtext">
                {watchlist.length} tickers tracked · AI signals refreshed on analysis
                <span className="data-stamp">
                  <Clock size={10} aria-hidden="true" />
                  <span>{DATA_STAMP}</span>
                </span>
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                {signals.map((s) => (
                  <button
                    key={s}
                    className="filter-chip"
                    data-active={signalFilter === s}
                    onClick={() => setSignalFilter(s)}
                    style={
                      s === 'All'
                        ? {}
                        : {
                            color: signalFilter === s ? SIGNAL_META[s]?.color : undefined,
                          }
                    }
                    aria-pressed={signalFilter === s}
                  >
                    {s === 'All' ? 'All' : SIGNAL_META[s]?.label}
                  </button>
                ))}
              </div>
              <button
                className="btn-analyze"
                style={{
                  width: 'auto',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                }}
                onClick={() => setShowAddModal(true)}
                aria-label="Add ticker to watchlist"
              >
                <Plus size={15} aria-hidden="true" />
                Add ticker
              </button>
            </div>
          </div>

          <div className="watchlist-table">
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
                icon={<BellOff size={32} style={{ opacity: 0.3 }} />}
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
      <div className="watchlist-right">
        <div className="glass-panel watchlist-alerts-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-heading">Alert Feed</h3>
              <p className="panel-subtext">AI &amp; price trigger notifications</p>
            </div>
            {alerts.length > 0 && (
              <span className="panel-badge" aria-label={`${alerts.length} active alerts`}>
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState
              icon={<BellOff size={24} style={{ opacity: 0.3 }} />}
              title="No active alerts"
            />
          ) : (
            <ul className="alerts-list">
              {alerts.map((al) => (
                <li key={al.id} className={`alert-item alert-${al.severity}`}>
                  <div className="alert-header">
                    <span className="alert-ticker">{al.ticker}</span>
                    <span className="alert-type">{al.type}</span>
                    <span className="alert-time price-mono">{al.time}</span>
                    <button
                      className="btn-icon"
                      style={{ width: 24, height: 24 }}
                      onClick={() => dismissAlert(al.id)}
                      aria-label={`Dismiss alert for ${al.ticker}`}
                    >
                      <Minus size={11} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="alert-msg">{al.msg}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Stats */}
        <div className="glass-panel watchlist-quick-stats">
          <div className="panel-header">
            <span className="panel-heading">Watchlist Summary</span>
          </div>
          <div className="quick-stat-grid">
            <div className="quick-stat-item">
              <div className="kpi-label">Buy Zone / Accumulate</div>
              <div className="kpi-value kpi-profit">{watchlist.filter((s) => ['buy-zone', 'accumulate'].includes(s.aiSignal)).length}</div>
            </div>
            <div className="quick-stat-item">
              <div className="kpi-label">Wait / Monitor</div>
              <div className="kpi-value kpi-warning">{watchlist.filter((s) => ['wait', 'monitor'].includes(s.aiSignal)).length}</div>
            </div>
            <div className="quick-stat-item">
              <div className="kpi-label">Up Today</div>
              <div className="kpi-value kpi-profit">{watchlist.filter((s) => s.changePct > 0).length}</div>
            </div>
            <div className="quick-stat-item">
              <div className="kpi-label">Down Today</div>
              <div className="kpi-value kpi-loss">{watchlist.filter((s) => s.changePct < 0).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Ticker Modal */}
      {showAddModal && (
        <>
          <button type="button" className="scenario-backdrop" aria-label="Close add ticker dialog" onClick={closeAddModal} />
          <dialog open className="add-ticker-modal" aria-modal="true" aria-label="Add ticker to watchlist">
            <div className="drawer-header">
              <div>
                <div className="drawer-title">Add to Watchlist</div>
                <div className="drawer-subtitle">Enter a ticker symbol to track</div>
              </div>
              <button className="btn-icon" onClick={closeAddModal} aria-label="Close dialog">
                <Minus size={14} aria-hidden="true" />
              </button>
            </div>
            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <label htmlFor="ticker-add-input" className="sr-only">
                Ticker symbol
              </label>
              <input
                id="ticker-add-input"
                className="form-input"
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
                <p id="ticker-add-error" className="input-error" role="alert">
                  {addError}
                </p>
              )}
              <button className="btn-analyze" onClick={handleAddTicker}>
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
