import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer.jsx';
import { formatCurrency, toNumber } from './journalFormatters.js';

const MODES = ['Quick Trade', 'Swing Trade', 'Long-Term/Core', 'Existing Position / Exit Review'];

function calculateTrade({ capital, entry, stopLoss, target }) {
  const numericCapital = toNumber(capital);
  const numericEntry = toNumber(entry);
  const numericStop = toNumber(stopLoss);
  const numericTarget = toNumber(target);
  const shares = numericEntry > 0 ? numericCapital / numericEntry : 0;
  const riskPerShare = numericEntry > 0 && numericStop > 0 ? Math.abs(numericEntry - numericStop) : 0;
  const rewardPerShare = numericEntry > 0 && numericTarget > 0 ? Math.abs(numericTarget - numericEntry) : 0;
  const risk = shares * riskPerShare;
  const rr = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;
  const riskLimit = numericCapital * 0.02;

  return {
    rr,
    shares,
    risk,
    riskLimit,
    warn: (rr > 0 && rr < 2) || (riskLimit > 0 && risk > riskLimit),
  };
}

function optionalNumber(value) {
  if (value === '') return undefined;
  const numeric = toNumber(value, undefined);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function TradeLogDrawer({ getToken, onClose, onSaved, open, suggestions = [], submitTrade }) {
  const [form, setForm] = useState({
    ticker: '',
    type: 'BUY',
    mode: 'Swing Trade',
    status: 'OPEN',
    entry: '',
    stopLoss: '',
    target: '',
    capital: '',
    thesis: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const calculation = useMemo(() => calculateTrade(form), [form]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    const ticker = form.ticker.trim().toUpperCase();
    const entry = Number(form.entry);
    if (!/^[A-Z0-9.-]{1,10}$/.test(ticker) || !Number.isFinite(entry) || entry <= 0) {
      setError('Ticker and entry price are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const shares = calculation.shares > 0 ? Number(calculation.shares.toFixed(6)) : undefined;
      await submitTrade('/api/journal', getToken, {
        method: 'POST',
        body: {
          ticker,
          type: form.type,
          mode: form.mode,
          status: form.status,
          shares,
          price: entry,
          entry,
          target: optionalNumber(form.target),
          stop_loss: optionalNumber(form.stopLoss),
          risk_reward: calculation.rr ? Number(calculation.rr.toFixed(2)) : undefined,
          notes: form.thesis.trim(),
        },
      });
      onSaved?.();
      onClose?.();
    } catch (saveError) {
      setError(saveError.message || 'Trade save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Log trade" width="520px">
      <div className="journal-trade-drawer">
        <datalist id="journal-ticker-suggestions">
          {suggestions.map((ticker) => (
            <option key={ticker} value={ticker} />
          ))}
        </datalist>
        <label>
          <span>Ticker</span>
          <input list="journal-ticker-suggestions" value={form.ticker} onChange={(event) => update('ticker', event.target.value.toUpperCase())} />
        </label>
        <div className="journal-drawer-grid">
          <label>
            <span>Trade Mode</span>
            <select value={form.mode} onChange={(event) => update('mode', event.target.value)}>
              {MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="OPEN">Active</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label>
            <span>Entry Price</span>
            <input inputMode="decimal" value={form.entry} onChange={(event) => update('entry', event.target.value)} />
          </label>
          <label>
            <span>Stop Loss</span>
            <input inputMode="decimal" value={form.stopLoss} onChange={(event) => update('stopLoss', event.target.value)} />
          </label>
          <label>
            <span>Target</span>
            <input inputMode="decimal" value={form.target} onChange={(event) => update('target', event.target.value)} />
          </label>
          <label>
            <span>Capital Allocated</span>
            <input inputMode="decimal" value={form.capital} onChange={(event) => update('capital', event.target.value)} />
          </label>
        </div>
        <div className="journal-quick-fill" aria-label="Capital quick fill">
          {[5000, 10000, 25000].map((amount) => (
            <button key={amount} className="btn-secondary" type="button" onClick={() => update('capital', String(amount))}>
              {formatCurrency(amount)}
            </button>
          ))}
        </div>
        <label>
          <span>Thesis</span>
          <textarea value={form.thesis} onChange={(event) => update('thesis', event.target.value)} />
        </label>
        <div className="journal-risk-summary">
          <span>R/R {calculation.rr ? calculation.rr.toFixed(2) : '—'}</span>
          <span>Risk {formatCurrency(calculation.risk)}</span>
          <span>Size {calculation.shares ? calculation.shares.toFixed(2) : '—'} sh</span>
        </div>
        {calculation.warn && (
          <div className="journal-risk-warning" role="alert">
            SOP warning: risk exceeds 2% capital or R/R is below 1:2.
          </div>
        )}
        {error && (
          <div className="command-inline-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn-analyze" type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save trade'}
        </button>
      </div>
    </Drawer>
  );
}

TradeLogDrawer.propTypes = {
  getToken: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
  open: PropTypes.bool,
  suggestions: PropTypes.arrayOf(PropTypes.string),
  submitTrade: PropTypes.func.isRequired,
};
