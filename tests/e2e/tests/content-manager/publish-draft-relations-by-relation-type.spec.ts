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
  RELATION_LAB_FIELDS,
  connectRelationTarget,
  createRelationTarget,
  openNewRelationLab,
  saveRelationLabDraft,
} from './publish-draft-relations-warning.utils';

const ARTICLE_CREATE_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;

test.describe('Publish draft-relations warning by relation type', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  for (const { field, dialogVariant } of RELATION_LAB_FIELDS) {
    test(`warns on publish when ${field} links to a draft-only target`, async ({ page }) => {
      const targetName = `Draft ${field}`;

      await createRelationTarget(page, targetName, { publish: false });
      await openNewRelationLab(page);
      await saveRelationLabDraft(page, `Lab ${field} draft target`);
      await connectRelationTarget(page, field, targetName, false);

      await clickPublishExpectDraftRelationsDialog(page, dialogVariant);
    });

    test(`does not warn on publish when ${field} links to a published target`, async ({ page }) => {
      const targetName = `Published ${field}`;

      await createRelationTarget(page, targetName, { publish: true });
      await openNewRelationLab(page);
      await saveRelationLabDraft(page, `Lab ${field} published target`);
      await connectRelationTarget(page, field, targetName, true);

      await clickPublishExpectNoDraftRelationsDialog(page);
      await findAndClose(page, 'Published Document');
    });
  }
});

test.describe('Publish draft-relations warning — fixture content types', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin', (cts) => cts, { coreStore: false });
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  test('bidirectional M2M (Article authors): warns for draft author', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.waitForURL(ARTICLE_CREATE_URL);

    await page.getByRole('textbox', { name: 'title' }).fill('Article draft author warning');
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByLabel('Coach BeardDraft').click();
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickPublishExpectDraftRelationsDialog(page, 'm2m');
  });

  test('bidirectional M2M (Article authors): no warning for published author', async ({ page }) => {
    await navToHeader(page, ['Content Manager', 'Author'], 'Author');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.getByRole('textbox', { name: 'name' }).fill('Published Author');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish', exact: true }).click()
    );
    await findAndClose(page, 'Published Document');

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.waitForURL(ARTICLE_CREATE_URL);

    await page.getByRole('textbox', { name: 'title' }).fill('Article published author');
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByLabel('Published AuthorPublished').click();
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });

  test('oneToMany (Shop product carousel): warns for draft product', async ({ page }) => {
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
    await page.getByLabel('Nike Mens 23/24 Away Stadium').click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await clickPublishExpectDraftRelationsDialog(page, 'xToOne');
  });

  test('oneToMany (Shop product carousel): no warning for published product', async ({ page }) => {
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(
      page,
      page.getByRole('gridcell', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    );
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
    await page.getByLabel('Nike Mens 23/24 Away StadiumPublished').click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });

  test('self-referential oneToMany (Dog related): no draft-relations warning', async ({ page }) => {
    await navToHeader(page, ['Content Manager', 'Dog'], 'Dog');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.getByRole('textbox', { name: 'name' }).fill('Rex');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await page.getByRole('combobox', { name: 'related' }).click();
    await clickAndWait(page, page.getByRole('option', { name: 'Rex' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });
});

test.describe('Publish draft-relations warning — no relations', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('does not warn when publishing a draft entry without relations', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    await page.waitForURL(ARTICLE_CREATE_URL);

    await page.getByRole('textbox', { name: 'title' }).fill('No relations');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    await clickPublishExpectNoDraftRelationsDialog(page);
    await findAndClose(page, 'Published Document');
  });
});
