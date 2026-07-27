import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) Quality Gate', () => {
  const pagesToScan = [
    { name: 'Dashboard', url: '/' },
    { name: 'Command Center', url: '/command-center' },
    { name: 'Journal', url: '/journal' },
    { name: 'Watchlist', url: '/watchlist' },
    { name: 'Risk', url: '/risk' },
  ];

  for (const p of pagesToScan) {
    test(`${p.name} page meets WCAG 2.1 accessibility standards`, async ({ page }) => {
      await page.goto(p.url);

      // Wait for loading to settle
      await expect(page.locator('text=กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 15000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['color-contrast']) // Color contrast is checked in dark UI theme specs
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
