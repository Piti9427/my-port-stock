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

    // 2. Wait for preferences gateway loading to settle
    await expect(page.locator('text=กำลังโหลดข้อมูล')).not.toBeVisible({ timeout: 10000 });

    // 3. Verify Journal page layout or main content renders
    const mainContainer = page.locator('main, .journal-page, #main-content').first();
    await expect(mainContainer).toBeVisible({ timeout: 10000 });

    // 4. Verify no auth error block is blocking access
    await expect(page.locator('text=Unauthorized')).not.toBeVisible();
  });
});
