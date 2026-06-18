# Per-User Markdown Runtime Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the transition from personal markdown runtime data to Supabase tables that are isolated by Clerk `user_id`, so each website user sees only their own holdings, journal, watchlists, and import audit rows.

**Architecture:** Supabase remains the runtime source of truth. Markdown files are one-time import sources for the owner only, then become redacted historical context. Express signs a Supabase-scoped JWT per Clerk user, Supabase RLS enforces row ownership, and the React UI renders empty states for users with no rows instead of sample data.

**Tech Stack:** Supabase Postgres, Row Level Security, Clerk user IDs, Express, `@supabase/supabase-js` v2 CommonJS backend, React/Vite frontend, Node test runner.

---

## Current State

- Live Supabase already has `holdings`, `journal`, `watchlists`, and `import_batches` for the owner import path.
- `journal` is the event source; `holdings` is recalculated by the `trg_journal_recalculate_holdings` trigger.
- `GET /api/holdings`, `GET /api/journal`, and `GET /api/watchlists` must read Supabase only.
- Normal API reads must never auto-import personal markdown data for a new or empty user.
- `backend/supabase_schema.sql` and `supabase/schema.sql` are desired full schemas and currently contain destructive `DROP TABLE` statements. Do not apply either file directly to live production data.
- The next implementation work is to make this durable as migrations, tests, UI states, and markdown redaction.

## File Map

- Modify: `supabase/migrations/<timestamp>_per_user_markdown_runtime_data.sql`
  - Add or verify import audit columns/tables without dropping live data.
- Modify: `backend/supabase_schema.sql`
  - Keep as desired schema documentation only; ensure it matches the additive migration after implementation.
- Modify: `supabase/schema.sql`
  - Keep as desired schema documentation only; ensure it matches the additive migration after implementation.
- Modify: `backend/src/services/migrationService.js`
  - Keep owner-only importer idempotent and refuse non-owner user IDs.
- Modify: `backend/scripts/import-markdown-snapshot.js`
  - Keep dry-run default and `--write` explicit.
- Modify: `backend/src/routes/api.js`
  - Keep runtime reads Supabase-only and scoped to the authenticated Clerk user.
- Modify: `frontend/src/pages/DashboardPage.jsx`
  - Render user-specific empty/insufficient-data states without mock portfolio rows.
- Modify: `backend/tests/migration.test.js`
  - Protect parser, owner-only import, idempotency, and `ADJUST` startup balance behavior.
- Modify: `backend/tests/runtimeData.test.js`
  - Protect against auto-bootstrap from normal API reads.
- Modify: `backend/tests/schemaContract.test.js`
  - Protect schema/RLS/grant/security-definer contract.
- Modify: `backend/tests/api.test.js`
  - Add API user isolation behavior.
- Modify: `PROJECT_MEMORY_INDEX.md`
  - Add compact pointer after implementation.
- Modify: `stock_portfolio.md`
  - Redact runtime holdings/watchlist numeric tables after DB verification.
- Modify: `trade_journal.md`
  - Redact runtime active-trade transaction rows after DB verification.

---

## Task 1: Create Additive Supabase Migration

**Files:**
- Create: `supabase/migrations/<timestamp>_per_user_markdown_runtime_data.sql`
- Modify: `backend/tests/schemaContract.test.js`

- [ ] **Step 1: Create a migration file with Supabase CLI**

Run:

```bash
npx supabase migration new per_user_markdown_runtime_data
```

Expected: a new file appears under `supabase/migrations/`.

- [ ] **Step 2: Write the failing schema contract test**

Add this behavior to `backend/tests/schemaContract.test.js`:

```js
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
});
```

- [ ] **Step 3: Run the test and confirm RED**

Run:

```bash
npm test --workspace=backend -- schemaContract.test.js
```

Expected: FAIL because the additive migration is empty or missing required SQL.

- [ ] **Step 4: Fill the migration with additive SQL**

Use this SQL in the newly created migration file:

