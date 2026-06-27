import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Drawer } from '../ui/Drawer.jsx';

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function TradeTicket({ open, ticker, decisionMode, quotePrice, onClose, onSubmit, saving = false, serverError = '' }) {
  const [type, setType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(quotePrice ? String(quotePrice) : '');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
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
          <label>
            Shares
            <input aria-label="Shares" type="number" min="0" step="0.0001" value={shares} onChange={(event) => setShares(event.target.value)} />
          </label>
          <label>
            Execution price
            <input aria-label="Execution price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label>
            Stop loss
            <input type="number" min="0" step="0.01" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
          </label>
          <label>
            Target
            <input type="number" min="0" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} />
          </label>
        </div>
        <div className="command-trade-calculation">
          <span>Hard risk: {calculation.risk == null ? '—' : `฿${calculation.risk.toFixed(2)}`}</span>
          <span>R/R: {calculation.rr == null ? '—' : `1:${calculation.rr.toFixed(2)}`}</span>
        </div>
        <label className="command-field">
          Notes
          <textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </label>
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
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  serverError: PropTypes.string,
};
