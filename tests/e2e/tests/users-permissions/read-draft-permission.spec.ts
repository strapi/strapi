import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, navToHeader } from '../../../utils/shared';

test.describe('Users & Permissions — Read drafts (Content API)', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Public role shows Read drafts next to Find for draft & publish content types', async ({
    page,
  }) => {
    await navToHeader(page, ['Settings', ['Users & Permissions', 'Roles']], 'Roles');
    await expect(page.getByRole('gridcell', { name: 'Public', exact: true })).toBeVisible();
    await page.getByRole('gridcell', { name: 'Public', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Edit a role/i })).toBeVisible();

    await clickAndWait(page, page.getByRole('button', { name: 'Article' }));
    await expect(page.getByRole('checkbox', { name: /^find$/i })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /^Read drafts$/i })).toBeVisible();
  });
});
