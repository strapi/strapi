import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { describeOnCondition } from '../../utils/shared';

const hasFutureFlag = process.env.STRAPI_FEATURES_FUTURE_CONTENT_HISTORY === 'true';

describeOnCondition(hasFutureFlag)('History', () => {
  test.describe('Collection Type', () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list', async ({
      page,
    }) => {
      // Navigate to the content-manager - collection type - article
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('combobox', { name: 'Select a locale' }).click();
      await page.getByRole('option', { name: 'French (fr)' }).click();
      await page.getByRole('link', { name: /Create new entry/, exact: true }).click();
      await page.waitForURL(
        '**/content-manager/collection-types/api::article.article/create?plugins\\[i18n\\]\\[locale\\]=fr'
      );

      /**
       * Create
       */
      const titleInput = await page.getByRole('textbox', { name: 'title' });
      // Create a french version
      const frenchTitle = "N'importe quoi";
      await titleInput.fill(frenchTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForURL(
        `**/content-manager/collection-types/api::article.article/*/history?plugins\\[i18n\\]\\[locale\\]=fr`
      );
      await expect(titleInput).toHaveValue(frenchTitle);

      // Go back to create new entry
      await page.goto('/admin');
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: /Create new entry/, exact: true }).click();
      await page.waitForURL(
        '**/content-manager/collection-types/api::article.article/create?plugins\\[i18n\\]\\[locale\\]=en'
      );

      // Create an english version
      const englishTitle = 'Being from Kansas is a pity';
      await titleInput.fill(englishTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForURL(
        `**/content-manager/collection-types/api::article.article/*/history?plugins\\[i18n\\]\\[locale\\]=en`
      );
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(1);
      // Assert the id was added after page load
      const idRegex = /id=\d+/;
      await expect(idRegex.test(page.url())).toBe(true);
      // Assert the most recent version is the current version
      const currentVersion = versionCards.nth(0);
      await expect(currentVersion.getByText('(current)')).toBeVisible();
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toBeDisabled();
      await expect(titleInput).toHaveValue(englishTitle);
      // Assert only the english versions are available
      await expect(page.getByText(frenchTitle)).not.toBeVisible();

      // Go back to the entry
      // TODO: Use the back button when it works
      // await page.getByRole('link', { name: 'Back' }).click();
      await page.goto('/admin');
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('gridcell', { name: 'Being from Kansas is a pity' }).click();

      /**
       * Update
       */
      await page.getByRole('textbox', { name: 'title' }).fill('Being from Kansas City');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForURL(
        '**/content-manager/collection-types/api::article.article/*/history?plugins\\[i18n\\]\\[locale\\]=en'
      );
      await expect(versionCards).toHaveCount(2);
      // Assert the most recent version is the current version
      await expect(titleInput).toHaveValue('Being from Kansas City');
      // Assert the previous version in the list is the expected version
      const previousVersion = versionCards.nth(1);
      previousVersion.click();
      await expect(titleInput).toHaveValue('Being from Kansas is a pity');
      await expect(previousVersion.getByText('(current)')).not.toBeVisible();

      // Go back to the entry
      // TODO: Use the back button when it works
      // await page.getByRole('link', { name: 'Back' }).click();
      // await page.goto('/admin');
      // await page.getByRole('link', { name: 'Content Manager' }).click();
      // await page.getByRole('gridcell', { name: 'Being from Kansas City' }).click();

      /**
       * Publish
       *
       * TODO: Fix publish
       * The publish action in the middleware used to create history versions has a different shape than the other actions.
       * This leaves us with null for status and relatedDocumentId in the history version.
       *
       */
      // await page.getByRole('button', { name: 'Publish' }).click();
      // await page.getByRole('link', { name: 'History' }).click();
      // await page.waitForURL(
      //   '**/content-manager/collection-types/api::article.article/*/history?plugins\\[i18n\\]\\[locale\\]=en'
      // );
      // await expect(versionCards).toHaveCount(3);
      // // Assert the current version is the most recent published version
      // await expect(titleInput).toHaveValue('Being from Kansas City');
      // await expect(currentVersion.getByText('Published')).toBeVisible();
      // // Assert the previous version in the list is the expected version
      // await expect(versionCards.nth(1).getByText('Draft')).toBeVisible();
      // versionCards.nth(1).click();
      // await expect(titleInput).toHaveValue('Being from Kansas City');
    });
  });

  test.describe('Single Type', () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list', async ({
      page,
    }) => {
      /**
       * TODO: Test version locales when saving single type locales works
       */

      // Navigate to the content-manager - single type - homepage
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Homepage' }).click();
      await page.waitForURL('**/content-manager/single-types/api::homepage.homepage');

      /**
       * Create
       */
      const titleInput = await page.getByRole('textbox', { name: 'title' });
      await titleInput.fill('AFC Richmond');
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForURL('**/content-manager/single-types/api::homepage.homepage/history**');
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(1);
      // Assert the id was added after page load
      const idRegex = /id=\d+/;
      await expect(idRegex.test(page.url())).toBe(true);
      // Assert the most recent version is the current version
      const currentVersion = versionCards.nth(0);
      await expect(currentVersion.getByText('(current)')).toBeVisible();
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toBeDisabled();
      await expect(titleInput).toHaveValue('AFC Richmond');

      // Go back
      // TODO: Use the back button when it works
      // await page.getByRole('link', { name: 'Back' }).click();
      await page.goto('/admin');
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Homepage' }).click();

      /**
       * Update
       */
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForURL('**/content-manager/single-types/api::homepage.homepage/history**');
      await expect(versionCards).toHaveCount(2);
      // Assert the most recent version is the current version
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');
      // Assert the previous version in the list is the expected version
      versionCards.nth(1).click();
      await expect(titleInput).toHaveValue('AFC Richmond');

      // Go back
      // TODO: Use the back button when it works
      // await page.getByRole('link', { name: 'Back' }).click();
      // await page.goto('/admin');
      // await page.getByRole('link', { name: 'Content Manager' }).click();
      // await page.getByRole('link', { name: 'Homepage' }).click();

      /**
       * Publish
       *
       * TODO: Fix publish
       * The publish action in the middleware used to create history versions has a different shape than the other actions.
       * This leaves us with null for status and relatedDocumentId in the history version.
       *
       */
      // await page.getByRole('button', { name: 'Publish' }).click();
      // await page.getByRole('link', { name: 'History' }).click();
      // await page.waitForURL('**/content-manager/single-types/api::homepage.homepage/history**');
      // await expect(versionCards).toHaveCount(3);
      // // Assert the current version is the most recent published version
      // await expect(titleInput).toHaveValue('Welcome to AFC Richmond!');
      // // TODO: Assert the version is marked as published when publishing works
      // await expect(currentVersion.getByText('Published')).toBeVisible();
      // // Assert the previous version in the list is the expected version
      // await expect(versionCards.nth(1).getByText('Draft')).toBeVisible();
      // versionCards.nth(1).click();
      // await expect(titleInput).toHaveValue('Welcome to AFC Richmond');
    });
  });
});
