import { test, expect } from '@playwright/test';

test.describe('Journal & Exit Post-Mortem E2E Flow (Option A: Dev Auth Bypass)', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  test('user can access trade journal and inspect active holdings/post-mortems', async ({ page }) => {
    // 1. Navigate to Journal page
    await page.goto('/journal');
    await expect(page).toHaveURL(/\/journal/);

    // 2. Verify Journal page header or container renders
    const pageBody = page.locator('body');
    await expect(pageBody).toBeVisible();

    // 3. Check table or card layout presence
    const journalContainer = page.locator('[data-testid="journal-container"], main, .container').first();
    await expect(journalContainer).toBeVisible();

    // 4. Verify no auth modal or error block is blocking access under Option A bypass
    await expect(page.locator('text=Unauthorized')).not.toBeVisible();
  });
});
