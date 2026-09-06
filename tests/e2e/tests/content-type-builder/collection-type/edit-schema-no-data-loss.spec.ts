import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { sharedSetup } from '../../../../utils/setup';
import { addAttributesToContentType } from '../../../../utils/content-types';
import { clickAndWait, navToHeader, findAndClose } from '../../../../utils/shared';
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

  // KNOWN LIMITATION — not a test bug, skipped intentionally.
  // Strapi does not preserve data when a field is renamed. The CTB writes the new attribute name
  // to the schema; on restart the DB sync (packages/core/database/src/schema/diff.ts) matches
  // columns by name, so the old column is treated as "removed" and dropped (builder.ts ~L355) while
  // the new column is created empty. There is no renameColumn operation for user-initiated renames.
  // Confirmed "expected, not a bug" by maintainers: https://github.com/strapi/strapi/issues/25076
  // (see also #19075, #12626, #12597). Tracked as a feature request:
  // https://feedback.strapi.io/developer-experience/p/gracefully-handle-renaming-of-content-types-and-fields-in-the-ctb
  // Flip this back to a real `test(...)` if/when the CTB supports rename-with-migration.
  test.fixme('Renaming a field preserves existing content data', async ({ page }) => {
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
