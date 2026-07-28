import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SURFACES = [
  { id: 'landing', landmark: 'main' },
  { id: 'onboarding', landmark: 'main' },
  { id: 'watchlist', text: 'Watchlist & Scanners' },
  { id: 'ai-floor', text: 'AI Trading Floor' },
] as const;

const THEME_CASES = [
  { name: 'light', preference: 'light', colorScheme: 'light', foreground: 'rgb(9, 9, 11)' },
  { name: 'dark', preference: 'dark', colorScheme: 'dark', foreground: 'rgb(237, 237, 237)' },
  { name: 'system-light', preference: 'system', colorScheme: 'light', foreground: 'rgb(9, 9, 11)' },
  { name: 'system-dark', preference: 'system', colorScheme: 'dark', foreground: 'rgb(237, 237, 237)' },
] as const;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

async function mockHarnessData(page) {
  await page.route('**/api/watchlists', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: [
        {
          ticker: 'NVDA',
          name: 'NVIDIA',
          sector: 'Technology',
          price: 130,
          changePct: 2.5,
          volume: '10M',
          aiSignal: 'buy-zone',
          setup: 'Bull flag breakout',
        },
      ],
    })
  );
  await page.route('**/api/ws-ticket', (route) => route.fulfill({ contentType: 'application/json', json: { ticket: 'ui-contract' } }));
}

test.describe('orphan surface component harness', () => {
  for (const viewport of VIEWPORTS) {
    for (const themeCase of THEME_CASES) {
      for (const surface of SURFACES) {
        test(`${surface.id} follows ${themeCase.name} tokens at ${viewport.name}`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await page.emulateMedia({ colorScheme: themeCase.colorScheme });
          await mockHarnessData(page);
          await page.goto(`/ui-contract-harness.html?surface=${surface.id}&theme=${themeCase.preference}`);

          const contract = page.locator(`[data-ui-contract="harness-${surface.id}"]`);
          await expect(contract).toBeVisible();
          if ('landmark' in surface) await expect(page.locator(surface.landmark)).toBeVisible();
          if ('text' in surface) await expect(page.getByText(surface.text, { exact: true }).first()).toBeVisible();

          await expect(page.locator('html')).toHaveAttribute('data-theme', themeCase.name.endsWith('dark') ? 'dark' : 'light');
          await page.waitForTimeout(700);

          const foreground = await contract.evaluate((element) => getComputedStyle(element).color);
          expect(foreground).toBe(themeCase.foreground);

          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow).toBeLessThanOrEqual(2);

          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          expect(axe.violations).toEqual([]);
        });
      }
    }
  }
});
