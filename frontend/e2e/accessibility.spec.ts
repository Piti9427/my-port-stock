import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) Quality Gate', () => {
  test('Dashboard page meets WCAG 2.1 accessibility standards', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Color contrast is checked in dark UI theme specs
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
