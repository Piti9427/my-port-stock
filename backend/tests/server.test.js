const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const sigtermListenersBeforeImport = process.listenerCount("SIGTERM");
const sigintListenersBeforeImport = process.listenerCount("SIGINT");
const { app, createGracefulShutdown } = require("../server");

describe("Express Server - Static Serving", () => {
  it("should serve static frontend files on the root route", async () => {
    const res = await request(app).get("/");
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/html/);
  });

  it("should catch-all non-api routes and return frontend/dist/index.html", async () => {
    const res = await request(app).get("/some-random-react-route");
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/html/);
  });
});

describe("production runtime lifecycle", () => {
  it("imports without opening listeners or registering signal handlers", () => {
    assert.equal(process.listenerCount("SIGTERM"), sigtermListenersBeforeImport);
    assert.equal(process.listenerCount("SIGINT"), sigintListenersBeforeImport);
  });

  it("keeps health output free of sensitive runtime details", async () => {
    const res = await request(app).get("/health");
    const payload = JSON.stringify(res.body);

    assert.equal(res.statusCode, 200);
    assert.doesNotMatch(payload, /dsn|secret|token|authorization|user[_-]?id|raw_error/i);
  });

  it("closes WebSockets before the HTTP server", async () => {
    const order = [];
    const shutdown = createGracefulShutdown({
      eventBus: {
        close: async () => {
          order.push("websocket");
        },
      },
      server: {
        close(callback) {
          order.push("http");
          callback();
        },
      },
      timeoutMs: 100,
      forceExit: () => assert.fail("graceful shutdown should not force exit"),
    });

    await shutdown("SIGTERM");

    assert.deepEqual(order, ["websocket", "http"]);
  });

  it("disables default Sentry PII and bounds sample rates through environment", () => {
    const source = fs.readFileSync(path.join(__dirname, "../instrument.js"), "utf8");

    assert.match(source, /sendDefaultPii:\s*false/);
    assert.match(source, /SENTRY_TRACES_SAMPLE_RATE/);
    assert.match(source, /SENTRY_PROFILES_SAMPLE_RATE/);
    assert.match(source, /return 0/);
    assert.doesNotMatch(source, /tracesSampleRate:\s*1(?:\.0)?/);
    assert.doesNotMatch(source, /profileSessionSampleRate:\s*1(?:\.0)?/);
  });
});
