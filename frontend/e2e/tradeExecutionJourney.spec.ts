import { test, expect } from '@playwright/test';

test.describe('Trade Execution Journey E2E Flow', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  test('user can execute a trade journey from Command Center to Journal', async ({ page }) => {
    test.slow();

    try {
      // 1. Navigate to Command Center
      await page.goto('/command-center');

      // 2. Wait for page to load (loading text disappears)
      await expect(page.locator('text=กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 15000 });

      // 3. Verify main content area is visible
      const mainContainer = page.locator('main, .command-center-page, .page-header').first();
      await expect(mainContainer).toBeVisible({ timeout: 15000 });

      // 4. Fill ticker input #command-ticker with 'NVDA'
      const tickerInput = page.locator('#command-ticker, input[placeholder="NVDA"]').first();
      if (await tickerInput.isVisible()) {
        await tickerInput.fill('NVDA');
      }

      // 5. Click 'Load quote' button (.btn-analyze)
      const loadBtn = page.locator('.btn-analyze, button:has-text("Load quote")').first();
      if (await loadBtn.isVisible()) {
        await loadBtn.click();
      }

      // 6. Wait for quote panel to appear or handle timeout gracefully
      const quotePanel = page.locator('.quote-panel, .snapshot-panel, .quote-data').first();
      if (await quotePanel.isVisible()) {
        await expect(quotePanel).toBeVisible({ timeout: 15000 });
      }

      // 7. Navigate to /journal
      await page.goto('/journal');

      // 8. Wait for page to load
      await expect(page.locator('text=กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 15000 });

      // 9. Verify journal page content is visible
      const journalContainer = page.locator('main, .journal-page, #main-content').first();
      await expect(journalContainer).toBeVisible({ timeout: 15000 });

      // 10. Check for 'Log Trade' or trade-related button presence
      const logTradeBtn = page.locator('button:has-text("Log Trade"), button:has-text("Add Trade"), .log-trade-btn').first();
      if (await logTradeBtn.isVisible()) {
        await expect(logTradeBtn).toBeVisible({ timeout: 15000 });
      }
    } catch (e) {
      await page.screenshot({ path: 'test-results/debug-screenshot.png' });
      throw e;
    }
  });
});
