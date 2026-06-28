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

describe("WebSocket ticket store", () => {
  it("issues one-time tickets that expire after 30 seconds", () => {
    let now = 1_000;
    const store = new WsTicketStore({ now: () => now });
    const first = store.issue("user_a");

    assert.match(first.ticket, /^[0-9a-f-]{36}$/i);
    assert.equal(first.expiresInSeconds, 30);
    assert.equal(store.consume(first.ticket), "user_a");
    assert.equal(store.consume(first.ticket), null);

    const expired = store.issue("user_a");
    now += 30_001;
    assert.equal(store.consume(expired.ticket), null);
  });

  it("keeps at most 1,000 pending tickets", () => {
    const store = new WsTicketStore();
    const first = store.issue("user_a");

    for (let index = 0; index < 1_000; index += 1) {
      store.issue(`user_${index}`);
    }

    assert.equal(store.size, 1_000);
    assert.equal(store.consume(first.ticket), null);
  });
});

describe("authenticated WebSocket event bus", () => {
  it("rejects missing, invalid, expired, and reused tickets", async () => {
    let now = 1_000;
    const store = new WsTicketStore({ now: () => now });
    const { baseUrl } = await startEventBus(store);

    assert.equal(await rejectedStatus(`${baseUrl}/ws/agent-events`), 401);
    assert.equal(await rejectedStatus(`${baseUrl}/ws/agent-events?ticket=invalid`), 401);

    const expired = store.issue("user_a");
    now += 30_001;
    assert.equal(
      await rejectedStatus(`${baseUrl}/ws/agent-events?ticket=${expired.ticket}`),
      401,
    );

    const valid = store.issue("user_a");
    const socket = await connect(`${baseUrl}/ws/agent-events?ticket=${valid.ticket}`);
    cleanups.push(() => closeSocket(socket));
    assert.equal(socket.readyState, WebSocket.OPEN);
    assert.equal(
      await rejectedStatus(`${baseUrl}/ws/agent-events?ticket=${valid.ticket}`),
      401,
    );
  });

  it("broadcasts user events only to that user", async () => {
    const store = new WsTicketStore();
    const { baseUrl, bus } = await startEventBus(store);
    const userATicket = store.issue("user_a");
    const userBTicket = store.issue("user_b");
    const userA = await connect(`${baseUrl}/ws/agent-events?ticket=${userATicket.ticket}`);
    const userB = await connect(`${baseUrl}/ws/agent-events?ticket=${userBTicket.ticket}`);
    cleanups.push(() => closeSocket(userA));
    cleanups.push(() => closeSocket(userB));
    const userBMessages = [];
    userB.on("message", (payload) => userBMessages.push(JSON.parse(payload.toString())));

    const userAMessage = nextMessage(userA);
    assert.equal(bus.broadcast({ type: "ANALYSIS_PROGRESS" }, { userId: "user_a" }), true);

    assert.equal((await userAMessage).type, "ANALYSIS_PROGRESS");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(userBMessages, []);
    assert.equal(bus.broadcast({ type: "ANALYSIS_PROGRESS" }), false);
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

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function rejectedStatus(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("unexpected-response", (_request, response) => {
      response.resume();
      resolve(response.statusCode);
    });
    socket.once("error", (error) => {
      if (!String(error.message).includes("Unexpected server response")) reject(error);
    });
  });
}

function nextMessage(socket) {
  return new Promise((resolve) => {
    socket.once("message", (payload) => resolve(JSON.parse(payload.toString())));
  });
}

function closeSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    socket.once("close", resolve);
    socket.close();
  });
}
