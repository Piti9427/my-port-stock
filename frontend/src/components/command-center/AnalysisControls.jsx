import PropTypes from 'prop-types';
import { Brain } from 'lucide-react';
import { useState } from 'react';

const MODES = ['Quick Trade', 'Swing Trade', 'Long-Term/Core', 'Existing Position / Exit Review'];

export function AnalysisControls({ ticker, decisionMode, onDecisionModeChange, onAnalyze, loading = false }) {
  const [manualPrice, setManualPrice] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const numericPrice = manualPrice === '' ? undefined : Number(manualPrice);
    if (numericPrice !== undefined && (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice >= 1000000)) {
      setError('Manual price must be a positive number below 1,000,000.');
      return;
    }
    setError('');
    onAnalyze({ manualPrice: numericPrice });
  };

  return (
    <section className="command-panel command-analysis-controls" aria-labelledby="analysis-controls-title">
      <div className="command-panel-heading">
        <div>
          <span className="command-panel-kicker">Analysis setup</span>
          <h2 id="analysis-controls-title">Decision mode</h2>
        </div>
      </div>
      <div className="command-mode-list" role="radiogroup" aria-label="Decision mode">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={decisionMode === mode}
            className={decisionMode === mode ? 'active' : ''}
            onClick={() => onDecisionModeChange(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
      <label className="command-field" htmlFor="manual-tier-one-price">
        <span>Manual Tier 1 price</span>
        <input
          id="manual-tier-one-price"
          type="number"
          min="0"
          step="0.01"
          value={manualPrice}
          onChange={(event) => setManualPrice(event.target.value)}
          placeholder="Optional broker quote"
        />
      </label>
      <p className="command-field-help">Use only a current broker or visible TradingView quote with session context.</p>
      {error && (
        <div className="command-inline-error" role="alert">
          {error}
        </div>
      )}
      <button className="btn-analyze command-run-analysis" type="button" disabled={!ticker || loading} onClick={submit}>
        <Brain size={16} aria-hidden="true" />
        {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์'}
      </button>
    </section>
  );
}

AnalysisControls.propTypes = {
  ticker: PropTypes.string,
  decisionMode: PropTypes.string.isRequired,
  onDecisionModeChange: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
