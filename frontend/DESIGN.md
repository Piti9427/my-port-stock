---
name: MyPortStock
description: AI-Powered Quantitative Trading Terminal
colors:
  primary: "#10b981"
  background: "#0a0a0a"
  foreground: "#ededed"
  surface: "#171717"
  border: "#262626"
  status-success: "#34d399"
  status-danger: "#f87171"
  status-warning: "#facc15"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontWeight: "700"
    letterSpacing: "-0.04em"
  body:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontWeight: "400"
    lineHeight: "1.6"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
---

# Design System: MyPortStock

## 1. Overview

**Creative North Star: "The Terminal for the Elite Quantitative Investor"**

This visual system embodies precision, speed, and algorithmic confidence. It explicitly rejects the bloated, playful, and overly colorful "SaaS cliché" or "AI slop" aesthetics. Instead, it leans entirely into a Vercel/Linear-inspired dark-first universe where data is the absolute focus. The atmosphere is stark, technical, and strictly utilitarian, optimized for high-density information scanning and split-second decisions without eye strain. 

**Key Characteristics:**
- **Dark-First:** Pure blacks and dark zincs form the canvas.
- **Monochrome Dominance:** Stark white on black for primary elements.
- **Data-Driven Colors:** Hues are reserved strictly for intent (Pass/Fail) and data visualization.
- **Surgical Precision:** Thin borders, tight tracking, and crisp components.

## 2. Colors

The palette is extremely restrained, using color only to signal state or technical success.

### Primary
- **Emerald Accent** (#10b981): Used extremely sparingly (≤5%) for glowing effects, brand accents, or primary success metrics. It provides a technical, glowing heartbeat to the terminal.

### Neutral
- **Deep Void** (#0a0a0a): The absolute background. Creates infinite depth.
- **Zinc Surface** (#171717): Used for cards and elevated containers.
- **Zinc Border** (#262626): The structural grid. Highly visible but never overpowering.
- **Stark White** (#ededed): Primary text and high-contrast buttons.

### Status
- **Success** (#34d399): Positive portfolio changes, 'Buy' verdicts.
- **Danger** (#f87171): Stop-loss triggers, negative metrics, 'Sell' verdicts.
- **Warning** (#facc15): Approaching risk limits, 'Wait' verdicts.

**The One Voice Rule.** The primary accent is used on ≤5% of any given screen. Its rarity is the point. Color is data, not decoration.

## 3. Typography

**Display Font:** Inter (with sans-serif fallback)
**Body Font:** Plus Jakarta Sans (with system-ui fallback)
**Label/Mono Font:** Geist Mono or system monospace

**Character:** Technical, highly legible, and structured for financial data scanning.

### Hierarchy
- **Display** (700, clamp(2.5rem, 5vw, 4.5rem), 1.1): Hero headlines and major terminal states.
- **Headline** (600, 1.5rem, 1.3): Section headers and card titles.
- **Title** (600, 1.15rem, 1.4): Sub-headers within dense data cards.
- **Body** (400, 1rem, 1.6): Standard prose and descriptions.
- **Label** (600, 0.75rem, uppercase, tracking-widest): Micro-copy, metadata, and status badges.

**The Capital Rule.** Small metadata and column headers should utilize uppercase styling with wide tracking (`tracking-widest`) to resemble technical readouts.

## 4. Elevation

Surfaces are strictly flat. Depth is created through crisp 1px borders, tonal contrast, and extremely subtle radial glows, rather than drop shadows.

### Shadow Vocabulary
- **Zero Shadow:** The default state for all cards and inputs.
- **Ambient Glow:** (`box-shadow: 0 0 100px rgba(16,185,129,0.2)`): Used only behind hero text or critical active states to simulate a CRT/Terminal glow.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Drop shadows are strictly forbidden for layout structuring.

## 5. Components

### Buttons
- **Shape:** Soft edges (8px radius)
- **Primary:** High-contrast stark white background, black text.
- **Hover / Focus:** Slight scaling (`scale-[1.02]`) and transition to a slightly muted zinc background.
- **Secondary / Ghost:** Transparent background with white text, transitioning to white/10 on hover.

### Cards / Containers
- **Corner Style:** 8px
- **Background:** Deep Void (#0a0a0a) or Zinc Surface (#171717).
- **Shadow Strategy:** None.
- **Border:** 1px solid #262626.
- **Internal Padding:** 24px.

### Inputs / Fields
- **Style:** Transparent background, 1px #262626 border.
- **Focus:** Border shifts to #ededed or #10b981 without thick focus rings.

### Badges / Labels
- **Style:** 10% opacity background of the accent color, 30% opacity border of the accent color, distinct text color (e.g. `bg-emerald-500/10 border-emerald-500/30 text-emerald-400`).

## 6. Do's and Don'ts

### Do:
- **Do** use responsive CSS grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) for dense data layouts.
- **Do** ensure every interactive element has a subtle, fast transition (≤200ms).
- **Do** prioritize contrast; ensure financial figures are the most legible element on screen.

### Don't:
- **Don't** use light mode colors (e.g., beige, cream, pure white backgrounds).
- **Don't** use large, soft drop-shadows to separate sections. Use 1px borders instead.
- **Don't** introduce "friendly" or "bouncy" animations. Motion must be purposeful and nearly instant.
- **Don't** use gradients on text or surfaces unless it's a very faint radial background glow.
