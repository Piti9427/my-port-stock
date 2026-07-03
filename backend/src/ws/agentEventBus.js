"use strict";

const WebSocket = require("ws");

let broadcastFn = () => false;

function rejectUpgrade(socket) {
  socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  socket.destroy();
}

function createAgentEventBus(httpServer, { ticketStore } = {}) {
  if (!ticketStore) throw new TypeError("Agent event bus requires a ticket store");

  const wss = new WebSocket.Server({ noServer: true });

  function handleUpgrade(request, socket, head) {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname !== "/ws/agent-events") return;

    const userId = ticketStore.consume(url.searchParams.get("ticket"));
    if (!userId) {
      rejectUpgrade(socket);
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = userId;
      wss.emit("connection", ws, request);
    });
  }

  httpServer.on("upgrade", handleUpgrade);
  wss.on("connection", (ws) => {
    ws.on("error", (error) => {
      console.error("[AgentEventBus] WS error:", error.message);
    });
  });

  broadcastFn = function scopedBroadcast(event, { userId } = {}) {
    const isSystemHealth = event?.type === "SYSTEM_HEALTH";
    if (!userId && !isSystemHealth) return false;

    const payload = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
    for (const client of wss.clients) {
      const canReceive = isSystemHealth || client.userId === userId;
      if (canReceive && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
    return true;
  };

  function close() {
    httpServer.off("upgrade", handleUpgrade);
    for (const client of wss.clients) client.terminate();
    return new Promise((resolve) => wss.close(resolve));
  }

  return { wss, broadcast: broadcastFn, close };
}

function broadcast(event, options) {
  return broadcastFn(event, options);
}

module.exports = { createAgentEventBus, broadcast };
