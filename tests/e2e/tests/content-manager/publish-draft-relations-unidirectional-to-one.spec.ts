import { test } from '@playwright/test';
import { loginWithApi } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import {
  clickPublishExpectDraftRelationsDialog,
  clickPublishExpectNoDraftRelationsDialog,
  findAndClose,
} from '../../../utils/shared';
import {
  connectRelationTarget,
  createRelationTarget,
  openNewRelationLab,
  saveRelationLabDraft,
} from './publish-draft-relations-warning.utils';

/**
 * xToOne-style relation-lab fields (unidirectional, stripped on publish) with a single target.
 * The to-many ones (oneToMany, manyToMany) are in
 * publish-draft-relations-unidirectional-to-many.spec.ts.
 */
const TO_ONE_LAB_FIELDS = ['manyToOne', 'oneToOne'] as const;

test.describe('Publish draft-relations warning — xToOne-style relations', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await loginWithApi({ page });
    await page.goto('/admin');
  });

  for (const field of TO_ONE_LAB_FIELDS) {
    test(`relation-lab ${field} warns when the target document is draft-only`, async ({ page }) => {
      const targetName = `${field} draft-only target`;

      await createRelationTarget(page, targetName, { publish: false });
      await openNewRelationLab(page);
      await saveRelationLabDraft(page, `Lab ${field} draft target`);
      await connectRelationTarget(page, field, targetName, 'draft');

      await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
    });

    test(`relation-lab ${field} does not warn when the target document is already published`, async ({
      page,
    }) => {
      const targetName = `${field} published target`;

      await createRelationTarget(page, targetName, { publish: true });
      await openNewRelationLab(page);
      await saveRelationLabDraft(page, `Lab ${field} published target`);
      await connectRelationTarget(page, field, targetName, 'published');

      await clickPublishExpectNoDraftRelationsDialog(page);
      await findAndClose(page, 'Published Document');
    });
  }
});
