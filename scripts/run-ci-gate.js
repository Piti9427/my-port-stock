#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const [id, name, command] = process.argv.slice(2);
if (!id || !name || !command) {
  throw new Error("Usage: run-ci-gate.js <id> <name> <command>");
}

const startedAt = Date.now();
const result = spawnSync(command, {
  cwd: path.resolve(__dirname, ".."),
  env: process.env,
  shell: true,
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
const output = `${result.stdout || ""}${result.stderr || ""}`;
process.stdout.write(output);

const logPath = path.resolve(`artifacts/reports/${id}.log`);
const reportPath = path.resolve(`artifacts/gate-reports/${id}.json`);
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(logPath, output);
fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      id,
      name,
      assuranceClass: "Merge Gate",
      required: true,
      advisory: false,
      command,
      durationMs: Date.now() - startedAt,
      result: result.status === 0 ? "PASS" : "FAIL",
      failureSummary:
        result.status === 0
          ? null
          : `Command exited with ${result.status ?? result.signal ?? "unknown status"}`,
      commitSha: process.env.GITHUB_SHA || null,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

process.exit(result.status ?? 1);
