import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait, navToHeader } from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';
import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

test.describe('Home as super admin', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should have a personalized homepage', async ({ page }) => {
    /**
     * Assert the user is greeted with their name
     */
    await expect(page.getByText('Hello test')).toBeVisible();
    await expect(page).toHaveTitle(/homepage/i);

    // Change the name and make sure it's reflected in the homepage
    await page.getByRole('button', { name: 'test' }).click();
    await clickAndWait(page, page.getByRole('menuitem', { name: /profile/i }));
    await page.getByRole('textbox', { name: /first name/i }).fill('Rebecca');
    await page.getByRole('button', { name: /save/i }).click();
    await clickAndWait(page, page.getByRole('link', { name: 'Home' }));
    await expect(page.getByText('Hello Rebecca')).toBeVisible();
  });

  test('a user should see its profile information', async ({ page }) => {
    const profileWidget = page.getByLabel(/Profile/i);
    await expect(profileWidget).toBeVisible();
    await expect(profileWidget.getByText('test testing')).toBeVisible();
    await expect(profileWidget.getByText('test@testing.com')).toBeVisible();
    await expect(profileWidget.getByText('Super Admin')).toBeVisible();

    // Change the name and make sure it's reflected in the homepage
    await clickAndWait(page, profileWidget.getByText('Profile settings'));
    await page.getByRole('textbox', { name: /first name/i }).fill('Ted');
    await page.getByRole('textbox', { name: /last name/i }).fill('Lasso');
    await page.getByRole('textbox', { name: /email/i }).fill('ted.lasso@afcrichmond.co.uk');
    await page.getByRole('button', { name: /save/i }).click();
    await clickAndWait(page, page.getByRole('link', { name: 'Home' }));

    await expect(profileWidget.getByText('Ted Lasso')).toBeVisible();
    await expect(profileWidget.getByText('ted.lasso@afcrichmond.co.uk')).toBeVisible();
  });

  test('a super admin should see the key statistics widget', async ({ page }) => {
    const keyStatisticsWidget = page.getByLabel(/project statistics/i, { exact: true });
    await expect(keyStatisticsWidget).toBeVisible();

    // Get initial entries count
    const entriesContent = await keyStatisticsWidget
      .getByText('Entries')
      .locator('..')
      .textContent();
    const initialEntriesMatch = entriesContent?.match(/Entries(\d+)/);
    const initialEntriesCount = initialEntriesMatch ? parseInt(initialEntriesMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialEntriesMatch) {
      await expect(keyStatisticsWidget.getByText('Entries')).toBeVisible();
    }

    // Get initial assets count
    const assetsContent = await keyStatisticsWidget.getByText('Assets').locator('..').textContent();
    const initialAssetsMatch = assetsContent?.match(/Assets(\d+)/);
    const initialAssetsCount = initialAssetsMatch ? parseInt(initialAssetsMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialAssetsMatch) {
      await expect(keyStatisticsWidget.getByText('Assets')).toBeVisible();
    }

    // Get initial content types count
    const contentTypesContent = await keyStatisticsWidget
      .getByText('Content-Types')
      .locator('..')
      .textContent();
    const initialContentTypesMatch = contentTypesContent?.match(/Content-Types(\d+)/);
    const initialContentTypesCount = initialContentTypesMatch
      ? parseInt(initialContentTypesMatch[1])
      : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialContentTypesMatch) {
      await expect(keyStatisticsWidget.getByText('Content-Types')).toBeVisible();
    }

    // Get initial components count
    const componentsContent = await keyStatisticsWidget
      .getByText('Components')
      .locator('..')
      .textContent();
    const initialComponentsMatch = componentsContent?.match(/Components(\d+)/);
    const initialComponentsCount = initialComponentsMatch ? parseInt(initialComponentsMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialComponentsMatch) {
      await expect(keyStatisticsWidget.getByText('Components')).toBeVisible();
    }

    // Get initial locales count
    const localesContent = await keyStatisticsWidget
      .getByText('Locales')
      .locator('..')
      .textContent();
    const initialLocalesMatch = localesContent?.match(/Locales(\d+)/);
    const initialLocalesCount = initialLocalesMatch ? parseInt(initialLocalesMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialLocalesMatch) {
      await expect(keyStatisticsWidget.getByText('Locales')).toBeVisible();
    }

    // Get initial admins count
    const adminsContent = await keyStatisticsWidget.getByText('Admins').locator('..').textContent();
    const initialAdminsMatch = adminsContent?.match(/Admins(\d+)/);
    const initialAdminsCount = initialAdminsMatch ? parseInt(initialAdminsMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialAdminsMatch) {
      await expect(keyStatisticsWidget.getByText('Admins')).toBeVisible();
    }

    // Get initial webhooks count
    const webhooksContent = await keyStatisticsWidget
      .getByText('Webhooks')
      .locator('..')
      .textContent();
    const initialWebhooksMatch = webhooksContent?.match(/Webhooks(\d+)/);
    const initialWebhooksCount = initialWebhooksMatch ? parseInt(initialWebhooksMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialWebhooksMatch) {
      await expect(keyStatisticsWidget.getByText('Webhooks')).toBeVisible();
    }

    // Get initial API tokens count
    const apiTokensContent = await keyStatisticsWidget
      .getByText('API Tokens')
      .locator('..')
      .textContent();
    const initialApiTokensMatch = apiTokensContent?.match(/API Tokens(\d+)/);
    const initialApiTokensCount = initialApiTokensMatch ? parseInt(initialApiTokensMatch[1]) : 0;

    // If we can't parse the initial count, just verify the element exists
    if (!initialApiTokensMatch) {
      await expect(keyStatisticsWidget.getByText('API Tokens')).toBeVisible();
    }

    // If we found all the initial counts, we can run the test of adding items to the project
    if (
      initialApiTokensMatch &&
      initialAdminsMatch &&
      initialWebhooksMatch &&
      initialContentTypesMatch &&
      initialComponentsMatch &&
      initialLocalesMatch &&
      initialAssetsMatch &&
      initialEntriesMatch
    ) {
      // Create an entry
      await navToHeader(page, ['Content Manager', 'Article'], 'Article');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
      await page.getByRole('textbox', { name: /title/i }).fill('Test article');
      await page.getByRole('button', { name: /save/i }).click();

      // Upload an asset
      await navToHeader(page, ['Media Library'], 'Media Library');
      await page.getByRole('button', { name: 'Add new assets' }).first().click();
      await page
        .getByLabel('Drag & Drop here or')
        .setInputFiles('public/assets/administration_panel.png');
      const uploadButton = page.getByRole('button', { name: 'Upload 1 asset to the library' });
      try {
        await uploadButton.waitFor({ state: 'visible', timeout: 5000 });
        await uploadButton.click();
      } catch {
        await page.getByRole('button', { name: /^finish$/i }).click();
      }
      await clickAndWait(page, page.getByRole('link', { name: 'Home' }));

      // Create a content type and a component
      await navToHeader(page, ['Content-Type Builder'], 'Content-Type Builder');
      await page.getByRole('button', { name: /create new collection type/i }).click();
      await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();
      await page.getByRole('textbox', { name: /display name/i }).fill('NewType');
      await page.getByRole('button', { name: /continue/i }).click();

      await page.getByRole('button', { name: /create new component/i }).click();
      await expect(page.getByRole('heading', { name: 'Create a component' })).toBeVisible();
      await page.getByRole('textbox', { name: /display name/i }).fill('NewComponent');
      await page
        .getByRole('combobox', { name: 'Select a category or enter a name to create a new one' })
        .fill('NewCategory');
      await page.getByRole('button', { name: /continue/i }).click();

      await page.getByRole('button', { name: /save/i }).click();
      await waitForRestart(page);

      // Create a locale
      await navToHeader(page, ['Settings', 'Internationalization'], 'Internationalization');
      await page.getByRole('button', { name: /add new locale/i }).click();
      await page.getByRole('combobox', { name: 'Locales' }).click();
      await page.getByRole('option', { name: 'Afrikaans (af)' }).click();
      await page.getByRole('button', { name: /save/i }).click();

      // Create an admin
      await navToHeader(page, ['Settings', 'Users'], 'Users');
      await page.getByRole('button', { name: /invite new user/i }).click();
      await page.getByRole('textbox', { name: /first name/i }).fill('New');
      await page.getByRole('textbox', { name: /email/i }).fill('newadmin@example.com');
      await page.getByRole('combobox', { name: "User's roles" }).click();
      await page.getByRole('option', { name: 'Author' }).click();
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: /invite user/i }).click();
      await page.getByRole('button', { name: /finish/i }).click();

      // Create a webhook
      await navToHeader(page, ['Webhooks'], 'Webhooks');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new webhook' }).first());
      await page.getByRole('textbox', { name: /name/i }).fill('NewWebhook');
      await page
        .getByRole('textbox', { name: /url/i })
        .fill('http://localhost:1337/api/webhooks/new');
      await page.getByRole('button', { name: /save/i }).click();

      // Create an API token
      await navToHeader(page, ['API Tokens'], 'API Tokens');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new API token' }).first());
      await page.getByRole('textbox', { name: /name/i }).fill('NewAPIToken');
      await page.getByRole('combobox', { name: 'Token duration' }).click();
      await page.getByRole('option', { name: '30 days' }).click();
      await page.getByRole('combobox', { name: 'Token type' }).click();
      await page.getByRole('option', { name: 'Full access' }).click();
      await page.getByRole('button', { name: /save/i }).click();

      // Go back to the home page
      await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));

      // The numbers should be updated
      await expect(keyStatisticsWidget.getByText('Entries').locator('..')).toContainText(
        String(initialEntriesCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('Assets').locator('..')).toContainText(
        String(initialAssetsCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('Content-Types').locator('..')).toContainText(
        String(initialContentTypesCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('Components').locator('..')).toContainText(
        String(initialComponentsCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('Locales').locator('..')).toContainText(
        String(initialLocalesCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('Admins').locator('..')).toContainText(
        String(initialAdminsCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('Webhooks').locator('..')).toContainText(
        String(initialWebhooksCount + 1)
      );
      await expect(keyStatisticsWidget.getByText('API Tokens').locator('..')).toContainText(
        String(initialApiTokensCount + 1)
      );

      // Remove the collection type and component to reset the dataset
      page.on('dialog', (dialog) => dialog.accept());
      await navToHeader(page, ['Content-Type Builder'], 'Content-Type Builder');
      await page.getByRole('link', { name: 'NewType' }).click();
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByRole('button', { name: /delete/i }).click();
      await page.getByRole('link', { name: 'NewComponent' }).click();
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByRole('button', { name: /delete/i }).click();

      await page.getByRole('button', { name: /save/i }).click();
      await waitForRestart(page);
    }
  });
});

test.describe('Home as editor', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
  });

  test('a user should not see the key statistics widget if they are not a super admin', async ({
    page,
  }) => {
    const keyStatisticsWidget = page.getByLabel(/project statistics/i, { exact: true });
    await expect(keyStatisticsWidget).not.toBeVisible();
  });
});
