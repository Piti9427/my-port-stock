"use strict";

const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const WebSocket = require("ws");

const { createAgentEventBus } = require("../src/ws/agentEventBus");
const { WsTicketStore } = require("../src/ws/wsTicketStore");

const cleanups = [];

afterEach(async () => {
  while (cleanups.length) {
    await cleanups.pop()();
  }
});

describe("Agent Event Bus Real-Time Resilience & Multi-User Isolation", () => {
  it("refuses to broadcast user-specific events when userId is missing", async () => {
    const store = new WsTicketStore();
    const { bus } = await startEventBus(store);

    const result = bus.broadcast({ type: "ANALYSIS_UPDATE", data: "test" });
    assert.equal(result, false);
  });

  it("broadcasts SYSTEM_HEALTH events to all connected clients regardless of userId", async () => {
    const store = new WsTicketStore();
    const { baseUrl, bus } = await startEventBus(store);

    const ticketA = store.issue("user_1");
    const ticketB = store.issue("user_2");

    const wsA = await connectWs(
      `${baseUrl}/ws/agent-events?ticket=${ticketA.ticket}`,
    );
    const wsB = await connectWs(
      `${baseUrl}/ws/agent-events?ticket=${ticketB.ticket}`,
    );
    cleanups.push(
      () => closeSocket(wsA),
      () => closeSocket(wsB),
    );

    const msgAPromise = nextWsMessage(wsA);
    const msgBPromise = nextWsMessage(wsB);

    const broadcastResult = bus.broadcast({
      type: "SYSTEM_HEALTH",
      status: "OK",
    });
    assert.equal(broadcastResult, true);

    const msgA = await msgAPromise;
    const msgB = await msgBPromise;

    assert.equal(msgA.type, "SYSTEM_HEALTH");
    assert.equal(msgB.type, "SYSTEM_HEALTH");
  });

  it("strictly isolates user-specific messages so User B never sees User A events", async () => {
    const store = new WsTicketStore();
    const { baseUrl, bus } = await startEventBus(store);

    const ticketA = store.issue("user_alice");
    const ticketB = store.issue("user_bob");

    const wsA = await connectWs(
      `${baseUrl}/ws/agent-events?ticket=${ticketA.ticket}`,
    );
    const wsB = await connectWs(
      `${baseUrl}/ws/agent-events?ticket=${ticketB.ticket}`,
    );
    cleanups.push(
      () => closeSocket(wsA),
      () => closeSocket(wsB),
    );

    const userBMessages = [];
    wsB.on("message", (raw) => userBMessages.push(JSON.parse(raw.toString())));

    const msgAPromise = nextWsMessage(wsA);
    bus.broadcast(
      { type: "PORTFOLIO_ALERT", ticker: "NVDA" },
      { userId: "user_alice" },
    );

    const msgA = await msgAPromise;
    assert.equal(msgA.type, "PORTFOLIO_ALERT");
    assert.equal(msgA.ticker, "NVDA");

    // Allow setImmediate loop for any potential leakage to User B
    await new Promise((res) => setImmediate(res));
    assert.deepEqual(userBMessages, []);
  });
});

async function startEventBus(ticketStore) {
  const server = http.createServer((_req, res) => res.end("ok"));
  const bus = createAgentEventBus(server, { ticketStore });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Expected TCP server address");
  cleanups.push(() => bus.close());
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));
  return { baseUrl: `ws://127.0.0.1:${address.port}`, bus };
}

function connectWs(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function nextWsMessage(socket) {
  return new Promise((resolve) => {
    socket.once("message", (payload) =>
      resolve(JSON.parse(payload.toString())),
    );
  });
}

function closeSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    socket.once("close", resolve);
    socket.close();
  });
}
