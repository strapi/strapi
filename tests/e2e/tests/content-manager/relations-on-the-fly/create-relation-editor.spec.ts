import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';
import { AUTHOR_EMAIL_ADDRESS, AUTHOR_PASSWORD } from '../../../constants';

test.describe('Relations on the fly - Create a Relation', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page, username: AUTHOR_EMAIL_ADDRESS, password: AUTHOR_PASSWORD });
  });

  test('I want to try to create a relation as an author without the permission to do it', async ({
    page,
  }) => {
    // Step 1. Got to Article collection-type and open one article
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Step 2. Try to Open the create relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    const createRelationButton = page.getByRole('option', { name: 'Create a relation' });
    await expect(createRelationButton).toBeDisabled();
    await expect(createRelationButton).toHaveAttribute('aria-disabled', 'true');
  });
});
