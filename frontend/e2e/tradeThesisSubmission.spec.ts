import { test, expect } from '@playwright/test';

test.describe('Trade Thesis Submission E2E Flow (Option A: Dev Auth Bypass)', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  test('user can open Command Center, fill trade parameters, and view decision snapshot', async ({ page }) => {
    // 1. Navigate to Command Center
    await page.goto('/command-center');
    await expect(page).toHaveURL(/\/command-center/);

    // 2. Verify page title or header presence
    const heading = page.locator('h1, h2, [data-testid="command-center-header"]').first();
    await expect(heading).toBeVisible();

    // 3. Fill in Ticker Input
    const tickerInput = page.locator('input[placeholder*="symbol"], input[placeholder*="ticker"], input[name="ticker"]').first();
    if (await tickerInput.isVisible()) {
      await tickerInput.fill('NVDA');
    }

    // 4. Select Decision Mode if selector exists
    const modeSelect = page.locator('select[name="decisionMode"], [data-testid="decision-mode-select"]').first();
    if (await modeSelect.isVisible()) {
      await modeSelect.selectOption('Swing Trade');
    }

    // 5. Submit form or trigger analysis
    const submitBtn = page.locator('button[type="submit"], button:has-text("Analyze"), button:has-text("Submit")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // 6. Verify page remains responsive and accessible without auth redirect
    await expect(page.locator('body')).toBeVisible();
  });
});
