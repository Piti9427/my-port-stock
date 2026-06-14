import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Trash2, Plus, TrendingUp, TrendingDown, Minus, RotateCcw, Clock } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { fetchWithAuth } from '../lib/api';

const SIGNAL_META = {
  'buy-zone':   { label: 'Buy Zone',   color: 'var(--fin-profit)',   bg: 'var(--fin-profit-dim)' },
  'accumulate': { label: 'Accumulate', color: '#34d399',             bg: 'rgba(52,211,153,0.12)' },
  'wait':       { label: 'Wait',       color: 'var(--fin-warning)',  bg: 'var(--fin-warning-dim)' },
  'monitor':    { label: 'Monitor',    color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.1)' },
  'avoid':      { label: 'Avoid',      color: 'var(--fin-loss)',     bg: 'var(--fin-loss-dim)' },
};

const INITIAL_ALERTS = [
  { id: 1, ticker: 'META', type: 'AI Signal', msg: 'Breakout confirmed above $525 resistance. Bull flag target $560.', time: '14:32', severity: 'profit' },
  { id: 2, ticker: 'PLTR', type: 'Price Alert', msg: 'Approaching alert threshold $95.00. Current: $88.70.', time: '13:10', severity: 'warning' },
  { id: 3, ticker: 'NVDA', type: 'AI Signal', msg: 'Pullback to 21-EMA — accumulation zone confirmed.', time: '11:45', severity: 'profit' },
];

const DATA_STAMP = 'Manual data · No live feed';

