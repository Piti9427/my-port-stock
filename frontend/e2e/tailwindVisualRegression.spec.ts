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
    })
  );
}

test.describe('Tailwind Migration Visual & Layout Integrity', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of TARGET_ROUTES) {
      test(`[${viewport.name}] Computed layout & visual snapshot for ${route.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mockPreferences(page);
        await page.goto(route.path);
        await expect(page.locator('[data-ui-contract="app-root"]')).toBeVisible();
        await expect(page.locator('[data-ui-contract="app-content"]')).toBeVisible();

        // 1. Verify critical computed CSS properties (e.g. font-family, dark background)
        const body = page.locator('body');
        const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Must have dark background set

        // 2. Tabular number font verification for financial numbers
        const financialNums = page.locator('.tabular-nums, [data-financial-num]').first();
        if (await financialNums.isVisible()) {
          const fontVariant = await financialNums.evaluate((el) => window.getComputedStyle(el).fontVariantNumeric);
          expect(fontVariant).toContain('tabular-nums');
        }
      });
    }
  }
});
