#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const sourceDir = path.resolve("artifacts/gate-reports");
const requiredGates = [
  ["format", "Format", "npm run check:format"],
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
const reportsByGate = new Map(
  (fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir) : [])
    .filter((name) => name.endsWith(".json"))
    .map((name) =>
      JSON.parse(fs.readFileSync(path.join(sourceDir, name), "utf8")),
    )
    .map((report) => [report.id, report]),
);
const reports = requiredGates.map(
  ([id, name, command]) =>
    reportsByGate.get(id) || {
      id,
      name,
      assuranceClass: "Merge Gate",
      required: true,
      advisory: false,
      command,
      durationMs: null,
      result: "MISSING",
      failureSummary: `${name} did not upload a report fragment`,
      commitSha: process.env.GITHUB_SHA || null,
      generatedAt: new Date().toISOString(),
    },
);
const output = path.resolve("artifacts/reports/pr-check-report.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      commitSha: process.env.GITHUB_SHA || reports[0]?.commitSha || null,
      assuranceClass: "Merge Gate",
      overallResult: reports.every((report) => report.result === "PASS")
        ? "PASS"
        : "FAIL",
      checks: reports,
    },
    null,
    2,
  )}\n`,
);
