import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { useState } from 'react';

const TICKER_PATTERN = /^[A-Z0-9.-]{1,10}$/;

export function TickerInput({ value, onChange, onSearch, loading = false }) {
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const ticker = String(value || '')
      .trim()
      .toUpperCase();
    if (!TICKER_PATTERN.test(ticker)) {
      setError('Enter a valid ticker using letters, numbers, dots, or dashes.');
      return;
    }
    setError('');
    onSearch(ticker);
  };

  return (
    <form
      className="[min-width:0] [display:grid] [gap:var(--space-2)] [color:var(--text-secondary)] [font-size:0.76rem] [font-weight:700]"
      aria-label="Ticker search"
      onSubmit={submit}
    >
      <label htmlFor="command-ticker">Ticker symbol</label>
      <div className="[min-height:44px] [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-xs)] [background:var(--bg-panel-solid)] [color:var(--text-secondary)] [padding-left:var(--space-3)] [overflow:hidden] [&:focus-within]:[border-color:var(--brand-primary)] [&_input]:[min-width:0] [&_input]:[min-height:40px] [&_input]:[border:1px_solid_var(--border-subtle)] [&_input]:[border-radius:var(--radius-xs)] [&_input]:[outline:none] [&_input]:[background:var(--bg-panel-solid)] [&_input]:[color:var(--text-primary)] [&_input]:[padding:0_var(--space-3)] [&_input]:font-mono [&_input]:[border:0] [&_input]:[background:transparent] [&_input]:[padding:0] [&_input]:[text-transform:uppercase] max-[560px]:[grid-template-columns:auto_minmax(0,_1fr)]">
        <Search size={16} aria-hidden="true" />
        <input
          id="command-ticker"
          value={value}
          maxLength={10}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="NVDA"
        />
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load quote'}
        </button>
      </div>
      {error && (
        <div
          className="text-balance [border:1px_solid_rgba(var(--status-warning-rgb),_0.38)] [color:var(--fin-warning)] [padding:var(--space-3)] [font-size:0.78rem] [line-height:1.45] [color:var(--fin-loss)] [font-size:0.76rem] [line-height:1.45] max-[640px]:[align-items:flex-start] max-[640px]:[flex-direction:column] max-[640px]:[gap:10px] [display:flex] [align-items:center] [gap:10px] [padding:12px_16px] [background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [border-radius:var(--radius-sm)] [font-size:0.85rem] [color:var(--text-primary)] [animation:fadeInDown_0.3s_ease] [&_strong]:[color:var(--fin-loss)]"
          role="alert"
        >
          {error}
        </div>
      )}
    </form>
  );
}

TickerInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
