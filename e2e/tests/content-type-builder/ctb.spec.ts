import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { navToHeader } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('Edit View CTB', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('A user should be able to navigate to the Edit View of the content type builder and see the contentype fields', async ({
    page,
  }) => {
    await navToHeader(page, ['Content-Type Builder'], 'Article');
    const modal = page.getByRole('button', { name: 'Close' });
    if (modal.isVisible()) {
      modal.click();
    }
    await page.getByRole('link', { name: 'Shop' }).click();
    await expect(
      page.getByRole('button', {
        name: 'Add another field to this component',
      })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add a component' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add another field to this single type' })
    ).toBeVisible();
  });
});
