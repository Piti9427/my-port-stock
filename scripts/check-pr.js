#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const reportPath = path.join(
  repoRoot,
  "artifacts/reports/pr-check-report.json",
);
const steps = [
  ["format", "Format", "npm run check:format"],
  ["docs", "Markdown & documentation structure", "npm run check:docs"],
  ["lint", "Lint", "npm run check:lint"],
  ["typecheck", "Full-repo JavaScript typecheck", "npm run check:type"],
  ["build", "Production build", "npm run check:build"],
  ["node-tests", "Node tests", "npm run check:unit"],
  ["python-tests", "Python quant tests", "npm run check:python"],
  ["property-tests", "Financial property tests", "npm run check:property"],
  ["database", "Supabase migration and RLS", "npm run check:database"],
  ["e2e", "Deterministic E2E and accessibility", "npm run check:e2e"],
  ["secrets", "Secret scan", "npm run check:secrets"],
  [
    "dependency-security",
    "Production dependency security",
    "npm run check:dependencies",
  ],
];

function run(command) {
  return spawnSync(command, {
    cwd: repoRoot,
    env: { ...process.env, CI: "true" },
    shell: true,
    stdio: "inherit",
  });
}

const commitSha = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).stdout.trim();
const results = [];
const suiteStartedAt = Date.now();
let failed = false;

for (const [id, name, command] of steps) {
  const startedAt = Date.now();
  const result = run(command);
  const durationMs = Date.now() - startedAt;
  const passed = result.status === 0;
  results.push({
    id,
    name,
    assuranceClass: "Merge Gate",
    required: true,
    advisory: false,
    command,
    durationMs,
    result: passed ? "PASS" : "FAIL",
    failureSummary: passed
      ? null
      : `Command exited with ${result.status ?? result.signal ?? "unknown status"}`,
  });
  if (!passed) {
    failed = true;
    break;
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      commitSha,
      assuranceClass: "Merge Gate",
      overallResult: failed ? "FAIL" : "PASS",
      durationMs: Date.now() - suiteStartedAt,
      checks: results,
    },
    null,
    2,
  )}\n`,
);

console.log(`PR assurance report: ${reportPath}`);
process.exit(failed ? 1 : 0);
