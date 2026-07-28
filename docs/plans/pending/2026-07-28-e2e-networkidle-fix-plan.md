---
status: Pending
updated_at: "2026-07-28"
owner: AI Agent / Developer
---

# Implementation Plan: E2E Playwright Networkidle Remediation

**Date:** July 28, 2026  
**Status:** Pending Approval  
**Category:** Testing & CI/CD Gate Stability  
**Target File:** `frontend/e2e/tailwindVisualRegression.spec.ts`

---

## 1. Context & Problem Statement

During execution of the repository PR Quality Assurance suite (`npm run check:pr`), **Gate 10 (Deterministic E2E and accessibility)** failed with 4 timeouts out of 159 tests.

### Gate Failure Trace:
```text
1) [chromium] › frontend/e2e/tailwindVisualRegression.spec.ts:25:7 › [mobile] Computed layout for market-explorer
   Test timeout of 30000ms exceeded.
   Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
     await page.goto(route.path);
   > await page.waitForLoadState('networkidle');
```

All 4 failing tests occurred on the `/market` route (`MarketExplorerPage.jsx`) across the 4 tested viewports (`mobile`, `tablet`, `laptop`, `desktop`).

---

## 2. Root Cause Analysis

1. **TradingView Embed Streaming**: `MarketExplorerPage.jsx` embeds a live TradingView Advanced Chart Widget via an `<iframe>` (`https://www.tradingview-widget.com/embed-widget/advanced-chart/...`).
2. **Network Activity Idle Contradiction**: The TradingView widget maintains active background network connections (font downloads, chart data updates, polling, telemetry).
3. **Playwright Anti-Pattern**: The test specification uses `await page.waitForLoadState('networkidle')`. Playwright defines `networkidle` as zero active network connections for at least 500ms. Because TradingView streams continuously, `networkidle` is never reached, resulting in a 30-second test timeout.

---

## 3. Proposed Fix & Technical Architecture

Replace the `networkidle` browser-wide load waiter with **Deterministic UI Contract Assertions** following Playwright official best practices.

### Key Remediation Principles:
- **Zero Hardcoded Timers**: No `waitForTimeout(...)` or arbitrary sleep durations.
- **Production Safety**: Zero changes to production code (`src/`).
- **Deterministic Event Gate**: Use `waitUntil: 'domcontentloaded'` alongside `expect(locator).toBeVisible()`.

### Code Specification (`frontend/e2e/tailwindVisualRegression.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

const TARGET_ROUTES = [
  { path: '/', name: 'today' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/risk', name: 'risk' },
  { path: '/market', name: 'market-explorer' },
  { path: '/journal', name: 'journal' },
  { path: '/command-center', name: 'command-center' },
  { path: '/analytics', name: 'analytics' },
  { path: '/config', name: 'config' },
  { path: '/ticker/AAPL', name: 'ticker-detail' },
];

async function mockPreferences(page) {
  await page.route('**/api/preferences', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        reporting_currency: 'THB',
        disclosure_level: 'beginner',
        theme: 'dark',
        onboarding_completed: true,
        onboarding_completed_at: '2026-07-28T00:00:00.000Z',
      },
    }),
  );
}

test.describe('Tailwind Migration Visual & Layout Integrity', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of TARGET_ROUTES) {
      test(`[${viewport.name}] Computed layout & visual snapshot for ${route.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mockPreferences(page);
        
        // 1. Navigate using standard DOMContentLoaded event
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });

        // 2. Deterministic UI contract assertions
        await expect(page.locator('[data-ui-contract="app-root"]')).toBeVisible();
        await expect(page.locator('[data-ui-contract="app-content"]')).toBeVisible();

        // 3. Computed CSS property checks
        const body = page.locator('body');
        const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

        // 4. Tabular font checks
        const financialNums = page.locator('.tabular-nums, [data-financial-num]').first();
        if (await financialNums.isVisible()) {
          const fontVariant = await financialNums.evaluate((el) => window.getComputedStyle(el).fontVariantNumeric);
          expect(fontVariant).toContain('tabular-nums');
        }
      });
    }
  }
});
```

---

## 4. Verification Plan

Upon approval to execute this plan:
1. Apply the updated spec to `frontend/e2e/tailwindVisualRegression.spec.ts`.
2. Run targeted test: `npx playwright test frontend/e2e/tailwindVisualRegression.spec.ts`.
3. Run complete monorepo QA suite: `npm run check:pr` to confirm all 12 Gates pass (`✅ PASS`).
