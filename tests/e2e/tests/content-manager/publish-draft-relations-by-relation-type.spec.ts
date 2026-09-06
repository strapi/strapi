import { test, expect } from '@playwright/test';
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
  XTOONE_LAB_FIELDS,
  connectRelationTarget,
  createRelationTarget,
  openNewRelationLab,
  saveRelationLabDraft,
  selectRelationComboboxOption,
} from './publish-draft-relations-warning.utils';

const ARTICLE_CREATE_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;

/**
 * Seed product name in the app-template dataset (see entities_00001.jsonl).
 * Combobox options use the full name plus a Draft/Published suffix — see relation-option-probe.spec.ts.
 */
const NIKE_JERSEY_NAME = 'Nike Mens 23/24 Away Stadium Jersey';

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

test.describe('Publish draft-relations warning — xToOne-style relations', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  for (const field of XTOONE_LAB_FIELDS) {
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

  test('Shop product carousel warns when linking an unpublished product', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    await page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/actions/countDraftRelations') &&
        response.ok()
    );

    await clickAndWait(page, page.getByRole('button', { name: 'Product carousel - 23/24 kits' }));
    await page.getByRole('combobox', { name: 'products' }).click();
    await selectRelationComboboxOption(page, NIKE_JERSEY_NAME, 'draft');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
  });

  test('Shop product carousel does not warn when linking an already-published product', async ({
    page,
  }) => {
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: NIKE_JERSEY_NAME }));
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish', exact: true }).click()
    );
    await findAndClose(page, 'Published Document');

    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    await page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/actions/countDraftRelations') &&
        response.ok()
    );

    await clickAndWait(page, page.getByRole('button', { name: 'Product carousel - 23/24 kits' }));
    await page.getByRole('combobox', { name: 'products' }).click();
    await selectRelationComboboxOption(page, NIKE_JERSEY_NAME, 'published');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });
});
