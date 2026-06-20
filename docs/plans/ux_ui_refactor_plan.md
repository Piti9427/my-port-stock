# MyPortStock UX/UI Refactor Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Before code changes, use `superpowers:test-driven-development` or `tdd` for each vertical slice. Steps use checkbox (`- [ ]`) syntax for tracking.
> 
> **Skill References Used:** `impeccable` (shape → craft → polish → harden), `using-superpowers`, `superpowers:writing-plans`, `grill-with-docs`, `find-skills`, `build-web-apps:react-best-practices`, `design-taste-frontend`

**Goal:** ปรับปรุง UX/UI และ harden runtime data contract ของ MyPortStock ให้ใช้งานได้จริงแบบ end-to-end สำหรับ personal trading assistant — ไม่ redesign theme ใหม่ แต่ปรับโครงสร้าง component, user flow, information architecture, interaction patterns, auth/per-user analysis context, และ API shape ที่จำเป็นให้เป็นระดับ production-grade

**Architecture Principle:** คง Dark Terminal Product UI (theme, colors, typography) ตาม `docs/DESIGN.md` ทุกประการ แต่ refactor component structure, data flow, shared primitives, และ page composition ให้ใกล้เคียงกับ reference apps ระดับ Linear/Vercel/Robinhood/thinkorswim. Backend changes are allowed only where required for auth, per-user analysis context, and stable API response shape; do not redesign schema, rebuild the backend, or change investment rules.

