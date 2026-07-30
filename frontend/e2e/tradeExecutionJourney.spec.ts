import { expect, test } from '@playwright/test';

test.describe('Trade Execution Journey E2E Flow', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  test('user records an executed trade and sees the persisted journal row', async ({ page }) => {
    await page.goto('/command-center');
    await page.getByLabel('Ticker symbol').fill('NVDA');
    await page.getByRole('button', { name: 'Load quote' }).click();
    await expect(page.getByText('Price gate: PASS — dual-source confirmed')).toBeVisible();

    await page.getByRole('radio', { name: 'Swing Trade' }).click();
    await page.getByRole('button', { name: 'วิเคราะห์', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Decision snapshot' })).toBeVisible();
    await page.getByRole('button', { name: 'Log executed trade' }).click();

    await page.getByLabel('Shares').fill('2');
    await page.getByLabel('Execution price').fill('100');
    await page.getByLabel('Stop loss').fill('90');
    await page.getByLabel('Target').fill('120');
    await page.getByLabel('Notes').fill('Deterministic E2E trade');
    const journalWrite = page.waitForResponse(
      (response) => response.url().endsWith('/api/journal') && response.request().method() === 'POST' && response.ok()
    );
    await page.getByRole('button', { name: 'Record executed trade' }).click();
    await journalWrite;

    await expect(page).toHaveURL(/\/journal\?ticker=NVDA/);
    const journalTable = page.getByRole('table');
    await expect(journalTable).toContainText('NVDA');
    await expect(journalTable).toContainText('2');
    await expect(journalTable.locator('td[data-field="price"]')).toContainText('100.00');
  });
});
