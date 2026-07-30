import PropTypes from 'prop-types';
import { BookOpen, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge.jsx';

export function DecisionSnapshot({ ticker, snapshot, onOpenTicker, onLogTrade }) {
  if (!snapshot || Object.keys(snapshot).length === 0) return null;
  const verdict = snapshot.verdict || 'Wait';

  return (
    <section
      className="[position:sticky] [bottom:0] [z-index:var(--z-sticky)] [display:grid] [grid-template-columns:minmax(180px,_0.7fr)_minmax(260px,_1.5fr)_auto] [align-items:center] [gap:var(--space-5)] [padding:var(--space-4)_var(--space-5)] [border:1px_solid_var(--border-medium)] [background:var(--bg-shell)] max-[900px]:[grid-template-columns:minmax(0,_1fr)] max-[900px]:[position:static]"
      aria-label="Decision snapshot"
    >
      <div>
        <span className="[color:var(--text-secondary)] font-mono [font-size:0.68rem] [text-transform:uppercase]">Decision snapshot</span>
        <div className="[display:flex] [align-items:center] [gap:var(--space-3)] [margin-top:var(--space-2)] [&_strong]:font-mono [&_>_span:last-child]:font-mono">
          <StatusBadge status={verdict} label={verdict} />
          <strong>{ticker}</strong>
          <span>{snapshot.score == null ? 'No score' : `${snapshot.score}/10`}</span>
        </div>
      </div>
      <div className="[&_p]:[margin:0_0_4px] [&_p]:[color:var(--text-secondary)] [&_p]:[font-size:0.78rem] [&_strong]:[color:var(--text-primary)] [&_strong]:[font-size:0.82rem]">
        <p>{snapshot.one_line_reason || 'No decision reason returned.'}</p>
        <strong>{snapshot.immediate_next_action || 'Wait for verified analysis context.'}</strong>
      </div>
      <div className="[display:flex] [align-items:center] [gap:var(--space-3)] max-[900px]:[flex-wrap:wrap] max-[560px]:[align-items:stretch] max-[560px]:[flex-direction:column]">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
          type="button"
          onClick={onOpenTicker}
        >
          <ExternalLink size={15} aria-hidden="true" />
          Ticker detail
        </button>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
          type="button"
          onClick={onLogTrade}
        >
          <BookOpen size={15} aria-hidden="true" />
          Log executed trade
        </button>
      </div>
    </section>
  );
}

DecisionSnapshot.propTypes = {
  ticker: PropTypes.string,
  snapshot: PropTypes.object,
  onOpenTicker: PropTypes.func.isRequired,
  onLogTrade: PropTypes.func.isRequired,
};
