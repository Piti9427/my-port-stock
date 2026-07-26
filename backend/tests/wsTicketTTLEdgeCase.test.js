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

describe("WebSocket Ticket TTL & Expiry Edge Cases", () => {
  it("strictly invalidates tickets after exact TTL expires", () => {
    let mockTime = 10_000;
    const store = new WsTicketStore({ now: () => mockTime, ttlMs: 30_000 });

    const ticketRecord = store.issue("user_edge");
    assert.ok(ticketRecord.ticket);
    assert.equal(ticketRecord.expiresInSeconds, 30);

    // Right before expiry (29.999 seconds later)
    mockTime += 29_999;
    assert.equal(store.consume(ticketRecord.ticket), "user_edge");

    // Re-issue ticket and test exact expiry boundary (30.001 seconds later)
    const secondRecord = store.issue("user_edge");
    mockTime += 30_001;
    assert.equal(store.consume(secondRecord.ticket), null);
  });

  it("removeExpired method correctly purges stale tickets without affecting valid ones", () => {
    let mockTime = 1_000;
    const store = new WsTicketStore({ now: () => mockTime, ttlMs: 10_000 });

    const oldTicket = store.issue("user_old");
    mockTime += 12_000; // oldTicket is now expired

    const freshTicket = store.issue("user_fresh");
    // issue() automatically calls removeExpired(), purging the stale ticket
    assert.equal(store.size, 1);
    assert.equal(store.consume(oldTicket.ticket), null);
    assert.equal(store.consume(freshTicket.ticket), "user_fresh");
  });

  it("WebSocket connection rejects expired ticket with HTTP 401 status", async () => {
    let mockTime = 5_000;
    const store = new WsTicketStore({ now: () => mockTime, ttlMs: 30_000 });
    const { baseUrl } = await startEventBus(store);

    const ticketRecord = store.issue("user_timeout");
    mockTime += 30_005; // Advance past TTL

    const status = await getConnectStatus(`${baseUrl}/ws/agent-events?ticket=${ticketRecord.ticket}`);
    assert.equal(status, 401);
  });

  it("WebSocket connection rejects ticket reuse on second connection attempt", async () => {
    const store = new WsTicketStore();
    const { baseUrl } = await startEventBus(store);

    const ticketRecord = store.issue("user_single_use");

    // First attempt succeeds
    const socket = await connectWs(`${baseUrl}/ws/agent-events?ticket=${ticketRecord.ticket}`);
    cleanups.push(() => closeSocket(socket));
    assert.equal(socket.readyState, WebSocket.OPEN);

    // Second attempt with same ticket fails with 401
    const secondStatus = await getConnectStatus(`${baseUrl}/ws/agent-events?ticket=${ticketRecord.ticket}`);
    assert.equal(secondStatus, 401);
  });
});

async function startEventBus(ticketStore) {
  const server = http.createServer((_req, res) => res.end("ok"));
  const bus = createAgentEventBus(server, { ticketStore });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
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

function getConnectStatus(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("unexpected-response", (_req, res) => {
      res.resume();
      resolve(res.statusCode);
    });
    socket.once("error", (err) => {
      if (String(err.message).includes("Unexpected server response")) {
        reject(err);
      }
    });
  });
}

function closeSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    socket.once("close", resolve);
    socket.close();
  });
}
