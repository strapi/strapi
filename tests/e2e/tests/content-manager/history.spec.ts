import { test, expect, Page } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition, findAndClose, skipCtbTour } from '../../utils/shared';
import { resetFiles } from '../../utils/file-reset';
import { waitForRestart } from '../../utils/restart';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const AUTHOR_CREATE_URL =
  /\/admin\/content-manager\/collection-types\/api::author.author\/create(\?.*)?/;
const AUTHOR_EDIT_URL =
  /\/admin\/content-manager\/collection-types\/api::author.author\/(?!create)[^/]/;
const ARTICLE_CREATE_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;
const ARTICLE_LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;
const ARTICLE_EDIT_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;
const ARTICLE_HISTORY_URL =
  /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+\/history(\?.*)?/;
const HOMEPAGE_EDIT_URL = /\/admin\/content-manager\/single-types\/api::homepage.homepage(\?.*)?/;
const HOMEPAGE_HISTORY_URL =
  /\/admin\/content-manager\/single-types\/api::homepage.homepage\/history(\?.*)?/;

const goToHistoryPage = async (page: Page) => {
  const moreActionsButton = page.getByRole('button', { name: /more actions/i });
  await expect(moreActionsButton).toBeEnabled();
  await moreActionsButton.click();
  const historyButton = page.getByRole('menuitem', { name: /content history/i });

  if (await historyButton.isVisible()) {
    await clickAndWait(page, historyButton);
  } else {
    await goToHistoryPage(page);
  }
};

const goToContentTypeBuilder = async (page: Page) => {
  await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  await skipCtbTour(page);
};

