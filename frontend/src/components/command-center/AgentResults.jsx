import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Skeleton } from '../ui/Skeleton.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';

const AGENTS = [
  { id: 'fundamental', stateId: 'fundamental-auditor', label: 'Fundamental' },
  { id: 'technical', stateId: 'quant-technician', label: 'Technical' },
  { id: 'macro_flow', stateId: 'macro-strategist', label: 'Macro' },
  { id: 'risk', stateId: 'portfolio-risk-manager', label: 'Risk' },
  { id: 'catalyst', stateId: 'catalyst-hunter', label: 'Catalyst' },
];

function stateLabel(state) {
  if (!state || state === 'IDLE') return 'Waiting';
  if (state === 'DONE' || state === 'EXITED') return 'Complete';
  return 'Working';
}

export function AgentResults({ agentStates = {}, analysis, loading = false }) {
  const [activeId, setActiveId] = useState('fundamental');
  const active = useMemo(() => AGENTS.find((agent) => agent.id === activeId) || AGENTS[0], [activeId]);
  const agentState = agentStates[active.stateId] || {};
  const result = analysis?.agent_results?.[active.id] || analysis?.sub_agent_scores?.[active.id] || {};

  return (
    <section className="command-panel command-agent-results" aria-labelledby="agent-results-title">
      <div className="command-panel-heading">
        <div>
          <span className="command-panel-kicker">Sub-agent council</span>
          <h2 id="agent-results-title">Analysis stream</h2>
        </div>
      </div>
      <div className="command-agent-tabs" role="tablist" aria-label="Agent results">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            role="tab"
            aria-selected={active.id === agent.id}
            className={active.id === agent.id ? 'active' : ''}
            onClick={() => setActiveId(agent.id)}
          >
            {agent.label}
          </button>
        ))}
      </div>
      <div className="command-agent-panel" role="tabpanel">
        <div className="command-agent-status-row">
          <StatusBadge status={stateLabel(agentState.state) === 'Complete' ? 'buy' : 'wait'} label={stateLabel(agentState.state)} />
          {result.score != null && <strong className="command-agent-score">{result.score}/10</strong>}
        </div>
        {agentState.message && <p className="command-agent-message">{agentState.message}</p>}
        {result.reason && <p className="command-agent-reason">{result.reason}</p>}
        {result.mode_fit && <div className="command-agent-fit">Mode fit: {result.mode_fit}</div>}
        {loading && !agentState.message && !result.reason && (
          <div className="command-agent-loading" aria-label={`${active.label} loading`}>
            <Skeleton height="16px" width="62%" />
            <Skeleton height="16px" />
            <Skeleton height="16px" width="84%" />
          </div>
        )}
        {!loading && !agentState.message && !result.reason && <p className="command-agent-empty">Run analysis to populate this section.</p>}
      </div>
    </section>
  );
}

AgentResults.propTypes = {
  agentStates: PropTypes.object,
  analysis: PropTypes.object,
  loading: PropTypes.bool,
};