```sql
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::TEXT;
$$ LANGUAGE SQL STABLE;

REVOKE ALL ON FUNCTION public.requesting_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requesting_user_id() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.import_batches (
  import_batch_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT public.requesting_user_id(),
  source_hash TEXT NOT NULL,
  source_files TEXT[] NOT NULL DEFAULT '{}',
  imported_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  inserted_journal INTEGER DEFAULT 0 NOT NULL,
  inserted_watchlists INTEGER DEFAULT 0 NOT NULL
);

ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS source_section TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS source_hash TEXT;
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS source_section TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS source_hash TEXT;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'journal_import_batch_id_fkey'
  ) THEN
    ALTER TABLE public.journal
      ADD CONSTRAINT journal_import_batch_id_fkey
      FOREIGN KEY (import_batch_id)
      REFERENCES public.import_batches(import_batch_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_user_source_hash
  ON public.journal(user_id, source_hash)
  WHERE source_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlists_user_source_hash
  ON public.watchlists(user_id, source_hash)
  WHERE source_hash IS NOT NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_import_batches_user_id
  ON public.import_batches(user_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own holdings" ON public.holdings;
CREATE POLICY "Users can view their own holdings"
ON public.holdings FOR SELECT
TO authenticated
USING (public.requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own watchlists" ON public.watchlists;
CREATE POLICY "Users can manage their own watchlists"
ON public.watchlists FOR ALL
TO authenticated
USING (public.requesting_user_id() = user_id)
WITH CHECK (public.requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own journal entries" ON public.journal;
CREATE POLICY "Users can manage their own journal entries"
ON public.journal FOR ALL
TO authenticated
USING (public.requesting_user_id() = user_id)
WITH CHECK (public.requesting_user_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their own import batches" ON public.import_batches;
CREATE POLICY "Users can manage their own import batches"
ON public.import_batches FOR ALL
TO authenticated
USING (public.requesting_user_id() = user_id)
WITH CHECK (public.requesting_user_id() = user_id);

REVOKE ALL ON TABLE public.holdings FROM anon, authenticated;
REVOKE ALL ON TABLE public.watchlists FROM anon, authenticated;
REVOKE ALL ON TABLE public.journal FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_batches FROM anon, authenticated;

GRANT SELECT ON TABLE public.holdings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.watchlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journal TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.holdings, public.watchlists, public.journal, public.import_batches TO service_role;
```

- [ ] **Step 5: Run the schema test and confirm GREEN**

Run:

```bash
npm test --workspace=backend -- schemaContract.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations backend/tests/schemaContract.test.js
git commit -m "db: add per-user markdown runtime migration"
```

---

## Task 2: Harden Trigger Function Contract

**Files:**
- Modify: `supabase/migrations/<timestamp>_per_user_markdown_runtime_data.sql`
- Modify: `backend/tests/schemaContract.test.js`

- [ ] **Step 1: Write the failing security-definer test**

Add:

```js
test("holdings recalculation trigger is private and has a fixed search_path", () => {
  const schema = fs.readFileSync(path.join(__dirname, "../supabase_schema.sql"), "utf8");

  assert.match(schema, /CREATE SCHEMA IF NOT EXISTS private/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION private\.recalculate_holdings\(\)/);
  assert.match(schema, /SECURITY DEFINER SET search_path = public, private/);
  assert.match(schema, /REVOKE ALL ON FUNCTION private\.recalculate_holdings\(\) FROM PUBLIC/);
  assert.match(schema, /EXECUTE FUNCTION private\.recalculate_holdings\(\)/);
  assert.doesNotMatch(schema, /CREATE OR REPLACE FUNCTION public\.recalculate_holdings\(\)/);
});
```

- [ ] **Step 2: Add or keep private trigger SQL**

The migration must include the private function pattern from `backend/supabase_schema.sql`. Do not create `public.recalculate_holdings()`.

- [ ] **Step 3: Verify**

Run:

```bash
npm test --workspace=backend -- schemaContract.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations backend/tests/schemaContract.test.js backend/supabase_schema.sql supabase/schema.sql
git commit -m "db: harden holdings recalculation trigger"
```

---

## Task 3: Protect Owner-Only Markdown Import

**Files:**
- Modify: `backend/src/services/migrationService.js`
- Modify: `backend/scripts/import-markdown-snapshot.js`
- Modify: `backend/tests/migration.test.js`

- [ ] **Step 1: Write tests for owner-only refusal and idempotent metadata**

