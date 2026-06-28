---
status: User-approved design; pending written-spec review
audience: Product, Design, Engineering, AI Agents
associated_adr: docs/adr/0005-pwa-first-ts-migration-vite-stack.md
primary_tests: npm test && npm run build && npm run lint
---

# MyPortStock Product Platform Design

## 1. Product definition

MyPortStock is a multi-user investment decision-support platform designed to feel like a personal investment operating system. It helps users understand what needs attention, research an asset with verified evidence, build a risk plan, monitor explicit conditions, and learn from actual outcomes.

The product does not execute trades, store broker credentials, or present generated analysis as guaranteed advice. Users confirm and execute orders in their broker.

### Initial market scope

- US-listed stocks and ETFs only.
- USD market data with portfolio risk also expressed in THB when the user selects THB as the reporting currency.
- Architecture may support more asset classes later, but v1 must not ship partially verified Thai equity, options, crypto, or commodity workflows.

### User scope

- Multi-user identity and data isolation are first-class requirements.
- The default experience serves beginners through plain-language guidance.
- Progressive disclosure exposes sources, assumptions, financial metrics, technical evidence, and agent findings for advanced users.
- The product has one coherent workflow rather than separate beginner and expert applications.

## 2. Product principles

1. **Decision before data density.** Start with what requires attention and why; expose raw detail on demand.
2. **Protect before pursue.** Risk items always rank above opportunities.
3. **Verified or fail closed.** Missing, stale, or conflicting evidence can produce `Wait` or `INSUFFICIENT_DATA`, never an invented actionable result.
4. **One verdict, one primary action.** Avoid competing calls to action.
5. **Explicit user control.** Alerts, risk plans, thesis changes, and executed trades require user confirmation.
6. **Learning loop over engagement feed.** Product value comes from improved decisions, not scrolling time.
7. **Manual broker execution.** The application prepares decisions and records outcomes; the broker owns order execution.
8. **Boring architecture.** Retain the React/Vite and Express modular monolith until measured constraints justify a change.

## 3. Information architecture

### Primary navigation

| Area      | User question                                                                    |
| :-------- | :------------------------------------------------------------------------------- |
| Today     | What requires my attention now?                                                  |
| Portfolio | What do I own, how is it performing, and where is the risk?                      |
| Discover  | What US stocks or ETFs are worth investigating?                                  |
| Analyze   | Is this asset suitable for this Decision Mode at the current verified price?     |
| Plans     | What entry, stop, target, size, and monitoring conditions have I defined?        |
| Journal   | What did I do, why, and what should I learn?                                     |
| Inbox     | Which alerts, degraded-data events, and completed analyses need acknowledgement? |
| Settings  | What are my currency, risk, notification, privacy, and experience preferences?   |

Desktop uses the full navigation. Mobile uses `Today`, `Portfolio`, `Discover`, `Analyze`, and `More`; Plans, Journal, Inbox, and Settings remain accessible through `More`, while Inbox status remains visible globally.

## 4. Today Decision Hub

Today is the default signed-in route. It is an action queue, not a generic market dashboard.

### Deterministic priority order

1. **Protect Capital** — stop proximity, portfolio drawdown, thesis failure, concentration breach, and unavailable critical data.
2. **Prepare** — upcoming earnings, expiring plan, position time stop, incomplete risk plan, and portfolio review reminders.
3. **Opportunity** — explicit watchlist or price-zone conditions where current data, portfolio fit, and risk/reward gates are available.
4. **Learn** — journal review, post-mortem, and recurring process mistakes.

AI may explain a queued item but does not assign its priority. Priority derives from documented rules with deterministic tests.

### Card contract

Every item contains:

- semantic status;
- plain-language reason;
- evidence timestamp or data-quality state;
- one primary action;
- optional advanced evidence;
- acknowledgement or resolution state where applicable.

Mobile presents one primary decision at a time. Desktop may show the ordered queue plus a compact portfolio pulse and pending setups.

