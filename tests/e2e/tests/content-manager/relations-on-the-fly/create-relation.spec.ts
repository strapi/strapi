import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

const CREATE_URL = /\/admin\/content-manager\/collection-types\/api::author.author\/create(\?.*)?/;

test.describe('Relations on the fly - Create a Relation', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    // Step 0. Login as admin
    await login({ page });
  });

  test('I want to create a new relation in a modal and open it in full page', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await expect(page.getByText('Create a relation')).toBeVisible();

    // click on the full page icon
    await clickAndWait(page, page.getByRole('button', { name: 'Go to entry' }));
    await page.waitForURL(CREATE_URL);
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
  });

  test('I want to click on a new relation in the create relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // Open a new relation in the articles field
    await clickAndWait(page, page.getByRole('combobox', { name: 'articles' }));
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    // Check the nested relation modal is shown
    await expect(page.getByRole('banner').getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    // and the back button is disabled
    await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  test('I want to add a new relation and edit it in the create relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // Open a new relation in the articles field
    await clickAndWait(page, page.getByRole('combobox', { name: 'articles' }));
    await page.getByRole('option', { name: 'West Ham post match analysis' }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'West Ham post match analysis' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    // Check the nested relation modal is shown
    await expect(page.getByRole('banner').getByText('Edit a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
    // and the back button is disabled
    await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  test('I want to click to close the relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // Click the Close button
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
  });

  test('I want to click the button to open the full page without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // click on the full page icon
    await clickAndWait(page, page.getByRole('button', { name: 'Go to entry' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await page.waitForURL(CREATE_URL);
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
  });

  test('I want to click the back button to open the previous relation without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));

    // Open a nested relation
    await clickAndWait(page, page.getByRole('button', { name: 'West Ham post match analysis' }));
    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Change the name of the author
    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // click on the Back button
    await clickAndWait(page, page.getByRole('button', { name: 'Back' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
  });
});
