# MyPortStock Investment Context

This context defines the investment decision language used by the MyPortStock instruction stack. It keeps domain terms precise so agents optimize for the intended investment behavior.

## Language

**Investment Accuracy**:
The ability to reduce bad decisions, especially false `Buy/Add`, stale-data `Buy/Add`, FOMO `Buy/Add`, and trades with weak risk/reward. The primary standard is risk-adjusted decision quality, not the number of opportunities recommended.
_Avoid_: prediction accuracy, price-call accuracy, signal frequency

**False Buy**:
A `Buy/Add` recommendation that should have been `Wait`, `Hold`, `Trim`, `Avoid`, or `Exit Review` because data, entry, risk/reward, thesis integrity, or portfolio fit was insufficient.
_Avoid_: bad pick, wrong call

**Risk-Adjusted Decision Quality**:
The quality of a verdict after accounting for downside risk, data freshness, hard stop discipline, position size, opportunity cost, and thesis integrity.
_Avoid_: bullishness, confidence, upside only

**Verified Data Packet**:
The Orchestrator-controlled evidence set used for investment analysis, including current market data, source timestamps, portfolio context, journal context, and known conflicts.
_Avoid_: search result, snippet, raw data dump

**Runtime Data Source**:
The live application source of truth used for portfolio, journal, watchlist, and user-owned operational data.
_Avoid_: markdown snapshot, sample seed, UI fixture

**Historical Context Source**:
A dated evidence source used to understand prior decisions, snapshots, theses, and post-mortems, but not to serve runtime application state.
_Avoid_: executable data source, live database, current quote

**Fail-Closed Analysis**:
The required behavior when data, credentials, services, or verification gates are incomplete: return `INSUFFICIENT_DATA` or `Wait` instead of inventing values or emitting `Buy/Add`.
_Avoid_: mock fallback, optimistic default, provisional buy

**Insight Presentation**:
A scan-friendly presentation layer that turns a **Verified Data Packet** and investment analysis into decision-ready chat output. It may use concise text blocks, tables, traffic-light labels, score bars, and visual grouping, but it is not a new evidence source and must preserve source provenance, hard gates, risk/reward, and uncertainty.
_Avoid_: raw data dump, decorative summary, unsupported recommendation, export artifact

**Decision Snapshot**:
The first layer of an **Insight Presentation** that gives six required fields in a few scan-friendly lines: status plus verdict, ticker plus **Decision Mode**, score, gate status, one-line reason, and immediate next action.
_Avoid_: executive summary, teaser, headline only

**Evidence Drilldown**:
The second layer of an **Insight Presentation** that preserves the supporting evidence behind the **Decision Snapshot**, including data stamp, source quality, thesis, technicals, risk/reward, and uncertainty.
_Avoid_: appendix, raw notes, data dump

**Adaptive Drilldown**:
The default **Evidence Drilldown** style for chat responses. It shows only the evidence blocks needed for the user's question while preserving required hard gates, source quality, risk/reward, uncertainty, and next triggers.
_Avoid_: fixed full memo, every-section dashboard, incomplete summary

**Decision-Impact Evidence**:
Relevant news, financials, filings, technical facts, portfolio context, or market data that can change the verdict, gate status, risk/reward, thesis integrity, or next action.
_Avoid_: news dump, metric dump, trivia, unrelated background

**Expectation Gap**:
The variance between actual financial results and Wall Street consensus expectations. Used to measure the post-earnings shock and direction of institutional adjustments.
_Avoid_: rumors, unconsensus targets, raw earnings beat without guidance check

**Piotroski F-Score**:
A 9-point fundamental health index used to confirm balance sheet strength.
_Avoid_: basic debt checks, subjective financial grades

**Altman Z-Score**:
A quantitative credit-strength score used to identify credit risks and potential insolvency.
_Avoid_: credit agency ratings, general debt-to-equity assumptions

**ROIC/ROCE**:
Returns on invested or employed capital used to verify that growth companies generate cash-flow efficiency from capital expenditure (CapEx).
_Avoid_: ROE, basic net profit margin

**Anchored VWAP (AVWAP)**:
The volume-weighted average price plotted from a key calendar event, representing the core institutional price defense zone.
_Avoid_: simple moving average, generic VWAP without anchor point

**Full Investment Dashboard**:
An expanded **Insight Presentation** used when the user asks for a full memo, pre-trade execution review, portfolio-entry thesis, or complete audit. It uses the full investment answer structure instead of the shorter **Adaptive Drilldown**.
_Avoid_: default chat reply, quick insight, casual scan

