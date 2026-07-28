import PropTypes from 'prop-types';
import { Brain } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils.js';

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
    <section
      className="[min-width:0] [padding:var(--space-5)] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-md)] [background:var(--bg-panel)] [overflow:hidden] [display:grid] [gap:var(--space-4)]"
      aria-labelledby="analysis-controls-title"
    >
      <div className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
        <div>
          <span className="[color:var(--text-secondary)] font-mono [font-size:0.68rem] [text-transform:uppercase]">Analysis setup</span>
          <h2 id="analysis-controls-title">Decision mode</h2>
        </div>
      </div>
      <div
        className="grid overflow-hidden rounded-sm border border-border-subtle bg-panel-solid [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:border-0 [&_button]:border-b [&_button]:border-border-subtle [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-left [&_button]:text-xs [&_button]:font-bold [&_button]:text-text-secondary [&_button:last-child]:border-b-0"
        role="radiogroup"
        aria-label="Decision mode"
      >
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={decisionMode === mode}
            className={cn(decisionMode === mode && 'bg-brand-dim text-brand')}
            onClick={() => onDecisionModeChange(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
      <label
        className="[min-width:0] [display:grid] [gap:var(--space-2)] [color:var(--text-secondary)] [font-size:0.76rem] [font-weight:700] [&_input]:[min-width:0] [&_input]:[min-height:40px] [&_input]:[border:1px_solid_var(--border-subtle)] [&_input]:[border-radius:var(--radius-xs)] [&_input]:[outline:none] [&_input]:[background:var(--bg-panel-solid)] [&_input]:[color:var(--text-primary)] [&_input]:[padding:0_var(--space-3)] [&_input]:font-mono [&_textarea]:[min-width:0] [&_textarea]:[min-height:40px] [&_textarea]:[border:1px_solid_var(--border-subtle)] [&_textarea]:[border-radius:var(--radius-xs)] [&_textarea]:[outline:none] [&_textarea]:[background:var(--bg-panel-solid)] [&_textarea]:[color:var(--text-primary)] [&_textarea]:[padding:0_var(--space-3)] [&_textarea]:font-mono [&_textarea]:[min-height:96px] [&_textarea]:[resize:vertical] [&_textarea]:[padding-block:var(--space-3)] [&_textarea]:font-sans"
        htmlFor="manual-tier-one-price"
      >
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
      <p className="[margin:0] [color:var(--text-secondary)] [font-size:0.78rem] [line-height:1.55]">
        Use only a current broker or visible TradingView quote with session context.
      </p>
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
        disabled={!ticker || loading}
        onClick={submit}
      >
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
