const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(path.join(__dirname, "../supabase_schema.sql"), "utf8");

test("schema has owner import audit table and explicit Data API grants", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.import_batches/);
  assert.match(schema, /ALTER TABLE public\.import_batches ENABLE ROW LEVEL SECURITY/);
  assert.match(schema, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.import_batches TO authenticated/);
  assert.match(schema, /GRANT SELECT ON TABLE public\.holdings TO authenticated/);
  assert.match(schema, /REVOKE ALL ON TABLE public\.holdings FROM anon, authenticated/);
});

test("holdings recalculation trigger is private and has a fixed search_path", () => {
  assert.match(schema, /CREATE SCHEMA IF NOT EXISTS private/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION private\.recalculate_holdings\(\)/);
  assert.match(schema, /SECURITY DEFINER SET search_path = public, private/);
  assert.match(schema, /REVOKE ALL ON FUNCTION private\.recalculate_holdings\(\) FROM PUBLIC/);
  assert.match(schema, /EXECUTE FUNCTION private\.recalculate_holdings\(\)/);
  assert.doesNotMatch(schema, /CREATE OR REPLACE FUNCTION public\.recalculate_holdings\(\)/);
});

test("live migration is additive and does not drop runtime data tables", () => {
  const migrationsDir = path.join(__dirname, "../../supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith("_per_user_markdown_runtime_data.sql"));

  assert.equal(migrationFiles.length, 1);
  const migration = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), "utf8");

  assert.doesNotMatch(migration, /DROP TABLE/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.import_batches/i);
  assert.match(migration, /ALTER TABLE public\.journal ADD COLUMN IF NOT EXISTS import_batch_id/i);
  assert.match(migration, /ALTER TABLE public\.watchlists ADD COLUMN IF NOT EXISTS import_batch_id/i);
  assert.match(migration, /ALTER TABLE public\.holdings ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /TO authenticated/i);
  assert.match(migration, /requesting_user_id\(\) = user_id/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION private\.recalculate_holdings\(\)/);
  assert.match(migration, /SECURITY DEFINER SET search_path = public, private/);
});

test("backend integrity migration adds guarded constraints without rewriting data", () => {
  const migrationPath = path.join(
    __dirname,
    "../../supabase/migrations/20260628160000_backend_integrity_constraints.sql",
  );
  const migration = fs.readFileSync(migrationPath, "utf8");

  assert.doesNotMatch(migration, /DROP TABLE/i);
  assert.doesNotMatch(migration, /DELETE FROM|UPDATE public\./i);
  assert.match(migration, /ADD CONSTRAINT journal_type_allowed_check/i);
  assert.match(migration, /CHECK \(type IN \('BUY', 'SELL', 'ADJUST'\)\)/i);
  assert.match(migration, /ADD CONSTRAINT journal_status_allowed_check/i);
  assert.match(migration, /CHECK \(status IN \('OPEN', 'CLOSED'\)\)/i);
  assert.match(migration, /ADD CONSTRAINT holdings_shares_nonnegative_check/i);
  assert.match(migration, /CHECK \(shares >= 0\)/i);
  assert.match(migration, /ADD CONSTRAINT holdings_avg_cost_nonnegative_check/i);
  assert.match(migration, /CHECK \(avg_cost >= 0\)/i);
  assert.match(migration, /ADD CONSTRAINT watchlists_alert_type_allowed_check/i);
  assert.match(migration, /CHECK \(alert_type IN \('above', 'below'\)\)/i);
  assert.match(migration, /IF NOT EXISTS[\s\S]+pg_constraint/i);
  assert.match(migration, /RAISE EXCEPTION 'Cannot add watchlists import batch foreign key/i);
  assert.match(migration, /ADD CONSTRAINT watchlists_import_batch_id_fkey/i);
});

test("canonical schema snapshots contain the backend integrity constraints", () => {
  const rootSchema = fs.readFileSync(
    path.join(__dirname, "../../supabase/schema.sql"),
    "utf8",
  );

  for (const candidate of [schema, rootSchema]) {
    assert.match(candidate, /CONSTRAINT journal_type_allowed_check/i);
    assert.match(candidate, /CONSTRAINT journal_status_allowed_check/i);
    assert.match(candidate, /CONSTRAINT holdings_shares_nonnegative_check/i);
    assert.match(candidate, /CONSTRAINT holdings_avg_cost_nonnegative_check/i);
    assert.match(candidate, /CONSTRAINT watchlists_alert_type_allowed_check/i);
    assert.match(candidate, /CONSTRAINT watchlists_import_batch_id_fkey/i);
  }
});
