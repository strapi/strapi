import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Bulk locale actions', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Bulk locale modal lists all locales after creating a new localization', async ({
    page,
  }) => {
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

    await expect(
      page.getByRole('row', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Unpublish multiple locales', exact: true }).click();

    await expect(page.getByRole('row', { name: /English \(en\)/ })).toBeVisible();

    await page.getByText('Unpublish multiple locales').click();
    await page.getByRole('checkbox', { name: 'Select en' }).click();
    await page.getByRole('button', { name: 'Unpublish' }).click();

    await findAndClose(page, 'Successfully unpublished');
  });
});
