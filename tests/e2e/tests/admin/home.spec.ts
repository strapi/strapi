import { test, expect } from '../../../fixtures';
import { login, loginWithApi } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { resetFiles } from '../../../utils/file-reset';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';
import { startCreateContentType } from '../../../utils/content-types';
import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import { AssetsPage } from '../media-library/page-objects/AssetsPage';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

test.describe('Home as super admin', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await loginWithApi({ page });
    await page.goto('/admin');
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

  test('a super admin should see the deploy now widget', async ({ page }) => {
    const deployWidget = page.locator('[data-strapi-widget-id="plugin::admin.deploy-now"]');
    await expect(deployWidget).toBeVisible();
    await expect(deployWidget.getByText('Ready to go live')).toBeVisible();
    await expect(deployWidget.getByText('Deploy with Strapi Cloud')).toBeVisible();
    await expect(deployWidget.getByRole('link', { name: /deploy now/i })).toBeVisible();
  });
});

test.describe('Home as super admin — key statistics', () => {
  let didWriteSchemaFiles = false;

  test.beforeEach(async ({ page }) => {
    didWriteSchemaFiles = false;
    await resetFiles();
    await resetDatabaseAndImportDataFromPath('with-admin');
    await loginWithApi({ page });
    await page.goto('/admin');
  });

  test.afterEach(async () => {
    if (didWriteSchemaFiles) {
      await resetFiles();
    }
  });

  test('a super admin should see the key statistics widget', async ({ page }) => {
    const keyStatisticsWidget = page.getByLabel(/project statistics/i, { exact: true });
    await expect(keyStatisticsWidget).toBeVisible();

    const readCount = async (label: string) => {
      const content = await keyStatisticsWidget.getByText(label).locator('..').textContent();
      const match = content?.match(new RegExp(`${label}(\\d+)`));
      if (!match) {
        await expect(keyStatisticsWidget.getByText(label)).toBeVisible();
        return null;
      }
      return parseInt(match[1], 10);
    };

    const initialEntriesCount = await readCount('Entries');
    const initialAssetsCount = await readCount('Assets');
    const initialLocalesCount = await readCount('Locales');
    const initialAdminsCount = await readCount('Admins');
    const initialWebhooksCount = await readCount('Webhooks');
    const initialApiTokensCount = await readCount('API Tokens');

    if (
      initialEntriesCount === null ||
      initialAssetsCount === null ||
      initialLocalesCount === null ||
      initialAdminsCount === null ||
      initialWebhooksCount === null ||
      initialApiTokensCount === null
    ) {
      return;
    }

    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await page.getByRole('textbox', { name: /title/i }).fill('Test article');
    await Promise.all([
      page.waitForURL(/\/admin\/content-manager\/collection-types\/api::article\.article\/[^/]+/),
      page.getByRole('button', { name: /save/i }).click(),
    ]);
    await findAndClose(page, 'Saved document');

    // Upload through the Media Library page object. Hardcoded panel copy broke this step
    // when the new Media Library became the default. navToHeader asserts an exact heading,
    // and the page is titled after the current folder ("Home (3 items)" at the root).
    const assetsPage = new AssetsPage(page);
    await clickAndWait(page, page.locator('role=link[name^="Media Library"]').last());
    await expect(assetsPage.newButton).toBeVisible();

    await assetsPage.uploadFilesWithFilePicker('public/assets/administration_panel.png');
    await assetsPage.waitForUploadProgressSuccess();
    await assetsPage.closeUploadProgressDialog();

    await navToHeader(page, ['Settings', 'Internationalization'], 'Internationalization');
    await page.getByRole('button', { name: /add new locale/i }).click();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Afrikaans (af)' }).click();
    await page.getByRole('button', { name: /save/i }).click();

    await navToHeader(page, ['Settings', 'Users'], 'Users');
    await page.getByRole('button', { name: /invite new user/i }).click();
    await page.getByRole('textbox', { name: /first name/i }).fill('New');
    await page.getByRole('textbox', { name: /email/i }).fill('newadmin@example.com');
    await page.getByRole('combobox', { name: "User's roles" }).click();
    await page.getByRole('option', { name: 'Author' }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /invite user/i }).click();
    await page.getByRole('button', { name: /finish/i }).click();

    await navToHeader(page, ['Webhooks'], 'Webhooks');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new webhook' }).first());
    await page.getByRole('textbox', { name: /name/i }).fill('NewWebhook');
    await page
      .getByRole('textbox', { name: /url/i })
      .fill('http://localhost:1337/api/webhooks/new');
    await Promise.all([
      page.waitForURL(/\/admin\/settings\/webhooks\/(?!create)[^/]+/),
      page.getByRole('button', { name: /save/i }).click(),
    ]);

    await navToHeader(page, ['API Tokens'], 'API Tokens');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new API token' }).first());
    await page.getByRole('textbox', { name: /name/i }).fill('NewAPIToken');
    await page.getByRole('combobox', { name: 'Token duration' }).click();
    await page.getByRole('option', { name: '30 days' }).click();
    await page.getByRole('combobox', { name: 'Token type' }).click();
    await page.getByRole('option', { name: 'Full access' }).click();
    await Promise.all([
      page.waitForURL(/\/admin\/settings\/api-tokens\/(?!create)[^/]+/),
      page.getByRole('button', { name: /save/i }).click(),
    ]);

    const keyStatisticsReady = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/homepage/key-statistics') &&
        response.ok()
    );
    await page.getByRole('link', { name: /^home$/i }).click();
    await keyStatisticsReady;

    await expect(keyStatisticsWidget.getByText('Entries').locator('..')).toContainText(
      String(initialEntriesCount + 1)
    );
    await expect(keyStatisticsWidget.getByText('Assets').locator('..')).toContainText(
      String(initialAssetsCount + 1)
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
  });

  test('a super admin should see content type and component counts update', async ({ page }) => {
    const keyStatisticsWidget = page.getByLabel(/project statistics/i, { exact: true });
    await expect(keyStatisticsWidget).toBeVisible();

    const readCount = async (label: string) => {
      const content = await keyStatisticsWidget.getByText(label).locator('..').textContent();
      const match = content?.match(new RegExp(`${label}(\\d+)`));
      if (!match) {
        await expect(keyStatisticsWidget.getByText(label)).toBeVisible();
        return null;
      }
      return parseInt(match[1], 10);
    };

    const initialContentTypesCount = await readCount('Content-Types');
    const initialComponentsCount = await readCount('Components');

    if (initialContentTypesCount === null || initialComponentsCount === null) {
      return;
    }

    didWriteSchemaFiles = true;

    await navToHeader(page, ['Content-Type Builder'], 'Content-Type Builder');
    await startCreateContentType(page, 'collection');
    await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();
    await page.getByRole('textbox', { name: /display name/i }).fill('NewType');
    await expect(page.getByLabel('API ID (Singular)')).toHaveValue('new-type');
    await expect(page.getByLabel('API ID (Plural)')).toHaveValue('new-types');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('button', { name: 'Add new field' }).first()).toBeVisible();

    await page.getByRole('button', { name: /create new component/i }).click();
    await expect(page.getByRole('heading', { name: 'Create a component' })).toBeVisible();
    await page.getByRole('textbox', { name: /display name/i }).fill('NewComponent');
    await page
      .getByRole('combobox', { name: 'Select a category or enter a name to create a new one' })
      .fill('NewCategory');
    await page.getByRole('button', { name: /continue/i }).click();

    await page.getByRole('button', { name: /save/i }).click();
    await waitForRestart(page);

    const keyStatisticsReady = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/homepage/key-statistics') &&
        response.ok()
    );
    await page.getByRole('link', { name: /^home$/i }).click();
    await keyStatisticsReady;

    await expect(keyStatisticsWidget.getByText('Content-Types').locator('..')).toContainText(
      String(initialContentTypesCount + 1)
    );
    await expect(keyStatisticsWidget.getByText('Components').locator('..')).toContainText(
      String(initialComponentsCount + 1)
    );
  });
});

test.describe('Home as editor', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
  });

  test('a user should not see the key statistics widget if they are not a super admin', async ({
    page,
  }) => {
    const keyStatisticsWidget = page.getByLabel(/project statistics/i, { exact: true });
    await expect(keyStatisticsWidget).not.toBeVisible();
  });

  test('a user should see the deploy now widget regardless of their role', async ({ page }) => {
    const deployWidget = page.locator('[data-strapi-widget-id="plugin::admin.deploy-now"]');
    await expect(deployWidget).toBeVisible();
    await expect(deployWidget.getByRole('link', { name: /deploy now/i })).toBeVisible();
  });
});
