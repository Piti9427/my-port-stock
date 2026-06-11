---
target: new screens — Risk, Analytics, Watchlist, Config
total_score: 20
p0_count: 1
p1_count: 2
timestamp: 2026-06-11T10-48-55Z
slug: new-screens-risk-analytics-watchlist-config
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | KPI cards always show data even when "stale"; no timestamp, no loading state for real data, no "last refreshed" indicator anywhere |
| 2 | Match System / Real World | 3 | Domain language is correct for a financial tool; "VaR (1-day, 95%)" is jargon without hover definition for non-quant users |
| 3 | User Control and Freedom | 2 | Removing a ticker from Watchlist is permanent and silent; Add Ticker modal has no ESC label; Config "Save" is a mock with no persistence boundary |
| 4 | Consistency and Standards | 3 | `.kpi-value` reused across all 4 pages is good; but KPI coloring logic differs: Risk uses `kpi-loss` for VaR (correctly alarming), Analytics uses `kpi-profit` for Win Rate, yet the same block-level class conveys no semantic hierarchy difference |
| 5 | Error Prevention | 1 | "Add ticker" accepts any string including duplicates (partially handled), but no validation on price fields, no warning before delete, no confirmation on Config reset-to-defaults |
| 6 | Recognition Rather Than Recall | 2 | Treemap has a legend but no tooltip on hover showing the exact sector weight + limit numbers simultaneously; drilldown table shows "Wt %" but user must remember the total portfolio value to contextualize it |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts; no bulk actions; Config page has no export/import of settings; Analytics has no date-range filter or ticker filter for the equity curve |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and restrained; minor noise from the 4-column KPI row repeating on every screen without variation in density or emphasis |
| 9 | Error Recovery | 1 | Zero error states for the happy-path failures: what happens when the ticker entered is unknown? What does the equity chart show with 0 trades? No recovery UI for any of these |
| 10 | Help and Documentation | 1 | No tooltips, no contextual help, no hover explanations for financial terms (VaR, Conviction Score, Expectancy); Config sliders have descriptions but no "what is this?" link |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: The four screens do not feel AI-generated at first glance — the "void" dark theme is intentional and consistent, the glassmorphism is restrained and purposeful, and the financial semantic coloring (green/amber/red for risk states) is earned, not decorative. The absolute bans are clean: no gradient text, no side-stripe borders, no hero-metric template. The treemap is the most distinctive element and avoids the "identical card grid" trap.

However, there are two subtler AI tells that survive initial inspection:

1. **KPI row sameness**: Every single page opens with an identical 4-column KPI card row. This structural reflex — big number, small label, supporting stat — is repeated verbatim on Risk, Analytics, and Watchlist. Individual KPIs are semantically correct, but the four-column row as the universal opener is a "dashboard AI grammar" tell. The pattern isn't wrong, but its uniformity is.

2. **Empty right-column drilldown**: The "Select a sector from the heatmap" placeholder is a low-effort default. It occupies a significant panel area with text that explains a mechanic rather than adding value in the idle state. This is the placeholder-as-content AI tell.

**Deterministic scan**: `detect.mjs` returned `[]` with exit code 0 — zero anti-pattern hits in all four JSX source files. No gradient text, no absolute-banned patterns detected in source. The pages passed the automated sweep.

## Overall Impression

The screens are structurally sound and visually cohesive. The dark theme, financial tokens, and glassmorphism all carry register appropriately. The most urgent gap is not aesthetic — it's the absence of empty states, error states, data staleness signals, and destructive-action guards. The system feels like a polished prototype: everything works for the mock data happy path, but one off-script action exposes zero resilience. The single biggest opportunity is hardening the interaction model so the UI responds confidently when things go wrong, not just when they go right.

## What's Working

