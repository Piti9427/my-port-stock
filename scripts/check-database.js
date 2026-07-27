#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const supabase = path.join(repoRoot, "node_modules/.bin/supabase");
const safeEnv = { ...process.env };
for (const key of [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "DATABASE_URL",
])
  delete safeEnv[key];

function run(args, { allowFailure = false, suppressStdout = false } = {}) {
  const result = spawnSync(supabase, args, {
    cwd: repoRoot,
    env: safeEnv,
    stdio: suppressStdout ? ["ignore", "ignore", "inherit"] : "inherit",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `supabase ${args.join(" ")} failed with exit code ${result.status}`,
    );
  }
}

function runDatabaseTests() {
  const template = fs.readFileSync(
    path.join(repoRoot, "supabase/tests/additive-baseline.test.sql.in"),
    "utf8",
  );
  const baseline = fs.readFileSync(
    path.join(
      repoRoot,
      "supabase/migrations/20260601000000_runtime_base_tables.sql",
    ),
    "utf8",
  );
  const testSql = template.replace("-- BASELINE_SQL", () => baseline);
  const generatedTestPath = path.join(
    repoRoot,
    "supabase/tests/additive-baseline.generated.test.sql",
  );
  fs.writeFileSync(generatedTestPath, testSql);
  try {
    run(["test", "db", "--local"]);
  } finally {
    fs.rmSync(generatedTestPath, { force: true });
  }
}

let failed = null;
try {
  // `supabase start` prints local default keys. They are not production
  // credentials, but suppress them so CI logs remain credential-free.
  run(["start"], { suppressStdout: true });
  run(["db", "reset", "--local"]);
  runDatabaseTests();
} catch (error) {
  failed = error;
} finally {
  run(["stop", "--no-backup"], { allowFailure: true });
}

if (failed) throw failed;
