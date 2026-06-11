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
    cio: { id: 'cio', state: 'IDLE', ...DESK_COORDINATES.cio, message: 'Monitoring' }
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
    
    setAgents(prev => {
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
          setAgents(p => {
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
          lastUpdated: Date.now()
        }
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
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
      }}
    >
      {/* Dimming overlay when active analysis is happening to focus on agents */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: Object.keys(agents).length > 1 ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
        transition: 'background-color 1s ease'
      }} />

      {Object.values(agents).map(agent => (
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
        transition: 'top 1.2s cubic-bezier(0.4, 0, 0.2, 1), left 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: agent.top // Fake depth sorting
      }}
    >
      {/* Speech Bubble / Message */}
      {(agent.message && (isTyping || isDone || agent.id === 'cio')) && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          marginBottom: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          border: `1px solid ${color}`,
          color: '#e2e8f0',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          zIndex: 100
        }}>
          {agent.message}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${color}`
          }} />
        </div>
      )}

      {/* The Character Body */}
      <div 
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '50%',
          border: `2px solid ${isDone ? '#10b981' : color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDone ? `0 0 15px #10b981` : isTyping ? `0 0 10px ${color}` : '0 4px 6px rgba(0,0,0,0.3)',
          animation: isWalking ? 'bounce 0.4s infinite alternate' : isTyping ? 'pulse 1s infinite alternate' : 'none'
        }}
      >
        <Icon size={18} color={isDone ? '#10b981' : color} />
      </div>
      
      {/* Name tag */}
      <div style={{
        marginTop: '4px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.65rem',
        color: '#94a3b8',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {agent.id.replace(/-/g, ' ')}
      </div>

      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 5px ${color}; }
          100% { transform: scale(1.1); box-shadow: 0 0 15px ${color}; }
        }
      `}</style>
    </div>
  );
}
