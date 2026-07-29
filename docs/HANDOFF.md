# MyPortStock TH/EN Runtime Language Handoff

**Date:** July 29, 2026
**Workspace:** `/Users/nopparuj/my-agents/MyPortStock`
**Scope:** Engineering — runtime UI language selection and persistence

## Outcome

MyPortStock can switch its active interface from Thai to English at runtime. The selected language is saved per authenticated user, restored on the next session, applied during onboarding, and forwarded to AI analysis/chat so generated content follows the active language.

## Runtime Contract

- Supported language codes: `th` and `en`.
- Default language: `th`.
- The header `TH`/`EN` control changes language immediately after the preference save succeeds.
- Config provides the same setting under General Settings.
- First-run onboarding can switch language before a preference row exists and persists the selected value on submit.
- `<html lang>` follows the active preference.
- Journal, Analytics, and shared timestamps use `th-TH` or `en-US` locale according to the active language.
- Missing translation keys fail visibly by returning the key path; English never silently falls back to Thai.
- User-authored content, ticker symbols, universal finance terms, and numeric market data are preserved rather than translated.

## Implemented Surfaces

- App shell: route titles, navigation, quick search, preference loading/error states.
- Dashboard: summary, holdings, quick actions, watchlist, scenario planner.
- Today and Portfolio Risk: page states, alerts, actions, and accessibility labels.
- Command Center and ticker drilldown: analysis controls, tabs, translated actions, and language-aware AI requests.
- Market Explorer, Trade Journal, Analytics, Equity Curve, Command Palette, Config, and Onboarding.
- AI analysis/chat: frontend sends `language`; backend allowlists `en` and otherwise defaults to `th`; Gemini prompts and structured analysis headings use the selected language.

`frontend/src/pages/AIFloorPage.jsx` is not part of the production router. Its isolated UI-contract harness remains outside this runtime localization scope.

## Persistence and Database

- Preference validation accepts only `th` or `en`.
- Canonical migration: `supabase/migrations/20260729170500_add_user_language.sql`.
- Database column: `user_preferences.language TEXT NOT NULL DEFAULT 'th'`.
- Check constraint: `language IN ('th', 'en')`.
- An unmigrated database retries writes without the unknown column, but reports the persisted/default language honestly instead of claiming an English preference was saved.
- Apply the migration before deployment; the compatibility fallback is not a substitute for migration.

## Regression Coverage

- Public shell test proves the header switch changes `วันนี้` to `Today`, changes navigation copy, and updates `<html lang>`.
- Onboarding test proves English can be selected and saved before onboarding completes.
- Catalog parity test requires Thai and English to expose the same key paths.
- Public page/component tests cover English rendering for Dashboard, Command Palette, Journal, Analytics, Config, Today, Risk, Command Center, and ticker detail.
- AI tests prove English requests reach both analysis/chat APIs and produce English-only prompt instructions.
- Backend tests cover preference defaults, English round-trip persistence, invalid-language rejection, pre-migration fallback behavior, route language normalization, migration schema, and database constraints.

Targeted tests support the RED/GREEN loop, but do not replace final repository verification. After the last file mutation, run exactly one non-concurrent:

```bash
npm run check:pr
```

Acceptance requires all 12 Merge Gates in `artifacts/reports/pr-check-report.json` to report `PASS`.

## Deployment Checklist

1. Apply `20260729170500_add_user_language.sql` to the target Supabase project.
2. Deploy backend and frontend from the same source revision.
3. Sign in, switch `TH` to `EN`, reload, and confirm the preference remains English.
4. Run one AI analysis and one chat request; confirm generated copy follows English.
