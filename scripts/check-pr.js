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

const actionHints = {
  format: "Run 'npm run format' to auto-fix Prettier code style issues.",
  docs: "Run 'npm run check:docs' to inspect loose plans, missing frontmatter, or broken links.",
  lint: "Run 'npm run lint:fix' to fix auto-fixable ESLint errors.",
  typecheck: "Run 'npm run check:type' to inspect TypeScript type errors.",
  build: "Run 'npm run check:build' to inspect build or server syntax errors.",
  "node-tests":
    "Run 'npm run check:unit' to inspect failing backend unit tests.",
  "python-tests":
    "Run 'python3 tools/market_oracle_test.py' to inspect Python test errors.",
  "property-tests":
    "Run 'npm run check:property' to inspect failing financial property tests.",
  database:
    "Run 'npm run check:database' to inspect Supabase migrations and pgTAP tests.",
  e2e: "Run 'npx playwright test' to inspect failing E2E or accessibility tests.",
  secrets:
    "Run 'gitleaks git --redact --config=.gitleaks.toml .' to inspect detected secrets.",
  "dependency-security":
    "Run 'npm audit' to inspect vulnerable production dependencies.",
};

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

const totalSteps = steps.length;
for (let i = 0; i < totalSteps; i++) {
  const [id, name, command] = steps[i];
  console.log(`\n▶ [Gate ${i + 1}/${totalSteps}] ${name} (${command})`);
  console.log(
    "--------------------------------------------------------------------------------",
  );

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

// Write JSON Report
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const totalDurationMs = Date.now() - suiteStartedAt;
const overallResult = failed ? "FAIL" : "PASS";

fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      commitSha,
      assuranceClass: "Merge Gate",
      overallResult,
      durationMs: totalDurationMs,
      checks: results,
    },
    null,
    2,
  )}\n`,
);

// Format Terminal Console Summary Output
const totalSec = (totalDurationMs / 1000).toFixed(1);
console.log("\n");
console.log(
  "================================================================================",
);
console.log(
  "                  PR QUALITY ASSURANCE SUITE SUMMARY                             ",
);
console.log(
  "================================================================================",
);
console.log(` Commit SHA : ${commitSha}`);
console.log(
  ` Result     : ${overallResult === "PASS" ? "✅ PASS" : "❌ FAIL"}`,
);
console.log(` Total Time : ${totalSec}s`);
console.log(
  "--------------------------------------------------------------------------------",
);
console.log(
  " #   Gate Name                              Duration     Result                ",
);
console.log(
  "--------------------------------------------------------------------------------",
);

steps.forEach(([id, name], idx) => {
  const check = results.find((r) => r.id === id);
  const numStr = String(idx + 1).padStart(2, " ");
  const namePad = name.padEnd(38, " ");

  if (check) {
    const durSec = (check.durationMs / 1000).toFixed(1) + "s";
    const durPad = durSec.padStart(8, " ");
    const resStr = check.result === "PASS" ? "✅ PASS" : "❌ FAIL";
    console.log(` ${numStr}  ${namePad} ${durPad}     ${resStr}`);
  } else {
    console.log(` ${numStr}  ${namePad}     -        ⏸️ SKIPPED`);
  }
});

if (failed) {
  const failedCheck = results.find((r) => r.result === "FAIL");
  if (failedCheck) {
    console.log(
      "--------------------------------------------------------------------------------",
    );
    console.log(" ❌ FAILURE DETAILS & DEBUGGING GUIDE");
    console.log(
      "--------------------------------------------------------------------------------",
    );
    console.log(` Failed Gate   : ${failedCheck.name} (${failedCheck.id})`);
    console.log(` Executed Cmd  : ${failedCheck.command}`);
    console.log(` Failure Status: ${failedCheck.failureSummary}`);
    console.log(` Debug Command : ${failedCheck.command}`);
    if (actionHints[failedCheck.id]) {
      console.log(` Suggested Fix : ${actionHints[failedCheck.id]}`);
    }
  }
}

console.log(
  "--------------------------------------------------------------------------------",
);
console.log(` JSON Report Saved : ${path.relative(repoRoot, reportPath)}`);
console.log(
  "================================================================================\n",
);

process.exit(failed ? 1 : 0);
