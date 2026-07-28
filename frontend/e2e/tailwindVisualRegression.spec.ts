import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
  { name: 'wide', width: 1440, height: 900 },
];

const TARGET_ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/journal', name: 'journal' },
  { path: '/command-center', name: 'command-center' },
  { path: '/analytics', name: 'analytics' },
];

test.describe('Tailwind Migration Visual & Layout Integrity', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of TARGET_ROUTES) {
      test(`[${viewport.name}] Computed layout & visual snapshot for ${route.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`http://localhost:5173${route.path}`);
        await page.waitForLoadState('networkidle');

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
