---
status: Completed
updated_at: "2026-07-27"
owner: AI Agent / Developer
---

# Impeccable Critique UI Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve every actionable UX/UI issue found by the existing Impeccable critique backlog, while preserving the MyPortStock Dark Terminal Product UI and avoiding visual redesign drift.

**Architecture:** Treat `docs/DESIGN.md` and `frontend/src/index.css` as the visual source of truth. Fix behavior and resilience first, then strip remaining visual anti-patterns, then verify the visible app route-by-route. This plan intentionally excludes new backend data contracts except where a UI state must clearly expose unavailable data.

**Tech Stack:** React, Vite, Clerk, Supabase-backed frontend APIs, CSS tokens in `frontend/src/index.css`, Vitest/React Testing Library, Impeccable detector, Browser/Playwright visual verification.

---

## Source Audit

Reviewed critique files:

- `.impeccable/critique/2026-06-11T02-45-03Z__frontend-src-pages-dashboardpage-jsx.md`
- `.impeccable/critique/2026-06-11T04-39-48Z__frontend-src-pages-dashboardpage-jsx.md`
- `.impeccable/critique/2026-06-11T10-48-55Z__new-screens-risk-analytics-watchlist-config.md`
- `.impeccable/critique/2026-06-11T11-41-26Z__dashboard-ui.md`
- `.impeccable/critique/2026-06-14T07-08-29Z__frontend-src.md`
- `.impeccable/critique/2026-06-14T09-32-13Z__frontend.md`

