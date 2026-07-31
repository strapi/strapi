import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { sharedSetup } from '../../../../utils/setup';
import { addAttributesToContentType } from '../../../../utils/content-types';
import {
  clickAndWait,
  confirmRenameMigration,
  navToHeader,
  findAndClose,
} from '../../../../utils/shared';
import { waitForRestart } from '../../../../utils/restart';

test.describe('CTB - Edit schema without data loss', { tag: ['@critical'] }, () => {
  // Long timeout — triggers multiple server restarts
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-schema-no-data-loss', page, {
      resetFiles: true,
      importData: 'with-admin',
      login: true,
      resetAlways: true,
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Renaming a field preserves existing content data', async ({ page }) => {
    await addAttributesToContentType(page, 'Article', [{ type: 'text', name: 'bio' }]);

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.getByRole('textbox', { name: 'title' }).fill('Rename test entry');
    await page.getByRole('textbox', { name: 'bio' }).fill('preserved bio content');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await navToHeader(page, ['Content-Type Builder', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('button', { name: 'Edit bio' }));
    await page.getByLabel('Name', { exact: true }).fill('biography');
    await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));
    await page.getByRole('button', { name: 'Save' }).click();
    await confirmRenameMigration(page, { preserve: true });
    await waitForRestart(page);

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'Rename test entry' }));
    await expect(page.getByRole('textbox', { name: 'biography' })).toHaveValue(
      'preserved bio content'
    );
  });

  test('Adding then removing a field does not corrupt existing entries', async ({ page }) => {
    // Baseline: the seeded entry has its title
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue(
      'West Ham post match analysis'
    );
    await expect(page.getByRole('textbox', { name: 'slug' })).toHaveValue(
      'west-ham-post-match-analysis'
    );

    // Add a new field — existing data must survive the schema change + restart
    await addAttributesToContentType(page, 'Article', [{ type: 'text', name: 'tempnotes' }]);
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue(
      'West Ham post match analysis'
    );
    await expect(page.getByRole('textbox', { name: 'slug' })).toHaveValue(
      'west-ham-post-match-analysis'
    );

    // Remove the field again — existing data must still survive
    await navToHeader(page, ['Content-Type Builder', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('button', { name: 'Delete tempnotes' }));
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue(
      'West Ham post match analysis'
    );
    await expect(page.getByRole('textbox', { name: 'slug' })).toHaveValue(
      'west-ham-post-match-analysis'
    );
  });
});
