import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';

const TICKER_PATTERN = /^[A-Z0-9.-]{1,10}$/;

export function AIChatCard({ initialTicker = '', onSubmit }) {
  const [ticker, setTicker] = useState(initialTicker);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!TICKER_PATTERN.test(normalizedTicker)) {
      setError('Ticker must use letters, numbers, dots, or dashes');
      return;
    }
    setError('');
    onSubmit?.(normalizedTicker);
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5" aria-labelledby="dashboard-ai-quick-title">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="dashboard-ai-quick-title" className="m-0 text-[0.95rem] font-semibold text-foreground">
            AI Quick Ask
          </h2>
          <p className="mt-1 max-w-[64ch] text-[0.78rem] leading-[1.45] text-text-secondary">
            Open the full authenticated analysis workspace for one ticker.
          </p>
        </div>
      </div>
      <form className="grid gap-2" aria-label="AI quick ask" onSubmit={handleSubmit}>
        <label className="text-[0.78rem] font-semibold text-text-secondary" htmlFor="dashboard-ai-ticker">
          Ticker to analyze
        </label>
        <div className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_40px] items-center gap-2 rounded-lg border border-border bg-panel-solid pl-3 text-text-secondary focus-within:border-brand">
          <Search size={16} aria-hidden="true" />
          <input
            id="dashboard-ai-ticker"
            value={ticker}
            maxLength={10}
            autoComplete="off"
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            placeholder="NVDA"
            className="min-w-0 border-0 bg-transparent font-mono uppercase text-foreground outline-none"
          />
          <button className="flex min-h-[42px] w-10 items-center justify-center bg-brand text-background" type="submit" aria-label="Open AI analysis">
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <div className="text-xs text-fin-loss" role="alert">
            {error}
          </div>
        )}
      </form>
    </section>
  );
}
