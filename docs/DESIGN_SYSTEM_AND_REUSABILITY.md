# MyPortStock System Design & Reusable Component Specification

> **Mandatory Agent Instructions:** Every AI agent working on frontend code, UI components, styles, or page layouts MUST read and strictly adhere to this document. Zero code duplication, zero hardcoded hex styles, and 100% component reusability are strictly enforced.

---

## 1. Core Reusability Mandates (Anti-Duplication Standard)

### Rule 1: DRY (Don't Repeat Yourself)
- If a UI pattern, layout snippet, table format, card, or modal is used in **2 or more places**, it MUST be extracted into a shared component under `frontend/src/components/ui/` or `frontend/src/components/shared/`.
- Never copy-paste JSX code blocks between pages or feature modules.

### Rule 2: Single Source of Truth for Design Tokens
- **Colors & Surfaces:** Always use Tailwind theme tokens (`bg-surface`, `bg-background`, `text-foreground`, `text-muted`, `border-border`).
- **Hardcoded Colors Forbidden:** Dynamic hex strings (`#1e293b`, `#000`) or arbitrary inline styles (`style={{ color: '#fff' }}`) are strictly forbidden.
- **Financial Signals:** Always use financial data classes (`text-fin-buy`, `text-fin-sell`, `text-fin-warning` or `--fin-profit`, `--fin-loss`, `--fin-warning`).

### Rule 3: Variant-Driven Styling with `cva()`
- Stateful components (e.g. `StatusBadge`, `MetricCard`, `Button`) MUST use `class-variance-authority` (`cva`) inside the shared component definition to encapsulate variants (`success`, `danger`, `warning`, `info`, `buy`, `sell`).
- Pages must pass clean props (e.g., `<StatusBadge variant="buy" />`) instead of duplicating inline conditional class logic.

### Rule 4: Centralized Barrel Imports
- Always import shared UI components from `@/components/ui`:
  ```javascript
  import { MetricCard, StatusBadge, Button, Input, DataTable } from '@/components/ui';
  ```
- Always import shared formatters and utilities from `@/lib`:
  ```javascript
  import { cn, formatCurrency, formatPercent } from '@/lib';
  ```

---

## 2. Design System Token Specifications

### Typography System
- **Primary UI Text:** `Plus Jakarta Sans` (English) / `IBM Plex Sans Thai` (Thai)
  - Used for headings, labels, body text, buttons, navigation, and badges.
- **Financial & Monospace Data:** `JetBrains Mono`
  - Used for prices (`$142.50`, `฿5,200`), percentages (`+3.45%`), tickers (`NVDA`, `BDMS.BK`), Risk/Reward ratios (`1:2.5`), Piotroski scores (`7/9`), and technical readouts.

### Color Tokens & Financial Signals

| Token Name | Hex / Value | Usage | Tailwind Class |
|---|---|---|---|
| **Dark Void** | `#0a0a0a` | Main App Background | `bg-background` / `bg-void` |
| **Shell** | `#111111` | Sidebar / App Frame | `bg-shell` |
| **Surface / Panel** | `#171717` | Cards, Tables, Drawers | `bg-surface` / `bg-card` |
| **Surface Hover** | `#1f1f1f` | Hover state for panels | `bg-accent` / `hover:bg-surface-hover` |
| **Primary Text** | `#ededed` | Headings & Body | `text-foreground` / `text-primary` |
| **Secondary Text** | `#a3a3a3` | Labels & Subtitles | `text-secondary` |
| **Muted Text** | `#737373` | Metadata & Captions | `text-muted` |
| **Profit / Buy** | `#34d399` / `#10b981` | Positive P&L, Buy Signal | `text-fin-buy` / `text-emerald-400` |
| **Loss / Sell** | `#f87171` | Negative P&L, Sell/Trim Signal | `text-fin-sell` / `text-rose-400` |
| **Warning / Wait** | `#facc15` | Hold/Wait Status, Warnings | `text-fin-warning` / `text-amber-400` |
| **Bias / Accent** | `#60a5fa` | Info badges, Active tabs | `text-accent-primary` / `text-blue-400` |

### Geometry & Borders
- **Borders:** 1px flat solid borders (`--border`: `#262626`, `--border-hover`: `#333333`). Zero heavy drop shadows.
- **Border Radii:**
  - `sm`: `8px` (Badges, Chips, Small Buttons)
  - `md`: `12px` (Cards, Inputs, Modals)
  - `lg`: `16px` (Main Layout Containers)

---

## 3. Component Architecture Directory

```text
frontend/src/
├── components/
│   ├── ui/                    # Base UI Primitives & Financial Shared Components
│   │   ├── index.js           # Central Barrel Export
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   ├── card.jsx
│   │   ├── badge.jsx
│   │   ├── dialog.jsx
│   │   ├── progress.jsx
│   │   ├── alert.jsx
│   │   ├── MetricCard.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── DataTable.jsx
│   │   ├── DataStamp.jsx
│   │   ├── Drawer.jsx
│   │   ├── EmptyState.jsx
│   │   ├── Skeleton.jsx
│   │   ├── Toast.jsx
│   │   └── Tooltip.jsx
│   ├── dashboard/             # Dashboard Domain Slices
│   ├── command-center/        # Command Center Domain Slices
│   ├── analytics/             # Analytics Domain Slices
│   ├── journal/               # Journal Domain Slices
│   ├── risk/                  # Risk Domain Slices
│   └── config/                # Config Domain Slices
├── lib/
│   ├── index.js               # Central Utility Barrel Export
│   ├── utils.js               # cn() helper
│   ├── format.js              # formatCurrency, formatPercent, currencySymbol
│   ├── api.js                 # API Client
│   └── supabase.js            # Supabase Client
```

---

## 4. Agent Self-Check Verification Gate

Before completing any frontend or UI task, every agent MUST verify:
- [ ] No duplicated JSX snippets across pages.
- [ ] No hardcoded hex colors or inline pixel styles.
- [ ] Component imported cleanly via `@/components/ui` or `@/lib`.
- [ ] Financial metrics formatted using `formatCurrency()` / `formatPercent()`.
- [ ] `npm test --workspace=frontend` passes 100%.
- [ ] `node scripts/check-pr.js` passes all gates.
