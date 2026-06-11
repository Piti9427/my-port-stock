---
name: MyPortStock Terminal
description: A premium, dark-mode, glassmorphism-inspired design system for an elite personal trading assistant and portfolio manager.
---

# Design System: MyPortStock Terminal

## 1. Core Principles
- **Elite & Professional:** The interface should feel like a multi-million dollar institutional trading terminal, not a generic SaaS.
- **Glass & Depth:** Utilize `backdrop-filter: blur` heavily for panels, overlaying a deep, dark void background.
- **Glowing Highlights:** Use subtle glowing box-shadows or gradients to draw attention to critical data (P/L, AI verdicts).
- **Data Density but Readable:** Financial data requires density, but ample padding and clear typography hierarchy must be maintained to prevent cognitive overload.

## 2. Color Tokens

### Base & Backgrounds
- `bg-void`: `#0f172a` (Slate 900) - The ultimate background.
- `bg-panel`: `rgba(30, 41, 59, 0.7)` - For glassmorphic cards and containers.
- `bg-panel-hover`: `rgba(51, 65, 85, 0.8)` - For interactive cards.
- `border-subtle`: `rgba(255, 255, 255, 0.1)` - For panel borders and dividers.

### Typography
- `text-primary`: `#f8fafc` (Slate 50) - For headings and primary data points.
- `text-secondary`: `#94a3b8` (Slate 400) - For labels, subtitles, and secondary text.

### Brand & Accents
- `brand-primary`: `#3b82f6` (Blue 500) - For primary actions and focus states.
- `brand-glow`: `rgba(59, 130, 246, 0.5)` - For button dropshadows.

### Semantic / Financial
- `fin-profit` (Green Light): `#10b981` (Emerald 500) - For positive P/L, Buy signals.
- `fin-loss` (Red Light): `#ef4444` (Red 500) - For negative P/L, Sell signals, Stop Loss alerts.
- `fin-warning` (Yellow Light): `#f59e0b` (Amber 500) - For Trim signals, warnings.

## 3. Typography
- **Font Family:** 'Inter', sans-serif (or system-ui if Inter fails).
- **Headings (h1):** 2.5rem, Font Weight 700, tight letter-spacing (-0.5px). Often rendered with a gradient text clip (e.g., `#60a5fa` to `#34d399`).
- **Data Points (Large Prices):** 1.8rem, Font Weight 300.
- **Body Text:** 1rem to 1.1rem, Font Weight 400, Line Height 1.6.

## 4. Components & Patterns

### 4.1 Glass Panels (The Core Container)
- **Background:** `bg-panel` with `backdrop-filter: blur(16px)`.
- **Border:** 1px solid `border-subtle`.
- **Border Radius:** `24px` for main containers, `16px` for inner cards.
- **Shadow:** `0 25px 50px -12px rgba(0, 0, 0, 0.5)` for depth.

### 4.2 Primary Buttons
- **Background:** Linear gradient (`135deg, #3b82f6, #2563eb`).
- **Text:** White, bold (600).
- **Border Radius:** `12px`.
- **Hover State:** Translate Y by `-2px`, increase shadow to `0 8px 25px var(--brand-glow)`.

### 4.3 Financial Inputs (Guided Form)
- **Background:** `rgba(15, 23, 42, 0.6)`.
- **Border:** 1px solid `border-subtle`.
- **Focus:** Change border to `brand-primary` and add an outer ring (`box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2)`).
- **Text:** White, monospace for numbers to ensure tabular alignment.

### 4.4 The AI Verdict Card
- A distinct inner card inside the glass panel.
- If the verdict is highly positive, apply a subtle `fin-profit` left border (`4px solid`).
- If negative or risky, apply a `fin-loss` left border.
- The AI's rationale should be displayed in a clean, readable text block with `text-secondary` for the body, highlighting key metrics in `text-primary`.

## 5. Micro-Animations
- **Page Load:** `fadeInDown` (0.8s) for headers, `fadeInUp` (0.8s, 0.2s delay) for main panels.
- **Data Loading:** A clean, spinning CSS ring `border-top-color: white` when fetching APIs or running the Mega-Agent prompt.
- **Transitions:** `all 0.3s ease` on buttons and input focus states.