Ensure `backend/tests/migration.test.js` covers:

```js
test("markdown import refuses non-owner user IDs", () => {
  assert.throws(
    () => assertMarkdownImportOwner("user_other", { MARKDOWN_IMPORT_OWNER_USER_ID: "user_owner" }),
    /refusing markdown import for non-owner user/
  );
});

test("markdown import payload creates audit metadata and ADJUST startup balances", () => {
  const payload = buildMarkdownImportPayload({
    userId: "user_owner",
    portfolioMarkdown: portfolioFixture,
    journalMarkdown: journalFixture,
    importedAt: "2026-06-17T00:00:00.000Z",
  });

  assert.match(payload.batch.import_batch_id, /^[a-f0-9]{64}$/);
  assert.ok(payload.journalEntries.every((row) => row.import_batch_id === payload.batch.import_batch_id));
  assert.ok(payload.watchlistItems.every((row) => row.import_batch_id === payload.batch.import_batch_id));
  assert.ok(payload.journalEntries.some((row) => row.type === "ADJUST" && row.source_note === "startup_balance_import"));
});
```

- [ ] **Step 2: Keep `--write` explicit**

`backend/scripts/import-markdown-snapshot.js` must default to dry-run. The script must write to Supabase only when called with:

```bash
npm run import:markdown:write --workspace=backend
```

- [ ] **Step 3: Verify importer tests**

Run:

```bash
npm test --workspace=backend -- migration.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/migrationService.js backend/scripts/import-markdown-snapshot.js backend/tests/migration.test.js
git commit -m "test: protect owner-only markdown import"
```

---

## Task 4: Block Runtime Auto-Bootstrap

**Files:**
- Modify: `backend/src/routes/api.js`
- Modify: `backend/tests/runtimeData.test.js`

- [ ] **Step 1: Keep the static regression test**

`backend/tests/runtimeData.test.js` must assert that normal API routes do not call import functions:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("runtime API routes do not auto-bootstrap markdown data", () => {
  const apiSource = fs.readFileSync(path.join(__dirname, "../src/routes/api.js"), "utf8");

  assert.doesNotMatch(apiSource, /bootstrapUserData/);
  assert.doesNotMatch(apiSource, /importMarkdownSnapshotForOwner/);
  assert.doesNotMatch(apiSource, /Auto-migration/i);
});
```

- [ ] **Step 2: Verify `GET` routes read only scoped Supabase**

Confirm:

```js
const userDb = getScopedDb(userId);
const holdings = await userDb.getUserHoldings(userId);
const trades = await userDb.getUserJournal(userId);
const watchlists = await userDb.getUserWatchlists(userId);
```

No markdown parser or importer should be reachable from `GET /api/holdings`, `GET /api/journal`, or `GET /api/watchlists`.

- [ ] **Step 3: Verify**

Run:

```bash
npm test --workspace=backend -- runtimeData.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/api.js backend/tests/runtimeData.test.js
git commit -m "test: block runtime markdown auto-bootstrap"
```

---

## Task 5: Add API User-Isolation Tests

**Files:**
- Modify: `backend/tests/api.test.js`
- Modify: `backend/src/db.js`
- Modify: `backend/src/routes/api.js`

- [ ] **Step 1: Write API behavior tests**

Add tests that verify:

```js
describe("runtime portfolio isolation", () => {
  it("returns empty holdings for a user with no Supabase rows", async () => {
    // Mock getScopedDb("user_b") so getUserHoldings returns [].
    // Request /api/holdings with Clerk auth for user_b.
    // Expect HTTP 200 and [].
  });

  it("does not return user A rows to user B", async () => {
    // Mock getScopedDb("user_b") so only user_b scoped rows are visible.
    // Insert user A-like fixture only into an unscoped mock.
    // Request /api/journal as user_b.
    // Expect no user A tickers in response.body.trades.
  });
});
```

Use the existing backend test style. If mocking Clerk auth is awkward in the current server shape, extract `getUserId(req)` into a tiny exported helper and test the data-layer functions directly first.

- [ ] **Step 2: Run and confirm RED**

Run:

```bash
npm test --workspace=backend -- api.test.js
```

Expected: FAIL until the mock/export seams are added.

- [ ] **Step 3: Implement smallest support code**

Keep the production behavior unchanged:

```js
const userId = getUserId(req);
if (!userId) return res.status(401).json({ error: 'Unauthorized' });
const userDb = getScopedDb(userId);
```

Do not add markdown fallback, sample rows, or shared default user IDs.

- [ ] **Step 4: Verify**

Run:

```bash
npm test --workspace=backend -- api.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/api.test.js backend/src/db.js backend/src/routes/api.js
git commit -m "test: enforce runtime user data isolation"
```

---

## Task 6: Add Frontend Empty States Per User

**Files:**
- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/tests/productionDataContract.test.js`

