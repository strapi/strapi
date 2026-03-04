import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Home (EE)', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the last activity widget', async ({ page }) => {
    const auditLogsWidget = page.getByLabel(/Last activity/i);
    await expect(auditLogsWidget).toBeVisible();

    const latestLog = auditLogsWidget.getByRole('row').nth(0);
    await expect(latestLog).toBeVisible();
    await expect(latestLog.getByRole('gridcell', { name: /admin login/i })).toBeVisible();
    await expect(latestLog.getByRole('gridcell', { name: /test testing/i })).toBeVisible();

    // Do any action (update an entry)
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    const title = page.getByLabel(/title/i);
    await title.fill('West Ham pre match pep talk');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));

    await expect(latestLog).toBeVisible();
    await expect(
      latestLog.getByRole('gridcell', { name: /update entry \(article\)/i })
    ).toBeVisible();
    await expect(latestLog.getByRole('gridcell', { name: /test testing/i })).toBeVisible();
  });
});
