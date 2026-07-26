# UX/UI Polish & Alignment Plan

This plan addresses all UX/UI inconsistencies, layout misalignments, currency formatting bugs, and spacing issues across the entire MyPortStock application. It incorporates the principles of open agent design skills like `design-taste-frontend`, `redesign-existing-projects`, and `web-design-guidelines`.

---

## 1. Design Inference (Reading the Room)

- **Page Kind:** Financial Analytics Terminal & Active Trade Orchestrator.
- **Audience:** Design-conscious retail investors and quantitative traders.
- **Vibe Language:** Sleek, high-contrast dark tech theme (Void background, Emerald accents, tactile spring physics).
- **Core Dials:**
  * `DESIGN_VARIANCE: 6` (Professional, clean, structured, non-chaotic layout)
  * `MOTION_INTENSITY: 4` (Subtle transitions, tactile active states, no distracting loops)
  * `VISUAL_DENSITY: 7` (Data-cockpit layout; compact but legible and structured)

---

## 2. Identified Inconsistencies & Issues (Audit)

### A. Currency & Price Mismatches (Highest Priority)
- **Watchlist Panel (`WatchlistPanel.jsx`):** Hardcoded to Baht (`฿`) for all items (e.g. showing `฿391.74` for US stock `ALAB`).
- **Ticker Detail Page (`TickerDetailPage.jsx`):** Hardcoded to USD (`$`) for all items (e.g. showing `$60.00` for Thai stock `CPALL.BK`).
- **Negative Sign Placement:** Formats as `฿-15.00` or `$-15.00` instead of `-฿15.00` or `-$15.00`. (Partially fixed in HoldingsTable; needs system-wide adoption).

### B. Typography & Grid Hierarchy
- **Decimal Bloat:** Numeric values (like shares or fractions) render raw floating-point strings in some tables, causing layout stretching.
- **Tabular Figures:** Column numbers alignment is inconsistent due to proportional fonts. We must ensure numbers use monospace fonts (`font-family: var(--font-mono)`) or tabular-nums layout.
- **Eyebrow Restraint:** Excess uppercase tracking labels used consecutively.

### C. Shape & Border Radius Consistency
- **Mixed Radii:** Buttons are `rounded-lg` (8px) while cards are `var(--radius-md)` (8px) and panels are `var(--radius-lg)` (12px). Focus states and active buttons should have standardized shapes.
- **Tactile Feedback:** Buttons lack micro-scale animations (`active:scale-[0.98] active:translate-y-[1px]`) and transitions.

### D. Spacing & Responsive Viewports
- **Flex Percentage Math:** Hand-rolled percentage calculations used in layout headers.
- **Mobile Collapse:** Some grids collapse dynamically without proper responsive padding, leading to cramped margins on small screen sizes.

---

## 3. Step-by-Step Implementation Tasks

### Phase 1: Global Currency & Price Formatting (Completed)
- [x] Update [HoldingsTable.jsx](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/components/dashboard/HoldingsTable.jsx) to support ticker-aware `formatCurrency` and `semanticValue`.
- [x] Modify [WatchlistPanel.jsx](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/components/dashboard/WatchlistPanel.jsx) to determine currency based on ticker suffix (e.g. `.BK` for THB, else USD).
- [x] Modify [TickerDetailPage.jsx](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/pages/TickerDetailPage.jsx) to dynamically select `$` or `฿` based on the active ticker.

### Phase 2: Typography & Numeric Presentation (Completed)
- [x] Standardize numbers, shares, prices, and changes in [WatchlistPanel.jsx](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/components/dashboard/WatchlistPanel.jsx), [TickerDetailPage.jsx](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/pages/TickerDetailPage.jsx), and [JournalTradeTable.jsx](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/components/journal/JournalTradeTable.jsx) to use monospace fonts.
- [x] Ensure all decimal prices are formatted to exactly 2 decimals, and shares to at most 4 decimals.
- [x] Define `--font-mono` globally in root of [tokens.css](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/styles/tokens.css) to ensure standard fallback.
- [x] Prevent orphan words in banners and alerts by adding `text-wrap: balance` or `text-wrap: pretty`.

### Phase 3: Interactive Polish & Tactility (Completed)
- [x] Audit all buttons (`btn-secondary`, `btn-analyze`, `btn-send-ai`, `btn-icon`) to ensure they support smooth transitions (180ms ease-out) and physical press scale (`active:scale-[0.98] active:translate-y-[1px]`) in [pages.css](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/styles/pages.css).
- [x] Add loading skeletons that perfectly mirror the final layout structure.

### Phase 4: Scroll & Grid Alignment (Completed)
- [x] Unify column ratios of primary and secondary dashboard grids to ensure perfect vertical division line alignment.
- [x] Add flex-grow and internal scrolling (`overflow-y: auto`) to CommandCenter and Ticker Detail pages on desktop to prevent content truncation.
- [x] Clean up mobile scrolling by removing double padding bottom, and override all page components to `overflow-y: visible !important` to ensure natural browser window scrolling on mobile screens.

---

## 4. Verification Methods

1. **Local Test Suite:** Run `npm test` after each change to verify Vitest tests remain green.
2. **Visual Audit via Playwright:** Launch `npx playwright-cli open` to navigate through `/`, `/journal`, and `/ticker/:symbol` to verify typography, alignment, and formatting visually.
