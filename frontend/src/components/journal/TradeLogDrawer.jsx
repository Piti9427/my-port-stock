import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer.jsx';
import { cn } from '../../lib/utils.js';
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
    cognitiveBias: 'None',
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
          cognitive_bias: form.cognitiveBias === 'None' ? null : form.cognitiveBias,
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
      <div className="grid gap-4 [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-sm [&_input]:border [&_input]:border-border-subtle [&_input]:bg-panel [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-foreground [&_label]:grid [&_label]:gap-2 [&_label]:text-xs [&_label]:font-bold [&_label]:text-text-secondary [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-sm [&_select]:border [&_select]:border-border-subtle [&_select]:bg-panel [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-foreground [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-sm [&_textarea]:border [&_textarea]:border-border-subtle [&_textarea]:bg-panel [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-foreground">
        <datalist id="journal-ticker-suggestions">
          {suggestions.map((ticker) => (
            <option key={ticker} value={ticker} />
          ))}
        </datalist>
        <div
          className="inline-grid auto-cols-fr grid-flow-col overflow-hidden rounded-sm border border-border-subtle bg-panel-solid [&_button]:min-h-10 [&_button]:border-r [&_button]:border-border-subtle [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:text-text-secondary [&_button:last-child]:border-r-0"
          role="radiogroup"
          aria-label="Trade type"
        >
          {['BUY', 'SELL', 'ADJUST'].map((value) => (
            <button
              key={value}
              className={cn(form.type === value && 'bg-brand-dim text-brand')}
              type="button"
              role="radio"
              aria-checked={form.type === value}
              onClick={() => update('type', value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-col gap-1">
          <label htmlFor="journal-ticker-input">Ticker</label>
          <input
            id="journal-ticker-input"
            className="w-full rounded-sm border border-border bg-panel-solid text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            list="journal-ticker-suggestions"
            value={form.ticker}
            onChange={(event) => update('ticker', event.target.value.toUpperCase())}
          />
        </div>
        <div className="[display:grid] [gap:var(--space-4)] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[560px]:[grid-template-columns:minmax(0,_1fr)]">
          <div className="flex flex-col gap-1">
            <label htmlFor="journal-mode-select">Trade Mode</label>
            <select
              id="journal-mode-select"
              className="w-full rounded-sm border border-border bg-panel-solid text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.mode}
              onChange={(event) => update('mode', event.target.value)}
            >
              {MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="journal-status-select">Status</label>
            <select id="journal-status-select" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="OPEN">Active</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="journal-entry-input">Entry Price</label>
            <input id="journal-entry-input" inputMode="decimal" value={form.entry} onChange={(event) => update('entry', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="journal-stoploss-input">Stop Loss</label>
            <input
              id="journal-stoploss-input"
              inputMode="decimal"
              value={form.stopLoss}
              onChange={(event) => update('stopLoss', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="journal-target-input">Target</label>
            <input id="journal-target-input" inputMode="decimal" value={form.target} onChange={(event) => update('target', event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="journal-capital-input">Capital Allocated</label>
            <input id="journal-capital-input" inputMode="decimal" value={form.capital} onChange={(event) => update('capital', event.target.value)} />
          </div>
        </div>
        <div className="[display:flex] [flex-wrap:wrap] [gap:var(--space-2)]" aria-label="Capital quick fill">
          {[5000, 10000, 25000].map((amount) => (
            <button
              key={amount}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
              type="button"
              onClick={() => update('capital', String(amount))}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor="journal-bias-select">Cognitive Bias Tag</label>
          <select
            id="journal-bias-select"
            value={form.cognitiveBias}
            onChange={(event) => update('cognitiveBias', event.target.value)}
            className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          >
            {['None', 'FOMO', 'Loss Aversion', 'Anchoring', 'Herd Behavior'].map((bias) => (
              <option key={bias} value={bias}>
                {bias}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor="journal-thesis-input">Thesis</label>
          <textarea id="journal-thesis-input" value={form.thesis} onChange={(event) => update('thesis', event.target.value)} />
        </div>
        <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:var(--space-3)] [border:1px_solid_var(--border-subtle)] [padding:var(--space-3)] [color:var(--text-primary)] font-mono [font-size:0.78rem] font-mono">
          <span>R/R {calculation.rr ? calculation.rr.toFixed(2) : '—'}</span>
          <span>Risk {formatCurrency(calculation.risk)}</span>
          <span>Size {calculation.shares ? calculation.shares.toFixed(2) : '—'} sh</span>
        </div>
        {calculation.warn && (
          <div
            className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
            role="alert"
          >
            SOP warning: risk exceeds 2% capital or R/R is below 1:2.
          </div>
        )}
        {error && (
          <div
            className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
            role="alert"
          >
            {error}
          </div>
        )}
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
          type="button"
          onClick={save}
          disabled={saving}
        >
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
