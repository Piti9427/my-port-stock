import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer.jsx';
import { currencySymbol } from '../../lib/format';

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function TradeTicket({ open, ticker, decisionMode, quotePrice, currentHolding, onClose, onSubmit, saving = false, serverError = '' }) {
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
      <form className="command-trade-ticket" onSubmit={submit}>
        <p className="command-trade-warning">This writes an executed trade to your Supabase journal and may update holdings.</p>
        <div className="command-trade-type" role="radiogroup" aria-label="Trade type">
          {['BUY', 'SELL', 'ADJUST'].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              className={type === value ? 'active' : ''}
              onClick={() => setType(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="command-trade-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="ticket-shares-input">Shares</label>
            <input id="ticket-shares-input" type="number" min="0" step="0.0001" value={shares} onChange={(event) => setShares(event.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="ticket-price-input">Execution price</label>
            <input id="ticket-price-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="ticket-target-input">Target</label>
            <input id="ticket-target-input" type="number" min="0" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} />
          </div>
        </div>
        <div className="command-trade-calculation font-mono">
          <span>Hard risk: {calculation.risk == null ? '—' : `฿${calculation.risk.toFixed(2)}`}</span>
          <span>R/R: {calculation.rr == null ? '—' : `1:${calculation.rr.toFixed(2)}`}</span>
          {hypotheticalAvgCost != null && (
            <span>
              ต้นทุนเฉลี่ยใหม่: {currencySymbol(ticker)}
              {hypotheticalAvgCost.toFixed(2)}
            </span>
          )}
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="ticket-bias-select">Cognitive Bias Tag</label>
          <select
            id="ticket-bias-select"
            value={cognitiveBias}
            onChange={(event) => setCognitiveBias(event.target.value)}
            className="mode-select"
          >
            {['None', 'FOMO', 'Loss Aversion', 'Anchoring', 'Herd Behavior'].map((bias) => (
              <option key={bias} value={bias}>
                {bias}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="ticket-notes-input">Notes</label>
          <textarea id="ticket-notes-input" value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </div>
        {submitted && validationError && (
          <div className="command-inline-error" role="alert">
            {validationError}
          </div>
        )}
        {serverError && (
          <div className="command-inline-error" role="alert">
            {serverError}
          </div>
        )}
        <button className="btn-analyze" type="submit" disabled={saving}>
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
