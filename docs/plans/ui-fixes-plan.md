# UI/UX Critique Fixes Plan

This plan executes the findings from the Impeccable critique to align the UI with the DESIGN.md template.

## Tasks

### Task 1: Remove Legacy Visual Noise (CSS)
**Context:** `frontend/src/index.css` contains leftover styles that violate the "Flat-By-Default" rule in `DESIGN.md`. 
**Requirements:**
- Remove all generic `box-shadow` properties from `.card`, `.drawer`, or generic containers.
- Retain ambient glows if they are explicitly using glow variables like `--brand-glow`.
- Remove the thick side-tab border (`border-right: 1px solid var(--border-subtle)`) from cards/drawers to avoid the "AI-generated" look.

### Task 2: Fix Layout Thrashing on Progress Bars
**Context:** Progress bars animate the `width` property directly, causing layout thrashing (flagged by detector).
**Requirements:**
- Modify `frontend/src/index.css` rules for `.sector-bar-fill` and `.stop-bar-fill` to use `transform: scaleX(...)` with `transform-origin: left` instead of animating `width`.
- Ensure the React components rendering these bars pass the percentage as a CSS custom property (e.g., `--fill-percent`) so `scaleX()` can utilize it, OR use inline styles setting `transform: scaleX(0.7)`. Note: If React is rendering inline `width: 70%`, change it to `transform: scaleX(0.7)`. 
- Check `frontend/src/pages/DashboardPage.jsx` or relevant components for where these progress bars are rendered.

### Task 3: Reduce Navigation Cognitive Load
**Context:** The main sidebar navigation in `frontend/src/App.jsx` has 7 top-level links, causing cognitive overload.
**Requirements:**
- Refactor the sidebar navigation in `frontend/src/App.jsx`.
- Group the links into 2 logical categories: "Main" (Dashboard, Market, Analytics, Journal) and "Utilities/System" (Command Center, Risk, Config). 
- Introduce subtle section headers (e.g., small uppercase labels) to distinguish these groups, reducing the visual weight of the overall list.
- Maintain the exact same routing and icons.