## 5. Core workflows

### 5.1 Discover

Discover provides useful market context without becoming an infinite news feed.

Included capabilities:

- symbol and company search;
- US index, sector, market breadth, and volatility overview;
- curated, explainable screeners;
- earnings and relevant macro-event calendar;
- stock/ETF overview with company or fund profile;
- financial trends, valuation context, price chart, and timestamped current news;
- watchlist save with intended Decision Mode and a short thesis note.

Every candidate handed to Analyze carries ticker, intended mode, and originating context. Search snippets and unverified summaries never become execution evidence.

### 5.2 Analyze to Plan

The guided workflow is:

```text
Intent -> Verify -> Decide -> Inspect -> Act
```

1. **Intent:** User selects ticker and exactly one Decision Mode.
2. **Verify:** System builds the verified current-price, portfolio, and journal context.
3. **Decide:** System presents the Decision Snapshot, gate status, one-line reason, and immediate action.
4. **Inspect:** User opens fundamental, technical, catalyst, portfolio, sources, conflicts, and exactly three bear-case points as needed.
5. **Act:** Product offers one action consistent with the verdict.

| Verdict      | Primary action                                            |
| :----------- | :-------------------------------------------------------- |
| Buy / Add    | Create a risk plan; execution remains in the broker       |
| Wait         | Create an explicit price, confirmation, or catalyst alert |
| Hold         | Review thesis and protective levels                       |
| Avoid / Trim | Record the reason or start an exit review                 |

Copilot conversation is contextual to the verified packet. It can explain evidence and assumptions but cannot bypass a hard gate or silently replace the verdict.

### 5.3 Plans

A plan records:

- ticker and Decision Mode;
- thesis and invalidation;
- entry zone;
- stop and targets;
- hard THB risk and position size;
- risk/reward calculation;
- catalyst and review date;
- linked alert rules;
- evidence timestamp and relevant source identifiers;
- status: draft, active, completed, cancelled, or expired.

Creating a plan does not create an executed position. The user records an actual fill separately after broker execution.

### 5.4 Portfolio

Portfolio defaults to risk and data quality before vanity performance metrics.

Included capabilities:

- holdings, cash, cost basis, current value, realized/unrealized P/L;
- reporting currency and FX impact;
- position and sector concentration;
- correlated exposure and speculative allocation;
- drawdown and circuit-breaker state;
- stop risk in THB and positions missing a complete risk plan;
- equity curve, benchmark comparison, and performance attribution;
- direct handoff to position review, plan update, or exit review.

Every current-value calculation identifies source timestamp, session, and data-quality status.

### 5.5 Journal and learning loop

The journal records the decision lifecycle rather than only transactions.

- **Before execution:** thesis, mode, evidence stamp, planned entry, and planned risk.
- **After manual broker execution:** actual fill, quantity, and date entered or imported by the user.
- **During ownership:** thesis changes, stop/target updates, observations, and emotion/bias tags.
- **After exit:** outcome, process grade, mistake tags, and post-mortem.

Journal learning may return evidence to Today, such as a repeated tendency to chase earnings gaps. It may not invent a new hard gate without an explicit durable rule change.

## 6. Explicit multi-rule alerts

### Rule ownership

- `alert_rules` supports multiple active conditions per ticker.
- Users create, edit, disable, and delete rules explicitly.
- A Journal or Plan action may prefill an alert form from a stop, target, entry zone, or review condition, but the user must confirm before saving.
- Journal changes never silently create, update, or delete an alert rule.

### V1 alert scope

- US stocks and ETFs only.
- Default polling interval: 15 minutes during applicable US market sessions.
- Monitoring only; alerts never claim to replace broker stop orders.
- Price conditions: above, below, and zone entry.
- Multiple stop and target alerts may coexist for one ticker.

### Verification and state

