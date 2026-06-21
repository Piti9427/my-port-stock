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
    <section className="dashboard-ai-quick" aria-labelledby="dashboard-ai-quick-title">
      <div className="dashboard-section-heading">
        <div>
          <h2 id="dashboard-ai-quick-title">AI Quick Ask</h2>
          <p>Open the full authenticated analysis workspace for one ticker.</p>
        </div>
      </div>
      <form className="dashboard-ai-form" aria-label="AI quick ask" onSubmit={handleSubmit}>
        <label htmlFor="dashboard-ai-ticker">Ticker to analyze</label>
        <div className="dashboard-ai-input-row">
          <Search size={16} aria-hidden="true" />
          <input
            id="dashboard-ai-ticker"
            value={ticker}
            maxLength={10}
            autoComplete="off"
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            placeholder="NVDA"
          />
          <button className="btn-analyze" type="submit" aria-label="Open AI analysis">
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <div className="dashboard-inline-error" role="alert">
            {error}
          </div>
        )}
      </form>
    </section>
  );
}
