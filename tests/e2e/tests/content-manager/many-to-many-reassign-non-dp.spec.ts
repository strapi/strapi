import { test, expect } from '@playwright/test';

import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';
import { login } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import {
  clickAndWait,
  findAndClose,
  navToHeader,
  withContentManagerPublish,
} from '../../../utils/shared';

const TARGET_NAME = 'CMS 1514 non-DP target';

test.describe(
  'Many-to-many reassignment to a non-Draft & Publish target',
  { tag: ['@extended'] },
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await resyncSuperAdminPermissionsAfterImport();
      await page.goto('/admin');
      await login({ page });
    });

    test('offers a target that remains related only from the published source', async ({
      page,
    }) => {
      const adminLogin = await page.request.post('/admin/login', {
        data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
      });
      const adminToken = (await adminLogin.json()).data?.token;
      expect(adminToken, 'admin API login failed').toBeTruthy();
      const targetResponse = await page
        .context()
        .request.post(
          '/content-manager/collection-types/api::relation-target-non-dp.relation-target-non-dp',
          { data: { name: TARGET_NAME }, headers: { Authorization: `Bearer ${adminToken}` } }
        );
      expect(targetResponse.ok()).toBe(true);

      await navToHeader(page, ['Content Manager', 'Relation lab'], 'Relation lab');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
      await page.getByRole('textbox', { name: 'title' }).fill('CMS 1514 source');
      await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
      await findAndClose(page, 'Saved Document');

      await page.getByRole('combobox', { name: 'manyToManyNonDp' }).click();
      await clickAndWait(page, page.getByRole('option', { name: TARGET_NAME }));
      await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
      await findAndClose(page, 'Saved Document');
      await withContentManagerPublish(page, () =>
        page.getByRole('button', { name: 'Publish', exact: true }).click()
      );
      await findAndClose(page, 'Published Document');

      await page
        .getByRole('listitem')
        .filter({ hasText: TARGET_NAME })
        .getByRole('button', { name: 'Remove' })
        .click();
      await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
      await findAndClose(page, 'Saved Document');

      await clickAndWait(page, page.getByRole('tab', { name: 'Published' }));
      await expect(page.getByRole('button', { name: TARGET_NAME })).toBeVisible();
      await clickAndWait(page, page.getByRole('tab', { name: 'Draft' }));

      await page.getByRole('combobox', { name: 'manyToManyNonDp' }).click();
      await expect(page.getByRole('option', { name: TARGET_NAME })).toBeVisible();
    });
  }
);
