---
status: Stable
audience: Human Developer & AI Agent
associated_plan: file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/webapp-pwa-implementation-plan.md
primary_tests: "npm test && npm run build"
---

# ADR 0005: PWA-First Delivery on the Existing Vite and Express Stack

## Status

Accepted — revised after implementation-plan review on 2026-06-28.

## Context

MyPortStock is an authenticated React 19 + Vite 8 SPA with an Express 5 backend, WebSocket events, Clerk authentication, and per-user Supabase data. It needs installable desktop/mobile access and scheduled notifications. SEO and server-rendered public pages are not requirements.

The original proposal combined PWA delivery, a full TypeScript migration, alert scheduling, Web Push, LINE Notify, Capacitor, and VPS provisioning. Review found that this made unrelated work a prerequisite, depended on the discontinued LINE Notify service, and left service-worker privacy and alert data-integrity requirements underspecified.

## Decision

1. **Keep Vite + Express.**
   - No Next.js or React Native migration.
   - Existing routing, Clerk integration, WebSocket behavior, and tests remain intact.

2. **Deliver a PWA with static-only caching.**
   - Use `vite-plugin-pwa` with `injectManifest` because Web Push requires custom `push` and `notificationclick` handlers.
   - Precache the application shell only.
   - Never runtime-cache `/api/*`; authenticated portfolio, journal, watchlist, quote, packet, and analysis responses must always come from the network and fail closed when unavailable.
   - Do not disable browser zoom. iOS push support is accepted only for a Home Screen-installed web app with user-granted permission.

3. **Use existing verified quote infrastructure for alerts.**
   - Alert evaluation must reuse the existing two-source quote packet and Current Price Acceptance Gate.
   - A single Yahoo quote cannot trigger an alert.
   - Initial thresholds come from existing `watchlists.alert_price`/`alert_type` and active journal `stop_loss`/`target`; no speculative alert-rule abstraction is added.
   - Persist edge state and immutable, idempotent alert events in additive Supabase tables.

4. **Use a bounded in-process scheduler for the single VPS process.**
   - Use recursive `setTimeout`, not `node-cron`.
   - Default interval is 15 minutes, with an environment kill switch, a ticker cap, no overlapping cycles, and sanitized health state.
   - Use IANA time zones rather than hardcoded ET-to-ICT conversions.
   - Before horizontal scaling, add a distributed lease or move scheduling to a dedicated worker.

5. **Use Web Push as the only notification channel in this delivery.**
   - Notification permission is requested only after explicit user interaction.
   - Payloads are factual alert records, not investment recommendations.
   - LINE Notify is rejected because the service ended on 2025-03-31. LINE Messaging API is a separate future decision because it requires Official Account onboarding, recipient identity mapping, and quota acceptance.

6. **Do not block delivery on a full TypeScript migration.**
   - Keep current JavaScript/JSX conventions for this plan.
   - Treat TypeScript migration as a separate technical-debt project triggered by measured defect or maintenance cost.

7. **Defer Capacitor and store distribution.**
   - Reconsider only when native APIs or App Store/Play Store distribution become requirements.

## Consequences

### Positive

- Smallest change that provides installability and background notifications.
- No private API responses remain in service-worker Cache Storage.
- Alerts preserve the repository's verified-price and fail-closed contracts.
- No dependency on a discontinued notification service.
- Rollback is immediate through `ALERT_SCHEDULER_ENABLED=false` and normal web deployment.

### Negative

- No offline portfolio or quote experience.
- iOS users must add the app to Home Screen before Web Push works.
- One-process scheduling does not support horizontal replicas.
- Exchange holidays rely on quote-session metadata until evidence justifies a calendar dependency.
- The codebase remains mixed runtime-validated JavaScript rather than statically typed TypeScript.

## Alternatives considered

| Alternative                     | Decision                                                               |
| :------------------------------ | :--------------------------------------------------------------------- |
| Next.js App Router              | Rejected: no SSR/SEO benefit and high routing/WebSocket migration cost |
| Full TypeScript migration first | Deferred: unrelated prerequisite with large blast radius               |
| Cache non-price API responses   | Rejected: risks retaining private per-user data across auth sessions   |
| `node-cron`                     | Rejected: native timers satisfy the single-process requirement         |
| LINE Notify                     | Rejected: service discontinued                                         |
| LINE Messaging API              | Deferred: separate onboarding, identity, and quota design              |
| Capacitor-first                 | Deferred: no current native-only requirement                           |
| Distributed scheduler           | Deferred until more than one backend replica exists                    |

## Verification

```bash
npm test
npm run build
npm run lint
```

Production acceptance additionally requires HTTPS installability checks, iOS Home Screen push verification, a controlled false-to-true alert transition, duplicate suppression, and a forced quote-gate failure proving that no alert is emitted.