- A price alert evaluates only when the current two-source acceptance gate passes.
- Events are edge-triggered: an unmatched-to-matched transition sends once; a continuously matched condition does not repeat.
- The rule must return to unmatched before a later crossing may send again.
- Persistent state and an idempotency key prevent duplicate events across scheduler cycles and restarts.

### Data-quality notification

- One failed verification cycle records degraded state but does not push.
- Two consecutive failed cycles for a monitored ticker produce one redacted data-quality notification.
- Success resets the consecutive-failure counter and permits a future degraded notification.
- The notification does not contain an unverified price or trading instruction.

### Notification privacy

- Lock-screen push is redacted by default: ticker plus `price alert triggered` or `market data unavailable`.
- Price, threshold, source, and plan details require opening the authenticated application.
- Permission is requested only from an explicit user action.
- Web Push is the only v1 external notification channel.

## 7. Platform architecture

### Client

- React/Vite PWA with shared navigation, data-quality states, and authenticated API client.
- Service worker precaches the application shell only.
- Authenticated `/api/*` responses are never runtime-cached.
- Responsive components preserve the same information hierarchy across desktop and mobile.

### Backend

- Express modular monolith organized around Decision, Portfolio, Research, Workflow, and Alerts domains.
- Zod validates trust boundaries.
- Existing verified quote packet remains the sole source for actionable current-price calculations.
- The bounded, single-process scheduler uses an environment kill switch, maximum tickers per cycle, no overlapping runs, and sanitized health state.
- A distributed lease becomes mandatory before adding a second backend replica.

### Data

- Supabase stores per-user operational data with RLS.
- Clerk identity is mapped to scoped Supabase access.
- Service-role access is isolated to explicit server-only administrative work such as scheduled evaluation and push delivery.
- Markdown remains historical context, not runtime state.

Core product entities are:

- user preferences;
- holdings and journal transactions;
- watchlists;
- analyses and evidence stamps;
- investment plans;
- alert rules, alert states, and immutable alert events;
- push subscriptions;
- inbox items and acknowledgement state.

New tables are added only in the vertical slice that first needs them.

## 8. Failure contract

| State                   | Product behavior                                                                     |
| :---------------------- | :----------------------------------------------------------------------------------- |
| Verified and fresh      | Normal workflow; source and session remain visible                                   |
| Stale or conflicting    | Warning shown; price-sensitive maximum verdict is Wait                               |
| Unavailable             | Preserve user input; show retry/insufficient-data state; do not invent fallback data |
| Scheduler cycle failure | Record sanitized health state; prevent overlap; try again next interval              |
| Push delivery failure   | Persist alert event; bounded retry; invalidate 404/410 subscriptions                 |
| Authentication failure  | Reject request and reveal no user data                                               |
| Partial module failure  | Keep unaffected modules usable and label unavailable evidence explicitly             |

## 9. Security, privacy, and accessibility

- Per-user RLS and API authorization are required for every user-owned entity.
- `user_id` comes from authenticated context, never request payloads.
- Secrets remain server-side and outside repository files.
- Push endpoints and key material are not logged.
- Lock-screen content is redacted by default.
- Color is not the only status signal.
- Browser zoom remains enabled.
- Keyboard, focus, labels, semantic headings, reduced motion, and mobile touch targets are release gates.
- Destructive actions require confirmation or an existing undo pattern.

## 10. Observability and success criteria

### Operational observability

- request ID and sanitized structured errors;
- data-source latency, gate pass/fail reason, and staleness;
- scheduler enabled/running/degraded state and last successful cycle;
- alert event creation, duplicate suppression, delivery result, and retry count;
- Sentry reporting without default PII collection.

### Product success criteria

- A signed-in user can identify the highest-priority portfolio action within 30 seconds.
- Every price-sensitive decision exposes data timestamp/session and gate status.
- No Buy/Add path bypasses documented hard gates.
- No authenticated API response is stored in service-worker Cache Storage.
- Alert rules do not emit duplicates while continuously matched.
- Beginners can complete Discover -> Analyze -> Alert/Plan without opening advanced evidence.
- Advanced users can inspect sources, conflicts, assumptions, and calculation inputs without leaving the decision workflow.
- A second user begins with empty isolated operational data.

