import { expect, test } from '@playwright/test';
import { DEVELOP_DARK_TOKENS, DEVELOP_SHELL_BASELINE } from './baselines/develop-055a92c';

const THEME_CASES = [
  { name: 'light', preference: 'light', colorScheme: 'light', surface: 'rgb(255, 255, 255)', foreground: 'rgb(9, 9, 11)' },
  { name: 'dark', preference: 'dark', colorScheme: 'light', surface: 'rgb(23, 23, 23)', foreground: 'rgb(237, 237, 237)' },
  { name: 'system-light', preference: 'system', colorScheme: 'light', surface: 'rgb(255, 255, 255)', foreground: 'rgb(9, 9, 11)' },
  { name: 'system-dark', preference: 'system', colorScheme: 'dark', surface: 'rgb(23, 23, 23)', foreground: 'rgb(237, 237, 237)' },
] as const;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, columns: 1 },
  { name: 'tablet', width: 768, height: 1024, columns: 1 },
  { name: 'laptop', width: 1024, height: 768, columns: 2 },
  { name: 'desktop', width: 1440, height: 900, columns: 2 },
] as const;

const ROUTES = ['/', '/dashboard', '/risk', '/command-center', '/market', '/journal', '/analytics', '/config', '/ticker/AAPL'] as const;

async function mockPreferences(page, theme: string) {
  await page.route('**/api/preferences', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        reporting_currency: 'THB',
        disclosure_level: 'beginner',
        theme,
        onboarding_completed: true,
        onboarding_completed_at: '2026-07-28T00:00:00.000Z',
      },
    });
  });
}

function expectBoxWithin(actual: Record<string, number> | null, expected: Record<string, number>, tolerance = 2) {
  expect(actual).not.toBeNull();
  for (const [property, value] of Object.entries(expected)) {
    expect(Math.abs(actual![property] - value), `${property} must stay within ${tolerance}px of develop@055a92c`).toBeLessThanOrEqual(tolerance);
  }
}

test.describe('Tailwind semantic theme contract', () => {
  for (const themeCase of THEME_CASES) {
    for (const route of ROUTES) {
      test(`${route} follows ${themeCase.name} semantic tokens`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: themeCase.colorScheme });
        await mockPreferences(page, themeCase.preference);
        await page.goto(route);
        await expect(page.getByText('กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 15_000 });

        const appRoot = page.locator('[data-ui-contract="app-root"]');
        await expect(appRoot).toBeVisible();
        await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe(themeCase.name.endsWith('dark') ? 'dark' : 'light');
        await page.waitForTimeout(700);

        const colors = await appRoot.evaluate((element) => {
          const rootStyle = window.getComputedStyle(element);
          const panel = element.querySelector('[class*="bg-panel"], [class*="bg-surface"]');
          const panelStyle = panel ? window.getComputedStyle(panel) : null;
          return {
            foreground: rootStyle.color,
            panel: panelStyle?.backgroundColor,
          };
        });

        expect(colors.foreground).toBe(themeCase.foreground);
        if (colors.panel && colors.panel !== 'rgba(0, 0, 0, 0)') expect(colors.panel).toBe(themeCase.surface);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
      });
    }
  }

  for (const viewport of VIEWPORTS) {
    test(`Dashboard keeps the develop layout topology at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockPreferences(page, 'dark');
      await page.goto('/dashboard');
      await expect(page.getByText('กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 15_000 });

      const portfolioSummary = page.getByRole('region', { name: 'Portfolio summary' });
      const quickActions = page.getByRole('region', { name: 'Quick Actions' });
      const nav = page.getByRole('navigation', { name: 'Main navigation' });
      const main = page.locator('main');
      const header = page.locator('main > header');
      const heading = page.getByRole('heading', { level: 1 });
      const [summaryBox, actionsBox, navBox, mainBox, headerBox, headingBox] = await Promise.all([
        portfolioSummary.boundingBox(),
        quickActions.boundingBox(),
        nav.boundingBox(),
        main.boundingBox(),
        header.boundingBox(),
        heading.boundingBox(),
      ]);

      expect(summaryBox).not.toBeNull();
      expect(actionsBox).not.toBeNull();

      if (viewport.columns === 2) {
        expect(actionsBox!.x).toBeGreaterThan(summaryBox!.x + summaryBox!.width - 2);
        expect(Math.abs(actionsBox!.y - summaryBox!.y)).toBeLessThanOrEqual(2);
      } else {
        expect(actionsBox!.y).toBeGreaterThan(summaryBox!.y + summaryBox!.height - 2);
        expect(Math.abs(actionsBox!.x - summaryBox!.x)).toBeLessThanOrEqual(2);
      }

      const baseline = DEVELOP_SHELL_BASELINE[viewport.name];
      expectBoxWithin(navBox, baseline.nav);
      expectBoxWithin(mainBox, baseline.main);
      expectBoxWithin(headerBox, baseline.header);
      expectBoxWithin(headingBox, baseline.heading);

      const tokens = await page.locator('html').evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.getPropertyValue('--background').trim(),
          foreground: style.getPropertyValue('--foreground').trim(),
          surface: style.getPropertyValue('--surface').trim(),
          border: style.getPropertyValue('--border').trim(),
        };
      });
      expect(tokens).toEqual(DEVELOP_DARK_TOKENS);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});
