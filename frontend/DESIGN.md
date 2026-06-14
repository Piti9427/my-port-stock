# Frontend Design Guide

The single source of truth for MyPortStock visual design is [`../docs/DESIGN.md`](../docs/DESIGN.md).

Frontend work must follow the canonical **Dark Terminal Product UI** direction there and the glossary terms in [`../CONTEXT.md`](../CONTEXT.md):

- `Dark Terminal Product UI`
- `Color Is Data`
- `Terminal Readability`

## Frontend Checklist

- Start with shared tokens in `frontend/src/index.css`; do not create page-local theme drift.
- Preserve dark-first black/zinc surfaces, sparse emerald accent, flat bordered panels, high-contrast text, and monospace financial readouts.
- Keep auth, app shell, dashboard pages, forms, tables, drawers, modals, and empty states in the same theme.
- Use `Plus Jakarta Sans` / `IBM Plex Sans Thai` for UI text and `JetBrains Mono` for prices, tickers, percentages, and technical readouts.
- Verify readability on dark surfaces; muted text is for metadata, not body copy.
- Use color only for actions, selected state, focus, status, risk, and data visualization.
- Avoid light dashboard surfaces, gradient text, glassmorphism as default styling, decorative neon glow, large card shadows, oversized radii, and non-state motion.

## Verification Targets

After frontend theme changes, inspect:

- Landing/auth handoff
- Sidebar and active nav
- Dashboard summary cards, table, empty state, AI chat card, Pixel Trading Floor panel
- Command Center
- Risk, Market, Journal, Analytics, and Config pages
- Drawers, modals, inputs, buttons, badges, table headers, loading states, and error states

Use Impeccable critique/audit/polish/harden for UI quality work, then verify the visible app in a browser.
