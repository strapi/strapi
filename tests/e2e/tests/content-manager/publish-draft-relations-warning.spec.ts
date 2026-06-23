import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait, findAndClose } from '../../../utils/shared';

const CREATE_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;

test.describe('Publish with draft relations warning', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('warns on publish with bidirectional M2M draft relations', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.waitForURL(CREATE_URL);

    await page.getByRole('textbox', { name: 'title' }).fill('Article with draft author');
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByLabel('Coach BeardDraft').click();

    await page.getByRole('button', { name: 'Publish' }).click();

    const confirmationDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(confirmationDialog).toBeVisible();
    await expect(confirmationDialog.getByText(/1 linked entry is still in draft/)).toBeVisible();
    await expect(
      confirmationDialog.getByRole('button', { name: 'Publish', exact: true })
    ).toBeVisible();

    await confirmationDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmationDialog).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Published' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Coach Beard' })).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(confirmationDialog).toBeVisible();
    await clickAndWait(
      page,
      confirmationDialog.getByRole('button', { name: 'Publish', exact: true })
    );
    await findAndClose(page, 'Published Document');

    await expect(page.getByRole('tab', { name: 'Published' })).toBeEnabled();
    await clickAndWait(page, page.getByRole('tab', { name: 'Published' }));
    // Draft relation targets are not listed on the published read-only view.
    await expect(page.getByRole('button', { name: 'Coach Beard' })).not.toBeVisible();

    await clickAndWait(page, page.getByRole('tab', { name: 'Draft' }));
    await expect(page.getByRole('button', { name: 'Coach Beard' })).toBeVisible();
  });
});
