# 2026-06-12 Dashboard UI Improvements

This document records the UI/UX changes made to the Market Oracle Dashboard based on the `/impeccable critique` assessment, ensuring it aligns closely with a premium, high-density, dark-mode aesthetic (Linear/Vercel style).

## 1. Colorize (Contrast & Aesthetics)
- **Problem**: Highly saturated red (`#ef4444`) and green (`#10b981`) text directly on a pure black (`#000000`) background created visual vibration (halation), leading to a "cheap neon" / "AI Slop" appearance that causes eye fatigue.
- **Solution**: 
  - Changed CSS `--background` to a deep graphite off-black (`#0a0a0a`).
  - Shifted `--surface` card backgrounds to `#121212`.
  - Desaturated the text status colors slightly using Tailwind's 400-level shades (`#34d399` for success, `#f87171` for danger, `#facc15` for warning) to improve legibility while maintaining the colored background badges at 10% opacity.

## 2. Layout (Mobile Accessibility)
- **Problem**: The "Remove Card" (X) button used a `group-hover:opacity-100` class, meaning the button was 100% invisible until hovered. This made it impossible to delete a card on touch screens (mobile users).
- **Solution**: 
  - Changed the button to `opacity-50 hover:opacity-100`. It is now always visible as a muted background control and brightens on desktop hover, making it discoverable and usable across all devices.

## 3. Harden (Search Interaction)
- **Problem**: The search mechanism expected multiple tickers to be strictly comma-separated. This is a power-user rule hidden in the placeholder text that disappeared as soon as the user started typing.
- **Solution**: 
  - Updated the parsing regex to split by both spaces and commas (`/[\s,]+/`).
  - Refined the placeholder to: `Add ticker (e.g. NVDA AAPL) and press Enter...` to clearly communicate the expected interaction flow without requiring commas.

## 4. Polish (Micro-details)
- **Problem**: Sub-labels for financial metrics were unreadably small (`text-[10px]`) on some high-resolution screens. Additionally, the loading skeleton's height jumped abruptly when the data loaded.
- **Solution**: 
  - Bumped the metric sub-labels (PEG Ratio, 50D MA, ATR, Stop Loss) up to `text-xs` (12px).
  - Removed the hardcoded `h-48` on the skeleton and structured its content blocks to organically match the layout height of the fully rendered card.
