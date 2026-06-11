'use strict';
const WebSocket = require('ws');

let broadcastFn = () => {};

function createAgentEventBus(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws/agent-events' });

  wss.on('connection', (ws) => {
    ws.on('error', (err) => console.error('[AgentEventBus] WS error:', err.message));
  });

  broadcastFn = function broadcast(event) {
    const payload = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  console.log('[AgentEventBus] WebSocket server active at /ws/agent-events');
  return { wss, broadcast: broadcastFn };
}

function broadcast(event) {
  broadcastFn(event);
}

module.exports = { createAgentEventBus, broadcast };
