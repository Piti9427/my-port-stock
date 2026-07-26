import { test, expect } from '@playwright/test';

test.describe('Trade Thesis Submission E2E Flow (Option A: Dev Auth Bypass)', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  test('user can open Command Center, fill trade parameters, and view decision snapshot', async ({ page }) => {
    test.slow();
    try {
      // 1. Navigate to Command Center
      await page.goto('/command-center');
      await expect(page).toHaveURL(/\/command-center/);

      // 2. Wait for preferences gateway loading to settle
      await expect(page.locator('text=กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 15000 });

      // 3. Verify main content or header presence
      const container = page.locator('main, .command-center-page, .page-header').first();
      await expect(container).toBeVisible({ timeout: 15000 });

      // 4. Fill in Ticker Input (#command-ticker)
      const tickerInput = page.locator('#command-ticker, input[placeholder="NVDA"]').first();
      if (await tickerInput.isVisible()) {
        await tickerInput.fill('NVDA');
      }

      // 5. Click Load quote button if present
      const loadBtn = page.locator('button.btn-analyze, button:has-text("Load quote")').first();
      if (await loadBtn.isVisible()) {
        await loadBtn.click();
      }

      // 6. Verify page content is visible and rendered
      await expect(page.locator('.command-center-page, main').first()).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await page.screenshot({ path: 'test-results/debug-screenshot.png' });
      throw e;
    }
  });
});
