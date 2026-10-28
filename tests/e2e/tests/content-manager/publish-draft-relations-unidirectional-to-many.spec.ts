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
 * Multi-target unidirectional relation-lab fields (oneToMany, manyToMany). They warn like xToOne
 * relations. The single-target ones are in publish-draft-relations-unidirectional-to-one.spec.ts.
 */
test.describe('Publish draft-relations warning — xToOne-style relations', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await loginWithApi({ page });
    await page.goto('/admin');
  });

  test('relation-lab oneToMany warns when the target document is draft-only', async ({ page }) => {
    const targetName = 'oneToMany draft-only target';

    await createRelationTarget(page, targetName, { publish: false });
    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab oneToMany draft target');
    await connectRelationTarget(page, 'oneToMany', targetName, 'draft');

    await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
  });

  test('relation-lab oneToMany does not warn when the target document is already published', async ({
    page,
  }) => {
    const targetName = 'oneToMany published target';

    await createRelationTarget(page, targetName, { publish: true });
    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab oneToMany published target');
    await connectRelationTarget(page, 'oneToMany', targetName, 'published');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });

  test('relation-lab unidirectional manyToMany warns when the target document is draft-only', async ({
    page,
  }) => {
    const targetName = 'Uni M2M draft-only target';

    await createRelationTarget(page, targetName, { publish: false });
    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab uni M2M draft target');
    await connectRelationTarget(page, 'manyToMany', targetName, 'draft');

    await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
  });

  test('relation-lab unidirectional manyToMany does not warn when the target document is already published', async ({
    page,
  }) => {
    const targetName = 'Uni M2M published target';

    await createRelationTarget(page, targetName, { publish: true });
    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab uni M2M published target');
    await connectRelationTarget(page, 'manyToMany', targetName, 'published');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });

  test('relation-lab oneToMany warns when linked to both published and draft-only targets', async ({
    page,
  }) => {
    await createRelationTarget(page, 'O2M mixed published target', { publish: true });
    await createRelationTarget(page, 'O2M mixed draft target', { publish: false });

    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab O2M mixed targets');
    await connectRelationTarget(page, 'oneToMany', 'O2M mixed published target', 'published');
    await connectRelationTarget(page, 'oneToMany', 'O2M mixed draft target', 'draft');

    await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
  });
});
