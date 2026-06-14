import React, { useEffect, useState, useRef } from 'react';
import { User, Cpu, Activity, Briefcase, FileSearch, ShieldAlert } from 'lucide-react';

const DESK_COORDINATES = {
  cio: { top: 20, left: 50 },
  'fundamental-auditor': { top: 40, left: 30 },
  'quant-technician': { top: 40, left: 70 },
  'macro-strategist': { top: 60, left: 30 },
  'portfolio-risk-manager': { top: 60, left: 70 },
  'catalyst-hunter': { top: 75, left: 50 },
};

const SPAWN_POINT = { top: 95, left: 50 };

const AGENT_COLORS = {
  cio: '#3b82f6', // blue
  'fundamental-auditor': '#10b981', // green
  'quant-technician': '#8b5cf6', // purple
  'macro-strategist': '#f59e0b', // amber
  'portfolio-risk-manager': '#ef4444', // red
  'catalyst-hunter': '#ec4899', // pink
};

const AGENT_ICONS = {
  cio: User,
  'fundamental-auditor': FileSearch,
  'quant-technician': Activity,
  'macro-strategist': Briefcase,
  'portfolio-risk-manager': ShieldAlert,
  'catalyst-hunter': Cpu,
};

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

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/agent-events';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'AGENT_STATE_CHANGE') {
          handleAgentStateChange(data);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleAgentStateChange = (data) => {
    const { agent, state, message } = data;

    setAgents((prev) => {
      const current = prev[agent] || { id: agent, ...SPAWN_POINT };
      let newCoords = { top: current.top, left: current.left };

      // Update coordinates based on state
      if (state === 'SPAWNED') {
        newCoords = { ...SPAWN_POINT };
      } else if (state === 'WALKING' || state === 'SITTING' || state === 'TYPING' || state === 'DONE' || state === 'PRESENTING') {
        newCoords = DESK_COORDINATES[agent] || SPAWN_POINT;
      } else if (state === 'EXITED') {
        // Walk back to door, then remove after delay
        newCoords = { ...SPAWN_POINT };
        setTimeout(() => {
          setAgents((p) => {
            const next = { ...p };
            delete next[agent];
            // Ensure CIO is always there
            if (agent === 'cio') next.cio = { id: 'cio', state: 'IDLE', ...DESK_COORDINATES.cio };
            return next;
          });
        }, 1500);
      }

      return {
        ...prev,
        [agent]: {
          ...current,
          ...newCoords,
          state,
          message: message || current.message,
          lastUpdated: Date.now(),
        },
      };
    });
  };

  return (
    <div
      className="pixel-trading-floor"
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        backgroundImage: 'url(/assets/floor/active_floor.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        boxShadow: 'inset 0 0 24px rgba(var(--black-rgb),0.55)',
      }}
    >
      {/* Dimming overlay when active analysis is happening to focus on agents */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: Object.keys(agents).length > 1 ? 'rgba(var(--black-rgb),0.4)' : 'rgba(var(--black-rgb),0.1)',
          transition: 'background-color 1s ease',
        }}
      />

      {Object.values(agents).map((agent) => (
        <AgentSprite key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentSprite({ agent }) {
  const Icon = AGENT_ICONS[agent.id] || User;
  const color = AGENT_COLORS[agent.id] || '#ffffff';

  const isTyping = agent.state === 'TYPING';
  const isWalking = agent.state === 'WALKING' || agent.state === 'EXITED';
  const isDone = agent.state === 'DONE' || agent.state === 'PRESENTING';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${agent.top}%`,
        left: `${agent.left}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'top 1.2s cubic-bezier(0.25, 1, 0.5, 1), left 1.2s cubic-bezier(0.25, 1, 0.5, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: agent.top, // Fake depth sorting
      }}
    >
      {/* Speech Bubble / Message */}
      {agent.message && (isTyping || isDone || agent.id === 'cio') && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: '16px',
            backgroundColor: 'var(--surface)',
            border: `1px solid var(--border-medium)`,
            color: 'var(--text-primary)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            boxShadow: 'none',
            animation: 'popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            zIndex: 100,
          }}
        >
          {agent.message}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--surface)',
              borderRight: '1px solid var(--border-medium)',
              borderBottom: '1px solid var(--border-medium)',
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
              rotate: '45deg',
            }}
          />
        </div>
      )}

      {/* The Pixel Agent Character */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: isWalking ? 'walkBob 0.5s ease-in-out infinite alternate' : 'none',
        }}
      >
        {/* Head */}
        <div
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: isDone ? 'var(--status-success)' : color,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2px',
            boxShadow: 'none',
            animation: isTyping ? 'pulseGlow 1.5s ease-in-out infinite alternate' : 'none',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Icon size={12} color="#ffffff" />
        </div>
        {/* Body */}
        <div
          style={{
            width: '24px',
            height: '14px',
            backgroundColor: 'var(--foreground)',
            borderRadius: '4px',
            position: 'relative',
            zIndex: 1,
            boxShadow: 'none',
          }}
        />
      </div>

      {/* Name tag */}
      <div
        style={{
          marginTop: '6px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: 'none',
        }}
      >
        {agent.id.replace(/-/g, ' ')}
      </div>

      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes walkBob {
          0% { transform: translateY(0) rotate(-3deg); }
          100% { transform: translateY(-4px) rotate(3deg); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.72; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
