import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { findAndClose } from '../../utils/shared';

test.describe('Edit View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  /**
   * TODO: we should split these tests into smaller ones.
   */
  test.describe('Collection Type', () => {
    test('A user should be able to navigate to the EditView of the content manager to create, save, publish, unpublish & delete a new entry', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: /Create new entry/ }).click();

      /**
       * Now we're in the edit view.
       */
      await page.waitForURL(
        '**/content-manager/collection-types/api::article.article/create?plugins\\[i18n\\]\\[locale\\]=en'
      );

      await page.getByRole('textbox', { name: 'title' }).fill('Being from Kansas City');

      await page.getByRole('button', { name: 'Save' }).click();

      await findAndClose(page, 'Saved');

      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

      await expect(page.getByText('Editing draft version')).toBeVisible();

      await page.getByRole('link', { name: 'Content Manager' }).click();

      await page.waitForURL(
        '**/content-manager/collection-types/api::article.article?page=1&pageSize=10&sort=title:ASC&plugins\\[i18n\\]\\[locale\\]=en'
      );

      await expect(page.getByRole('gridcell', { name: 'Being from Kansas City' })).toBeVisible();

      await page.getByRole('gridcell', { name: 'Being from Kansas City' }).click();

      await page.waitForURL('**/content-manager/collection-types/api::article.article/**');

      await page.getByRole('textbox', { name: 'title' }).fill('');

      await page.getByRole('textbox', { name: 'title' }).fill('Being an American');

      await page
        .getByRole('textbox')
        .nth(1)
        .fill('I miss the denver broncos, now I can only watch it on the evening.');

      await page.getByRole('combobox', { name: 'authors' }).click();

      await page.getByRole('option', { name: 'Ted Lasso' }).click();

      await expect(page.getByRole('link', { name: 'Ted Lasso' })).toBeVisible();

      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();

      await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'Save' }).click();

      await findAndClose(page, 'Saved');

      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Success:Published', { exact: true })).toBeVisible();

      await expect(page.getByRole('button', { name: 'Unpublish' })).not.toBeDisabled();

      await page.getByRole('textbox', { name: 'title' }).fill('Being an American in the UK');

      await expect(page.getByRole('button', { name: 'Unpublish' })).toBeDisabled();

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByRole('button', { name: 'Unpublish' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'Unpublish' }).click();

      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();

      await page.getByRole('button', { name: 'Yes, confirm' }).click();

      await expect(page.getByText('Unpublished')).toBeVisible();

      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'Delete this entry' }).click();

      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();

      await page.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByText('Deleted')).toBeVisible();

      /**
       * We're back on the list view
       */
      await page.waitForURL(
        '**/content-manager/collection-types/api::article.article?page=1&pageSize=10&sort=title:ASC&plugins\\[i18n\\]\\[locale\\]=en'
      );

      await expect(
        page.getByRole('gridcell', { name: 'Being from Kansas City' })
      ).not.toBeVisible();
    });
  });

  test.describe('Single Type', () => {
    test('A user should be able to navigate to the EditView of the content manager to create, save, publish, unpublish & delete a new entry', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();

      await page.getByRole('link', { name: 'Homepage' }).click();

      /**
       * Now we're in the edit view.
       */
      await page.waitForURL('**/content-manager/single-types/api::homepage.homepage');

      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');

      await page
        .getByRole('textbox')
        .nth(1)
        .fill(
          "We're a premier league football club based in South West London with a vicious rivalry with Fulham. Because who doens't hate them?"
        );

      await page.getByRole('button', { name: 'Save' }).click();

      await findAndClose(page, 'Saved');

      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

      await page.getByRole('button', { name: 'Publish' }).click();

      await expect(page.getByText('Published', { exact: true })).toBeVisible();

      await expect(page.getByRole('button', { name: 'Unpublish' })).not.toBeDisabled();

      await page.getByRole('combobox', { name: 'admin_user' }).click();
      await page.getByRole('option').nth(0).click();

      await expect(page.getByRole('button', { name: 'Unpublish' })).toBeDisabled();

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByRole('button', { name: 'Unpublish' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'Unpublish' }).click();

      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();

      await page.getByRole('button', { name: 'Yes, confirm' }).click();

      await expect(page.getByText('Unpublished')).toBeVisible();

      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'Delete this entry' }).click();

      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();

      await page.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByText('Deleted')).toBeVisible();

      await expect(page.getByRole('textbox', { name: 'title' })).toHaveText('');
    });
  });
});
