---
name: MyPortStock Dark Terminal
description: Canonical product UI design system for the MyPortStock trading dashboard.
---

# Design System: MyPortStock Dark Terminal

This is the canonical visual direction for MyPortStock. The app should feel like a precise, high-density trading terminal: dark-first, highly legible, restrained, and optimized for fast investment decisions. The design must preserve the mood of the auth screen while behaving like a serious product dashboard after login.

## 1. Core Principles

- **Decision clarity over decoration:** Data, gate status, and next action must be easier to read than the interface styling.
- **Dark-first everywhere:** Auth, app shell, dashboard, forms, tables, drawers, and empty states use one coherent dark terminal language.
- **Color is data:** Emerald, red, amber, and blue are semantic signals. Do not use color as filler.
- **Flat by default:** Use tonal contrast and 1px borders for structure. Avoid drop shadows as layout scaffolding.
- **Dense but readable:** Keep dashboard density, but protect contrast, spacing, numeric alignment, and table scan speed.
- **No AI slop:** Avoid decorative glow, glassmorphism by default, gradient text, oversized radii, bouncy motion, and generic SaaS card grids.

## 2. Color Tokens

### Base

- `bg-void`: `#0a0a0a` - App background and auth background.
- `bg-shell`: `#111111` - Sidebar and persistent app chrome.
- `bg-panel`: `#171717` - Main cards, panels, forms, and tables.
- `bg-panel-hover`: `#1f1f1f` - Hover or selected row surface.
- `bg-panel-solid`: `#0f0f0f` - Dense nested surfaces and table bodies.

### Borders

- `border-subtle`: `#262626` - Default structural border.
- `border-medium`: `#333333` - Stronger dividers, focused regions, and table headers.
- `border-strong`: `#525252` - Rare high-emphasis separators.

### Typography

- `text-primary`: `#ededed` - Primary text, page titles, important values.
- `text-secondary`: `#a3a3a3` - Labels, descriptions, secondary values.
- `text-muted`: `#737373` - Metadata only. Do not use for body text.
- `text-inverse`: `#0a0a0a` - Text on high-contrast white buttons.

### Accent and Status

- `brand-primary`: `#10b981` - Primary action, active nav, focus, live status.
- `brand-dark`: `#059669` - Active or pressed primary state.
- `fin-profit`: `#34d399` - Positive P/L and Buy/Pass states.
- `fin-loss`: `#f87171` - Negative P/L, Stop, Sell, and danger states.
- `fin-warning`: `#facc15` - Wait, warning, and risk-limit states.
- `accent-primary`: `#60a5fa` - Info state only, not decoration.

## 3. Typography

- **Primary UI font:** `Plus Jakarta Sans`, with `IBM Plex Sans Thai` and system sans fallbacks.
- **Numeric and ticker font:** `JetBrains Mono`, used for prices, portfolio values, tickers, percentages, and compact technical readouts.
- **Scale:** Product UI uses fixed rem sizes, not fluid hero typography after login.
- **Headings:** 600-700 weight, no gradient text, no oversized display treatment in dashboards.
- **Body:** 400-500 weight, line-height around 1.5-1.6.
- **Labels:** 600 weight, small size, optional uppercase only for short metadata and table headers.

Contrast rules:

- Body text must meet WCAG 4.5:1 against its surface.
- Muted text is for metadata, not explanatory copy.
- Placeholder text must remain readable on dark fields.

## 4. Surfaces and Layout

### App Shell

- Sidebar uses `bg-shell`, subtle borders, compact nav groups, and emerald only for the active link.
- Main content uses `bg-void` with optional faint grid texture. The grid must not compete with data.
- Persistent chrome should feel quiet and utilitarian.

### Panels and Cards

- Default card radius: `8px`.
- Main panels may use `12px` only when they contain dense grouped data.
- Avoid nested decorative cards. Use tables, sections, dividers, and spacing before adding another card layer.
- No large soft shadows. If an active or critical state needs emphasis, use border color, background tint, or a small semantic badge.

### Tables

- Header rows should be clear on dark surfaces with strong enough contrast.
- Numeric columns should align consistently and prefer monospace.
- Empty states should be dark, calm, and useful; they should tell the user what data is missing or what action starts the workflow.

## 5. Components

### Buttons

- **Primary:** high-contrast white or emerald depending on action criticality.
- **Secondary:** transparent or panel-colored with border.
- **Danger:** red semantic styling only for destructive or risk actions.
- Radius: `8px`.
- Motion: 150-200ms, state feedback only.

### Inputs

- Dark field background, 1px border, readable placeholder, visible focus state.
- Focus may use emerald border or a subtle outline. Avoid thick glow rings.
- Financial inputs should use monospace for numeric values.

### Badges and Status

- Use tinted backgrounds with semantic borders.
- Traffic-light colors must preserve the meaning in `CONTEXT.md`: green action allowed, yellow wait/conditional, red avoid/broken thesis.
- Badges should not become decorative confetti.

### Motion

- Motion must communicate state: loading, focus, selection, drawer open/close, or data update.
- No bouncy, elastic, or theatrical page-load sequences.
- Always support reduced motion.

## 6. Explicit Bans

- Light-mode dashboard surfaces as the default logged-in experience.
- Gradient text.
- Glassmorphism as a default container style.
- Large soft drop shadows for cards.
- Border radius above `16px` for cards, panels, inputs, or tables.
- Decorative neon glow.
- Color used without semantic meaning.
- Motion that does not communicate state.

## 7. Implementation Guidance

- Keep `frontend/DESIGN.md` and this file aligned. If they diverge, this file is the product-level source of truth and `frontend/DESIGN.md` should be updated to match.
- Start with shared tokens in `frontend/src/index.css` so all logged-in pages inherit the same dark terminal foundation.
- Then verify page-level surfaces: Dashboard, Command Center, Risk, Market, Journal, Analytics, Config, drawers, forms, tables, empty states, and Clerk/auth handoff.
- Use Impeccable for UI critique, audit, polish, harden, clarify, and animate work.
