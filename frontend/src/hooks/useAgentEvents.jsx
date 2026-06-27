import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const AgentEventsContext = createContext(null);

const WS_URL = (() => {
  const proto = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_WS_HOST || globalThis.location.host;
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

  useEffect(() => {
    let disposed = false;

    const connect = () => {
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
          } catch (parseError) {
            console.debug('Ignored malformed agent event payload:', parseError);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (!disposed) reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws.close();
      } catch (connectError) {
        console.debug('WebSocket connect failed, retrying:', connectError);
        if (!disposed) reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAgentStates((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, { state: 'IDLE', message: null }])));
  }, []);

  const contextValue = useMemo(
    () => ({
      agentStates,
      lastEvent,
      analysisResult,
      connected,
      resetAnalysis,
    }),
    [agentStates, lastEvent, analysisResult, connected, resetAnalysis]
  );

  return <AgentEventsContext.Provider value={contextValue}>{children}</AgentEventsContext.Provider>;
}

AgentEventsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// The provider and hook share this private context contract.
// eslint-disable-next-line react-refresh/only-export-components
export function useAgentEvents() {
  return useContext(AgentEventsContext);
}
