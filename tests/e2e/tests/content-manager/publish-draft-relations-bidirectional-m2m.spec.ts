import { test } from '@playwright/test';
import { login } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import {
  clickAndWait,
  clickPublishExpectDraftRelationsDialog,
  clickPublishExpectNoDraftRelationsDialog,
  findAndClose,
  navToHeader,
  withContentManagerPublish,
} from '../../../utils/shared';
import {
  BIDIRECTIONAL_M2M_LAB_FIELD,
  connectRelationTarget,
  createRelationTarget,
  openNewRelationLab,
  saveRelationLabDraft,
  selectRelationComboboxOption,
} from './publish-draft-relations-warning.utils';

const ARTICLE_CREATE_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;

test.describe('Publish draft-relations warning — bidirectional M2M regression', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  test('shows the M2M warning when authors link to a draft-only entry', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.waitForURL(ARTICLE_CREATE_URL);

    await page.getByRole('textbox', { name: 'title' }).fill('Article with draft author');
    await page.getByRole('combobox', { name: 'authors' }).click();
    await selectRelationComboboxOption(page, 'Coach Beard', 'draft');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickPublishExpectDraftRelationsDialog(page, 'm2m');
  });

  test('does not warn when authors link to a document that is already published', async ({
    page,
  }) => {
    const authorName = 'Jane Smith';

    await navToHeader(page, ['Content Manager', 'Author'], 'Author');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.getByRole('textbox', { name: 'name' }).fill(authorName);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish', exact: true }).click()
    );
    await findAndClose(page, 'Published Document');

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.waitForURL(ARTICLE_CREATE_URL);

    await page.getByRole('textbox', { name: 'title' }).fill('Article with published author');
    await page.getByRole('combobox', { name: 'authors' }).click();
    await selectRelationComboboxOption(page, authorName, 'published');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });

  test('relation-lab manyToManyBi warns when the target document is draft-only', async ({
    page,
  }) => {
    const targetName = 'Draft-only M2M target';

    await createRelationTarget(page, targetName, { publish: false });
    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab draft M2M target');
    await connectRelationTarget(page, BIDIRECTIONAL_M2M_LAB_FIELD, targetName, 'draft');

    await clickPublishExpectDraftRelationsDialog(page, 'm2m');
  });

  test('relation-lab manyToManyBi does not warn when the target document is already published', async ({
    page,
  }) => {
    const targetName = 'Published M2M target';

    await createRelationTarget(page, targetName, { publish: true });
    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Lab published M2M target');
    await connectRelationTarget(page, BIDIRECTIONAL_M2M_LAB_FIELD, targetName, 'published');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });

  test('relation-lab with both xToOne and bidirectional M2M draft targets uses the danger modal', async ({
    page,
  }) => {
    await createRelationTarget(page, 'Mixed M2M target', { publish: false });
    await createRelationTarget(page, 'Mixed xToOne target', { publish: false });

    await openNewRelationLab(page);
    await saveRelationLabDraft(page, 'Mixed relations lab');
    await connectRelationTarget(page, 'manyToOne', 'Mixed xToOne target', 'draft');
    await connectRelationTarget(page, BIDIRECTIONAL_M2M_LAB_FIELD, 'Mixed M2M target', 'draft');

    await clickPublishExpectDraftRelationsDialog(page, 'mixed');
  });
});