**1. Risk page treemap + sector bars are a genuinely useful dual-encoding.** The treemap gives spatial overview, the bars give precise comparison — both drive toward the same drilldown. The interaction is coherent and the color escalation (green → amber → red pulsing) is purposeful, not decorative. The `risk-pulse` keyframe on over-limit sectors is the best motion in the build.

**2. Config sliders with live color feedback.** The slider thumb and track color shifting from blue → amber → red as the value approaches danger thresholds (via `--track-fill` CSS variable) is a smart progressive warning system. It directly maps the visual language of the Risk page into the settings form.

**3. Analytics equity curve is library-free and clean.** A hand-rolled SVG chart that avoids Chart.js overhead is a good call for this scope. The gradient area fill under the line and the interactive dot-reveal are done correctly.

## Priority Issues

**[P0] No confirmation on destructive Watchlist actions**
- **What**: Clicking the trash icon on a watchlist ticker removes it immediately and silently. There is no undo, no toast, no confirmation. The list state resets on page reload.
- **Why it matters**: An accidental tap destroys tracking context the user may have built over days. "Delete with no escape" is among the most common reasons users lose trust in a tool.
- **Fix**: Add a toast with an "Undo" action (3-second window). The `useReducer` pattern + `setTimeout` handles this without a modal. Alternatively, a soft-delete (strike-through for 3s, then remove) is even more trustworthy.
- **Suggested command**: `/impeccable harden`

**[P1] Zero empty/error states across all four pages**
- **What**: Analytics with no closed trades shows a broken equity curve (division by zero for `AVG_LOSS` when CLOSED - WINNERS = 0). Watchlist with all tickers removed shows a blank table body, not an empty state. Config with no API key shows no visual affordance for "inactive" status.
- **Why it matters**: Edge cases aren't edge cases for real users — they're the start of every new session. A tool that crashes or goes blank on first use destroys onboarding.
- **Fix**: Guard `AVG_LOSS` computation with a conditional; add explicit empty-state components for the Watchlist table and Analytics history; show a "No API key set" banner in Config's system status.
- **Suggested command**: `/impeccable harden`

**[P1] KPI cards convey no data freshness — all numbers look live even when stale**
- **What**: All four pages display financial figures with no timestamp, no "as of" marker, no loading state. In a real deployment the data could be hours old, but there's no UI signal to indicate this.
- **Why it matters**: The AGENTS.md rule explicitly requires `Data as of:` and `Quote timestamp/session` before any actionable number. The UI violates the project's own data integrity contract visually.
- **Fix**: Add a `data-timestamp` string to each panel's `panel-header` — a small `<span class="data-stamp">As of 14:32 · Manual data</span>` on the right side. Use `var(--text-muted)` and `JetBrains Mono`. This is a 10-line CSS + 5-line JSX change per page.
- **Suggested command**: `/impeccable polish`

**[P2] Config "Save changes" has no persistence boundary — user cannot tell if settings are saved**
- **What**: Clicking "Save changes" briefly shows "Saved!" then reverts. State is in React memory only; page reload resets everything. There is no visual indicator of unsaved vs. saved state between the button clicks.
- **Why it matters**: Config changes are high-stakes (they control execution gates). A user who changes `Min R/R` from 2.0 to 1.5 and then navigates away has no feedback that the change was lost.
- **Fix**: (a) Show a persistent "Unsaved changes" indicator next to the Save button when `config !== DEFAULT_CONFIG`. (b) Store config in `localStorage` so changes survive reload. Both together take ~20 lines.
- **Suggested command**: `/impeccable harden`

**[P2] Treemap drilldown idle state is a missed opportunity**
- **What**: The right-column drilldown shows "Select a sector from the heatmap to see individual holdings and stops" — a passive instruction in empty space. No information is surfaced until interaction.
- **Why it matters**: The right column is a significant screen area. A power user who lands on Risk sees half the content area as dead space until they click. This pushes the cognitive cost of the page up because the user doesn't know what reward is behind that click.
- **Fix**: Default-show the highest-risk sector's holdings (the one over limit, or the highest weight). Add a heading like "Showing: Technology (highest risk)" with a subtle "click any sector to change" subtext. This makes the drilldown feel alive on load.
- **Suggested command**: `/impeccable polish`

