import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer.jsx';
import { cn } from '../../lib/utils.js';
import { currencySymbol } from '../../lib/format';
import { useTranslation } from '../../i18n/useTranslation.js';

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function TradeTicket({
  open,
  ticker,
  decisionMode,
  quotePrice = null,
  currentHolding = null,
  onClose,
  onSubmit,
  saving = false,
  serverError = '',
}) {
  const { t } = useTranslation();
  const [type, setType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(quotePrice ? String(quotePrice) : '');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [cognitiveBias, setCognitiveBias] = useState('None');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const calculation = useMemo(() => {
    const entry = numeric(price);
    const stop = numeric(stopLoss);
    const targetPrice = numeric(target);
    const quantity = numeric(shares);
    const riskPerShare = entry != null && stop != null ? Math.abs(entry - stop) : null;
    const rewardPerShare = entry != null && targetPrice != null ? Math.abs(targetPrice - entry) : null;
    return {
      risk: riskPerShare != null && quantity != null ? riskPerShare * quantity : null,
      rr: riskPerShare > 0 && rewardPerShare != null ? rewardPerShare / riskPerShare : null,
    };
  }, [price, shares, stopLoss, target]);

  const hypotheticalAvgCost = useMemo(() => {
    if (!currentHolding || type !== 'BUY') return null;
    const currentShares = currentHolding.shares || 0;
    const currentAvgCost = currentHolding.avg_cost || 0;
    const newShares = numeric(shares) || 0;
    const newPrice = numeric(price) || 0;

    if (currentShares === 0 && newShares === 0) return null;
    return (currentShares * currentAvgCost + newShares * newPrice) / (currentShares + newShares);
  }, [currentHolding, type, shares, price]);

  const validationError = !ticker
    ? 'Ticker is required.'
    : !(numeric(shares) > 0)
      ? 'Shares must be greater than zero.'
      : !(numeric(price) > 0)
        ? 'Execution price must be greater than zero.'
        : '';

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (validationError) return;
    onSubmit({
      ticker,
      type,
      mode: decisionMode,
      status: 'OPEN',
      shares: numeric(shares),
      price: numeric(price),
      entry: numeric(price),
      stop_loss: numeric(stopLoss) ?? undefined,
      target: numeric(target) ?? undefined,
      risk_reward: calculation.rr ?? undefined,
      cognitive_bias: cognitiveBias === 'None' ? null : cognitiveBias,
      notes,
      source_note: 'Command Center executed trade ticket',
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={`${ticker || 'Trade'} · Record executed trade`} width="min(520px, 100vw)">
      <form className="[display:grid] [gap:var(--space-4)]" onSubmit={submit}>
        <p className="text-pretty [margin:0] [padding:var(--space-3)] [border:1px_solid_rgba(var(--status-warning-rgb),_0.36)] [color:var(--fin-warning)] [font-size:0.76rem]">
          This writes an executed trade to your Supabase journal and may update holdings.
        </p>
        <div
          className="inline-grid auto-cols-[minmax(80px,1fr)] grid-flow-col overflow-hidden rounded-sm border border-border-subtle bg-panel-solid [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:border-0 [&_button]:border-r [&_button]:border-border-subtle [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:text-text-secondary [&_button]:transition-colors [&_button:last-child]:border-r-0"
          role="radiogroup"
          aria-label="Trade type"
        >
          {['BUY', 'SELL', 'ADJUST'].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              className={cn(type === value && 'bg-brand-dim text-brand')}
              onClick={() => setType(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="[&_input]:[min-width:0] [&_input]:[min-height:40px] [&_input]:[border:1px_solid_var(--border-subtle)] [&_input]:[border-radius:var(--radius-xs)] [&_input]:[outline:none] [&_input]:[background:var(--bg-panel-solid)] [&_input]:[color:var(--text-primary)] [&_input]:[padding:0_var(--space-3)] [&_input]:font-mono [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:var(--space-3)] [&_label]:[display:grid] [&_label]:[gap:var(--space-2)] [&_label]:[color:var(--text-secondary)] [&_label]:[font-size:0.74rem] [&_label]:[font-weight:700] max-[560px]:[grid-template-columns:minmax(0,_1fr)]">
          <div className="flex flex-col gap-1">
            <label htmlFor="ticket-shares-input">Shares</label>
            <input id="ticket-shares-input" type="number" min="0" step="0.0001" value={shares} onChange={(event) => setShares(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ticket-price-input">Execution price</label>
            <input id="ticket-price-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ticket-stoploss-input">Stop loss</label>
            <input
              id="ticket-stoploss-input"
              type="number"
              min="0"
              step="0.01"
              value={stopLoss}
              onChange={(event) => setStopLoss(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ticket-target-input">Target</label>
            <input id="ticket-target-input" type="number" min="0" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} />
          </div>
        </div>
        <div className="[display:flex] [align-items:center] [gap:var(--space-3)] [justify-content:space-between] [color:var(--text-primary)] font-mono [font-size:0.78rem] font-mono">
          <span>Hard risk: {calculation.risk == null ? '—' : `฿${calculation.risk.toFixed(2)}`}</span>
          <span>R/R: {calculation.rr == null ? '—' : `1:${calculation.rr.toFixed(2)}`}</span>
          {hypotheticalAvgCost != null && (
            <span>
              {t('command.hypothetical_average_cost')}: {currencySymbol(ticker)}
              {hypotheticalAvgCost.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor="ticket-bias-select">Cognitive Bias Tag</label>
          <select
            id="ticket-bias-select"
            value={cognitiveBias}
            onChange={(event) => setCognitiveBias(event.target.value)}
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
          <label htmlFor="ticket-notes-input">Notes</label>
          <textarea id="ticket-notes-input" value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </div>
        {submitted && validationError && (
          <div
            className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
            role="alert"
          >
            {validationError}
          </div>
        )}
        {serverError && (
          <div
            className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
            role="alert"
          >
            {serverError}
          </div>
        )}
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Record executed trade'}
        </button>
      </form>
    </Drawer>
  );
}

TradeTicket.propTypes = {
  open: PropTypes.bool.isRequired,
  ticker: PropTypes.string,
  decisionMode: PropTypes.string.isRequired,
  quotePrice: PropTypes.number,
  currentHolding: PropTypes.shape({
    shares: PropTypes.number,
    avg_cost: PropTypes.number,
  }),
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  serverError: PropTypes.string,
};
