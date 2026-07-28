import PropTypes from 'prop-types';
import { Activity, Briefcase, Cpu, FileSearch, ShieldAlert, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn, cssVars } from '../lib/utils';

const DESK_COORDINATES = {
  cio: { top: 20, left: 50 },
  'fundamental-auditor': { top: 40, left: 30 },
  'quant-technician': { top: 40, left: 70 },
  'macro-strategist': { top: 60, left: 30 },
  'portfolio-risk-manager': { top: 60, left: 70 },
  'catalyst-hunter': { top: 75, left: 50 },
};

const SPAWN_POINT = { top: 95, left: 50 };

const AGENT_COLOR_CLASSES = {
  cio: 'bg-data-agent-cio',
  'fundamental-auditor': 'bg-data-agent-fundamental',
  'quant-technician': 'bg-data-agent-quant',
  'macro-strategist': 'bg-data-agent-macro',
  'portfolio-risk-manager': 'bg-data-agent-risk',
  'catalyst-hunter': 'bg-data-agent-catalyst',
};

const AGENT_ICONS = {
  cio: User,
  'fundamental-auditor': FileSearch,
  'quant-technician': Activity,
  'macro-strategist': Briefcase,
  'portfolio-risk-manager': ShieldAlert,
  'catalyst-hunter': Cpu,
};

function scheduleAgentExit(setAgents, agent) {
  setTimeout(() => {
    setAgents((previousAgents) => {
      const nextAgents = { ...previousAgents };
      delete nextAgents[agent];
      if (agent === 'cio') {
        nextAgents.cio = { id: 'cio', state: 'IDLE', ...DESK_COORDINATES.cio };
      }
      return nextAgents;
    });
  }, 1500);
}

export default function PixelTradingFloor() {
  const [agents, setAgents] = useState({
    cio: {
      id: 'cio',
      state: 'IDLE',
      ...DESK_COORDINATES.cio,
      message: 'Monitoring',
    },
  });
  const wsRef = useRef(null);

  const handleAgentStateChange = useCallback((data) => {
    const { agent, state, message } = data;

    setAgents((previousAgents) => {
      const current = previousAgents[agent] || { id: agent, ...SPAWN_POINT };
      let coordinates = { top: current.top, left: current.left };

      if (state === 'SPAWNED') {
        coordinates = { ...SPAWN_POINT };
      } else if (['WALKING', 'SITTING', 'TYPING', 'DONE', 'PRESENTING'].includes(state)) {
        coordinates = DESK_COORDINATES[agent] || SPAWN_POINT;
      } else if (state === 'EXITED') {
        coordinates = { ...SPAWN_POINT };
        scheduleAgentExit(setAgents, agent);
      }

      return {
        ...previousAgents,
        [agent]: {
          ...current,
          ...coordinates,
          state,
          message: message || current.message,
          lastUpdated: Date.now(),
        },
      };
    });
  }, []);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/agent-events';
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'AGENT_STATE_CHANGE') {
          handleAgentStateChange(data);
        }
      } catch (error) {
        console.error('Failed to parse WS message', error);
      }
    };

    return () => websocket.close();
  }, [handleAgentStateChange]);

  const overlayClass = Object.keys(agents).length > 1 ? 'bg-overlay/60' : 'bg-overlay/20';

  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-sm border border-border bg-[url('/assets/floor/active_floor.png')] bg-cover bg-center shadow-[inset_0_0_24px_rgba(var(--black-rgb),0.55)]"
      data-ui-contract="pixel-trading-floor"
    >
      <div className={cn('absolute inset-0 transition-colors duration-1000', overlayClass)} aria-hidden="true" />
      {Object.values(agents).map((agent) => (
        <AgentSprite key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentSprite({ agent }) {
  const Icon = AGENT_ICONS[agent.id] || User;
  const colorClass = AGENT_COLOR_CLASSES[agent.id] || 'bg-foreground';
  const isTyping = agent.state === 'TYPING';
  const isWalking = agent.state === 'WALKING' || agent.state === 'EXITED';
  const isDone = agent.state === 'DONE' || agent.state === 'PRESENTING';

  return (
    <div
      className="absolute left-[var(--agent-left)] top-[var(--agent-top)] z-[var(--agent-depth)] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[top,left] [transition-duration:1200ms] [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
      style={cssVars({
        '--agent-top': `${agent.top}%`,
        '--agent-left': `${agent.left}%`,
        '--agent-depth': agent.top,
      })}
    >
      {agent.message && (isTyping || isDone || agent.id === 'cio') && (
        <div className="absolute bottom-full z-[100] mb-4 animate-[pixel-pop-in_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] whitespace-nowrap rounded-sm border border-border-medium bg-surface px-3 py-2 text-xs font-semibold text-foreground motion-reduce:animate-none">
          {agent.message}
          <div className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-border-medium bg-surface [clip-path:polygon(100%_0,0_100%,100%_100%)]" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col items-center motion-reduce:animate-none',
          isWalking && 'animate-[pixel-walk-bob_0.5s_ease-in-out_infinite_alternate]'
        )}
      >
        <div
          className={cn(
            'relative z-[2] mb-0.5 flex size-5 items-center justify-center rounded-[6px] text-text-inverse motion-reduce:animate-none',
            isDone ? 'bg-fin-profit' : colorClass,
            isTyping && 'animate-[pixel-pulse_1.5s_ease-in-out_infinite_alternate]'
          )}
        >
          <Icon size={12} aria-hidden="true" />
        </div>
        <div className="relative z-[1] h-3.5 w-6 rounded bg-foreground" />
      </div>

      <div className="mt-1.5 rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-secondary">
        {agent.id.replaceAll('-', ' ')}
      </div>
    </div>
  );
}

AgentSprite.propTypes = {
  agent: PropTypes.shape({
    id: PropTypes.string.isRequired,
    top: PropTypes.number,
    left: PropTypes.number,
    state: PropTypes.string,
    message: PropTypes.string,
  }).isRequired,
};
