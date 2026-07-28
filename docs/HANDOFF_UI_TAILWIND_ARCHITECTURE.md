# Handoff: Tailwind CSS UI Architecture

**Baseline:** `develop@055a92c`

**Tailwind:** `v3.4.x`

**Migration strategy:** incremental replacement with Layout + Token contracts

## TL;DR

The frontend now uses Tailwind utilities for component and page styling while preserving the existing component APIs, business behavior, accessibility semantics, responsive topology, and `data-theme` behavior. The previous hybrid claim that the UI required the legacy page stylesheets is obsolete.

The only global CSS entry points are:

```text
frontend/src/index.css
frontend/src/styles/tokens.css
frontend/src/styles/base.css
frontend/src/styles/animations.css
```

`App.css`, `utilities.css`, `layout.css`, `components.css`, and `pages.css` have no consumers and are removed.

## Architecture

### Token ownership

CSS custom properties in `styles/tokens.css` are the source of truth. Tailwind maps those properties to semantic utilities in `tailwind.config.js`, including:

- surfaces: `bg-background`, `bg-shell`, `bg-panel`, `bg-surface`
- text: `text-foreground`, `text-text-secondary`, `text-text-muted`
- borders and focus: `border-border`, `border-border-subtle`, `ring-ring`
- financial status: `text-fin-profit`, `text-fin-loss`, `text-fin-warning`, `text-fin-info`
- visualization agents: `text-data-agent-*`, `bg-data-agent-*`

JSX must not use raw hex values, raw Tailwind palette colors, numeric `rgb`/`rgba`, or dynamically assembled Tailwind class names.

### Theme behavior

`PreferencesContext` resolves `light`, `dark`, and `system` preferences and writes the resolved result to `html[data-theme]`. Base colors use semantic variables, not Tailwind's `dark:` color variants. System theme is contracted in both OS light and OS dark modes.

### Component styling

- Shared primitives retain their public props and `className` extension points.
- Conditional styling uses `cn()`, `cva()`, or static class maps.
- Runtime geometry may use inline CSS custom properties through `cssVars()`. This exception covers charts, progress values, Pixi/canvas placement, and similar data-derived geometry.
- Static layout and color declarations belong in Tailwind classes.
- Motion communicates state and respects `motion-reduce` or the global reduced-motion fallback.

### CSS ownership

- `index.css`: import graph only
- `tokens.css`: Tailwind layers, semantic variables, and global token definitions
- `base.css`: document-level defaults and shared browser normalization
- `animations.css`: keyframes, theme transitions, and reduced-motion behavior

Adding another CSS file or restoring a deleted legacy file fails the Tailwind governance gate.

## Verification model

Pixel-diff screenshots are retained only as review artifacts. CI contracts observable behavior instead:

- semantic tokens must match exactly
- critical geometry tolerance is at most `±2px`
- responsive topology must remain unchanged
- page-level horizontal overflow and unintentional clipping are forbidden
- Axe includes real color-contrast checks
- Light, Dark, System-Light, and System-Dark are exercised

Active application routes are tested through the real dev-auth shell. Landing, Onboarding, Watchlist, and AI Floor are preserved without adding production routes and are tested through `ui-contract-harness.html`.

The shell geometry and dark semantic-token values were captured directly from `055a92c` and are stored in `frontend/e2e/baselines/develop-055a92c.ts`. The contract checks navigation, main content, header, and page-heading geometry at all four required viewports with a maximum `±2px` tolerance.

## Governance and test entry points

```bash
npm run format:check
npm run lint
npm run verify:architecture
npm run verify:tailwind
npm run typecheck
npm run test:unit
npm run build
npx playwright test e2e/tailwindThemeContract.spec.ts --project=chromium
npx playwright test e2e/impeccableUiLayoutAudit.spec.ts --project=chromium
npx playwright test e2e/orphanSurfaceContract.spec.ts --project=chromium
```

Latest verified worktree result:

- frontend quality gate: 41 files, 205 unit/contract tests passed
- active-route semantic theme and develop topology contract: 40/40 passed
- active-route layout, overflow, interaction, and Axe audit: 40/40 passed
- Landing, Onboarding, Watchlist, and AI Floor harness: 32/32 passed
- production build passed; the existing large-chunk advisory remains non-blocking
- lint passed with three pre-existing `PreferencesContext.jsx` warnings and no errors

The architecture and completion contracts reject:

- deleted legacy CSS filenames or imports
- legacy-selector consumers
- raw colors in source JSX/TSX
- direct `style={{ ... }}` declarations
- non-token inline style values
- malformed or dynamically constructed Tailwind classes
- CSS files outside the approved global set

## Rollback boundary

The migration is organized by ownership: foundation, shared primitives, shell, active routes, and orphan surfaces. A regression should be reverted at the owning surface or primitive rather than restoring a legacy stylesheet globally.