describeOnCondition(edition === 'EE')('History', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar', (cts) => cts, { coreStore: false });
    await resetFiles();
    await page.goto('/admin');
    await page.evaluate(() => window.localStorage.setItem('GUIDED_TOUR_SKIPPED', 'true'));
    await login({ page });
    await page.waitForURL('/admin');
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('A user should be able to restore a history version', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: /Create new entry/, exact: true }));
    await page.waitForURL(ARTICLE_CREATE_URL);

    const titleInput = page.getByRole('textbox', { name: 'title' });
    // Create an initial entry to also create an initial version
    await titleInput.fill('Being from Kansas');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');
    // Update to create another version
    await titleInput.fill('Being from Florida');
    await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    await goToHistoryPage(page);
    await page.waitForURL(ARTICLE_HISTORY_URL);

    // Select the original version and restore it
    const versionCards = page.getByRole('listitem', { name: 'Version card' });
    await versionCards.last().click();
    await expect(titleInput).toHaveValue('Being from Kansas');
    await page.getByRole('button', { name: 'Restore' }).click();
    const confirmationDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(confirmationDialog).toBeVisible();
    await confirmationDialog.getByRole('button', { name: 'Restore' }).click();
    await page.waitForURL(ARTICLE_EDIT_URL);
    await expect(titleInput).toHaveValue('Being from Kansas');
  });

  test.describe('Collection Type', () => {
    test('A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list', async ({
      page,
    }) => {
      // Navigate to the content-manager - collection type - article
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await page.getByRole('combobox', { name: 'Select a locale' }).click();
      await page.getByRole('option', { name: 'French (fr)' }).click();
      await clickAndWait(page, page.getByRole('link', { name: /Create new entry/, exact: true }));
      await page.waitForURL(ARTICLE_CREATE_URL);

      /**
       * Create
       */
      const titleInput = page.getByRole('textbox', { name: 'title' });
      // Create a french version
      const frenchTitle = "N'importe quoi";
      await titleInput.fill(frenchTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved document');
      await page.waitForURL(ARTICLE_EDIT_URL);

      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);
      await expect(titleInput).toHaveValue(frenchTitle);

      // Go back to the CM to create a new english entry
      await page.goto('/admin');
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: /Create new entry/, exact: true }));
      await page.waitForURL(ARTICLE_CREATE_URL);

      // Create an english version
      const englishTitle = 'Being from Kansas is a pity';
      await titleInput.fill(englishTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved document');
      await page.waitForURL(ARTICLE_EDIT_URL);
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);
      const versionCards = page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(1);
      // Assert the id was added after page load
      const idRegex = /id=\d+/;
      expect(idRegex.test(page.url())).toBe(true);
      // Assert the most recent version is the current version
      const currentVersion = versionCards.nth(0);
      await expect(currentVersion.getByText('(current)')).toBeVisible();
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toBeDisabled();
      await expect(titleInput).toHaveValue(englishTitle);
      // Assert only the english versions are available
      await expect(page.getByText(frenchTitle)).not.toBeVisible();

      // Go back to the entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

      /**
       * Update
       */
      await titleInput.fill('Being from Kansas City');
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);
      await expect(versionCards).toHaveCount(2);
      // Assert the most recent version is the current version
      await expect(titleInput).toHaveValue('Being from Kansas City');
      // Assert the previous version in the list is the expected version
      const previousVersion = versionCards.nth(1);
      previousVersion.click();
      await expect(titleInput).toHaveValue('Being from Kansas is a pity');
      await expect(previousVersion.getByText('(current)')).not.toBeVisible();

      // Go back to the entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

      /**
       * Publish
       */
      await page.getByRole('button', { name: 'Publish' }).click();
      await findAndClose(page, 'Published Document');
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);
      await expect(versionCards).toHaveCount(3);
      // The current version is the most recent draft
      await expect(currentVersion.getByText('Published')).toBeVisible();
      await expect(titleInput).toHaveValue('Being from Kansas City');
      previousVersion.click();
      await expect(titleInput).toHaveValue('Being from Kansas City');

      // Go back to the entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

      /**
       * Modified
       */
      await titleInput.fill('Being from Kansas City, Missouri');
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);
      await expect(versionCards).toHaveCount(4);
      // Assert the current version is the modified version
      await expect(currentVersion.getByText('Modified')).toBeVisible();
      await expect(titleInput).toHaveValue('Being from Kansas City, Missouri');
    });

    test('A user should see the relations and whether some are missing', async ({ page }) => {
      // Create new author
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Author' }));
      await clickAndWait(page, page.getByRole('link', { name: /Create new entry/, exact: true }));
      await page.waitForURL(AUTHOR_CREATE_URL);
      await page.getByRole('textbox', { name: 'name' }).fill('Will Kitman');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForURL(AUTHOR_EDIT_URL);

      // Create new article and add authors to it
      await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
      await page.waitForURL(ARTICLE_LIST_URL);
      await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }));
      await page.getByRole('textbox', { name: 'title' }).fill('Zava retires');
      await page.getByRole('combobox', { name: 'Authors' }).click();
      await page.getByText('Will Kitman').click();
      await page.getByRole('combobox', { name: 'Authors' }).click();
      await page.getByText('Coach Beard').click();
      // Make sure the relation was added before proceeding to save, otherwise we risk saving too quickly without the relation
      await expect(page.getByRole('link', { name: 'Coach Beard' })).toBeVisible();
      await page.getByRole('button', { name: 'Save' }).click();
      // Confirm the save was succesful before proceeding, otherwise we may end up on the related page before the relation is established
      await findAndClose(page, 'Saved Document');

      // Delete one of the authors, leaving only Coach Beard
      await clickAndWait(page, page.getByRole('link', { name: 'Will Kitman' }));
      await page.waitForURL(AUTHOR_EDIT_URL);
      await page.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('menuitem', { name: /delete entry/i }).click();
      await page.getByRole('button', { name: /confirm/i }).click();

      // Go to the history page
      await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
      await clickAndWait(page, page.getByRole('gridcell', { name: 'Zava retires' }));
      await page.waitForURL(ARTICLE_EDIT_URL);
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);

      // Assert that the unknown relation alert is displayed
      await expect(page.getByRole('link', { name: 'Coach Beard' })).toBeVisible();
      await expect(page.getByText('Will Kitman')).not.toBeVisible();
      await expect(page.getByText(/missing relation/i)).toBeVisible();
    });

    test('A user should be able to rename (delete + create) a field in the content-type builder and see the changes as "unknown fields" in concerned history versions', async ({
      page,
    }) => {
      /**
       * Create an initial entry to also create an initial version
       */
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: /Create new entry/, exact: true }));
      await page.waitForURL(ARTICLE_CREATE_URL);
      await page.getByRole('textbox', { name: 'title' }).fill('Being from Kansas');
      await page
        .getByRole('textbox', { name: 'slug This value is unique for the selected locale' })
        .fill('being-from-kansas');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForURL(ARTICLE_EDIT_URL);

      /**
       * Rename field in content-type builder
       */
      await goToContentTypeBuilder(page);
      await page.waitForURL(
        '/admin/plugins/content-type-builder/content-types/api::article.article'
      );
      await page.getByRole('button', { name: 'Edit title' }).first().click();
      await page.getByRole('textbox', { name: 'name' }).fill('titleRename');
      await page.getByRole('button', { name: 'Finish' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      await waitForRestart(page);
      await expect(page.getByRole('cell', { name: 'titleRename', exact: true })).toBeVisible();

      /**
       * Update the existing entry to create another version
       */
      await page.goto('/admin');
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
      await page.getByRole('gridcell', { name: 'being-from-kansas' }).click();
      await page.waitForURL(ARTICLE_EDIT_URL);
      await page.getByRole('textbox', { name: 'titleRename' }).fill('Being from Kansas City');
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      /**
       * Go to the history page
       */
      await goToHistoryPage(page);
      await page.waitForURL(ARTICLE_HISTORY_URL);
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(2);

      const previousVersion = versionCards.nth(1);
      await previousVersion.click();

      // Assert the unknown field is present
      await expect(page.getByText('Unknown fields')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'title' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue('Being from Kansas');
      // Assert the new field is present
      await expect(page.getByText('titleRename')).toBeVisible();
      page.getByRole('status').getByText('New field');
    });
  });

  test.describe('Single Type', () => {
    test('A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list', async ({
      page,
    }) => {
      const HISTORY_URL =
        /\/admin\/content-manager\/single-types\/api::homepage.homepage\/history(\?.*)?/;

      // Navigate to the content-manager - single type - homepage
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.getByRole('combobox', { name: 'Locales' }).click();
      await page.getByRole('option', { name: 'French (fr)' }).click();

      /**
       * Create
       */
      const titleInput = page.getByRole('textbox', { name: 'title' });
      // Create a french version
      const frenchTitle = 'Paris Saint-Germain';
      await titleInput.fill(frenchTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(HISTORY_URL);
      await expect(titleInput).toHaveValue(frenchTitle);

      // Go back to the CM to create a new english entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));
      await page.getByRole('combobox', { name: 'Locales' }).click();
      await page.getByRole('option', { name: 'English (en)' }).click();

      // Create an english version
      const englishTitle = 'AFC Richmond';
      await titleInput.fill(englishTitle);
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(HISTORY_URL);
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(1);
      // Assert the id was added after page load
      const idRegex = /id=\d+/;
      await expect(idRegex.test(page.url())).toBe(true);
      // Assert the most recent version is the current version
      const currentVersion = versionCards.nth(0);
      const previousVersion = versionCards.nth(1);
      await expect(currentVersion.getByText('(current)')).toBeVisible();
      await expect(currentVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toBeDisabled();
      await expect(titleInput).toHaveValue(englishTitle);
      // Assert only the english versions are available
      await expect(page.getByText(frenchTitle)).not.toBeVisible();

      // Go back to the entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

      /**
       * Update
       */
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(HISTORY_URL);
      await expect(versionCards).toHaveCount(2);
      // Assert the most recent version is the current version
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');
      // Assert the previous version in the list is the expected version
      await previousVersion.click();
      await expect(titleInput).toHaveValue('AFC Richmond');

      // Go back to the entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

      /**
       * Publish
       */
      await page.getByRole('button', { name: 'Publish' }).click();
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL('**/content-manager/single-types/api::homepage.homepage/history**');
      await expect(versionCards).toHaveCount(3);
      // The current version is the most recent published
      await expect(currentVersion.getByText('Published')).toBeVisible();
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');
      // The second in the list is the draft version
      await previousVersion.click();
      await expect(previousVersion.getByText('Draft')).toBeVisible();
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond');

      // Go back to the entry
      await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

      /**
       * Modified
       */
      await titleInput.fill('Welcome to AFC Richmond!');
      await page.getByRole('button', { name: 'Save' }).click();
      // Go to the history page
      await goToHistoryPage(page);
      await page.waitForURL(HISTORY_URL);
      await expect(versionCards).toHaveCount(4);
      // Assert the current version is the most recent published version
      await expect(titleInput).toHaveValue('Welcome to AFC Richmond!');
      await expect(currentVersion.getByText('Modified')).toBeVisible();
    });

    test('A user should see the relations and whether some are missing', async ({ page }) => {
      // Create relation in Content-Type Builder
      await goToContentTypeBuilder(page);

      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.waitForURL(
        '/admin/plugins/content-type-builder/content-types/api::homepage.homepage'
      );
      await page.getByRole('button', { name: /add another field to this single type/i }).click();
      await page.getByRole('button', { name: /relation/i }).click();
      await page.getByLabel('Basic settings').getByRole('button').nth(1).click();
      await page.getByRole('button', { name: /article/i }).click();
      await page.getByRole('menuitem', { name: /author/i }).click();
      await page.getByRole('button', { name: 'Finish' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      await waitForRestart(page);
      await expect(page.getByRole('cell', { name: 'authors', exact: true })).toBeVisible();

      // Create new author
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Author' }));
      await clickAndWait(page, page.getByRole('link', { name: /Create new entry/, exact: true }));
      await page.waitForURL(AUTHOR_CREATE_URL);
      await page.getByRole('textbox', { name: 'name' }).fill('Will Kitman');
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForURL(AUTHOR_EDIT_URL);

      // Add author to homepage
      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.waitForURL(HOMEPAGE_EDIT_URL);
      await page.getByRole('combobox', { name: 'Authors' }).click();
      await page.getByText('Will Kitman').click();
      await page.getByRole('combobox', { name: 'Authors' }).click();
      await page.getByText('Coach Beard').click();
      await page.getByRole('button', { name: 'Save' }).click();

      // Delete one of the authors, leaving only Coach Beard
      await clickAndWait(page, page.getByRole('link', { name: 'Will Kitman' }));
      await page.waitForURL(AUTHOR_EDIT_URL);
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /delete entry/i }).click();
      await page.getByRole('button', { name: /confirm/i }).click();

      // Go to the history page
      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.waitForURL(HOMEPAGE_EDIT_URL);
      await page.getByRole('button', { name: /more actions/i }).click();
      await clickAndWait(page, page.getByRole('menuitem', { name: /content history/i }));
      await page.waitForURL(HOMEPAGE_HISTORY_URL);

      // Assert that the unknown relation alert is displayed
      await expect(page.getByRole('link', { name: 'Coach Beard' })).toBeVisible();
      await expect(page.getByText('Will Kitman')).not.toBeVisible();
      await expect(page.getByText(/missing relation/i)).toBeVisible();
    });

    test('A user should be able to rename (delete + create) a field in the content-type builder and see the changes as "unknown fields" in concerned history versions', async ({
      page,
    }) => {
      /**
       * Create an initial entry to also create an initial version
       */
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      /**
       * Rename field in content-type builder
       */
      await goToContentTypeBuilder(page);

      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.waitForURL(
        '/admin/plugins/content-type-builder/content-types/api::homepage.homepage'
      );
      await page.getByRole('button', { name: 'Edit title' }).first().click();
      await page.getByRole('textbox', { name: 'name' }).fill('titleRename');
      await page.getByRole('button', { name: 'Finish' }).click();
      await page.getByRole('button', { name: 'Save' }).click();
      await waitForRestart(page);
      await expect(page.getByRole('cell', { name: 'titleRename', exact: true })).toBeVisible();

      /**
       * Update the existing entry to create another version
       */
      await page.goto('/admin');
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await clickAndWait(page, page.getByRole('link', { name: 'Homepage' }));
      await page.getByRole('textbox', { name: 'titleRename' }).fill('Welcome to AFC Richmond!');
      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      /**
       * Go to the history page
       */
      await goToHistoryPage(page);
      await page.waitForURL(HOMEPAGE_HISTORY_URL);
      const versionCards = await page.getByRole('listitem', { name: 'Version card' });
      await expect(versionCards).toHaveCount(2);

      const previousVersion = versionCards.nth(1);
      await previousVersion.click();

      // Assert the unknown field is present
      await expect(page.getByText('Unknown fields')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'title' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue(
        'Welcome to AFC Richmond'
      );
      // Assert the new field is present
      await expect(page.getByText('titleRename')).toBeVisible();
      page.getByRole('status').getByText('New field');
    });
  });
});