## Persona Red Flags

**Alex (Power User / Trader) — attempting to review sector risk and set a stop:**

- Lands on Risk page. Wants to drill Technology, compare NVDA stop to AAPL stop, then immediately jump to Config to tighten the sector limit. No keyboard shortcut to jump between panels. Must click the treemap block, read the drilldown table, then click the Config nav tab. Three separate navigations to complete one decision.
- The sector bars list all 6 sectors including "Cash / Fixed" at 5.8% — this sector has no holdings and clicking it gives an empty drilldown. Wasted click, no feedback that this is expected.
- Config: no way to see the *current* sector limit while looking at the Risk page. Must memorize the breach number, navigate to Config, find the slider, correlate. Classic memory bridge violation.

**Sam (Accessibility-Dependent User — keyboard + screen reader):**

- `<dialog open>` for the Add Ticker modal is used correctly for native focus trap. Good.
- Treemap blocks use `role="group"` on the container and `aria-pressed` on each button — the `aria-pressed` state tells the screen reader it's selected. Correct.
- However, the sector bars are `<button>` elements with no `aria-label` — they read as "button" + the sector name text content only. The `ChevronRight` icon inside has no `aria-hidden="true"`, so VoiceOver reads it as "Chevron right" after the button text.
- The stop-loss section uses `div.stop-row` with no interactive role or label. The data is purely visual; a screen reader user gets "NVDA Stop: $115.00 ฿24,500" read as flat text with no structural relationship.
- Color-only encoding: the `stop-bar-fill` changes color (green/amber/red) with no text alternative. A user who cannot see color gets no risk signal from the bars.

**Riley (Stress Tester):**

- Types "AAPL" into Add Ticker: it already exists. The dedup guard works (the `find()` check prevents adding). But no feedback is given — the modal closes silently. Riley doesn't know if the add succeeded or was a no-op.
- Removes all 6 watchlist items one by one: blank `<tbody>` with no empty state. Not broken, but bare.
- Navigates to Analytics and filters to "Core": one trade shows. Navigates back to "All". The filter persists — but switching pages and returning resets the filter. Inconsistent state behavior (filter is local to the mount).

## Minor Observations

- The nav now has 7 items. At 1280px width the icons + labels may wrap or compress. The `white-space: nowrap` prevents wrapping but could cause overflow. Recommend testing at 1280px.
- `sector-bar-limit-marker` div (line 162 in PortfolioRiskPage) has no CSS class definition — it renders but is invisible. The intent was probably a vertical line at the 100% position of the bar to mark the limit boundary. Currently does nothing.
- `AnalyticsPage` computes `AVG_LOSS` via division. If `TOTAL_CLOSED - WINNERS === 0` (perfect win rate), this produces `NaN`. The `EXPECTANCY` display would then show `NaN%`.
- The `ticker-input` class used in WatchlistPage's Add Ticker modal has no definition in `index.css`. It will receive no styles beyond browser defaults — an unstyled bare input in an otherwise polished modal.
- Config's `mode-select` dropdown uses the existing `mode-select` class but no focus-visible style is defined for it — keyboard tabbing to the select gives no visible focus ring.

## Questions to Consider

- "The Config page stores nothing — should it write to `localStorage` as a first step toward a real settings contract, or should this be deferred until there's a backend?"
- "The Risk page's biggest gap is the idle drilldown state. Should the default sector shown be Technology (highest risk) or should the user see a portfolio-level summary (total unrealized P/L, max drawdown from peak, Sharpe estimate) before drilling?"
- "Seven nav items is pushing the working memory limit for tab navigation. Should 'Config' live inside an overflow menu or be demoted to a settings icon on the far right, outside the primary flow?"
