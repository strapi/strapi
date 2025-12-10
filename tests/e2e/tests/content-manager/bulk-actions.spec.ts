import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Bulk actions', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to be able to disable the bulk actions on a content type', async ({
    page,
  }) => {
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.getByRole('checkbox', { name: 'Select all entries' }).click();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
    await page.getByRole('button', { name: 'View settings' }).click();
    await page.getByRole('link', { name: 'Configure the view' }).click();
    await page.getByRole('checkbox', { name: 'Enable bulk actions' }).uncheck();
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));
    await page.getByRole('checkbox', { name: 'Select all entries' }).click();
    await expect(page.getByRole('button', { name: 'Publish' })).not.toBeVisible();
  });
});
