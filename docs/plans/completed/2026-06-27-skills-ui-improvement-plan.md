---
status: Completed
updated_at: "2026-07-27"
owner: AI Agent / Developer
---

# Roadmap: UI/UX Improvement with UI Skills

This roadmap outlines how we will systematically apply industry-standard design engineering skills from the **UI Skills Library** to upgrade the visual quality, interactivity, accessibility, and performance of the **MyPortStock** dashboard.

---

## 1. Selected Skills & Visual Direction

We are targeting a **Premium Dark Financial Terminal** aesthetic. The dashboard must feel dense yet legible, alive but not distracting, and highly responsive.

| Selected Skill | Focus Area | Application to MyPortStock |
| :--- | :--- | :--- |
| **`pbakaus/impeccable`** | Grid, Density & Visual Quality | Enforce strict column alignment, clean up card borders, and fix vertical spacing overlaps. |
| **`ibelick/baseline-ui`** | Component Standards & Styles | Replace custom legacy elements with accessible `shadcn/ui` components, standardizing Focus rings. |
| **`jakubkrehel/make-interfaces-feel-better`** | Micro-animations & Motion | Add scale presses to buttons, smooth spring transitions on drawers, and hover state elevations. |
| **`jakubkrehel/oklch-skill`** | Dark Palette & Semantic Colors | Re-anchor colors using OKLCH variables to ensure uniform color perception and high text contrast. |
| **`addyosmani/web-quality-audit`** | Web Performance & Skeletons | Optimise client-side layout shifts (CLS) and structure loading skeleton states. |

---

## 2. Action Plan by Phase

### Phase 1: Theme & Colors (`oklch-skill` & `impeccable`)
We will unify our colors using the OKLCH model to optimize contrast and reduce visual fatigue in dark mode.
* **Semantic Profit/Loss Indicators:** Standardize Green/Red indicators. OKLCH guarantees that green and red have the exact same perceived lightness against the void background, avoiding "blinding greens" or "dull reds".
* **Card & Panel Accents:** Apply a clean `oklch(22% 0.01 240)` for dark surface panels and `oklch(16% 0.02 240)` for page backgrounds.
* **Tasks:**
  - [x] Define OKLCH tokens at the top of [tokens.css](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/styles/tokens.css).
  - [x] Refactor `.semantic-positive` and `.semantic-negative` classes to use the new tokens.

### Phase 2: Component Architecture & A11y (`baseline-ui` & `fixing-accessibility` - Completed/Pending)
Clean up the remaining legacy DOM structures and enforce clean keyboard navigation flows.
* **Component Replacement:** Systematically replace custom select elements in the watchlist and config with shadcn's Select/Dropdown primitives.
* **Keyboard Navigation Focus States:** Standardize focus outlines. Any interactive element (`button`, `input`, `select`, `a`) must have a unified, high-contrast focus outline offset (`outline-offset-2`).
* **Tasks:**
  - [x] Add global `:focus-visible` styling to [base.css](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/styles/base.css) using a brand OKLCH color token.
  - [x] Audit keyboard accessibility for the main `DataTable` rows to ensure they can be selected using arrow keys or Tab + Enter.

### Phase 3: Tactility & Micro-Interactions (`make-interfaces-feel-better` - Completed/Pending)
Give the application a tactile, responsive feel. Let the interface adapt physically to cursor movements.
* **Spring Transitions:** Use spring-like timing curves (`cubic-bezier(0.25, 1, 0.5, 1)`) for drawers sliding in from the right.
* **Active Press Feedback:** Standardize the small physical click depth we implemented on all primary and secondary buttons (`active:scale-[0.98] active:translate-y-[0.5px]`).
* **Tasks:**
  - [x] Apply tactile hover states (subtle border color highlights + opacity shifts) on table rows.
  - [x] Polish dynamic transitions when showing inline warning alerts.
  - [x] Audit all buttons (`btn-secondary`, `btn-analyze`, `btn-send-ai`, `btn-icon`) to ensure they support smooth transitions (180ms ease-out) and physical press scale (`active:scale-[0.98] active:translate-y-[1px]`) in [pages.css](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/styles/pages.css).

### Phase 4: Performance & Skeletons (`web-quality-audit` - Completed/Pending)
Ensure the application is fast, stable, and minimizes layout shifting when asynchronous Supabase queries load.
* **Skeleton Matching:** Loading skeletons must match the dimensions and margins of the actual components they replace to prevent layout jumping (Cumulative Layout Shift - CLS).
* **Tasks:**
  - [x] Update the `Skeleton` components for `HoldingsTable` and `WatchlistPanel` to align exactly with the real headers and margins.
  - [x] Audit and wire up all page components (such as Watchlist add/delete/undo) to call actual Supabase database APIs instead of staying local-only mock-ups.
  - [ ] Implement lazy-loading imports for larger chart components to speed up First Contentful Paint (FCP).

---

## 3. Implementation Schedule

1. **Sprint 1 (Color & Layout):** Polish [tokens.css](file:///Users/nopparuj/my-agents/MyPortStock/frontend/src/styles/tokens.css) color variables, clean up card margins, and refine row paddings.
2. **Sprint 2 (Interactions & A11y):** Apply keyboard accessibility controls, hover states, and smooth spring timings.
3. **Sprint 3 (Performance & Skeletons):** Match Skeletons layout, split packages, and verify build bundles.

---

## 4. Verification & Testing

Every task will be verified using:
1. **Vitest Unit Checks:** Run `npm test` to keep existing components and router logic green.
2. **Local Production Build:** Verify using `npm run build` to prevent bundle warnings.
3. **Browser Execution:** Open locally with `npm run dev` and perform keyboard-only navigation to ensure compliance.
