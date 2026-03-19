import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Home', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the last entries assigned to them', async ({ page }) => {
    const assignedWidget = page.getByLabel(/assigned to me/i);
    await expect(assignedWidget).toBeVisible();

    // Make content update in the CM and assign it to the current user
    await navToHeader(page, ['Content Manager'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: /^west ham/i }));

    // Assign the entry to the current user
    await page.getByRole('combobox', { name: 'Assignee' }).click();
    await page.getByRole('option', { name: 'test testing' }).click();
    await findAndClose(page, 'Assignee updated');

    // Go back to the home page, the assigned entry should be visible in the assigned widget
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const assignedEntry = assignedWidget.getByRole('row').nth(0);
    await expect(assignedEntry).toBeVisible();
    await expect(assignedEntry.getByRole('gridcell', { name: /^west ham/i })).toBeVisible();
    await expect(assignedEntry.getByRole('gridcell', { name: /draft/i })).toBeVisible();
  });
});
