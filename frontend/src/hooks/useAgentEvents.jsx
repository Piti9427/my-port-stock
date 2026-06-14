import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const AgentEventsContext = createContext(null);

const WS_URL = (() => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_WS_HOST || window.location.host;
  return `${proto}//${host}/ws/agent-events`;
})();

export function AgentEventsProvider({ children }) {
  const [agentStates, setAgentStates] = useState({
    cio: { state: 'IDLE', message: null },
    'fundamental-auditor': { state: 'IDLE', message: null },
    'quant-technician': { state: 'IDLE', message: null },
    'macro-strategist': { state: 'IDLE', message: null },
    'portfolio-risk-manager': { state: 'IDLE', message: null },
    'catalyst-hunter': { state: 'IDLE', message: null },
  });
  const [lastEvent, setLastEvent] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (evt) => {
        try {
          const event = JSON.parse(evt.data);
          setLastEvent(event);

          if (event.type === 'AGENT_STATE_CHANGE') {
            setAgentStates((prev) => ({
              ...prev,
              [event.agent]: {
                state: event.state,
                message: event.message || null,
                ticker: event.ticker,
              },
            }));
          }

          if (event.type === 'ANALYSIS_COMPLETE') {
            setAnalysisResult(event.payload);
          }
        } catch (_) {
          /* ignore parse errors */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    } catch (_) {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAgentStates((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, { state: 'IDLE', message: null }])));
  }, []);

  return (
    <AgentEventsContext.Provider
      value={{
        agentStates,
        lastEvent,
        analysisResult,
        connected,
        resetAnalysis,
      }}
    >
      {children}
    </AgentEventsContext.Provider>
  );
}

export function useAgentEvents() {
  return useContext(AgentEventsContext);
}
