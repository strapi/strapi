import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait } from '../../utils/shared';

const AUTHOR_EDIT_URL =
  /\/admin\/content-manager\/collection-types\/api::author.author\/(?!create)[^/]/;

test.describe('Unstable Relations on the fly', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('as a user I want to open a relation modal inside a collection and then open it full page', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();

    // Add a new relation to the entry
    await clickAndWait(page, page.getByRole('combobox', { name: 'authors' }));
    await clickAndWait(page, page.getByLabel('Coach BeardDraft'));
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));
    // it opens the edit relations modal
    await expect(page.getByText('Edit a relation')).toBeVisible();

    // click on the full page icon
    await clickAndWait(page, page.getByRole('link', { name: 'Go to entry' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));
    await page.waitForURL(AUTHOR_EDIT_URL);
    await expect(page.getByRole('heading', { name: 'Coach Beard' })).toBeVisible();
  });
});
