# MyPortStock Design System and Reusable Component Specification

This is the canonical frontend styling contract. Preserve the existing dark-first, high-legibility financial dashboard language; changes to the styling architecture are not permission to redesign the product.

## 1. Styling source of truth

CSS custom properties in `frontend/src/styles/tokens.css` own all colors. Tailwind `v3.4` maps those values to semantic utilities in `frontend/tailwind.config.js`.

Use semantic classes:

```jsx
<section className="border border-border bg-panel text-foreground">
  <p className="text-text-secondary">Updated recently</p>
  <strong className="text-fin-profit">+3.4%</strong>
</section>
```

Do not use:

- raw hex, `rgb`, `rgba`, or `0x` colors in JSX
- Tailwind palette colors such as `text-zinc-*`, `bg-emerald-*`, or `border-red-*`
- `dark:` variants for base theme colors
- dynamically constructed Tailwind strings
- static inline styles

## 2. Semantic token groups

| Group           | Tailwind examples                                                                | Purpose                         |
| --------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| App surfaces    | `bg-background`, `bg-shell`, `bg-panel`, `bg-surface`                            | Page, shell, cards, overlays    |
| Text            | `text-foreground`, `text-text-primary`, `text-text-secondary`, `text-text-muted` | Content hierarchy               |
| Borders/focus   | `border-border`, `border-border-subtle`, `ring-ring`                             | Boundaries and keyboard focus   |
| Financial state | `text-fin-profit`, `text-fin-loss`, `text-fin-warning`, `text-fin-info`          | Profit, loss, wait, information |
| Agent data      | `text-data-agent-cio`, `bg-data-agent-risk`                                      | Data visualization identity     |

Both light and dark values must satisfy contrast requirements. `data-theme` is the resolved theme mechanism for Light, Dark, and System.

## 3. Typography and geometry

- UI text: Plus Jakarta Sans with IBM Plex Sans Thai support
- Financial/numeric data: JetBrains Mono and `tabular-nums`
- Shared radii: `rounded-sm` 8px, `rounded-md` 12px, `rounded-lg` 16px
- Borders: flat 1px semantic borders; avoid decorative glow, glassmorphism, and heavy shadows
- Compact labels may match the established baseline but must not fall below the contracted readable threshold

## 4. Component rules

- Preserve public props, accessibility semantics, and `className` extension points.
- Use shared primitives from `@/components/ui` when the primitive already exists.
- Use `cn()` for class merging and `cva()` or a static map for finite variants.
- Extract a new shared abstraction only after the same stable pattern has at least three consumers.
- Keep domain-specific layouts with their owning feature; do not create wrappers only to make files look uniform.
- Never nest interactive controls.

Allowed runtime styling is limited to CSS custom properties carrying data-derived geometry:

```jsx
<div
  className="w-[var(--progress)]"
  style={cssVars({ "--progress": `${value}%` })}
/>
```

Charts, treemaps, canvas/Pixi sizing, and progress indicators may use this pattern. Static values belong in Tailwind.

## 5. Responsive and motion contract

Required viewports:

- Mobile: `390x844`
- Tablet: `768x1024`
- Laptop: `1024x768`
- Desktop: `1440x900`

The page must preserve topology, avoid horizontal page overflow and unintended text clipping, and keep critical geometry within `±2px` of the baseline contract. State-driven animation must support `motion-reduce`; purely decorative motion should be omitted.

## 6. Approved global CSS

Only these files may remain:

```text
src/index.css
src/styles/tokens.css
src/styles/base.css
src/styles/animations.css
```

Page, layout, component, and utility selector files are legacy architecture and must not be restored.

## 7. Required verification

Before completing frontend work:

```bash
npm run format:check
npm run lint
npm run verify:architecture
npm run verify:tailwind
npm run typecheck
npm run test:unit
npm run build
```

Meaningful UI changes also require the relevant Playwright route/theme/layout contract. Screenshots are review artifacts, not pixel-diff blockers.