**Traffic-Light Status**:
A limited visual marker used in an **Insight Presentation** to show decision state: green for action allowed, yellow for wait or conditional setup, and red for avoid or broken thesis. It is a semantic status marker, not decoration.
_Avoid_: emoji decoration, sentiment badge, colorful filler

**Current Price Evidence**:
An accepted, timestamped quote used to decide entry, stop, target, R/R, and position size. It must identify the source, market session, and whether it is live, delayed, pre-market, regular-hours, after-hours, or latest close.
_Avoid_: visible number, search snippet, article price, chart label

**Price Source Ladder**:
The ordered trust model for current price evidence. Broker/user-provided quote is preferred; free timestamped financial quote pages can cross-check; search snippets, analyst targets, and social posts are forbidden as current price.
_Avoid_: any two sources, generic web result

**Chart Visual Source**:
A charting UI or chart library used for visual structure such as trend, support, resistance, and candles. It is not current price evidence unless the quote source, session, and timestamp are separately verified.
_Avoid_: execution price source

**No-Paid Market Data Policy**:
The current workspace policy that avoids adding paid market-data subscriptions or paid API dependencies. If free/current evidence is insufficient, the correct action is to ask for a broker or TradingView-visible quote from the user, not to assume a price.
_Avoid_: paid feed requirement, subscription-first workflow

**Thesis Integrity**:
The state of whether the original reason to own or enter an asset remains valid after current evidence, risks, and post-mortem lessons are checked.
_Avoid_: conviction, belief, story

**Wait Verdict**:
A deliberate capital-preservation decision used when the asset may be attractive but entry, confirmation, data quality, catalyst timing, or risk/reward is not good enough.
_Avoid_: no opinion, neutral filler

**Decision Mode**:
The intended investment timeframe and decision context that determines score weights, hard gates, and acceptable evidence. A verdict must be evaluated under exactly one mode unless the answer explicitly compares multiple modes.
_Avoid_: style, vibe, generic analysis

**Quick Trade**:
A short-duration trade where current price, liquidity, catalyst freshness, volume, and stop execution dominate the decision.
_Avoid_: quick opinion, casual buy

**Swing Trade**:
A multi-day to multi-week trade where technical setup, catalyst path, risk/reward, and position sizing matter more than long-term ownership quality.
_Avoid_: medium-term hold

**Long-Term/Core**:
A multi-month to multi-year ownership decision where business quality, financial durability, valuation discipline, and thesis integrity dominate entry timing.
_Avoid_: permanent hold, marry the stock

**Existing Position / Exit Review**:
A decision mode for held or previously traded assets where journal evidence, thesis integrity, downside protection, and tax/position impact dominate new upside.
_Avoid_: fresh buy analysis

## Product UI Language

**Dark Terminal Product UI**:
The canonical visual language for MyPortStock: dark-first black and zinc surfaces, sparse emerald accents, flat bordered panels, high-contrast typography, and monospace financial readouts. It is a product dashboard language optimized for dense investment decisions, not a decorative landing-page style.
_Avoid_: light dashboard, glass terminal, neon dashboard, generic SaaS dark mode

**Color Is Data**:
The rule that color is reserved for semantic meaning such as action, selection, risk, success, warning, danger, and data visualization. Accent color should not be used as decoration.
_Avoid_: decorative glow, colorful filler, gradient emphasis

**Terminal Readability**:
The requirement that dark terminal styling must preserve scan speed, text contrast, numeric alignment, table clarity, and accessible interaction states. A screen that looks dramatic but slows decision-making fails this standard.
_Avoid_: dark aesthetic, moody UI, cinematic terminal

## Example Dialogue

Dev: "Should the agent maximize upside capture?"

Domain Expert: "No. For MyPortStock, investment accuracy means reducing false `Buy/Add` first. A clean `Wait` is better than a forced buy when data or R/R is incomplete."

Dev: "So `Buy` should require all hard gates?"

Domain Expert: "Yes. Current data, journal check, thesis integrity, hard stop, THB risk, and R/R must pass before the score can produce `Buy/Add`."

Dev: "Can one conviction score cover every case?"

Domain Expert: "No. A quick trade, a swing, a core position, and an exit review need different weights. The agent must choose the decision mode before scoring."

Dev: "Can the chart price in TradingView be used as execution price?"

Domain Expert: "Only if the user provides it as the current visible quote with session context, or another accepted source verifies it. Otherwise TradingView is chart context, not price evidence."
