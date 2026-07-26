#!/usr/bin/env node
/**
 * Master Verification Runner for Pre-PR and Pre-Push checks.
 * Runs format check, lint, typecheck, build, unit tests, and Playwright E2E tests in fail-fast order.
 * Generates summary metrics in artifacts/reports/pr-check-report.json.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

const steps = [
  { id: "format", name: "Code Format Check", cmd: "npm run check:format" },
  { id: "lint", name: "Linter Check", cmd: "npm run check:lint" },
  { id: "typecheck", name: "Static Type Check", cmd: "npm run check:type" },
  { id: "build", name: "Production Build Check", cmd: "npm run check:build" },
  { id: "unit", name: "Unit & Integration Tests", cmd: "npm run check:unit" },
  { id: "python", name: "Python Quant Model Tests", cmd: "npm run check:python" },
  { id: "e2e", name: "Playwright E2E & A11y Tests", cmd: "npm run check:e2e" },
];

console.log(`\n${colors.bright}${colors.cyan}=====================================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}   MyPortStock Pre-PR Verification Suite (7 Gates)   ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}=====================================================${colors.reset}\n`);

const results = [];
const overallStartTime = Date.now();
let overallPassed = true;

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  console.log(`${colors.bright}[${i + 1}/${steps.length}] Running: ${step.name}...${colors.reset} ${colors.dim}(${step.cmd})${colors.reset}`);
  
  const startTime = Date.now();
  let status = "PASS";
  let errorOutput = null;

  try {
    execSync(step.cmd, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, CI: "true" },
    });
  } catch (err) {
    status = "FAIL";
    overallPassed = false;
    errorOutput = err.message;
  }

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  results.push({
    id: step.id,
    name: step.name,
    command: step.cmd,
    status,
    durationMs,
    durationSec: `${durationSec}s`,
    error: errorOutput,
  });

  if (status === "PASS") {
    console.log(`${colors.green}✔ ${step.name} PASSED in ${durationSec}s${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✖ ${step.name} FAILED in ${durationSec}s${colors.reset}\n`);
    console.log(`${colors.red}Stopping verification suite (Fail-Fast). Please fix errors before pushing or opening a PR.${colors.reset}\n`);
    break;
  }
}

const totalDurationMs = Date.now() - overallStartTime;
const totalDurationSec = (totalDurationMs / 1000).toFixed(2);

// Write JSON report
const reportDir = path.join(__dirname, "../artifacts/reports");
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const reportPath = path.join(reportDir, "pr-check-report.json");
const reportData = {
  timestamp: new Date().toISOString(),
  overallStatus: overallPassed ? "PASS" : "FAIL",
  totalDurationSec: `${totalDurationSec}s`,
  steps: results,
};

fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf8");

console.log(`${colors.bright}${colors.cyan}-----------------------------------------------------${colors.reset}`);
console.log(`${colors.bright}Verification Report generated:${colors.reset} ${reportPath}`);
console.log(`${colors.bright}${colors.cyan}-----------------------------------------------------${colors.reset}`);

if (overallPassed) {
  console.log(`\n${colors.green}${colors.bright}🎉 ALL 7 VERIFICATION GATES PASSED in ${totalDurationSec}s! Ready for PR to develop/main.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${colors.red}${colors.bright}🚨 VERIFICATION FAILED. Correct issues above before proceeding with PR.${colors.reset}\n`);
  process.exit(1);
}
