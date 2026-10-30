import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import {
  clickAndWait,
  clickPublishExpectDraftRelationsDialog,
  clickPublishExpectNoDraftRelationsDialog,
  findAndClose,
  navToHeader,
  withContentManagerPublish,
} from '../../../utils/shared';
import { selectRelationComboboxOption } from './publish-draft-relations-warning.utils';

/**
 * Seed product name in the app-template dataset (see entities_00001.jsonl).
 * Combobox options use the full name plus a Draft/Published suffix — see relation-option-probe.spec.ts.
 */
const NIKE_JERSEY_NAME = 'Nike Mens 23/24 Away Stadium Jersey';

/**
 * The Shop single type's product carousel: a oneToMany products relation inside a dynamic zone
 * component.
 */
test.describe('Publish draft-relations warning — xToOne-style relations', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  test('Shop product carousel warns when linking an unpublished product', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    await page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/actions/countDraftRelations') &&
        response.ok()
    );

    await clickAndWait(page, page.getByRole('button', { name: 'Product carousel - 23/24 kits' }));
    await page.getByRole('combobox', { name: 'products' }).click();
    await selectRelationComboboxOption(page, NIKE_JERSEY_NAME, 'draft');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
  });

  test('Shop product carousel does not warn when linking an already-published product', async ({
    page,
  }) => {
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: NIKE_JERSEY_NAME }));
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish', exact: true }).click()
    );
    await findAndClose(page, 'Published Document');

    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    await page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/actions/countDraftRelations') &&
        response.ok()
    );

    await clickAndWait(page, page.getByRole('button', { name: 'Product carousel - 23/24 kits' }));
    await page.getByRole('combobox', { name: 'products' }).click();
    await selectRelationComboboxOption(page, NIKE_JERSEY_NAME, 'published');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });
});
