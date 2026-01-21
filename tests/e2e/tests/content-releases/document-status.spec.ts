import { test, expect } from '@playwright/test';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Releases - Document status', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('history-spec', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      resetAlways: true, // NOTE: this makes tests extremely slow, but it's necessary to ensure isolation between tests
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('should update the document status when a release is published', async ({ page }) => {
    const releaseName = 'Trent Crimm: The Independent';
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    await expect(
      page.getByRole('row').nth(1).getByRole('status', { name: 'published' })
    ).toBeVisible();
    await expect(page.getByRole('row').nth(2).getByRole('status', { name: 'draft' })).toBeVisible();

    await page.getByRole('row').nth(2).getByRole('button', { name: 'Row actions' }).click();
    await page.getByRole('menuitem', { name: 'Add to release' }).click();
    await page.getByRole('combobox', { name: 'Select a release' }).click();
    await page.getByRole('option', { name: releaseName }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await navToHeader(page, ['Releases'], 'Releases');
    await clickAndWait(page, page.getByRole('link', { name: releaseName }));
    await expect(page.getByRole('heading', { name: releaseName })).toBeVisible();
    await clickAndWait(page, page.getByRole('button', { name: 'Publish', exact: true }));

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await expect(page.getByRole('row').nth(1).getByRole('status', { name: 'draft' })).toBeVisible();
    await expect(
      page.getByRole('row').nth(2).getByRole('status', { name: 'published' })
    ).toBeVisible();

    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();
  });
});
