import PropTypes from 'prop-types';
import { BookOpen, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge.jsx';

export function DecisionSnapshot({ ticker, snapshot, onOpenTicker, onLogTrade }) {
  if (!snapshot || Object.keys(snapshot).length === 0) return null;
  const verdict = snapshot.verdict || 'Wait';

  return (
    <section className="command-decision-snapshot" aria-label="Decision snapshot">
      <div className="command-decision-primary">
        <span className="command-panel-kicker">Decision snapshot</span>
        <div className="command-decision-verdict">
          <StatusBadge status={verdict} label={verdict} />
          <strong>{ticker}</strong>
          <span>{snapshot.score == null ? 'No score' : `${snapshot.score}/10`}</span>
        </div>
      </div>
      <div className="command-decision-copy">
        <p>{snapshot.one_line_reason || 'No decision reason returned.'}</p>
        <strong>{snapshot.immediate_next_action || 'Wait for verified analysis context.'}</strong>
      </div>
      <div className="command-decision-actions">
        <button className="btn-secondary" type="button" onClick={onOpenTicker}>
          <ExternalLink size={15} aria-hidden="true" />
          Ticker detail
        </button>
        <button className="btn-analyze" type="button" onClick={onLogTrade}>
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
