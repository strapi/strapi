import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition } from '../../utils/shared';

describeOnCondition(process.env.STRAPI_FEATURES_UNSTABLE_RELATIONS_ON_THE_FLY === 'true')(
  'Unstable Relations on the fly',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('as a user I want to open a relation modal inside a collection', async ({ page }) => {
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Author' }));
      await clickAndWait(page, page.getByRole('gridcell', { name: 'Ted Lasso' }));

      await expect(page.getByRole('heading', { name: 'Ted Lasso' })).toBeVisible();

      await clickAndWait(page, page.getByRole('button', { name: 'Pourquoi je préfère le' }));
      // it opens the edit relations modal
      await expect(page.getByText('Edit a relation')).toBeVisible();
    });
  }
);
