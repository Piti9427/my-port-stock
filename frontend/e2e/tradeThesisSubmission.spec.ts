import { expect, test } from '@playwright/test';

test.describe('Trade Thesis Submission E2E Flow (Option A: Dev Auth Bypass)', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  test('user loads a verified quote and receives a decision snapshot', async ({ page }) => {
    await page.goto('/command-center');
    await expect(page).toHaveURL(/\/command-center/);

    await page.getByLabel('Ticker symbol').fill('NVDA');
    const quoteResponse = page.waitForResponse((response) => response.url().includes('/api/quote/NVDA') && response.ok());
    await page.getByRole('button', { name: 'Load quote' }).click();
    await quoteResponse;
    await expect(page.getByText('Price gate: PASS — dual-source confirmed')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'NVDA' })).toBeVisible();

    const analysisResponse = page.waitForResponse((response) => response.url().endsWith('/api/analyze') && response.ok());
    await page.getByRole('radio', { name: 'Swing Trade' }).click();
    await page.getByRole('button', { name: 'วิเคราะห์', exact: true }).click();
    await analysisResponse;

    const snapshot = page.getByRole('region', { name: 'Decision snapshot' });
    await expect(snapshot).toBeVisible();
    await expect(snapshot).toContainText('NVDA');
    await expect(snapshot.getByRole('button', { name: 'Log executed trade' })).toBeEnabled();
  });
});