## 11. Testing strategy

Every vertical slice follows public-behavior TDD:

1. Add one failing contract through the public API or visible user workflow.
2. Prove RED.
3. Implement the smallest vertical behavior.
4. Prove GREEN with focused tests.
5. Run affected backend/frontend suites.
6. Verify visible desktop and mobile behavior.
7. Verify loading, empty, error, stale, unauthorized, and insufficient-data states.
8. Record telemetry and rollback evidence before production rollout.

Financial decision logic additionally tests fail-closed behavior, duplicate suppression, current-price gate enforcement, hard THB risk, and false Buy/Add prevention.

## 12. Vertical-slice roadmap

### Slice 1: Foundation

- Finish backend hardening relevant to authentication, error sanitization, bounded caches, and observability.
- Add onboarding/preferences needed by reporting currency, experience level, and risk defaults.
- Establish navigation and shared data-quality UI contracts.

### Slice 2: Today and Portfolio Risk

- Build deterministic Today priority from existing holdings and journal data.
- Add compact portfolio pulse and direct review actions.
- Do not add a new market feed in this slice.

### Slice 3: PWA and Alert Inbox

- Add static-only PWA shell.
- Add explicit multi-rule alert management.
- Add edge-triggered verified evaluation, Inbox, redacted Web Push, and two-cycle degraded-data notification.

### Slice 4: Analyze to Plan

- Unify verified packet, Decision Snapshot, adaptive evidence, and verdict-specific action.
- Add persisted risk plans and explicit alert handoff.

### Slice 5: Discover

- Add US stock/ETF search, market context, curated screeners, calendar, and research overview.
- Hand off ticker, mode, and discovery context to Analyze.

### Slice 6: Journal Learning

- Add manual execution confirmation, complete lifecycle journaling, post-mortems, and deterministic learning feedback to Today.

Each slice is independently releasable and receives its own detailed implementation plan. Existing plans are reused or revised rather than duplicated.

## 13. Deferred scope and activation triggers

| Capability                   | Activation trigger                                                                                    |
| :--------------------------- | :---------------------------------------------------------------------------------------------------- |
| Thai equities                | Two accepted current-price sources, market-session contract, and separate design review are available |
| Options, crypto, gold        | Asset-specific data, risk, units, and market-hour contracts are approved                              |
| LINE Messaging API           | Web Push coverage is insufficient and Official Account onboarding/quota is accepted                   |
| Broker integration           | A separate security, compliance, credential, audit, and failure-recovery design is approved           |
| Social/community             | A validated user problem requires it; engagement alone is insufficient                                |
| Billing/subscriptions        | A public commercial offering and entitlement model are approved                                       |
| TypeScript migration         | Measured defect or maintenance cost justifies a separate migration project                            |
| Multiple backend replicas    | Distributed scheduler lease and shared rate limiting are implemented first                            |
| Exchange calendar dependency | Quote-session metadata proves insufficient around actual exchange holidays                            |

## 14. Approved design decisions

- Multi-user foundation and personal-grade investment workflow from the start.
- Decision support only; no order execution.
- US stocks and ETFs in v1.
- Beginner-to-advanced progressive disclosure.
- Decision Workflow Hub information architecture.
- Deterministic Today priority: Protect, Prepare, Opportunity, Learn.
- Guided Analyze -> Plan workflow with one primary action per verdict.
- Discover, Portfolio, and Journal connected as a learning loop.
- Explicit multi-rule alerts with optional Journal/Plan prefill and mandatory confirmation.
- Redacted lock-screen notifications.
- Data-quality push after two consecutive verification failures.
- Fifteen-minute default polling and edge-triggered repeat semantics.
- Modular monolith and vertical-slice delivery.
