import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';

test.describe('Tutorial', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Shows tutorial on first content type', async ({ page }) => {
    await page.getByRole('link', { name: 'Content-type Builder' }).click();

    const modalHeader = page.getByRole('heading', { name: '🧠 Create a first Collection' });
    expect(modalHeader).toBeVisible();
    await modalHeader.click();

    const closeButton = page.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeVisible();
    await closeButton.click();

    await expect(closeButton).not.toBeVisible();
    await expect(modalHeader).not.toBeVisible();
  });
});
