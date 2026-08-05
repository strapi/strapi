import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

test.describe('Relations on the fly - Create a Relation and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
  });

  test(
    'I want to create a new relation, publish the related document and check if the new relation is added to the parent document',
    { tag: ['@critical'] },
    async ({ page }) => {
      // Step 0. Login as admin
      await login({ page });
      // Step 1. Got to Article collection-type and open one article
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
      await clickAndWait(
        page,
        page.getByRole('gridcell', { name: 'West Ham post match analysis' })
      );

      // Step 2. Open the relation modal
      await page.getByRole('combobox', { name: 'authors' }).click();
      await page.getByRole('option', { name: 'Create a relation' }).click();

      // Step 3. Edit the form
      const name = page.getByRole('textbox', { name: 'name' });
      await expect(name).toHaveValue('');
      await name.fill('Mr. Fred Passo');
      await expect(name).toHaveValue('Mr. Fred Passo');

      // Step 4. Publish the related document
      await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
      await expect(name).toHaveValue('Mr. Fred Passo');
      await expect(page.getByRole('status', { name: 'Published' }).first()).toBeVisible();

      // Wait for publish + parent connect to finish (header flips to Edit) before closing.
      await expect(page.getByRole('banner').getByText('Edit a relation')).toBeVisible();

      // Step 5. Close the relation modal to see the updated relation on the root document
      await page.getByRole('button', { name: 'Close modal' }).click();
      await expect(page.getByRole('button', { name: 'Mr. Fred Passo' })).toBeVisible();
    }
  );

  test('I want to retain unsaved parent changes when publishing a top-level relation', async ({
    page,
  }) => {
    const updatedTitle = 'West Ham post match analysis - published update';
    const authorName = 'Mr. Published Top Level Relation';

    await login({ page });
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    const title = page.getByRole('textbox', { name: 'title' });
    await title.fill(updatedTitle);
    await expect(title).toHaveValue(updatedTitle);

    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await page.getByRole('textbox', { name: 'name' }).fill(authorName);

    const parentUpdate = page.waitForRequest(
      (request) =>
        request.method() === 'PUT' &&
        request.url().includes('/content-manager/collection-types/api::article.article')
    );
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));

    const parentUpdateData = (await parentUpdate).postDataJSON() as {
      title?: string;
      authors?: { connect?: Array<{ documentId?: unknown }> };
      undefined?: unknown;
    };
    expect(parentUpdateData).toEqual(
      expect.objectContaining({
        title: updatedTitle,
        authors: expect.objectContaining({
          connect: expect.arrayContaining([
            expect.objectContaining({ documentId: expect.any(String) }),
          ]),
        }),
      })
    );
    expect(parentUpdateData.undefined).toBeUndefined();

    await expect(page.getByRole('banner').getByText('Edit a relation')).toBeVisible();

    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));
    await expect(page.getByRole('button', { name: authorName })).toBeVisible();
    await expect(title).toHaveValue(updatedTitle);
  });
});
