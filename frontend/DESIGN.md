# Linear/Vercel Design System

## Brand Core
- **Vibe:** Ultra-minimal, precise, stark monochrome, code-forward, professional quantitative trader.
- **Color Strategy:** Restrained. Pure black or very dark gray backgrounds. High contrast stark white text. Colors are strictly reserved for functional status (Pass/Fail) and data. 
- **Typography:** Crisp, system-first or clean sans-serif (Inter, Geist). Tight tracking on UI elements.

## Color Tokens
*Note: This document serves as aspirational design guidance rather than the absolute single source of truth.*
```css
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --surface: #0a0a0a;
  --surface-hover: #171717;
  --border: #262626;
  --border-hover: #404040;
  
  /* Status Colors (Muted but crisp) */
  --status-success: #34d399;
  --status-success-bg: rgba(16, 185, 129, 0.1);
  --status-danger: #f87171;
  --status-danger-bg: rgba(239, 68, 68, 0.1);
  --status-warning: #facc15;
  --status-warning-bg: rgba(234, 179, 8, 0.1);
  
  --muted: #a3a3a3;
}
```

## UI Elements
- **Borders:** 1px solid `--border`. Highly visible and structured. No soft shadows.
- **Radii:** Small and precise (e.g., 4px or 6px). 
- **Cards:** Used for the Decision Snapshots. Background `--surface`, border 1px `--border`. On hover, border changes to `--border-hover` with a very subtle transition.
- **Buttons / Inputs:** Minimalistic. Black background, stark white border, white text. (Tailwind: `bg-black border border-white text-white` or using token-based classes like `bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]`)

## Layout Strategy
- **Grid:** Responsive CSS grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) for the dashboard to automatically wrap cards based on screen size.
- **Header/Command Bar:** A simple top bar acting as the command input for searching tickers.
- **Information Density:** High density with clear visual hierarchy. Use uppercase small font for labels (e.g., "PEG RATIO") and large sharp font for values.

## Animation
- **Rule:** Fast, purposeful, almost imperceptible. No bouncy or playful animations. 
- **Hover States:** Subtle background lightening or border color shift.
- **Loading:** Minimalist skeleton loaders, no spinning elements.
