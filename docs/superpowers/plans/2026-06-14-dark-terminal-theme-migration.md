# Dark Terminal Theme Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the logged-in MyPortStock app from the current light dashboard styling to the canonical Dark Terminal Product UI while preserving readability and dashboard density.

**Architecture:** Make `docs/DESIGN.md` the single source of truth and implement the visual migration through shared CSS tokens first. Then repair page-level surfaces that rely on legacy light assumptions, verify with automated checks, and inspect the visible app in a browser.

**Tech Stack:** React 19, Vite 8, plain CSS in `frontend/src/index.css`, Tailwind utility classes in page components, Vitest, ESLint.

---

## File Structure

- Create `frontend/tests/themeContract.test.js`: behavior-focused theme contract test for the public CSS custom properties that drive the app theme.
- Modify `frontend/src/index.css`: primary theme tokens, app shell, panels, tables, forms, drawer, motion, and responsive dark terminal surfaces.
- Modify `frontend/src/components/ui/button.jsx`: remove default shadcn shadow classes that conflict with flat-by-default rules.
- Modify `frontend/src/components/ui/input.jsx`: remove default shadcn shadow classes and align focus styling with dark fields.
- Modify `frontend/src/components/PixelTradingFloor.jsx`: reduce decorative shadows/glow and align overlay panels with dark tokens.
- Modify `frontend/src/pages/CommandCenterPage.jsx`: replace undefined `--fin-success`, `--fin-danger`, and `--border-color` aliases or add compatibility aliases in CSS.
- Verify `docs/DESIGN.md` remains the design source of truth and `frontend/DESIGN.md` remains a pointer/checklist.

## Task 0: TDD Theme Contract Tracer Bullet

**Files:**
- Create: `frontend/tests/themeContract.test.js`
- Test: `frontend/tests/themeContract.test.js`

- [ ] **Step 1: Write the failing theme contract test**

Create `frontend/tests/themeContract.test.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, '../src/index.css'), 'utf8');

const rootBlock = css.match(/:root\s*\{(?<body>[\s\S]*?)\n\s*\}/)?.groups?.body ?? '';

function tokenValue(name) {
  const match = rootBlock.match(new RegExp(`${name.replaceAll('-', '\\-')}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

