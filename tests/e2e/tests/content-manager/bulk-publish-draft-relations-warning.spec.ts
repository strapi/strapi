import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';
import {
  BIDIRECTIONAL_M2M_LAB_FIELD,
  connectRelationTarget,
  createRelationTarget,
  saveRelationLabDraft,
} from './publish-draft-relations-warning.utils';

test.describe('Bulk publish draft-relations warning', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  test('warns when bulk publishing non-i18n relation-lab entries linked to draft-only targets', async ({
    page,
  }) => {
    await createRelationTarget(page, 'Bulk M2M target one', { publish: false });
    await createRelationTarget(page, 'Bulk M2M target two', { publish: false });

    for (const [title, targetName] of [
      ['Bulk lab one', 'Bulk M2M target one'],
      ['Bulk lab two', 'Bulk M2M target two'],
    ] as const) {
      await navToHeader(page, ['Content Manager', 'Relation lab'], 'Relation lab');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
      await saveRelationLabDraft(page, title);
      await connectRelationTarget(page, BIDIRECTIONAL_M2M_LAB_FIELD, targetName, 'draft');
      await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
      await findAndClose(page, 'Saved Document');
    }

    await navToHeader(page, ['Content Manager', 'Relation lab'], 'Relation lab');

    await page
      .getByRole('row', { name: /Bulk lab one/ })
      .getByRole('checkbox')
      .check();
    await page
      .getByRole('row', { name: /Bulk lab two/ })
      .getByRole('checkbox')
      .check();

    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }).first());

    await expect(page.getByRole('heading', { name: 'Publish entries' })).toBeVisible();
    await clickAndWait(
      page,
      page.getByLabel('Publish entries').getByRole('button', { name: 'Publish' })
    );

    const dialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(dialog).toBeVisible();
    // ICU plural chunks add extra spaces in the DOM text Playwright reads — avoid tight single-space regexes.
    await expect(dialog).toContainText('not published yet and might lead to unexpected behavior');
    await expect(dialog).toContainText(/2\s+relations\s+out of\s+2\s+entries/i);
    await expect(dialog.getByRole('button', { name: 'Publish' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).not.toBeVisible();
  });
});
