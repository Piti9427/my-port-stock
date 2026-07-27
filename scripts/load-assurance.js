#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const autocannon = require("autocannon");
const WebSocket = require("ws");
const { requireLoopbackUrl } = require("../backend/src/providers/testMode");

const target = requireLoopbackUrl(
  process.env.LOAD_TARGET || "http://127.0.0.1:8080",
  "LOAD_TARGET",
);
const httpClients = Math.min(Number(process.env.LOAD_HTTP_CLIENTS || 25), 50);
const wsClients = Math.min(Number(process.env.LOAD_WS_CLIENTS || 50), 100);
const durationSeconds = Math.min(
  Number(process.env.LOAD_DURATION_SECONDS || 30),
  60,
);

function readTargetRssBytes() {
  const pid = process.env.LOAD_SERVER_PID;
  if (!pid || !/^\d+$/.test(pid)) return process.memoryUsage().rss;
  const linuxStatus = `/proc/${pid}/status`;
  if (fs.existsSync(linuxStatus)) {
    const match = fs
      .readFileSync(linuxStatus, "utf8")
      .match(/^VmRSS:\s+(\d+)\s+kB$/m);
    if (match) return Number(match[1]) * 1024;
  }
  const kilobytes = Number(
    execFileSync("ps", ["-o", "rss=", "-p", pid], { encoding: "utf8" }).trim(),
  );
  return Number.isFinite(kilobytes)
    ? kilobytes * 1024
    : process.memoryUsage().rss;
}

const rssBefore = readTargetRssBytes();

async function runWebSockets() {
  const sockets = [];
  let connected = 0;
  let errors = 0;
  let delivered = 0;
  await Promise.all(
    Array.from({ length: wsClients }, async () => {
      const ticketResponse = await fetch(new URL("/api/ws-ticket", target), {
        method: "POST",
        headers: { Authorization: "Bearer dev-ui-auth-bypass" },
      });
      const { ticket } = await ticketResponse.json();
      const wsUrl = new URL(
        `/ws/agent-events?ticket=${encodeURIComponent(ticket)}`,
        target,
      );
      wsUrl.protocol = target.protocol === "https:" ? "wss:" : "ws:";
      await new Promise((resolve) => {
        const socket = new WebSocket(wsUrl);
        sockets.push(socket);
        socket.on("message", () => {
          delivered += 1;
        });
        socket.once("open", () => {
          connected += 1;
          resolve();
        });
        socket.once("error", () => {
          errors += 1;
          resolve();
        });
      });
    }),
  );
  if (connected > 0) {
    const analysisResponse = await fetch(new URL("/api/analyze", target), {
      method: "POST",
      headers: {
        Authorization: "Bearer dev-ui-auth-bypass",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker: "NVDA",
        decision_mode: "Swing Trade",
        risk_plan: {
          stop_loss: 90,
          hard_risk_thb: 500,
          rr_ratio: 2.5,
        },
      }),
    });
    if (!analysisResponse.ok) errors += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  sockets.forEach((socket) => socket.terminate());
  return {
    attempted: wsClients,
    connected,
    errors,
    delivered,
    connectionSuccessRate: connected / wsClients,
    eventDeliveryCorrect: connected > 0 && delivered >= connected,
  };
}

async function main() {
  const websocket = await runWebSockets();
  const httpResult = await autocannon({
    url: new URL("/api/quote/NVDA", target).toString(),
    connections: httpClients,
    duration: durationSeconds,
    amount: undefined,
    pipelining: 1,
  });
  const report = {
    generatedAt: new Date().toISOString(),
    assuranceClass: "Scheduled Assurance",
    safety: {
      fixtureTicker: "NVDA",
      externalProviderCalls: 0,
      retries: 0,
      httpClients,
      wsClients,
      durationSeconds,
    },
    http: {
      latencyMs: {
        p50: httpResult.latency.p50,
        p95: httpResult.latency.p97_5,
        p99: httpResult.latency.p99,
      },
      p95Method: "Autocannon p97.5 conservative upper bound",
      throughput: httpResult.throughput.average,
      requests: httpResult.requests.total,
      errors: httpResult.errors,
      non2xx: httpResult.non2xx,
      rate429:
        (httpResult.statusCodeStats?.["429"]?.count || 0) /
        Math.max(httpResult.requests.total, 1),
    },
    websocket,
    rssGrowthBytes: readTargetRssBytes() - rssBefore,
    eventDeliveryCorrect: websocket.eventDeliveryCorrect,
  };
  const output = path.resolve("artifacts/reports/load-assurance.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  if (
    httpResult.errors > 0 ||
    websocket.errors > 0 ||
    !websocket.eventDeliveryCorrect
  )
    process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