**Tech Stack:** React 19, Vite, Tailwind CSS + CSS Custom Properties, Clerk Auth, Supabase, Vitest, React Testing Library, Node.js/Express

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Design References & Inspiration](#design-references--inspiration)
3. [Production Scope Boundary](#production-scope-boundary)
4. [Phase 0: Runtime Data Contract Hardening](#phase-0-runtime-data-contract-hardening)
5. [Phase 1: Foundation — Shared Primitives & Design System](#phase-1-foundation--shared-primitives--design-system)
6. [Phase 2: Information Architecture & Navigation](#phase-2-information-architecture--navigation)
7. [Phase 3: Dashboard — North Star Page](#phase-3-dashboard--north-star-page)
8. [Phase 4: Command Center — AI Analysis Flow](#phase-4-command-center--ai-analysis-flow)
9. [Phase 5: Trade Journal & Analytics — Decision Loop](#phase-5-trade-journal--analytics--decision-loop)
10. [Phase 6: Risk & Market Explorer](#phase-6-risk--market-explorer)
11. [Phase 7: Config & Onboarding](#phase-7-config--onboarding)
12. [Phase 8: Ticker Drilldown — Missing Critical Flow](#phase-8-ticker-drilldown--missing-critical-flow)
13. [Phase 9: Anti-Slop Polish & Impeccable Hardening](#phase-9-anti-slop-polish--impeccable-hardening)
14. [Phase 10: Mobile Responsiveness & Accessibility](#phase-10-mobile-responsiveness--accessibility)
15. [Phase 11: Motion & Micro-Interactions](#phase-11-motion--micro-interactions)
16. [Phase 12: Final Verification & Acceptance](#phase-12-final-verification--acceptance)
17. [Rollback Strategy](#rollback-strategy)

---

## Current State Assessment

### Strengths to Preserve
- ✅ Dark Terminal Product UI theme (colors, tokens, typography choices)
- ✅ Keyboard shortcuts system (`KeyboardShortcuts.jsx`)
- ✅ Dark-first landing page with emerald accent
- ✅ Comprehensive CSS token system in `index.css`
- ✅ Auth flow with Clerk adapter
- ✅ Scenario Planner with validation guards
- ✅ Watchlist undo-delete pattern

### Critical Pain Points

| Problem | Impact | Priority |
|:--------|:-------|:---------|
| Monolithic pages (10-38KB per file) | Unmaintainable, slow cognitive scan | P0 |
| No shared component library (4 UI primitives only) | Inconsistent UX across pages | P0 |
| Missing Ticker Drilldown flow (PRD requirement) | Core user flow broken | P0 |
| Analysis context still mixes runtime UI with markdown-derived context | Can show stale portfolio/journal evidence inside production analysis | P0 |
| API response shapes are inconsistent across runtime routes | Hooks and pages duplicate parsing, error, and insufficient-data handling | P0 |
| No global state / data layer | Duplicated API calls, no caching | P1 |
| Inconsistent loading/error/empty states | Low trust, confusion | P1 |
| No progressive disclosure | Information overload on Dashboard | P1 |
| CSS monolith (3,181 lines in one file) | Style drift, hard to maintain | P2 |
| Accessibility gaps (color-only, non-keyboard) | Excludes users, violates WCAG | P2 |
| No skeleton loading states | Janky perceived performance | P2 |

### Design Critique Score (from Impeccable Audit)

| Heuristic | Score | Target |
|:----------|:-----:|:------:|
| Visibility of System Status | 3/4 | 4 |
| Match System / Real World | 4/4 | 4 |
| User Control and Freedom | 3/4 | 4 |
| Consistency and Standards | 2/4 | 4 |
| Error Prevention | 3/4 | 4 |
| Recognition Rather Than Recall | 3/4 | 4 |
| Flexibility and Efficiency | 3/4 | 4 |
| Aesthetic and Minimalist Design | 2/4 | 4 |
| Error Recovery | 2/4 | 3 |
| Help and Documentation | 1/4 | 3 |
| **Total** | **26/40** | **38/40** |

---

## Design References & Inspiration

### Primary References (ยึดเป็นหลัก)

| Reference | Pattern ที่นำมาใช้ | ที่มา |
|:----------|:-------------------|:------|
| **Linear App** | Sidebar navigation, keyboard shortcuts, Cmd+K command palette, clean density | Mobbin, Product use |
| **Vercel Dashboard** | Monospace technical data, 1px borders, minimal surfaces, deployment status | Mobbin, Product use |
| **Robinhood** | Progressive disclosure, simplified trade ticket, portfolio overview hierarchy | Mobbin, Behance |
| **thinkorswim** | High-density data tables, multi-panel layout, sector breakdown | Behance, Dribbble |

### Secondary References (ใช้ pattern เฉพาะจุด)

| Reference | Pattern ที่นำมาใช้ |
|:----------|:-------------------|
| **Wealthfront** | Goal-based portfolio view, automated insights cards |
| **Schwab** | Tiered complexity (simple → pro mode), trade journal layout |
| **Stripe Dashboard** | Metric cards with sparklines, table with inline actions |
| **Raycast** | Command palette interaction, keyboard-first workflow |

### UX Design Principles (จาก Mobbin/Behance Research)

1. **Bento Grid Layout** — Modular cards ขนาดต่างกันตาม importance (primary metric = large card, secondary = small)
2. **Progressive Disclosure** — แสดง North Star metric ก่อน แล้ว drill-down เมื่อต้องการ
3. **Task-Oriented IA** — จัดกลุ่ม nav ตาม Jobs-to-be-Done ไม่ใช่ตาม feature
4. **Instant Feedback** — Hover/click feedback ต้องเร็ว crisp ไม่ floaty
5. **Context Preservation** — ใช้ drawer/slide-over แทน page navigation เพื่อ keep context
6. **Semantic Color Only** — สีมีความหมาย ไม่ใช่ decoration
7. **Data Freshness** — ทุก data point ต้องมี source label + timestamp

---

## Production Scope Boundary

### Allowed Scope

- Frontend UX/UI refactor for logged-in product screens under `frontend/src/`.
- Runtime data contract hardening only where it supports the UX flow:
  - Auth propagation from React to API calls.
  - Per-user analysis context for `POST /api/analyze` and `GET /api/packet/:ticker`.
  - Stable response normalization for holdings, watchlists, journal, quote, packet, and analysis calls.
  - Fail-closed rendering for `INSUFFICIENT_DATA`, auth failure, network failure, stale data, and partial data.
- Backend edits may touch only:
  - `backend/server.js`
  - `backend/src/routes/api.js`
  - `backend/src/db.js`
  - `backend/src/packets/verifiedDataPacket.js`
  - narrowly-scoped tests under `backend/tests/`

### Explicit Non-Goals

- No visual redesign away from Dark Terminal Product UI.
- No Supabase schema redesign, destructive migrations, or table renames.
- No paid market-data dependency.
- No broker execution integration.
- No rewrite of the Express server, routing model, auth provider, or investment decision rules.
- No frontend state library dependency unless the current hooks approach fails a concrete acceptance test.

### Current Baseline To Preserve

- `docs/DESIGN.md` is the product-level design source of truth.
- Supabase remains the runtime source of truth for user-owned `holdings`, `journal`, and `watchlists`.
- Markdown portfolio/journal files are historical context only and must not silently populate production user runtime state.
- Local `dev:ui` may use the existing dev auth bypass for visual testing, but production behavior must require Clerk-backed user identity.
- Current Impeccable detector baseline on 2026-06-20:

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
```

Expected current result:

```json
[]
```

Treat older detector findings as backlog evidence. Re-verify current source before implementing cleanup work.

---

## Phase 0: Runtime Data Contract Hardening

> **Goal:** Lock production data/auth behavior before visual refactors create polished screens on top of stale or inconsistent data.
> **TDD Rule:** Every task in this phase starts with a failing backend/frontend contract test.

### Task 0.1: Define Authenticated Analysis Context Contract

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/src/packets/verifiedDataPacket.js`
- Test: `backend/tests/runtimeData.test.js`
- Test: `backend/tests/deepAnalysisPayload.test.js`

- [ ] **Step 1: Add failing tests for authenticated analysis context**

Add backend tests that prove:

```text
POST /api/analyze with an authenticated user:
- uses Clerk `user_id` / dev scoped user for portfolio and journal context
- does not treat `stock_portfolio.md` holdings as current runtime holdings
- returns `portfolio_context.source = "supabase"` or `status = "INSUFFICIENT_DATA"`
- returns `journal_context.source = "supabase"` or `status = "INSUFFICIENT_DATA"`
- preserves markdown only as `historical_context_warning`, not as runtime data
```

Run:

```bash
cd backend && npm run test
```

Expected before implementation: fail because `getVerifiedPacket()` still builds portfolio/journal context from markdown readers.

- [ ] **Step 2: Implement minimal per-user context lookup**

Use existing Supabase helpers where possible. Do not add tables or migrations.

```text
Authenticated analysis context source order:
1. Supabase scoped by Clerk `user_id`
2. If Supabase unavailable: `INSUFFICIENT_DATA`
3. Markdown: historical warning only, never runtime holdings/trades
```

- [ ] **Step 3: Keep fail-closed behavior**

If Supabase is not configured, disconnected, or auth is missing for a personalized flow:

```json
{
  "status": "INSUFFICIENT_DATA",
  "error_details": "Supabase runtime data unavailable for authenticated analysis context",
  "decision_snapshot": {
    "verdict": "Wait",
    "gate_status": "fail"
  }
}
```

- [ ] **Step 4: Re-run backend tests**

Run:

```bash
cd backend && npm run test
```

Expected: pass.

### Task 0.2: Normalize Frontend API Contract

**Files:**
- Modify: `frontend/src/lib/api.js`
- Create: `frontend/src/hooks/useApi.js`
- Test: `frontend/tests/productionDataContract.test.js`

- [ ] **Step 1: Add failing frontend contract tests**

Tests must cover:

```text
fetchWithAuth:
- includes Authorization header when getToken is available
- supports GET and mutation requests
- normalizes non-2xx responses into Error objects with status and message
- preserves `INSUFFICIENT_DATA` payloads instead of throwing generic "API Error"

useApi:
- exposes { data, loading, error, status, refetch, isStale }
- aborts stale in-flight requests on unmount or key change
- reports source/timestamp metadata when payload contains it
```

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/productionDataContract.test.js
```

Expected before implementation: fail because `frontend/src/lib/api.js` is only a thin GET helper.

- [ ] **Step 2: Implement smallest shared API helper**

The helper must support current endpoints without forcing a backend rewrite:

```js
fetchWithAuth('/api/holdings', getToken);
fetchWithAuth('/api/journal', getToken);
fetchWithAuth('/api/analyze', getToken, {
  method: 'POST',
  body: { ticker, decision_mode: decisionMode, manual_price: manualPrice },
});
```

- [ ] **Step 3: Normalize runtime states**

Every API-backed screen must be able to distinguish:

```text
loading
success with data
success but empty
INSUFFICIENT_DATA
unauthorized
network error
stale/partial data
```

- [ ] **Step 4: Re-run frontend contract tests**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/productionDataContract.test.js
```

Expected: pass.

### Task 0.3: Lock No-Schema-Change Constraint

**Files:**
- Read: `supabase/schema.sql`
- Read: `supabase/migrations/20260617120000_per_user_markdown_runtime_data.sql`
- Test: `backend/tests/schemaContract.test.js`

- [ ] **Step 1: Confirm local and live Supabase schema satisfy this plan**

Use only:

```text
holdings
watchlists
journal
import_batches
```

Current live schema review on 2026-06-20 confirmed:

```text
public.holdings
- RLS enabled
- SELECT only for authenticated users
- scoped by user_id through requesting_user_id()
- unique active ticker index: (user_id, ticker) where is_deleted = false

public.watchlists
- RLS enabled
- authenticated users can manage only their rows
- import metadata columns exist
- unique active ticker index: (user_id, ticker) where is_deleted = false

public.journal
- RLS enabled
- authenticated users can manage only their rows
- import metadata columns exist
- FK to import_batches(import_batch_id)
- trigger trg_journal_recalculate_holdings fires after INSERT/UPDATE/DELETE

public.import_batches
- RLS enabled
- authenticated users can manage only their rows
- used for owner-only markdown import audit metadata
```

If ticker drilldown or analytics requires data not present in those tables, stop and record the gap in this plan instead of adding a migration.

- [ ] **Step 2: Treat full schema files as documentation, not executable production migration**

`supabase/schema.sql` and `backend/supabase_schema.sql` include destructive `DROP TABLE` statements for full clean-room generation. Do not apply them directly to the live project as part of this plan.

Use only additive migrations for live changes. This plan currently expects no new schema migration.

- [ ] **Step 3: Track Supabase advisor findings without expanding this plan**

Current advisor findings to keep out of UX implementation unless the user approves a separate schema-hardening task:

```text
Security:
- public.requesting_user_id has mutable search_path.
- public.rls_auto_enable() is SECURITY DEFINER and callable by anon/authenticated.

Performance:
- public.journal journal_import_batch_id_fkey has no covering index.
- idx_journal_user_id is currently reported unused.
```

Do not fix these inside the UX/UI refactor unless they block Phase 0 tests or the user explicitly expands scope to schema hardening.

- [ ] **Step 4: Add/extend schema contract tests only if needed**

Required assertions:

```text
holdings, watchlists, and journal remain scoped by user_id
RLS remains enabled
No production screen depends on markdown runtime rows
No UX implementation applies destructive full-schema SQL
```

---

## Phase 1: Foundation — Shared Primitives & Design System

> **Impeccable Flow:** `extract` → `document`
> **Goal:** สร้าง shared component library ที่ทุก page ใช้ร่วมกัน ลดการ copy-paste

### Task 1.1: CSS Architecture Restructure

**Files:**
- Restructure: `frontend/src/index.css` → modular CSS files
- Create: `frontend/src/styles/` directory

- [ ] **Step 1: Split `index.css` (3,181 lines) into modules**

```
frontend/src/styles/
├── tokens.css          # CSS custom properties (colors, spacing, typography, z-index)
├── base.css            # Reset, body, html, font-face imports
├── layout.css          # App shell, sidebar, main content area
├── components.css      # Shared component styles (cards, badges, buttons, inputs, tables)
├── pages.css           # Page-specific overrides (minimal)
├── utilities.css       # Utility classes (not covered by Tailwind)
└── animations.css      # Motion tokens, keyframes, reduced-motion
```

- [ ] **Step 2: Define semantic z-index scale**

```css
:root {
  --z-dropdown: 40;
  --z-sticky: 50;
  --z-drawer: 60;
  --z-modal-backdrop: 70;
  --z-modal: 80;
  --z-toast: 90;
  --z-tooltip: 100;
  --z-command-palette: 110;
}
```

- [ ] **Step 3: Add spacing tokens**

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

- [ ] **Step 4: Remove all `Inter` font remnants**
- [ ] **Step 5: Remove decorative `box-shadow`, keep only focus rings**
- [ ] **Step 6: Replace `transition: width` with `transform: scaleX()`**

### Task 1.2: Shared Component Library

**Files:**
- Extend: `frontend/src/components/ui/`

- [ ] **Step 1: Create shared `MetricCard` component**

```
Reference: Stripe Dashboard metric cards
Pattern: Large value + label + optional sparkline + change indicator
```

```jsx
// frontend/src/components/ui/MetricCard.jsx
<MetricCard
  label="Total Portfolio Value"
  value="฿1,234,567"
  change="+2.4%"
  changeType="positive"  // positive | negative | neutral
  sparklineData={[...]}   // optional
  dataStamp="Supabase holdings"
  mono                     // use JetBrains Mono for value
/>
```

- [ ] **Step 2: Create shared `DataTable` component**

```
Reference: Linear issue list + thinkorswim data tables
Pattern: Sortable headers, monospace numbers, row hover, keyboard navigation, empty state
```

```jsx
// frontend/src/components/ui/DataTable.jsx
<DataTable
  columns={[
    { key: 'ticker', label: 'Ticker', mono: true, sortable: true },
    { key: 'price', label: 'Price', mono: true, align: 'right', sortable: true },
    { key: 'pnl', label: 'P/L', semantic: true },  // auto red/green
  ]}
  data={holdings}
  onRowClick={(row) => navigate(`/ticker/${row.ticker}`)}
  emptyState={{ title: 'ยังไม่มีหุ้นในพอร์ต', action: 'เพิ่มหุ้นตัวแรก' }}
  loading={isLoading}
  skeletonRows={5}
/>
```

- [ ] **Step 3: Create shared `Drawer` component**

```
Reference: Robinhood trade ticket slide-over
Pattern: Right-side drawer, Escape to close, focus trap, backdrop
```

```jsx
// frontend/src/components/ui/Drawer.jsx
<Drawer open={isOpen} onClose={close} title="Scenario Planner" width="480px">
  {children}
</Drawer>
```

- [ ] **Step 4: Create shared `EmptyState` component**

```
Reference: Linear empty states — calm, actionable, guide the user
Pattern: Icon + title + description + optional action button
```

```jsx
// frontend/src/components/ui/EmptyState.jsx
<EmptyState
  icon={<Inbox />}
  title="ยังไม่มีบันทึกการเทรด"
  description="บันทึกการเทรดครั้งแรกเพื่อเริ่มติดตามผลงาน"
  action={{ label: 'บันทึกเทรด', onClick: openTradeForm }}
/>
```

- [ ] **Step 5: Create shared `DataStamp` component**

```jsx
// frontend/src/components/ui/DataStamp.jsx
<DataStamp source="Supabase holdings" timestamp={lastUpdated} />
```

- [ ] **Step 6: Create shared `SkeletonLoader` component**

```
Reference: Linear/Vercel skeleton loading
Pattern: Pulsing rectangles matching content layout, not spinner
```

```jsx
// frontend/src/components/ui/Skeleton.jsx
<Skeleton variant="metric-card" />
<Skeleton variant="table" rows={5} columns={4} />
<Skeleton variant="text" width="200px" />
```

- [ ] **Step 7: Create shared `StatusBadge` component**

```
Reference: Vercel deployment status badges
Pattern: Semantic color background tint + border + text label
```

```jsx
// frontend/src/components/ui/StatusBadge.jsx
<StatusBadge status="buy" />     // emerald bg tint
<StatusBadge status="hold" />    // amber bg tint
<StatusBadge status="avoid" />   // red bg tint
<StatusBadge status="wait" />    // gray bg tint
```

- [ ] **Step 8: Create shared `Toast` notification component**

```jsx
// frontend/src/components/ui/Toast.jsx
<Toast message="Removed NVDA" undoAction={undo} duration={5000} />
```

- [ ] **Step 9: Create shared `Tooltip` component**

```
Reference: Vercel tooltips — minimal, precise
```

- [ ] **Step 10: Migrate existing `card.jsx` to remove decorative shadow**

### Task 1.3: Data Layer Foundation

**Files:**
- Modify: `frontend/src/lib/api.js`
- Create: `frontend/src/hooks/useApi.js`
- Create: `frontend/src/hooks/usePortfolio.js`
- Create: `frontend/src/hooks/useJournal.js`
- Create: `frontend/src/hooks/useWatchlist.js`
- Test: `frontend/tests/productionDataContract.test.js`

- [ ] **Step 1: Extend shared API helper from Phase 0**

`fetchWithAuth` must be the only helper for authenticated runtime reads and mutations.

Required behavior:

```text
Input:
- url
- getToken
- method
- body
- signal

Output:
- parsed JSON payload
- preserved `status: "INSUFFICIENT_DATA"` payloads
- Error with status/message for unauthorized, non-2xx, and network failure
```

- [ ] **Step 2: Create shared API hook with caching, loading, stale, abort, and error states**

```jsx
// frontend/src/hooks/useApi.js
const { data, loading, error, status, isStale, refetch } = useApi('/api/holdings', {
  cacheKey: 'holdings',
  staleTime: 30000,  // 30s
});
```

- [ ] **Step 3: Create domain-specific hooks**

```jsx
// frontend/src/hooks/usePortfolio.js
const { holdings, summary, loading, error, refetch } = usePortfolio();

// frontend/src/hooks/useJournal.js
const { trades, closedTrades, stats, loading, error, refetch } = useJournal();

// frontend/src/hooks/useWatchlist.js
const { items, alerts, add, remove, loading, error, refetch } = useWatchlist();
```

- [ ] **Step 4: Ensure all hooks return consistent runtime state shape**

```jsx
{
  data,
  loading,
  error,
  status,       // OK | EMPTY | INSUFFICIENT_DATA | UNAUTHORIZED | ERROR
  meta,         // source, timestamp, gate status when available
  isStale,
  refetch,
}
```

- [ ] **Step 5: Run frontend contract tests**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/productionDataContract.test.js
```

Expected: pass.

---

## Phase 2: Information Architecture & Navigation

> **Impeccable Flow:** `clarify` → `layout`
> **Reference:** Linear sidebar navigation + Raycast command palette

### Task 2.1: Sidebar Navigation Refinement

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css` (layout section)

- [ ] **Step 1: Reorganize nav groups for cognitive clarity**

Current navigation has 7 items which is at Miller's Law boundary. Reorganize:

```jsx
const NAV_GROUPS = [
  {
    title: 'OVERVIEW',
    links: [
      { to: '/', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { to: '/risk', label: 'ความเสี่ยง', icon: ShieldAlert },
    ],
  },
  {
    title: 'TRADING',
    links: [
      { to: '/command-center', label: 'วิเคราะห์หุ้น', icon: Bot },
      { to: '/market', label: 'สำรวจตลาด', icon: Crosshair },
      { to: '/journal', label: 'บันทึกเทรด', icon: BookOpen },
    ],
  },
  {
    title: 'INSIGHTS',
    links: [
      { to: '/analytics', label: 'สถิติผลงาน', icon: BarChart2 },
    ],
  },
];

// Config moves to bottom utility area (near user button)
```

- [ ] **Step 2: Add collapsible sidebar option**

```
Pattern: Linear collapsible sidebar → icon-only mode for more content space
Toggle: Button at sidebar bottom or keyboard shortcut (Cmd+B)
```

- [ ] **Step 3: Add breadcrumb/page title in content area header**

```jsx
// Reference: Vercel page headers
<header className="page-header">
  <h1>แดชบอร์ด</h1>
  <DataStamp source="Supabase holdings" />
</header>
```

### Task 2.2: Command Palette (Cmd+K)

**Files:**
- Create: `frontend/src/components/CommandPalette.jsx`
- Modify: `frontend/src/components/KeyboardShortcuts.jsx`

- [ ] **Step 1: Build command palette with search**

```
Reference: Linear Cmd+K / Raycast
Pattern: Search across pages, tickers, recent actions
```

```jsx
const COMMANDS = [
  { type: 'page', label: 'แดชบอร์ด', shortcut: 'g d', action: () => navigate('/') },
  { type: 'page', label: 'วิเคราะห์หุ้น', shortcut: 'g c', action: () => navigate('/command-center') },
  { type: 'action', label: 'วิเคราะห์ $NVDA', action: () => analyzeStock('NVDA') },
  { type: 'ticker', label: '$ASTS', action: () => navigate('/ticker/ASTS') },
  // ... dynamic from portfolio/watchlist
];
```

- [ ] **Step 2: Integrate with existing keyboard shortcuts**
- [ ] **Step 3: Show hint in sidebar bottom area**

```jsx
<div className="sidebar-cmd-hint">
  <kbd>⌘</kbd><kbd>K</kbd> <span>Quick search</span>
</div>
```

---

## Phase 3: Dashboard — North Star Page

> **Impeccable Flow:** `shape` → `craft` → `distill`
> **Reference:** Robinhood portfolio overview + Stripe dashboard + thinkorswim summary

### Task 3.1: Dashboard Decomposition

**Files:**
- Refactor: `frontend/src/pages/DashboardPage.jsx` (37,765 bytes → target <8KB)
- Create: Multiple extracted components

- [ ] **Step 1: Extract components from monolithic DashboardPage**

```
DashboardPage.jsx (37KB) → decompose into:
├── DashboardPage.jsx            (~3KB - layout + composition only)
├── components/
│   ├── PortfolioSummary.jsx     (~3KB - total value, daily P/L, metrics)
│   ├── HoldingsTable.jsx        (~4KB - uses shared DataTable)
│   ├── WatchlistPanel.jsx       (~3KB - compact watchlist with sparklines)
│   ├── AIChatCard.jsx           (~3KB - inline AI quick-ask)
│   ├── ScenarioPlanner.jsx      (~5KB - extracted from Dashboard, uses Drawer)
│   └── QuickActions.jsx         (~2KB - analyze, log trade, add watchlist)
```

- [ ] **Step 2: Apply Bento Grid layout**

```
Reference: Apple/finance bento grids from Mobbin research

Desktop (1200px+):
┌─────────────────────────────┬─────────────────┐
│  Portfolio Summary (2 cols) │ Quick Actions    │
│  Total Value + P/L + Change │ (1 col)          │
├─────────────────────────────┴─────────────────┤
│  Holdings Table (full width)                   │
│  Sortable, row-clickable for ticker drilldown  │
├──────────────────────┬────────────────────────┤
│  Watchlist Panel     │  AI Quick Ask          │
│  With sparklines     │  "วิเคราะห์ $___"     │
└──────────────────────┴────────────────────────┘
```

- [ ] **Step 3: Portfolio Summary as North Star**

```
Reference: Robinhood home screen — one hero number
 
Display hierarchy:
1. Total Portfolio Value (largest, JetBrains Mono, white)
2. Daily P/L with % change (secondary, semantic color)
3. Unrealized P/L (muted, underneath)
4. Data stamp (smallest, muted)
```

- [ ] **Step 4: Holdings Table using shared DataTable**

```
Reference: thinkorswim positions table

Columns: Ticker | Shares | Avg Cost | Current | P/L | P/L % | Weight
- Row click → navigates to /ticker/:ticker (drilldown)
- Semantic color on P/L columns
- Monospace for all numbers
- Sort by any column
```

- [ ] **Step 5: Watchlist Panel with sparklines**

```
Reference: Stripe metric cards

Each watchlist item shows:
- Ticker (mono, link to drilldown)
- Current price (mono)
- Mini sparkline (7-day, inline)
- Change % (semantic color)
- Quick action: "วิเคราะห์" button
```

- [ ] **Step 6: AI Quick Ask card**

```
Reference: Linear quick-action area

Simple input: "พิมพ์ ticker เพื่อวิเคราะห์..."
→ On enter, navigate to /command-center?ticker=NVDA
Not a full chat interface on Dashboard
```

### Task 3.2: Scenario Planner as Drawer

**Files:**
- Extract: From DashboardPage → `frontend/src/components/ScenarioPlanner.jsx`
- Uses: Shared `Drawer` component

- [ ] **Step 1: Move Scenario Planner to shared Drawer**

```
Reference: Robinhood trade ticket — right-side slide-over

Trigger: Button on Holdings row or Quick Actions
Opens as Drawer, not inline collapse
Pre-filled with selected ticker data
```

- [ ] **Step 2: Consolidate validation (from existing remediation plan Task 4)**
- [ ] **Step 3: Add quick-fill budget buttons (฿5k, ฿10k, ฿25k)**
- [ ] **Step 4: Show risk/reward calculation live as user types**

---

## Phase 4: Command Center — AI Analysis Flow

> **Impeccable Flow:** `shape` → `craft` → `clarify`
> **Reference:** thinkorswim analysis + Linear detail view

### Task 4.1: Command Center Restructure

**Files:**
- Refactor: `frontend/src/pages/CommandCenterPage.jsx` (18,907 bytes → target <6KB)
- Create: Extracted sub-components
- Modify: `frontend/src/lib/api.js`
- Test: `frontend/tests/productionDataContract.test.js`

- [ ] **Step 1: Decompose into clear panels**

```
CommandCenterPage.jsx → decompose into:
├── CommandCenterPage.jsx      (~3KB - layout only)
├── components/
│   ├── TickerInput.jsx        (~2KB - search/select ticker)
│   ├── QuotePanel.jsx         (~3KB - current price with gate status)
│   ├── AnalysisControls.jsx   (~2KB - mode select, analyze button)
│   ├── AgentResults.jsx       (~4KB - sub-agent council results)
│   ├── DecisionSnapshot.jsx   (~3KB - verdict, score, traffic light)
│   └── TradeTicket.jsx        (~3KB - execute trade from analysis)
```

- [ ] **Step 2: Apply progressive disclosure layout**

```
Reference: thinkorswim "Analyze" tab + Robinhood stock detail

Flow:
1. TickerInput (top) → user picks ticker
2. QuotePanel shows (with clear "Display quote only" or "Gate-passed" label)
3. AnalysisControls (select mode: Quick/Swing/Long-Term)
4. Click "วิเคราะห์" → streaming results appear
5. AgentResults in tabs (Fundamental / Technical / Macro / Risk / Catalyst)
6. DecisionSnapshot sticky at bottom (verdict + score + action)
7. "Log Trade" button → opens TradeTicket drawer
```

- [ ] **Step 3: DeepAnalysisTabs integration**

```
Keep existing DeepAnalysisTabs.jsx structure
Wrap each tab content in a consistent panel
Add loading skeletons per tab
```

- [ ] **Step 4: Clear data source labeling**

```
Quote Panel: "Display quote · Yahoo Finance · delayed 15min"
Gate Panel:  "⚠️ Price gate: FAIL — ต้องยืนยัน Tier 1 ก่อน execution"
or           "✅ Price gate: PASS — dual-source confirmed"
```

- [ ] **Step 5: Route all personalized analysis through authenticated API helper**

```
Command Center analysis calls must use `fetchWithAuth('/api/analyze', getToken, { method: 'POST', body })`.

Public/display quote lookup may remain unauthenticated only if it is clearly labeled display-only.
Any result that affects portfolio/journal context must include authenticated user context from Phase 0.
```

### Task 4.2: Chat Interface Improvement

**Files:**
- Modify: Chat components within Command Center

- [ ] **Step 1: Separate "Analysis Mode" from "Chat Mode"**

```
Reference: ChatGPT mode switching

Two modes:
1. "วิเคราะห์" mode — structured analysis with sub-agent council
2. "สนทนา" mode — free-form AI chat about markets
Toggle clearly visible at top
```

- [ ] **Step 2: Show streaming analysis with proper loading states**

```
Reference: Linear's task detail loading

During analysis:
- Show skeleton for each agent section
- Stream results as they arrive
- Final verdict appears last with animation
```

---

## Phase 5: Trade Journal & Analytics — Decision Loop

> **Impeccable Flow:** `shape` → `craft` → `harden`
> **Reference:** Schwab trade history + Stripe analytics dashboard

### Task 5.1: Trade Journal Enhancement

**Files:**
- Refactor: `frontend/src/pages/JournalPage.jsx`
- Create: Sub-components

- [ ] **Step 1: Enhance journal table**

```
Reference: Schwab trade history

Features to add:
- Sortable columns (date, ticker, type, P/L)
- Filter by: ticker, trade mode, status (open/closed), date range
- URL-persisted filters (?ticker=NVDA&mode=swing)
- Inline status badges (Active/Closed/Stopped Out)
- Row click → expand trade detail (thesis, entry/exit, post-mortem)
```

- [ ] **Step 2: Add "Log Trade" form as Drawer**

```
Reference: Robinhood order ticket

Fields:
- Ticker (auto-suggest from portfolio/watchlist)
- Entry Price, Stop Loss, Target (monospace inputs)
- Capital Allocated (with quick-fill buttons)
- Trade Mode (Quick/Swing/Long-Term)
- Thesis (textarea)
- Auto-calculated: R/R ratio, THB risk, position size
- Warning if risk exceeds SOP limits
```

- [ ] **Step 3: Post-mortem view for closed trades**

```
Reference: Schwab filled order detail

Show:
- Original thesis vs actual outcome
- Entry/exit prices and dates
- P/L (absolute and %)
- Lessons learned
- Link to related analysis
```

### Task 5.2: Analytics Page Enhancement

**Files:**
- Refactor: `frontend/src/pages/AnalyticsPage.jsx`
- Create: Sub-components

- [ ] **Step 1: Add filter controls (from existing remediation plan Task 8)**

```
Reference: Stripe analytics filters

Filters:
- Ticker dropdown (from closed trades)
- Mode dropdown (Quick/Swing/Long-Term)
- Date range picker
- Persist in URL query params
```

- [ ] **Step 2: Metric cards row**

```
Reference: Stripe dashboard KPI row

Cards: Win Rate | Avg Win/Loss Ratio | Total P/L | Best Trade | Worst Trade
Each card uses shared MetricCard component
```

- [ ] **Step 3: Equity curve chart**

```
Simple line chart showing portfolio value over time
With proper empty state: "ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ"
```

- [ ] **Step 4: Differentiate no-data vs no-match empty states**

---

## Phase 6: Risk & Market Explorer

> **Impeccable Flow:** `craft` → `harden`
> **Reference:** thinkorswim risk analyzer + Wealthfront portfolio view

### Task 6.1: Portfolio Risk Enhancement

**Files:**
- Refactor: `frontend/src/pages/PortfolioRiskPage.jsx`

- [ ] **Step 1: Make sector bars interactive buttons (from remediation Task 7)**

```
- Keyboard accessible
- Click to show sector drilldown
- ARIA labels with weight + limit info
- Text alternative for color-coded states
```

- [ ] **Step 2: Add position-level risk view**

```
Reference: thinkorswim risk analyzer

Show per-position:
- Ticker | Value | Weight% | Stop Distance | THB Risk | Status
- Highlight positions without stop-loss
- Total portfolio risk summary
```

- [ ] **Step 3: Risk budget gauge**

```
Reference: Wealthfront risk meter

Simple visual:
- Used: ฿15,000 / ฿50,000 risk budget
- Bar fill with semantic color (green → amber → red as approaching limit)
```

### Task 6.2: Market Explorer Enhancement

**Files:**
- Refactor: `frontend/src/pages/MarketExplorerPage.jsx`

- [ ] **Step 1: Clear "display quote only" labeling**
- [ ] **Step 2: Add sector/theme overview**

```
Reference: Schwab market overview

Sections:
- Market indices (S&P500, NASDAQ, DJI)
- Sector performance heat map (simple grid, not gaudy)
- Theme watchlist groups (Space Data Center, AI Infrastructure, etc.)
```

- [ ] **Step 3: Quick analyze button per ticker**

```
Click → navigate to /command-center?ticker=XYZ
```

---

## Phase 7: Config & Onboarding

> **Impeccable Flow:** `clarify` → `onboard` → `harden`
> **Reference:** Vercel project settings + Linear settings

### Task 7.1: Config Page Restructure

**Files:**
- Refactor: `frontend/src/pages/ConfigPage.jsx` (20,828 bytes → target <5KB)

- [ ] **Step 1: Split into sections with sidebar navigation**

```
Reference: Vercel project settings / GitHub settings

Sections:
├── General (display preferences)
├── API Keys (with secret masking)
├── Risk Parameters (SOP limits)
├── Notifications (LINE/email settings)
└── Data Management (import/export)
```

- [ ] **Step 2: Per-section save with unsaved indicator**
- [ ] **Step 3: Move to bottom utility area in sidebar (settings icon)**

### Task 7.2: First-Run Empty States

**Files:**
- Multiple page files

- [ ] **Step 1: Design first-run experience per page**

```
Reference: Linear onboarding empty states

Each page should have a meaningful empty state:
- Dashboard: "เริ่มต้นโดยเพิ่มหุ้นในพอร์ต" + action button
- Journal: "บันทึกเทรดครั้งแรกเพื่อเริ่มติดตาม" + action
- Analytics: "ต้องมี trade ที่ปิดแล้วอย่างน้อย 1 รายการ"
- Risk: "เพิ่มหุ้นในพอร์ตเพื่อดูความเสี่ยง"
```

---

## Phase 8: Ticker Drilldown — Missing Critical Flow

> **Impeccable Flow:** `shape` → `craft`
> **Reference:** Robinhood stock detail + Schwab stock overview
> **Priority:** P0 — This is described in PRD but not implemented. Execute this as the first vertical slice after Phase 0 and the minimum shared primitives from Phase 1, even though the detailed section lives here.

### Task 8.1: Ticker Detail Page

**Files:**
- Create: `frontend/src/pages/TickerDetailPage.jsx`
- Modify: `frontend/src/App.jsx` (add route)
- Modify: `frontend/src/lib/api.js`
- Test: `frontend/tests/productionDataContract.test.js`
- Test: `backend/tests/runtimeData.test.js`

- [ ] **Step 1: Write route and data contract tests first**

Required frontend test assertions:

```text
App exposes `/ticker/:symbol`
Dashboard holdings rows navigate to `/ticker/:symbol`
Watchlist rows navigate to `/ticker/:symbol`
Journal ticker links navigate to `/ticker/:symbol`
Ticker detail shows loading, empty, insufficient-data, and unauthorized states
Ticker detail labels every price/source field as display-only unless price gate passed
```

Required backend test assertions:

```text
GET /api/journal/:ticker is scoped to authenticated user
GET /api/holdings never returns another user's rows
POST /api/analyze uses authenticated per-user context when called from ticker detail
```

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/productionDataContract.test.js
cd backend && npm run test
```

Expected before implementation: fail for missing route and incomplete per-user analysis context.

- [ ] **Step 2: Create `/ticker/:symbol` route**

```
Reference: Robinhood stock detail page

This is the CORE user flow described in PRD:
"เมื่อกดที่หุ้นแต่ละตัว จะเข้าสู่หน้ารายละเอียดหุ้นนั้นๆ"
```

- [ ] **Step 3: Design ticker detail layout**

```
┌─────────────────────────────────────────────────┐
│  Header: $NVDA · NVIDIA Corporation             │
│  Price: $142.50  +2.4%  ✅ Gate: Pass           │
│  ├──────────────────────────────────────────────┤
│  Position Summary (if held)                      │
│  Shares: 10 | Avg: $135 | P/L: +฿2,500 (+5.5%) │
│  ├──────────────────────────────────────────────┤
│  Actions: [วิเคราะห์ Setup] [บันทึกเทรด] [เปิด│
│           Scenario Planner] [เพิ่ม Watchlist]   │
│  ├──────────────────────────────────────────────┤
│  Tabs:                                          │
│  [ประวัติเทรด] [ผลวิเคราะห์ล่าสุด] [แผนแนวรับ]│
│                                                 │
│  Trade History (filtered to this ticker)         │
│  or Last Analysis Results                        │
│  or Active Scenario Plan                         │
└─────────────────────────────────────────────────┘
```

- [ ] **Step 4: Wire up all entry points**

```
Entry points to /ticker/:symbol:
- Dashboard holdings table row click
- Watchlist panel item click
- Command Center after analysis
- Journal table ticker link
- Market Explorer ticker click
- Command Palette search result
```

- [ ] **Step 5: Pre-fill data from authenticated runtime context**

Data rules:

```text
Position Summary:
- Use Supabase `holdings` for the signed-in user only.
- If no holding exists, show "not held" and keep analysis/watchlist actions available.

Trade History:
- Use Supabase `journal` filtered by ticker for the signed-in user only.
- If no rows exist, show a no-history empty state.

Quote/Price:
- Use quote/packet fields only with source, timestamp/session, and gate status.
- Never present Yahoo-only enrichment from `/api/price/:ticker` as execution-ready.

Analysis:
- Call `POST /api/analyze` through `fetchWithAuth`.
- If per-user context is unavailable, show `Wait` / `INSUFFICIENT_DATA`, not a generic error.
```

- [ ] **Step 6: Re-run route/data contract tests**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/productionDataContract.test.js
cd backend && npm run test
```

Expected: pass.

---

## Phase 9: Anti-Slop Polish & Impeccable Hardening

> **Impeccable Flow:** `polish` → `harden` → `distill`
> **Reference:** DESIGN.md bans list + Impeccable anti-pattern rules

### Task 9.1: CSS Anti-Slop Cleanup

**Files:**
- Modify: All CSS files

- [ ] **Step 1: Remove all banned patterns**

```
Checklist (from DESIGN.md + Impeccable):
[ ] No gradient text (background-clip: text)
[ ] No glassmorphism as default container
[ ] No large soft drop shadows
[ ] No border radius > 16px
[ ] No decorative neon glow
[ ] No color without semantic meaning
[ ] No motion that doesn't communicate state
[ ] No bouncy/elastic easing
[ ] No Inter font remnants
[ ] No transition: width (use transform)
[ ] No side-stripe accent borders
```

- [ ] **Step 2: Run Impeccable detector**

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
```

- [ ] **Step 3: Fix all P0/P1 detector hits**

### Task 9.2: Error & Edge Case Hardening

- [ ] **Step 1: Every API-backed view must handle: loading, error, empty, partial data**
- [ ] **Step 2: Every destructive action must have confirmation or undo**
- [ ] **Step 3: Every form must validate before submit with inline errors**
- [ ] **Step 4: Network failure must show retry button, not blank screen**
- [ ] **Step 5: Stale data must show staleness indicator, not pretend freshness**

---

## Phase 10: Mobile Responsiveness & Accessibility

> **Impeccable Flow:** `adapt` → `audit`
> **Reference:** Robinhood mobile + WCAG 2.1 AA

### Task 10.1: Mobile Layout

- [ ] **Step 1: Sidebar → bottom nav or hamburger on mobile (<768px)**

```
Reference: Robinhood bottom navigation

On mobile:
- Bottom tab bar with 4-5 icons
- Content fills full width
- Drawers become full-screen modals
- Tables scroll horizontally or transform to card layout
```

- [ ] **Step 2: Touch-friendly targets (min 44px)**
- [ ] **Step 3: Test all pages at 390px, 768px, 1024px, 1440px**

### Task 10.2: Accessibility

- [ ] **Step 1: All interactive elements keyboard accessible**
- [ ] **Step 2: Color-coded data must have text alternative**
- [ ] **Step 3: Proper heading hierarchy (single h1 per page)**
- [ ] **Step 4: ARIA labels on icon-only buttons**
- [ ] **Step 5: Focus visible on all interactive elements**
- [ ] **Step 6: Reduced motion support for all animations**
- [ ] **Step 7: Screen reader announcements for live data updates**

---

## Phase 11: Motion & Micro-Interactions

> **Impeccable Flow:** `animate`
> **Reference:** Linear transitions + Vercel feedback

### Task 11.1: Purposeful Motion

- [ ] **Step 1: Page transitions**

```css
/* Subtle fade-in for route changes */
.page-enter { opacity: 0; transform: translateY(4px); }
.page-enter-active {
  opacity: 1; transform: translateY(0);
  transition: all 0.2s var(--ease-out-quart);
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active { transition: none; }
}
```

- [ ] **Step 2: Drawer slide-in**

```
200ms ease-out-quart slide from right
Backdrop fade 150ms
```

- [ ] **Step 3: Toast enter/exit**

```
Enter: slide up + fade in 200ms
Exit: fade out 150ms
Auto-dismiss: 5s with progress bar
```

- [ ] **Step 4: Data update flash**

```
When a price updates:
- Brief green/red flash on the value
- 300ms, then return to default color
- Reduced motion: no flash, just value change
```

- [ ] **Step 5: Skeleton → content transition**

```
Skeleton pulse: 1.5s ease-in-out infinite
Content reveal: 200ms fade-in replacing skeleton
```

---

## Phase 12: Final Verification & Acceptance

> **Impeccable Flow:** Full verification pass
> **Reference:** Existing remediation plan Task 11

### Task 12.1: Automated Gates

- [ ] **Step 1: Backend contract tests pass**

```bash
cd backend && npm run test
```

- [ ] **Step 2: Frontend tests pass**

```bash
cd frontend && npm run test -- --run
```

- [ ] **Step 3: Lint passes**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Typecheck and architecture checks pass**

```bash
cd frontend && npm run typecheck && npm run verify:architecture
```

- [ ] **Step 5: Build passes**

```bash
cd frontend && npm run build
```

- [ ] **Step 6: Impeccable detector clean**

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
```

### Task 12.2: Visual Route Verification

- [ ] **Step 1: Desktop smoke test every route**

```
Routes to check:
/ (Dashboard)
/ticker/:symbol (NEW — Ticker Drilldown)
/command-center
/risk
/market
/journal
/analytics
/config
```

- [ ] **Step 2: Mobile smoke test (390px) every route**
- [ ] **Step 3: Empty state verification per route**
- [ ] **Step 4: Loading state verification per route**
- [ ] **Step 5: Error state verification per route**
- [ ] **Step 6: Keyboard navigation test**
- [ ] **Step 7: Screen reader test (VoiceOver)**

### Task 12.3: End-to-End User Flow Verification

- [ ] **Step 1: New user flow**

```
Landing → Sign in → Empty Dashboard → Add first ticker → 
Analyze → View results → Log trade → See in Journal →
Check Analytics → View Risk
```

- [ ] **Step 2: Returning user flow**

```
Sign in → Dashboard (holdings visible) → Click ticker → 
See detail + history → Run new analysis → 
Open Scenario Planner → Calculate risk → 
Log trade → See updated portfolio
```

- [ ] **Step 3: Power user keyboard flow**

```
⌘K → type ticker → Enter → Analysis page → 
Tab through results → g d → Dashboard → 
g j → Journal → g r → Risk
```

### Acceptance Criteria

```text
[ ] Design critique score ≥ 36/40 (from 26/40 baseline)
[ ] Large pages are decomposed so route files own composition/orchestration only; extracted components have focused tests
[ ] Shared component library has ≥ 10 reusable primitives
[ ] Ticker drilldown flow works end-to-end
[ ] Command palette (Cmd+K) works
[ ] Every page has proper loading, error, empty states
[ ] Every data display has source label
[ ] Personalized analysis uses authenticated per-user Supabase context or fails closed
[ ] Markdown portfolio/journal data is never shown as production runtime data
[ ] No Impeccable detector hard hits
[ ] Backend contract tests pass
[ ] Frontend tests, lint, typecheck, architecture check, and build pass
[ ] Mobile layout works at 390px
[ ] WCAG 2.1 AA compliance on all interactive elements
[ ] Reduced motion support for all animations
[ ] Theme colors and typography unchanged from docs/DESIGN.md
```

---

## Rollback Strategy

Rollback by reverting only the scoped files changed by this plan:

- `frontend/src/` — all modified and new files
- `frontend/src/styles/` — new directory
- `frontend/src/components/` — new shared components
- `frontend/src/pages/` — refactored pages + new TickerDetailPage
- `frontend/tests/productionDataContract.test.js` — updated frontend contract tests
- `backend/server.js` — only if Phase 0 authenticated analysis context changed it
- `backend/src/routes/api.js` — only if API shape/auth propagation changed it
- `backend/src/db.js` — only if shared per-user runtime lookup helpers changed it
- `backend/src/packets/verifiedDataPacket.js` — only if context metadata changed it
- `backend/tests/` — Phase 0 backend contract tests

No database schema changes. No destructive migrations. No design token changes unless `docs/DESIGN.md` is explicitly updated first.

Git strategy: Use feature branch `feat/ux-refactor` with per-phase commits for granular rollback.

---

## Implementation Priority Order

```mermaid
graph TD
    P0["Phase 0: Runtime Contract<br/>Auth + Per-User Context"]
    P1["Phase 1: Foundation<br/>Shared Primitives"]
    P2["Phase 2: IA & Navigation"]
    P3["Phase 3: Dashboard"]
    P4["Phase 4: Command Center"]
    P5["Phase 5: Journal & Analytics"]
    P6["Phase 6: Risk & Market"]
    P7["Phase 7: Config & Onboarding"]
    P8["Phase 8: Ticker Drilldown"]
    P9["Phase 9: Anti-Slop Polish"]
    P10["Phase 10: Mobile & A11y"]
    P11["Phase 11: Motion"]
    P12["Phase 12: Verification"]

    P0 --> P1
    P1 --> P8
    P8 --> P3
    P8 --> P4
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P4 --> P9
    P7 --> P9
    P9 --> P10
    P10 --> P11
    P11 --> P12
```

**Estimated effort per phase:**

| Phase | Scope | Est. Time |
|:------|:------|:----------|
| Phase 0 | Runtime contract / auth / per-user analysis context | 1-2 days |
| Phase 1 | Foundation | 2-3 days |
| Phase 2 | IA & Nav | 1 day |
| Phase 3 | Dashboard | 2-3 days |
| Phase 4 | Command Center | 2 days |
| Phase 5 | Journal & Analytics | 2 days |
| Phase 6 | Risk & Market | 1-2 days |
| Phase 7 | Config & Onboarding | 1 day |
| Phase 8 | Ticker Drilldown | 2 days |
| Phase 9 | Anti-Slop Polish | 1 day |
| Phase 10 | Mobile & A11y | 2 days |
| Phase 11 | Motion | 1 day |
| Phase 12 | Verification | 1 day |
| **Total** | | **~19-24 days** |