describe('Dark Terminal Product UI theme contract', () => {
  test('exposes dark terminal tokens as the shared app theme', () => {
    expect(tokenValue('--background')).toBe('#0a0a0a');
    expect(tokenValue('--foreground')).toBe('#ededed');
    expect(tokenValue('--bg-void')).toBe('#0a0a0a');
    expect(tokenValue('--bg-shell')).toBe('#111111');
    expect(tokenValue('--bg-panel')).toBe('#171717');
    expect(tokenValue('--bg-panel-solid')).toBe('#0f0f0f');
    expect(tokenValue('--surface')).toBe('#171717');
    expect(tokenValue('--border-subtle')).toBe('#262626');
    expect(tokenValue('--text-primary')).toBe('#ededed');
    expect(tokenValue('--text-secondary')).toBe('#a3a3a3');
    expect(tokenValue('--brand-primary')).toBe('#10b981');
    expect(tokenValue('--accent-primary')).toBe('#60a5fa');
  });

  test('keeps compatibility aliases for existing page code', () => {
    expect(tokenValue('--fin-success')).toBe('var(--fin-profit)');
    expect(tokenValue('--fin-danger')).toBe('var(--fin-loss)');
    expect(tokenValue('--border-color')).toBe('var(--border-subtle)');
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
npm run test --workspace=frontend -- themeContract.test.js --run
```

Expected: FAIL because the current root tokens still expose the light dashboard theme.

- [ ] **Step 3: Implement only Task 1 token changes**

Complete Task 1 below.

- [ ] **Step 4: Run the test to verify GREEN**

Run:

```bash
npm run test --workspace=frontend -- themeContract.test.js --run
```

Expected: PASS.

## Task 1: Shared Dark Terminal Tokens

**Files:**
- Modify: `frontend/src/index.css:7-80`

- [ ] **Step 1: Replace the root token block**

Replace the current `:root` variables with this token block inside `@layer base`:

```css
  :root {
    --bg-slate-rgb: 10, 10, 10;
    --text-inverse-rgb: 237, 237, 237;
    --black-rgb: 0, 0, 0;
    --muted-rgb: 115, 115, 115;

    --background: #0a0a0a;
    --foreground: #ededed;
    --surface: #171717;
    --surface-hover: #1f1f1f;
    --border: #262626;
    --border-hover: #333333;

    --status-success-rgb: 52, 211, 153;
    --status-success: #34d399;
    --status-success-bg: rgba(var(--status-success-rgb), 0.12);

    --status-danger-rgb: 248, 113, 113;
    --status-danger: #f87171;
    --status-danger-bg: rgba(var(--status-danger-rgb), 0.12);

    --status-warning-rgb: 250, 204, 21;
    --status-warning: #facc15;
    --status-warning-bg: rgba(var(--status-warning-rgb), 0.12);

    --muted: #737373;

    --bg-void: #0a0a0a;
    --bg-shell: #111111;
    --bg-panel: #171717;
    --bg-panel-hover: #1f1f1f;
    --bg-panel-solid: #0f0f0f;
    --border-subtle: #262626;
    --border-medium: #333333;
    --border-strong: #525252;
    --border-color: var(--border-subtle);

    --text-primary: #ededed;
    --text-secondary: #a3a3a3;
    --text-muted: #737373;
    --text-inverse: #0a0a0a;

    --brand-rgb: 16, 185, 129;
    --brand-primary: #10b981;
    --brand-dark: #059669;
    --brand-glow: rgba(var(--brand-rgb), 0.12);

    --accent-rgb: 96, 165, 250;
    --accent-primary: #60a5fa;
    --accent-glow: rgba(var(--accent-rgb), 0.16);
    --accent-primary-dim: rgba(var(--accent-rgb), 0.1);

    --fin-profit: #34d399;
    --fin-success: var(--fin-profit);
    --fin-profit-dim: rgba(var(--status-success-rgb), 0.12);
    --fin-loss: #f87171;
    --fin-danger: var(--fin-loss);
    --fin-loss-dim: rgba(var(--status-danger-rgb), 0.12);
    --fin-warning: #facc15;
    --fin-warning-dim: rgba(var(--status-warning-rgb), 0.12);

    --radius-lg: 12px;
    --radius-md: 8px;
    --radius-sm: 8px;
    --radius-xs: 6px;

    --shadow-glass: none;
    --shadow-sm: none;
    --blur-glass: none;

    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --transition: background-color 0.18s var(--ease-out-quart), border-color 0.18s var(--ease-out-quart), color 0.18s var(--ease-out-quart), transform 0.18s var(--ease-out-quart);

    --nav-width: 260px;
  }
```

- [ ] **Step 2: Update the body background**

Replace the existing `body` background image block with:

```css
    background-color: var(--bg-void);
    background-image:
      linear-gradient(to right, rgba(128, 128, 128, 0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(128, 128, 128, 0.035) 1px, transparent 1px),
      radial-gradient(ellipse at 20% 0%, rgba(var(--brand-rgb), 0.08) 0%, transparent 42%);
    background-size: 24px 24px, 24px 24px, auto;
```

- [ ] **Step 3: Verify no light root tokens remain**

Run:

```bash
rg -n "#f1f4f2|#ffffff|#f8faf9|#e2e8e5|#cbd5d1|#84cc16" frontend/src/index.css
```

Expected: no matches in the `:root` token block. Matches are acceptable only in comments explaining removed legacy colors, but this plan should not add such comments.

## Task 2: App Shell and Core Surfaces

**Files:**
- Modify: `frontend/src/index.css:111-260`

- [ ] **Step 1: Darken app shell and content**

Update the app shell selectors to:

```css
.app-root {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  background: var(--bg-void);
  color: var(--text-primary);
}

.app-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.side-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  width: var(--nav-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  background: var(--bg-shell);
  border-right: 1px solid var(--border-subtle);
}
```

- [ ] **Step 2: Align brand mark and active nav**

Update these selectors:

```css
.brand-dot {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-dot::after {
  content: '';
  width: 12px;
  height: 12px;
  background: var(--bg-void);
  border-radius: 2px;
}

.side-link.active {
  background: rgba(var(--brand-rgb), 0.12);
  color: var(--brand-primary);
  border: 1px solid rgba(var(--brand-rgb), 0.24);
}
```

- [ ] **Step 3: Keep cards flat**

Update shared panel classes:

```css
.glass-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: none;
}

.glass-card {
  background: var(--bg-panel-solid);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: none;
}
```

- [ ] **Step 4: Verify app shell uses dark tokens**

Run:

```bash
rg -n "side-nav|glass-panel|glass-card|side-link.active" frontend/src/index.css
```

Expected: selectors exist and use `--bg-shell`, `--bg-panel`, `--bg-panel-solid`, `--border-subtle`, and `--brand-primary`.

## Task 3: Tables, Forms, and Drawer Readability

**Files:**
- Modify: `frontend/src/index.css:367-760`

- [ ] **Step 1: Make table headers dark and readable**

Update table header and row states:

```css
.watchlist-table th {
  padding: 10px 24px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-medium);
  position: sticky;
  top: 0;
  background: var(--bg-panel-solid);
}

.watchlist-table td {
  padding: 14px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.watchlist-row:hover {
  background: var(--bg-panel-hover);
}

.watchlist-row.active-row {
  background: rgba(var(--brand-rgb), 0.1);
  outline: 1px solid rgba(var(--brand-rgb), 0.35);
  outline-offset: -1px;
}
```

- [ ] **Step 2: Align input and select fields**

Update form controls:

```css
.ticker-input,
.form-input,
.mode-select {
  background: var(--bg-panel-solid);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

.ticker-input:focus,
.form-input:focus,
.mode-select:focus {
  border-color: var(--brand-primary);
  outline: none;
}

.ticker-input::placeholder,
.form-input::placeholder {
  color: var(--text-muted);
}
```

- [ ] **Step 3: Keep drawer dark terminal**

Update scenario drawer selectors:

```css
.scenario-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(var(--black-rgb), 0.72);
  animation: fadeIn 0.2s ease;
}

.scenario-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 520px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-subtle);
  animation: slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
```

- [ ] **Step 4: Verify light table colors are gone**

Run:

```bash
rg -n "rgba\\(var\\(--bg-slate-rgb\\)|rgba\\(var\\(--text-inverse-rgb\\), 0\\.03\\)|rgba\\(var\\(--text-inverse-rgb\\), 0\\.04\\)" frontend/src/index.css
```

Expected: no matches in table, row, drawer, or form selectors.

## Task 4: Component-Level Shadow Cleanup

**Files:**
- Modify: `frontend/src/components/ui/button.jsx`
- Modify: `frontend/src/components/ui/input.jsx`
- Modify: `frontend/src/components/PixelTradingFloor.jsx`

- [ ] **Step 1: Remove shadcn shadow classes from buttons**

In `frontend/src/components/ui/button.jsx`, replace the `buttonVariants` variant strings with:

```jsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
```

- [ ] **Step 2: Remove shadcn shadow class from inputs**

In `frontend/src/components/ui/input.jsx`, replace the class string with:

```jsx
'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
```

- [ ] **Step 3: Reduce PixelTradingFloor decorative shadows**

In `frontend/src/components/PixelTradingFloor.jsx`, replace these style values:

```jsx
border: '1px solid var(--border-color)',
boxShadow: 'inset 0 0 24px rgba(var(--black-rgb),0.55)',
```

Replace overlay card shadows with:

```jsx
boxShadow: 'none',
```

Replace the typing pulse keyframes with a subtle opacity pulse:

```jsx
const pulseKeyframes = `
  @keyframes pulse-${agent.id} {
    0% { opacity: 0.72; }
    100% { opacity: 1; }
  }
`;
```

- [ ] **Step 4: Verify no component shadows remain in targeted files**

Run:

```bash
rg -n "shadow|boxShadow|0 0 16px|0 4px 12px|0 2px 4px" frontend/src/components/ui/button.jsx frontend/src/components/ui/input.jsx frontend/src/components/PixelTradingFloor.jsx
```

Expected: no matches except `boxShadow: 'none'` and the floor inset shadow if retained for image legibility.

## Task 5: Automated Verification

**Files:**
- No production file edits.

- [ ] **Step 1: Run frontend lint**

Run:

```bash
npm run lint --workspace=frontend
```

Expected: command exits `0`.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
npm run test --workspace=frontend -- --run
```

Expected: command exits `0`.

- [ ] **Step 3: Run frontend build**

Run:

```bash
npm run build --workspace=frontend
```

Expected: command exits `0` and Vite reports a successful production build.

- [ ] **Step 4: Run full frontend standard check if earlier steps pass**

Run:

```bash
npm run check:frontend-standard --workspace=frontend
```

Expected: command exits `0`.

## Task 6: Browser Verification

**Files:**
- No production file edits unless visual verification reveals concrete issues.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev --workspace=frontend
```

Expected: Vite serves the app on `http://localhost:5173/` or the next available port.

- [ ] **Step 2: Inspect the signed-out auth page**

Open the dev URL in a browser.

Expected:
- Auth page remains dark terminal.
- Header, grid texture, emerald accent, and primary CTA still look consistent.
- Text remains readable.

- [ ] **Step 3: Inspect the signed-in dashboard**

Use the existing signed-in browser session.

Expected:
- Sidebar, main background, panels, table, empty state, and AI input panel are dark terminal.
- No white dashboard panels remain.
- Active nav uses emerald sparingly.
- Numeric values are readable and aligned.

- [ ] **Step 4: Inspect secondary pages**

Navigate to:

```text
/
/risk
/market
/command-center
/journal
/analytics
/config
```

Expected:
- Each route inherits dark shell and dark panels.
- Inputs, tables, badges, modals, drawers, and empty states are readable.
- Any remaining page-local light surface is logged with exact route and selector for follow-up.

## Self-Review

- **Spec coverage:** This plan covers the canonical docs decision, shared token migration, app shell, core panels, tables, forms, drawers, component shadows, automated checks, and browser verification.
- **Placeholder scan:** No `TBD`, `TODO`, or open-ended "handle later" instructions remain.
- **Type consistency:** CSS variables match `docs/DESIGN.md` and `frontend/DESIGN.md`; compatibility aliases cover existing `--fin-success`, `--fin-danger`, and `--border-color` usage.
