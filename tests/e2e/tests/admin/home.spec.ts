import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait } from '../../utils/shared';

test.describe('Home', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should be greeted by their name', async ({ page }) => {
    // "test" is the user fist name in the database
    await expect(page.getByText('Hello test')).toBeVisible();

    // Change the name and make sure it's reflected in the homepage
    await page.getByRole('button', { name: 'test' }).click();
    await clickAndWait(page, page.getByRole('menuitem', { name: /profile/i }));
    await page.getByRole('textbox', { name: /first name/i }).fill('Rebecca');
    await page.getByRole('button', { name: /save/i }).click();
    await clickAndWait(page, page.getByRole('link', { name: 'Home' }));
    await expect(page.getByText('Hello Rebecca')).toBeVisible();
  });
});
