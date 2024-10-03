import { test, expect } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { Admin } from '../../pageHelpers/Admin';

test.describe('Log Out', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should be able to logout', async ({ page }) => {
    const admin = new Admin(page);

    await admin.clickUser('test testing');
    await admin.clickLogout();

    await admin.assertLoginHeader();
  });
});