Current detector baseline:

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
```

Result on 2026-06-15:

- `overused-font` warning at `frontend/src/index.css:554`
- `overused-font` warning at `frontend/src/index.css:575`
- No current detector hits for gradient text, width transitions, or bouncy easing.

Already partly fixed in current code and should be verified, not rebuilt blindly:

- Watchlist delete has undo toast in `frontend/src/pages/WatchlistPage.jsx`.
- Watchlist empty states exist for filter-empty, full-empty, and no alerts.
- Config persists non-secret settings to `localStorage`, shows unsaved badge, and confirms reset.
- Analytics no longer divides by zero for average loss.
- Portfolio Risk uses transform-based sector bar fill.
- Dashboard Scenario Planner has Escape close, reset, target/stop guard, support-order warning, and table tooltips.
- Keyboard shortcut help exists in `frontend/src/components/KeyboardShortcuts.jsx`.

## Priority Map

### P0: Trust And Data Integrity UX

- Destructive actions must always have undo, confirmation, or soft-delete.
- Financial KPIs must not look live without a visible source/staleness marker.
- Empty, loading, error, and insufficient-data states must exist on all live-data routes.
- Mock-looking "live" labels must be replaced with precise source labels.

### P1: Power-User Efficiency And Error Prevention

- Scenario Planner must prevent invalid support/stop/target/share states and reduce repetitive numeric entry.
- Dense financial metrics need contextual help where the formula affects decisions.
- Keyboard navigation must cover route switching and key task entry points.

### P2: Visual Anti-Slop Polish

- Remove `Inter` remnants and align typography with `docs/DESIGN.md`.
- Remove soft decorative shadows, glow-as-decoration, and blur-as-container effects.
- Keep motion to fast state feedback only, with reduced-motion fallback.
- Make shared primitives and legacy CSS consistent with dark terminal tokens.

---

## Task 1: Lock The Audit Contract In Tests

**Files:**

- Create: `frontend/tests/impeccableCritiqueContract.test.js`
- Read: `.impeccable/critique/*.md`
- Read: `docs/DESIGN.md`

- [ ] **Step 1: Write static failing tests for known Impeccable regressions**

Create `frontend/tests/impeccableCritiqueContract.test.js`:

```js
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('impeccable critique remediation contract', () => {
  it('keeps runtime data pages explicit about source, empty states, and no fake live feed', () => {
    const watchlist = read('src/pages/WatchlistPage.jsx');
    const analytics = read('src/pages/AnalyticsPage.jsx');
    const risk = read('src/pages/PortfolioRiskPage.jsx');

    expect(watchlist).toContain('data-stamp');
    expect(watchlist).toContain('Your watchlist is empty');
    expect(watchlist).not.toContain('INITIAL_ALERTS');
    expect(analytics).toContain('Insufficient data for equity curve');
    expect(risk).toContain('Insufficient data for portfolio risk');
  });

  it('keeps destructive watchlist removal recoverable', () => {
    const watchlist = read('src/pages/WatchlistPage.jsx');

    expect(watchlist).toContain('UndoToast');
    expect(watchlist).toContain('onUndo');
    expect(watchlist).toContain('aria-live="polite"');
  });

  it('keeps scenario planner protected against invalid trade math', () => {
    const dashboard = read('src/pages/DashboardPage.jsx');

    expect(dashboard).toContain('ราคาเป้าหมายต้องสูงกว่าจุดตัดขาดทุนเสมอ');
    expect(dashboard).toContain('แนวรับควรเรียงจากราคาสูงสุด');
    expect(dashboard).toContain('disabled={parseFloat(target) <= parseFloat(stopLoss) || rows.length === 0}');
  });

  it('does not keep Inter remnants in product UI CSS', () => {
    const css = read('src/index.css');

    expect(css).not.toMatch(/font-family:\s*['"]Inter['"]/);
  });

  it('does not reintroduce banned decorative UI patterns in source CSS', () => {
    const css = read('src/index.css');

    expect(css).not.toMatch(/background-clip:\s*text/);
    expect(css).not.toMatch(/transition:[^;]*width/);
    expect(css).not.toMatch(/cubic-bezier\(0\.34,\s*1\.56/);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/impeccableCritiqueContract.test.js
```

Expected now: fail on the `Inter` remnants in `frontend/src/index.css`.

- [ ] **Step 3: Keep this test file as the regression gate for the remaining tasks**

Do not broaden this test into screenshot assertions. It should stay a fast static contract that catches the exact critique families.

---

## Task 2: Remove Typography Drift

**Files:**

- Modify: `frontend/src/index.css`
- Check: `frontend/src/main.jsx`
- Test: `frontend/tests/impeccableCritiqueContract.test.js`

- [ ] **Step 1: Replace the remaining `Inter` CSS declarations**

Change these selectors in `frontend/src/index.css`:

```css
.mode-select {
  font-family:
    'Plus Jakarta Sans',
    'IBM Plex Sans Thai',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    system-ui,
    sans-serif;
}

.btn-analyze {
  font-family:
    'Plus Jakarta Sans',
    'IBM Plex Sans Thai',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    system-ui,
    sans-serif;
}
```

- [ ] **Step 2: Decide whether Clerk appearance should keep `Inter`**

`frontend/src/main.jsx` still configures Clerk with:

```js
fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
```

Recommended change:

```js
fontFamily: '"Plus Jakarta Sans", "IBM Plex Sans Thai", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
```

This keeps auth handoff consistent with `docs/DESIGN.md`.

- [ ] **Step 3: Run the typography regression test**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/impeccableCritiqueContract.test.js
```

Expected: pass.

- [ ] **Step 4: Re-run Impeccable detector**

Run:

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
```

Expected: no `overused-font` warning for literal `Inter` remnants. A warning for `Plus Jakarta Sans` may remain as a detector opinion, but it is an accepted product decision in `docs/DESIGN.md`.

---

## Task 3: Finish Flat-By-Default CSS Cleanup

**Files:**

- Modify: `frontend/src/index.css`
- Modify only if actually imported in runtime: `frontend/src/App.css`
- Modify: `frontend/src/components/ui/card.jsx`
- Modify: `frontend/src/components/ui/badge.jsx`
- Test: `frontend/tests/impeccableCritiqueContract.test.js`

- [ ] **Step 1: Audit all remaining shadows**

Run:

```bash
rg -n "box-shadow|shadow-\\[|\\bshadow\\b|backdropFilter|backdrop-filter" frontend/src
```

Classify each result:

- Keep if it is a focus ring, accessibility outline, or Clerk forced style.
- Remove if it is decorative card/button depth.
- Replace with border/background tint if it marks state.

- [ ] **Step 2: Remove decorative Tailwind shadow from shared primitives**

Change `frontend/src/components/ui/card.jsx` from:

```jsx
<div ref={ref} className={cn('rounded-xl border bg-card text-card-foreground shadow', className)} {...props} />
```

to:

```jsx
<div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground', className)} {...props} />
```

Change `frontend/src/components/ui/badge.jsx` variants so default and destructive variants do not include `shadow`.

- [ ] **Step 3: Keep focus rings, remove decorative glows**

Allowed examples:

```css
:focus-visible {
  outline: 1px solid var(--brand-primary);
  outline-offset: 2px;
}
```

Avoid examples:

```css
box-shadow: 0 6px 20px var(--brand-glow);
box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.3);
```

Replace non-focus decorative shadows with:

```css
border-color: var(--border-medium);
background: var(--bg-panel-hover);
```

- [ ] **Step 4: Preserve modal backdrop blur only if it improves focus**

`frontend/src/components/KeyboardShortcuts.jsx` uses `backdropFilter: 'blur(4px)'`. This is acceptable only as a modal backdrop. Do not use blur on `.glass-panel`, cards, tables, KPI panels, or route containers.

- [ ] **Step 5: Verify no new detector hits**

Run:

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
cd frontend && npm run test -- --run frontend/tests/impeccableCritiqueContract.test.js
```

Expected: detector has no banned structural hits; tests pass.

---

## Task 4: Complete Scenario Planner Hardening And Efficiency

**Files:**

- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/tests/productionDataContract.test.js`
- Test: `frontend/tests/impeccableCritiqueContract.test.js`

- [ ] **Step 1: Extract validation into a readable object**

Inside `ScenarioPlannerDrawer`, add a memoized validation object:

```jsx
const validation = useMemo(() => {
  const s1 = parseFloat(supports.s1);
  const s2 = parseFloat(supports.s2);
  const s3 = parseFloat(supports.s3);
  const sl = parseFloat(stopLoss);
  const tgt = parseFloat(target);

  const supportOrderInvalid =
    (Number.isFinite(s1) && Number.isFinite(s2) && s1 < s2) ||
    (Number.isFinite(s2) && Number.isFinite(s3) && s2 < s3);
  const targetStopInvalid = Number.isFinite(tgt) && Number.isFinite(sl) && tgt <= sl;
  const negativePosition = held < 0 || avgCost < 0 || addAmt < 0;
  const missingPlan = rows.length === 0;

  return {
    supportOrderInvalid,
    targetStopInvalid,
    negativePosition,
    missingPlan,
    canSave: !supportOrderInvalid && !targetStopInvalid && !negativePosition && !missingPlan,
  };
}, [supports, stopLoss, target, held, avgCost, addAmt, rows.length]);
```

- [ ] **Step 2: Disable save with the full validation contract**

Change the confirm button disabled state to:

```jsx
disabled={!validation.canSave || saveStatus === 'Saving...'}
```

- [ ] **Step 3: Add one compact validation summary**

Render one warning block above the drawer footer:

```jsx
{!validation.canSave && (
  <div className="validation-summary" role="alert">
    {validation.supportOrderInvalid && <div>แนวรับต้องเรียงจาก S1 สูงสุดไป S3 ต่ำสุด</div>}
    {validation.targetStopInvalid && <div>ราคาเป้าหมายต้องสูงกว่าจุดตัดขาดทุน</div>}
    {validation.negativePosition && <div>จำนวนหุ้น ราคาเฉลี่ย และงบซื้อเพิ่มต้องไม่ติดลบ</div>}
    {validation.missingPlan && <div>กรอกแนวรับอย่างน้อย 1 จุดก่อนบันทึกแผน</div>}
  </div>
)}
```

- [ ] **Step 4: Add numeric step controls without inventing a complex UI**

Use native `step`, `min`, `onFocus` select, and optional quick-fill buttons only:

```jsx
<button type="button" className="quick-fill-btn" onClick={() => setAddAmt(5000)}>
  ฿5k
</button>
<button type="button" className="quick-fill-btn" onClick={() => setAddAmt(10000)}>
  ฿10k
</button>
<button type="button" className="quick-fill-btn" onClick={() => setAddAmt(25000)}>
  ฿25k
</button>
```

Do not add sliders for prices in this pass; they are imprecise for financial entry.

- [ ] **Step 5: Verify drawer behavior**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/productionDataContract.test.js frontend/tests/impeccableCritiqueContract.test.js
```

Manual route check:

- Open `/`.
- Open Scenario Planner.
- Confirm Escape closes it.
- Confirm invalid support order shows one warning.
- Confirm target below stop disables save.
- Confirm negative held shares disables save.
- Confirm quick-fill buttons do not shift layout.

---

## Task 5: Standardize Data Freshness And Insufficient-Data States

**Files:**

- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/pages/CommandCenterPage.jsx`
- Modify: `frontend/src/pages/PortfolioRiskPage.jsx`
- Modify: `frontend/src/pages/AnalyticsPage.jsx`
- Modify: `frontend/src/pages/JournalPage.jsx`
- Modify: `frontend/src/pages/WatchlistPage.jsx`
- Modify: `frontend/src/pages/MarketExplorerPage.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/tests/impeccableCritiqueContract.test.js`

- [ ] **Step 1: Create consistent stamp copy per route**

Use precise labels, not fake live language:

```js
const DATA_STAMP = 'Supabase holdings + market data gateway';
const DATA_STAMP = 'Supabase journal data';
const DATA_STAMP = 'Quote packet + decision gate';
const DATA_STAMP = 'Display quote only';
```

- [ ] **Step 2: Show the stamp in every page header or primary panel**

Use the existing class:

```jsx
<span className="data-stamp">
  <Clock size={10} aria-hidden="true" />
  {DATA_STAMP}
</span>
```

Routes that still need a full pass:

- Dashboard header and watchlist panel.
- Command Center quote/packet panel.
- Journal table header.
- Market Explorer chart header.

- [ ] **Step 3: Add consistent empty-state copy**

Use these states:

```jsx
<div className="empty-state" role="status">
  <div className="empty-title">Insufficient data</div>
  <div className="empty-copy">Connect Supabase data or run analysis before this panel can calculate.</div>
</div>
```

Avoid:

- Blank table bodies.
- KPI rows that show numeric zeros as if real data exists.
- "Live" badges without actual timestamp/session.

- [ ] **Step 4: Add error recovery buttons where the route fetches data**

For fetch-backed pages, expose a retry path:

```jsx
<button className="btn-secondary" onClick={reloadData}>
  Retry
</button>
```

Do this for:

- Watchlist.
- Journal.
- Analytics.
- Portfolio Risk.

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/impeccableCritiqueContract.test.js
```

Manual route check:

- `/` Dashboard with empty holdings/watchlists.
- `/command-center` before and after quote fetch.
- `/risk` with no holdings.
- `/journal` with no trades.
- `/analytics` with no closed trades.
- `/market` when quote fetch fails.
- `/config` without API key.

---

## Task 6: Finish Watchlist Interaction Hardening

**Files:**

- Modify: `frontend/src/pages/WatchlistPage.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/tests/impeccableCritiqueContract.test.js`

- [ ] **Step 1: Keep undo delete, add durable-state boundary copy**

The current undo toast only changes local state. Until delete is persisted through Supabase, label the state clearly after delete:

```jsx
setToast({
  ticker,
  item,
  message: 'Removed locally. Supabase delete endpoint not connected yet.',
});
```

If a real delete endpoint is added later, change the message to "Removed from Supabase" only after the API succeeds.

- [ ] **Step 2: Make add ticker validation strict and visible**

Normalize:

```js
const normalizedTicker = newTicker.trim().toUpperCase();
const validTicker = /^[A-Z0-9.-]{1,10}$/.test(normalizedTicker);
```

Show:

```jsx
if (!validTicker) {
  setAddError('Use 1-10 ticker characters: A-Z, 0-9, dot, or dash.');
  return;
}
```

- [ ] **Step 3: Preserve modal keyboard behavior**

Keep:

- Escape closes modal.
- Enter submits only when valid.
- Error uses `role="alert"`.
- Close button has `aria-label`.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm run test -- --run frontend/tests/impeccableCritiqueContract.test.js
```

Manual route check:

- Duplicate ticker shows error and keeps modal open.
- Invalid ticker shows error.
- Delete shows undo toast.
- Undo restores row.
- Fully empty table shows empty state.

---

## Task 7: Portfolio Risk Accessibility And Default Drilldown

**Files:**

- Modify: `frontend/src/pages/PortfolioRiskPage.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add selected sector state**

```jsx
const [selectedSector, setSelectedSector] = useState(null);

const activeSector = useMemo(() => {
  if (selectedSector) {
    return risk.sectors.find((sector) => sector.sector === selectedSector) || risk.sectors[0];
  }
  return risk.overLimit[0] || risk.sectors[0] || null;
}, [risk.sectors, risk.overLimit, selectedSector]);
```

- [ ] **Step 2: Make sector bars real buttons**

Each sector row should be keyboard reachable:

```jsx
<button
  type="button"
  className="sector-bar-row"
  onClick={() => setSelectedSector(sector.sector)}
  aria-pressed={activeSector?.sector === sector.sector}
  aria-label={`${sector.sector}: ${sector.weight.toFixed(1)} percent of portfolio, limit ${sector.limit} percent`}
>
```

Ensure icons inside buttons are `aria-hidden="true"`.

- [ ] **Step 3: Show default drilldown instead of idle placeholder**

Below sector bars, render:

```jsx
{activeSector && (
  <section className="risk-drilldown" aria-label={`${activeSector.sector} holdings`}>
    <div className="panel-heading">Showing: {activeSector.sector}</div>
    <div className="panel-subtext">
      {activeSector.weight > activeSector.limit ? 'Highest breach risk' : 'Highest current allocation'}
    </div>
    <table className="risk-holdings-table">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Value</th>
          <th>Weight</th>
          <th>Risk</th>
        </tr>
      </thead>
      <tbody>
        {activeSector.holdings.map((holding) => (
          <tr key={holding.id || holding.ticker}>
            <td>{holding.ticker}</td>
            <td>฿{(Number(holding.shares || 0) * Number(holding.price || 0)).toLocaleString()}</td>
            <td>{activeSector.weight.toFixed(1)}%</td>
            <td>{activeSector.weight > activeSector.limit ? 'Over limit' : 'Within limit'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
)}
```

- [ ] **Step 4: Add text alternative for color-coded risk bars**

Every color state needs adjacent text:

```jsx
<span className="sector-risk-label">
  {isOver ? 'Over limit' : 'Within limit'}
</span>
```

- [ ] **Step 5: Verify**

Manual route check:

- Tab reaches every sector row.
- Screen reader label contains sector, weight, and limit.
- Default drilldown is visible without clicking.
- Empty holdings still shows insufficient-data state.

---

## Task 8: Analytics Filters And Empty-State Consistency

**Files:**

- Modify: `frontend/src/pages/AnalyticsPage.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add compact filters without rebuilding the chart**

Add local filters:

```jsx
const [tickerFilter, setTickerFilter] = useState('ALL');
const [modeFilter, setModeFilter] = useState('ALL');

const filteredClosedTrades = useMemo(() => {
  return closedTrades.filter((trade) => {
    const tickerOk = tickerFilter === 'ALL' || trade.ticker === tickerFilter;
    const modeOk = modeFilter === 'ALL' || trade.mode === modeFilter;
    return tickerOk && modeOk;
  });
}, [closedTrades, tickerFilter, modeFilter]);
```

- [ ] **Step 2: Persist filter state in URL query params**

Use `useSearchParams` so a user returning to Analytics does not lose context:

```jsx
const [searchParams, setSearchParams] = useSearchParams();
```

Keep query keys short:

- `ticker`
- `mode`

- [ ] **Step 3: Recalculate stats from filtered trades**

Replace stats source from `closedTrades` to `filteredClosedTrades` so KPI row and history table agree.

- [ ] **Step 4: Empty-state copy differentiates no data vs no match**

Use:

```jsx
{closedTrades.length === 0 ? 'ไม่มี trade ที่ปิดแล้วใน Supabase' : 'ไม่มี trade ที่ตรงกับ filter นี้'}
```

- [ ] **Step 5: Verify**

Manual route check:

- No closed trades shows insufficient data.
- Filter with no matching trades shows no-match state.
- Query params preserve filter after refresh.

---

## Task 9: Command Center And Market Explorer State Clarity

**Files:**

- Modify: `frontend/src/pages/CommandCenterPage.jsx`
- Modify: `frontend/src/pages/MarketExplorerPage.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Command Center quote panel must distinguish display quote vs gate quote**

Use explicit labels:

```jsx
<span className="data-stamp">Quote packet + decision gate</span>
```

For failed gate:

```jsx
<div className="gate-warning" role="alert">
  Price gate failed. Enter manual Tier 1 price before considering execution.
</div>
```

- [ ] **Step 2: Market Explorer labels `/api/price/:ticker` as display quote**

Use:

```jsx
<span className="data-stamp">Display quote only, not execution gate</span>
```

Do not show Market Explorer price in green/red as if it passed the Current Price Acceptance Gate.

- [ ] **Step 3: Add retry state for quote failures**

Render a retry button when quote fetch fails:

```jsx
<button className="btn-secondary" onClick={loadPrice}>
  Retry quote
</button>
```

- [ ] **Step 4: Verify**

Manual route check:

- Command Center failed gate shows manual Tier 1 prompt.
- Market Explorer says display quote only.
- Failed quote does not leave stale price on screen.

---

## Task 10: Keyboard Shortcut UX Polish

**Files:**

- Modify: `frontend/src/components/KeyboardShortcuts.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Move inline styles into CSS classes**

Create CSS classes:

```css
.shortcut-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(var(--black-rgb), 0.72);
}

.shortcut-dialog {
  width: min(100%, 420px);
  padding: 24px;
}

.shortcut-kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 2px 8px;
  background: var(--surface);
}
```

- [ ] **Step 2: Replace arbitrary z-index**

Current `zIndex: 9999` should become a semantic layer class such as `z-index: 80` or a token:

```css
:root {
  --z-modal: 80;
  --z-tooltip: 90;
}
```

- [ ] **Step 3: Add route entry shortcut hints where helpful**

Do not add noisy visible shortcut text everywhere. Show `?` help in the modal and optionally subtle `<kbd>` hints in Command Center input only.

- [ ] **Step 4: Verify**

Manual route check:

- `?` opens help.
- Escape closes help.
- `g d`, `g r`, `g m`, `g a`, `g j`, `g v`, `g c` navigate.
- Help dialog does not trap pointer or keyboard unexpectedly.

---

## Task 11: Visual Route Verification

**Files:**

- No code required unless verification exposes defects.

- [ ] **Step 1: Run automated frontend gates**

Run:

```bash
cd frontend && npm run test -- --run
cd frontend && npm run lint
cd frontend && npm run build
```

Expected:

- Tests pass.
- Lint has no new warnings from touched files.
- Build passes. Sentry sourcemap warnings are acceptable only if they match the existing missing-token behavior.

- [ ] **Step 2: Start local app**

Run:

```bash
cd backend && npm start
cd frontend && npm run dev -- --host 127.0.0.1
```

Use another port if one is busy.

- [ ] **Step 3: Browser smoke every route**

Routes:

- `/`
- `/command-center`
- `/risk`
- `/market`
- `/journal`
- `/analytics`
- `/config`

Check:

- No overlapping text at desktop width.
- Sidebar remains readable.
- Empty states render as intended.
- Data stamps visible on runtime data panels.
- Focus ring visible on buttons, inputs, selects, route links.
- No decorative glow or glass panels dominate data.

- [ ] **Step 4: Mobile smoke**

Check at 390px width:

- Sidebar/app shell does not cover content.
- Tables scroll horizontally or collapse intentionally.
- Buttons do not wrap into unreadable labels.
- Modals/drawers fit and close with Escape/close button.

- [ ] **Step 5: Re-run detector**

Run:

```bash
node /Users/nopparuj/.agents/skills/impeccable/scripts/detect.mjs --json frontend/src
```

Expected:

- No gradient text.
- No decorative glassmorphism containers.
- No bouncy easing.
- No layout-width transition warnings.
- Any remaining font warning is documented as accepted only if it points to the chosen product font, not stale `Inter`.

---

## Acceptance Criteria

- Every existing Impeccable critique item is either fixed, already fixed and verified, or explicitly documented as accepted product trade-off.
- No runtime financial screen displays fake live confidence, stale-looking KPIs without source labels, or blank table bodies.
- Watchlist destructive action is recoverable.
- Scenario Planner cannot save invalid trade math.
- Config persistence boundary is visible and does not store secrets.
- Product UI stays dark terminal: flat, bordered, high-contrast, sparse semantic color.
- Detector has no hard anti-pattern hits.
- `cd frontend && npm run test -- --run` passes.
- `cd frontend && npm run lint` passes or reports only pre-existing warnings outside touched files.
- `cd frontend && npm run build` passes.
- Browser route smoke passes for desktop and mobile.

## Rollback

All tasks are frontend-only except tests and this plan. Rollback by reverting touched files:

- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/src/components/ui/card.jsx`
- `frontend/src/components/ui/badge.jsx`
- `frontend/src/components/KeyboardShortcuts.jsx`
- `frontend/src/pages/*.jsx` files changed by tasks
- `frontend/tests/impeccableCritiqueContract.test.js`

No database rollback is required.