- [ ] **Step 1: Write the frontend contract test**

Add assertions that the dashboard has empty-state copy and no sample portfolio fallback:

```js
it("uses real empty portfolio copy instead of sample data copy", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/DashboardPage.jsx"), "utf8");

  expect(source).toContain("No portfolio data yet");
  expect(source).not.toMatch(/sample|mock|demo portfolio/i);
});
```

- [ ] **Step 2: Run and confirm RED**

Run:

```bash
npm test --workspace=frontend -- productionDataContract.test.js
```

Expected: FAIL until the UI copy exists.

- [ ] **Step 3: Implement empty state**

When `/api/holdings` returns `[]`, render:

```jsx
<div className="empty-state" role="status">
  <div className="empty-state-title">No portfolio data yet</div>
  <div className="empty-state-copy">Add a journal entry or run the owner import for this account.</div>
</div>
```

When the API returns `{ status: "INSUFFICIENT_DATA" }`, render:

```jsx
<div className="empty-state empty-state-warning" role="status">
  <div className="empty-state-title">Portfolio data unavailable</div>
  <div className="empty-state-copy">Supabase is not configured or the current account has no accessible rows.</div>
</div>
```

- [ ] **Step 4: Verify frontend tests**

Run:

```bash
npm test --workspace=frontend -- productionDataContract.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DashboardPage.jsx frontend/tests/productionDataContract.test.js
git commit -m "ui: show per-user portfolio empty states"
```

---

## Task 7: Verify Live Supabase Before Redaction

**Files:**
- Modify: `backend/tests/verify_schema_rls.sql`

- [ ] **Step 1: Add verification SQL**

Add this block to `backend/tests/verify_schema_rls.sql`:

```sql
SELECT
  table_name,
  row_security
FROM information_schema.tables
JOIN pg_class ON pg_class.relname = information_schema.tables.table_name
WHERE table_schema = 'public'
  AND table_name IN ('holdings', 'journal', 'watchlists', 'import_batches');

SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('holdings', 'journal', 'watchlists', 'import_batches')
ORDER BY tablename, policyname;

SELECT
  (SELECT count(*) FROM public.import_batches) AS import_batches,
  (SELECT count(*) FROM public.journal WHERE is_deleted = false) AS journal_rows,
  (SELECT count(*) FROM public.watchlists WHERE is_deleted = false) AS watchlist_rows,
  (SELECT count(*) FROM public.holdings WHERE is_deleted = false) AS active_holdings;
```

- [ ] **Step 2: Run against linked Supabase**

Run:

```bash
npx supabase db query --linked --file backend/tests/verify_schema_rls.sql
```

Expected:

- `import_batches >= 1` for the owner after import.
- `journal_rows > 0` for the owner import.
- `watchlist_rows > 0` for the owner import.
- `active_holdings > 0` for the owner import.
- Policies are scoped to `authenticated` and use user ownership checks.

- [ ] **Step 3: Verify runtime scoped client**

Run a safe backend check that does not print secrets:

```bash
node -e "require('dotenv').config({path:'backend/.env'}); const {getScopedDb}=require('./backend/src/db'); (async()=>{const id=process.env.MARKDOWN_IMPORT_OWNER_USER_ID; const db=getScopedDb(id); console.log({holdings:(await db.getUserHoldings(id)).length,journal:(await db.getUserJournal(id)).length,watchlists:(await db.getUserWatchlists(id)).length});})().catch(e=>{console.error(e.message); process.exit(1);})"
```

