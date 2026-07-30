import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils.js';
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
    <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5" aria-labelledby="agent-results-title">
      <div className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
        <div>
          <span className="[color:var(--text-secondary)] font-mono [font-size:0.68rem] [text-transform:uppercase]">Sub-agent council</span>
          <h2 id="agent-results-title">Analysis stream</h2>
        </div>
      </div>
      <div
        className="grid grid-cols-5 overflow-hidden rounded-sm border border-border-subtle max-[560px]:grid-cols-2 [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:border-0 [&_button]:border-r [&_button]:border-border-subtle [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:text-text-secondary [&_button]:transition-colors [&_button:last-child]:border-r-0 max-[560px]:[&_button]:border-b"
        role="tablist"
        aria-label="Agent results"
      >
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            role="tab"
            aria-selected={active.id === agent.id}
            className={cn(active.id === agent.id && 'bg-brand-dim text-brand')}
            onClick={() => setActiveId(agent.id)}
          >
            {agent.label}
          </button>
        ))}
      </div>
      <div className="[min-height:240px] [padding:var(--space-5)] [border:1px_solid_var(--border-subtle)] [border-top:0]" role="tabpanel">
        <div className="[display:flex] [align-items:center] [justify-content:space-between] [gap:var(--space-3)] [margin-bottom:var(--space-4)]">
          <StatusBadge status={stateLabel(agentState.state) === 'Complete' ? 'buy' : 'wait'} label={stateLabel(agentState.state)} />
          {result.score != null && (
            <strong className="[color:var(--text-primary)] font-mono [font-size:0.72rem] [background:var(--bg-panel-solid)] [border:1px_solid_var(--border-subtle)] [padding:2px_8px] [border-radius:999px] [font-weight:600]">
              {result.score}/10
            </strong>
          )}
        </div>
        {agentState.message && (
          <p className="[margin:0] [color:var(--text-secondary)] [font-size:0.78rem] [line-height:1.55]">{agentState.message}</p>
        )}
        {result.reason && (
          <p className="[margin:0] [color:var(--text-secondary)] [font-size:0.78rem] [line-height:1.55] [margin-top:var(--space-3)] [color:var(--text-primary)]">
            {result.reason}
          </p>
        )}
        {result.mode_fit && (
          <div className="[color:var(--text-primary)] font-mono [font-size:0.78rem] [margin-top:var(--space-4)] [color:var(--text-secondary)]">
            Mode fit: {result.mode_fit}
          </div>
        )}
        {loading && !agentState.message && !result.reason && (
          <div className="[display:grid] [gap:var(--space-3)]" aria-label={`${active.label} loading`}>
            <Skeleton height="16px" width="62%" />
            <Skeleton height="16px" />
            <Skeleton height="16px" width="84%" />
          </div>
        )}
        {!loading && !agentState.message && !result.reason && (
          <p className="[margin:0] [color:var(--text-secondary)] [font-size:0.78rem] [line-height:1.55]">Run analysis to populate this section.</p>
        )}
      </div>
    </section>
  );
}

AgentResults.propTypes = {
  agentStates: PropTypes.object,
  analysis: PropTypes.object,
  loading: PropTypes.bool,
};
