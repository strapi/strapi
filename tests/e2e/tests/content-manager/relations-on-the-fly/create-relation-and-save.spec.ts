import { test, expect, type Request } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

test.describe('Relations on the fly - Create a Relation and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
  });

  test('I want to create a new relation, save the related document and check if the new relation is added to the parent document', async ({
    page,
  }) => {
    // Step 0. Login as admin
    await login({ page });
    // Step 1. Got to Article collection-type and open one article
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Step 2. Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Step 3. Edit the form
    await expect(page.getByRole('banner').getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'West Ham post match analysis' })
    ).toBeVisible();
    const name = page.getByRole('textbox', { name: 'name' });
    await expect(name).toHaveValue('');
    await name.fill('Mr. Plop');
    await expect(name).toHaveValue('Mr. Plop');

    // Step 4. Save the related document as draft
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(name).toHaveValue('Mr. Plop');
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();

    // Wait for create + parent connect to finish (header flips to Edit) before closing.
    await expect(page.getByRole('banner').getByText('Edit a relation')).toBeVisible();

    // Step 5. Close the relation modal to see the updated relation on the root document
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

    await expect(page.getByRole('banner').getByText('Edit a relation')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Mr. Plop' })).toBeVisible();
  });

  test('I want to retain unsaved parent changes, unpersisted, when creating a top-level relation', async ({
    page,
  }) => {
    const updatedTitle = 'West Ham post match analysis - updated';
    const authorName = 'Mr. Top Level Relation';

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

    // Connecting the newly created relation must never PUT the parent article to the server —
    // that would silently persist the unsaved title edit above along with it.
    const parentUpdates: string[] = [];
    const trackParentUpdate = (request: Request) => {
      if (
        request.method() === 'PUT' &&
        request.url().includes('/content-manager/collection-types/api::article.article')
      ) {
        parentUpdates.push(request.url());
      }
    };
    page.on('request', trackParentUpdate);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(page.getByRole('banner').getByText('Edit a relation')).toBeVisible();
    page.off('request', trackParentUpdate);
    expect(parentUpdates).toEqual([]);

    // The relation and the title edit both show locally, still unsaved.
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));
    await expect(page.getByRole('button', { name: authorName })).toBeVisible();
    await expect(title).toHaveValue(updatedTitle);

    // The unsaved title edit was never persisted on the parent's behalf: the user must still
    // explicitly save the parent article for it to stick. The author itself stays connected,
    // because its own create request already carries the inverse `articles` connect.
    await page.reload();
    await expect(page.getByRole('button', { name: authorName })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'title' })).not.toHaveValue(updatedTitle);
  });
});