Expected: non-zero counts for the owner user ID.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/verify_schema_rls.sql
git commit -m "test: document live Supabase runtime verification"
```

---

## Task 8: Redact Runtime Tables From Markdown

**Files:**
- Modify: `stock_portfolio.md`
- Modify: `trade_journal.md`
- Modify: `PROJECT_MEMORY_INDEX.md`

- [ ] **Step 1: Confirm DB verification passed**

Do not redact until Task 7 passes.

- [ ] **Step 2: Replace portfolio runtime tables**

In `stock_portfolio.md`, replace personal holdings/watchlist numeric tables with:

```markdown
> Runtime portfolio and watchlist data migrated to Supabase on 2026-06-17.
> Do not store personal holdings, average cost, live watchlist alerts, or transaction-sized rows in this markdown.
> Use Supabase as the runtime source of truth. This file keeps framework and historical thesis context only.
```

Keep durable thesis notes and non-runtime framework text.

- [ ] **Step 3: Replace trade journal runtime rows**

In `trade_journal.md`, replace active trade transaction rows with:

```markdown
> Runtime trade journal rows migrated to Supabase on 2026-06-17.
> Do not store active personal entries, share counts, entry prices, stops, targets, or transaction-sized rows in this markdown.
> Use Supabase `journal` as the event source. This file keeps templates, SOP notes, and post-mortem context only.
```

Keep templates, lessons, and non-sensitive post-mortem framework text.

- [ ] **Step 4: Add memory index pointer**

Append:

```markdown
### 2026-06-17 - Markdown Runtime Redaction

- Keywords: `markdown-redaction`, `supabase-runtime`, `personal-data`, `per-user-data`
- Decision: Personal runtime numeric data now lives in Supabase per Clerk `user_id`; markdown files keep only historical/context material.
- Action: Redacted holdings, watchlist alert rows, and active trade transaction rows after live import verification.
- Source: `stock_portfolio.md`, `trade_journal.md`, `backend/tests/verify_schema_rls.sql`
```

- [ ] **Step 5: Verify no obvious runtime tables remain**

Run:

```bash
rg -n "\|\s*\*\*\$|\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*\$|shares|avg cost|stop_loss|alert_price" stock_portfolio.md trade_journal.md
```

Expected: no active holdings/watchlist/transaction table rows remain. Framework text may still mention example fields.

- [ ] **Step 6: Commit**

```bash
git add stock_portfolio.md trade_journal.md PROJECT_MEMORY_INDEX.md
git commit -m "docs: redact markdown runtime portfolio data"
```

---

## Task 9: Final Verification

**Files:**
- No code files unless previous tasks fail.

- [ ] **Step 1: Run backend tests**

```bash
npm test --workspace=backend
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests**

```bash
npm test --workspace=frontend
```

Expected: PASS.

- [ ] **Step 3: Run full workspace tests**

```bash
npm test --workspaces --if-present
```

Expected: PASS.

- [ ] **Step 4: Manual user isolation check**

Open the app as:

- Owner account: should show imported Supabase rows.
- Second team member account: should show `No portfolio data yet` and no owner tickers.

- [ ] **Step 5: Commit if final verification changed docs/tests**

```bash
git status --short
git add <changed-files>
git commit -m "test: verify per-user runtime data migration"
```

---

## Rollback

- If the migration breaks live access, do not restore markdown auto-bootstrap.
- Revert the additive migration by dropping only newly added import metadata objects after exporting any live rows.
- Keep RLS enabled and keep `user_id` ownership predicates.
- Restore markdown runtime tables only from git history if needed for audit, not as application source of truth.

## Acceptance Criteria

- `holdings`, `journal`, `watchlists`, and `import_batches` are available through Supabase with RLS enabled.
- All user-owned tables scope access with `requesting_user_id() = user_id`.
- `holdings` is readable but not directly writable by normal authenticated users.
- `journal` inserts/updates/deletes recalculate `holdings`.
- Owner markdown import runs only for `MARKDOWN_IMPORT_OWNER_USER_ID`.
- Re-running the same import batch does not duplicate journal/watchlist rows.
- User B sees empty arrays or `INSUFFICIENT_DATA`, never owner-imported rows.
- Frontend empty state says `No portfolio data yet` and does not render sample/mock holdings.
- Runtime numeric markdown tables are redacted only after live Supabase verification passes.