// ── Toast component ──────────────────────────────────────────
function UndoToast({ ticker, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast-msg">
        <Trash2 size={13} aria-hidden="true" />
        Removed <strong>{ticker}</strong> from watchlist
      </span>
      <button className="undo-toast-btn" onClick={onUndo} aria-label={`Undo removal of ${ticker}`}>
        <RotateCcw size={12} aria-hidden="true" />
        Undo
      </button>
      <button className="undo-toast-close" onClick={onDismiss} aria-label="Dismiss notification">
        <Minus size={11} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function WatchlistPage() {
  const { getToken } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [signalFilter, setSignalFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [addError, setAddError] = useState('');
  const [toast, setToast] = useState(null); // { ticker, item }
  const toastTimerRef = useRef(null);

  useEffect(() => {
    fetchWithAuth('/api/watchlists', getToken)
      .then(data => {
        const mapped = data.map(item => ({
          ...item,
          last: item.price || 0,
          aiSignal: item.aiSignal || 'monitor',
          setup: item.setup || 'Tracked in watchlist',
          sector: item.sector || 'Unknown'
        }));
        setWatchlist(mapped);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [getToken]);

  const signals = ['All', 'buy-zone', 'accumulate', 'wait', 'monitor'];
  const filtered = signalFilter === 'All' ? watchlist : watchlist.filter(s => s.aiSignal === signalFilter);

  // Soft-delete with undo
  const removeFromWatchlist = (ticker) => {
    const item = watchlist.find(s => s.ticker === ticker);
    if (!item) return;
    setWatchlist(w => w.filter(s => s.ticker !== ticker));
    clearTimeout(toastTimerRef.current);
    setToast({ ticker, item });
  };

  const handleUndo = () => {
    if (!toast) return;
    setWatchlist(w => {
      // Re-insert at its original position (end if not found)
      const exists = w.find(s => s.ticker === toast.ticker);
      if (exists) return w;
      return [...w, toast.item];
    });
    setToast(null);
  };

  const dismissToast = () => setToast(null);
  const dismissAlert = (id) => setAlerts(a => a.filter(al => al.id !== id));

  const handleAddTicker = () => {
    const trimmed = newTicker.trim();
    if (!trimmed) {
      setAddError('Enter a ticker symbol.');
      return;
    }
    if (watchlist.find(s => s.ticker === trimmed)) {
      setAddError(`${trimmed} is already in your watchlist.`);
      return;
    }
    setWatchlist(w => [...w, {
      ticker: trimmed, name: trimmed, last: 0, change: 0, changePct: 0,
      volume: '—', alertPrice: 0, alertType: 'above',
      aiSignal: 'monitor',
      setup: 'Newly added — run AI analysis to generate a setup.',
      sector: 'Unknown',
    }]);
    setShowAddModal(false);
    setNewTicker('');
    setAddError('');
  };

  const handleModalKeyDown = (e) => {
    if (e.key === 'Escape') { setShowAddModal(false); setNewTicker(''); setAddError(''); }
    if (e.key === 'Enter') handleAddTicker();
  };

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
                <span className="data-stamp"><Clock size={10} aria-hidden="true" />{DATA_STAMP}</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {signals.map(s => (
                  <button
                    key={s}
                    className="filter-chip"
                    data-active={signalFilter === s}
                    onClick={() => setSignalFilter(s)}
                    style={s !== 'All' ? { color: signalFilter === s ? SIGNAL_META[s]?.color : undefined } : {}}
                    aria-pressed={signalFilter === s}
                  >
                    {s === 'All' ? 'All' : SIGNAL_META[s]?.label}
                  </button>
                ))}
              </div>
              <button
                className="btn-analyze"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
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
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Loading watchlists...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <BellOff size={28} aria-hidden="true" style={{ opacity: 0.3 }} />
                        <div>No tickers match this filter.</div>
                        <button
                          className="btn-secondary"
                          style={{ width: 'auto', marginTop: 4 }}
                          onClick={() => setSignalFilter('All')}
                        >
                          Show all
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => {
                    const sig = SIGNAL_META[s.aiSignal];
                    const isUp = s.changePct >= 0;
                    return (
                      <tr key={s.ticker} className="watchlist-row">
                        <td>
                          <div className="ticker-cell">
                            <div
                              className="ticker-icon"
                              style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--brand-primary)' }}
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
                              {isUp
                                ? <TrendingUp size={11} aria-hidden="true" />
                                : <TrendingDown size={11} aria-hidden="true" />
                              }
                              <span aria-label={`${isUp ? 'up' : 'down'} ${Math.abs(s.changePct).toFixed(2)} percent`}>
                                {isUp ? '+' : ''}{s.changePct.toFixed(2)}%
                              </span>
                            </span>
                          ) : <span className="price-mono" style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className="price-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {s.volume}
                        </td>
                        <td>
                          <span
                            className="panel-badge"
                            style={{ background: sig.bg, color: sig.color, fontWeight: 600 }}
                          >
                            {sig.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '200px' }}>
                          {s.setup}
                        </td>
                        <td>
                          {s.alertPrice > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {s.alertType === 'above'
                                ? <TrendingUp size={12} aria-hidden="true" style={{ color: 'var(--fin-profit)' }} />
                                : <TrendingDown size={12} aria-hidden="true" style={{ color: 'var(--fin-loss)' }} />
                              }
                              <span
                                className="price-mono"
                                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                                aria-label={`Alert ${s.alertType} $${s.alertPrice.toFixed(2)}`}
                              >
                                ${s.alertPrice.toFixed(2)}
                              </span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-icon"
                            onClick={() => removeFromWatchlist(s.ticker)}
                            aria-label={`Remove ${s.ticker} from watchlist`}
                            title={`Remove ${s.ticker}`}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Watchlist fully empty state */}
            {watchlist.length === 0 && (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <BellOff size={32} aria-hidden="true" style={{ opacity: 0.25 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Your watchlist is empty</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '28ch', textAlign: 'center' }}>
                  Add tickers to track signals, alerts, and setups.
                </div>
                <button
                  className="btn-analyze"
                  style={{ width: 'auto', marginTop: 8 }}
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={14} aria-hidden="true" /> Add first ticker
                </button>
              </div>
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
              <span className="panel-badge" aria-label={`${alerts.length} active alerts`}>{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state">
              <BellOff size={28} aria-hidden="true" style={{ opacity: 0.3 }} />
              <div>No active alerts</div>
            </div>
          ) : (
            <div className="alerts-list" role="list">
              {alerts.map(al => (
                <div key={al.id} className={`alert-item alert-${al.severity}`} role="listitem">
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
                </div>
              ))}
            </div>
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
              <div className="kpi-value kpi-profit">
                {watchlist.filter(s => ['buy-zone', 'accumulate'].includes(s.aiSignal)).length}
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="kpi-label">Wait / Monitor</div>
              <div className="kpi-value kpi-warning">
                {watchlist.filter(s => ['wait', 'monitor'].includes(s.aiSignal)).length}
              </div>
            </div>
            <div className="quick-stat-item">
              <div className="kpi-label">Up Today</div>
              <div className="kpi-value kpi-profit">{watchlist.filter(s => s.changePct > 0).length}</div>
            </div>
            <div className="quick-stat-item">
              <div className="kpi-label">Down Today</div>
              <div className="kpi-value kpi-loss">{watchlist.filter(s => s.changePct < 0).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Ticker Modal */}
      {showAddModal && (
        <>
          <div className="scenario-backdrop" onClick={() => { setShowAddModal(false); setNewTicker(''); setAddError(''); }} />
          <dialog
            open
            className="add-ticker-modal"
            aria-modal="true"
            aria-label="Add ticker to watchlist"
            onKeyDown={handleModalKeyDown}
          >
            <div className="drawer-header">
              <div>
                <div className="drawer-title">Add to Watchlist</div>
                <div className="drawer-subtitle">Enter a ticker symbol to track</div>
              </div>
              <button
                className="btn-icon"
                onClick={() => { setShowAddModal(false); setNewTicker(''); setAddError(''); }}
                aria-label="Close dialog"
              >
                <Minus size={14} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label htmlFor="ticker-add-input" className="sr-only">Ticker symbol</label>
              <input
                id="ticker-add-input"
                className="form-input"
                placeholder="e.g. MSFT"
                value={newTicker}
                onChange={e => { setNewTicker(e.target.value.toUpperCase()); setAddError(''); }}
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
      {toast && (
        <UndoToast
          ticker={toast.ticker}
          onUndo={handleUndo}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
