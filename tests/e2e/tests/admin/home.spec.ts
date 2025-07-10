import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../utils/shared';
import { waitForRestart } from '../../utils/restart';
import roles from '@strapi/admin/server/src/routes/roles';

test.describe('Home', () => {
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

  test('a user should see the last edited entries', async ({ page }) => {
    const recentlyEditedWidget = page.getByLabel(/last edited entries/i);
    await expect(recentlyEditedWidget).toBeVisible();

    // Make content update in the CM
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: /^nike mens/i }));
    const nameBox = page.getByLabel(/name/i);
    await nameBox.fill('Nike Mens newer!');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    // Go back to the home page, the updated entry should be the first in the table
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const mostRecentEntry = recentlyEditedWidget.getByRole('row').nth(0);
    await expect(mostRecentEntry).toBeVisible();
    await expect(
      mostRecentEntry.getByRole('gridcell', { name: /nike mens newer!/i })
    ).toBeVisible();
    await expect(mostRecentEntry.getByRole('gridcell', { name: /draft/i })).toBeVisible();
  });

  test('a user should see the last published entries', async ({ page }) => {
    const recentlyPublishedWidget = page.getByLabel(/last published entries/i);
    await expect(recentlyPublishedWidget).toBeVisible();

    // Make content update in the CM
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

    // Go back to the home page, the published entry should be the first in the table with published status
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const mostRecentPublishedEntry = recentlyPublishedWidget.getByRole('row').nth(0);
    await expect(mostRecentPublishedEntry).toBeVisible();
    await expect(
      mostRecentPublishedEntry.getByRole('gridcell', { name: 'West Ham post match analysis' })
    ).toBeVisible();
    await expect(
      mostRecentPublishedEntry.getByRole('gridcell', { name: 'Published' })
    ).toBeVisible();

    // Now go modify the published entry
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    const title = page.getByLabel(/title/i);
    await title.fill('West Ham pre match pep talk');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    // Go back to the home page, the published entry should be the first in the table with modified status
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const mostRecentModifiedEntry = recentlyPublishedWidget.getByRole('row').nth(0);
    await expect(
      // It should still be the published data, not the modified draft data
      mostRecentModifiedEntry.getByRole('gridcell', { name: 'West Ham post match analysis' })
    ).toBeVisible();
    await expect(mostRecentModifiedEntry.getByRole('gridcell', { name: 'Modified' })).toBeVisible();
  });

  test('a user should see the entries chart widget', async ({ page }) => {
    const chartWidget = page.getByLabel('Entries', { exact: true });

    await expect(chartWidget).toBeVisible();

    // By default, the chart should only show draft entries (no published/modified)
    await expect(chartWidget.getByText('Draft')).toBeVisible();
    await expect(chartWidget.getByText('Modified')).not.toBeVisible();
    await expect(chartWidget.getByText('Published')).not.toBeVisible();

    const arcDraft = chartWidget.locator('circle').first();
    await arcDraft.focus();

    const tooltip = page.getByTestId('entries-chart-tooltip');

    await expect(tooltip).toBeVisible();

    // Get the initial draft count from the tooltip
    const tooltipText = await tooltip.textContent();
    const initialDraftMatch = tooltipText?.match(/(\d+) Draft/);
    const initialDraftCount = initialDraftMatch ? parseInt(initialDraftMatch[1]) : 0;

    // Publish an entry
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');

    // Modify an entry
    await page.getByRole('link', { name: 'Back' }).click();
    await clickAndWait(
      page,
      page.getByRole('gridcell', { name: 'Why I prefer football over soccer' })
    );
    await page.getByRole('button', { name: /publish/i }).click();
    await findAndClose(page, 'Published document');
    const title = page.getByLabel(/title/i);
    await title.fill('West Ham pre match pep talk');
    await page.getByRole('button', { name: /save/i }).click();
    await findAndClose(page, 'Saved document');

    // Go back to the home page
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));

    // The published and modified entries should be visible in the chart
    await expect(chartWidget.getByText('Draft')).toBeVisible();
    await expect(chartWidget.getByText('Modified')).toBeVisible();
    await expect(chartWidget.getByText('Published')).toBeVisible();

    const arcDraftUpdated = chartWidget.locator('circle').nth(0);
    await arcDraftUpdated.focus();

    await expect(tooltip).toBeVisible();
    // Should be 2 less than initial (we published 2 entries)
    await expect(tooltip).toContainText(`${initialDraftCount - 2} Draft`);

    const arcPublished = chartWidget.locator('circle').nth(1);
    await arcPublished.focus();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('1 Modified');

    const arcModified = chartWidget.locator('circle').nth(2);
    await arcModified.focus();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('1 Published');
  });

  test.only('a user should see the key statistics widget', async ({ page }) => {
    const keyStatisticsWidget = page.getByLabel(/project statistics/i, { exact: true });
    await expect(keyStatisticsWidget).toBeVisible();

    // Test that each number is next to its label
    // Check entries
    await expect(keyStatisticsWidget.getByText('Entries').locator('..')).toContainText('11');

    // Check assets
    await expect(keyStatisticsWidget.getByText('Assets').locator('..')).toContainText('9');

    // Check content types
    await expect(keyStatisticsWidget.getByText('Content-Types').locator('..')).toContainText('10');

    // Check components
    await expect(keyStatisticsWidget.getByText('Components').locator('..')).toContainText('5');

    // Check locales
    await expect(keyStatisticsWidget.getByText('Locales').locator('..')).toContainText('4');

    // Check admins
    await expect(keyStatisticsWidget.getByText('Admins').locator('..')).toContainText('3');

    // Check webhooks
    await expect(keyStatisticsWidget.getByText('Webhooks').locator('..')).toContainText('0');

    // Check API tokens
    await expect(keyStatisticsWidget.getByText('API Tokens').locator('..')).toContainText('0');

    // Create an entry
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await page.getByRole('textbox', { name: /title/i }).fill('Test article');
    await page.getByRole('button', { name: /save/i }).click();

    // Create a content type and a component
    await navToHeader(page, ['Content-Type Builder'], 'Content-Type Builder');
    await page.getByRole('button', { name: /skip the tour/i }).click();
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

    // The numbers should have updated
    await expect(keyStatisticsWidget.getByText('Entries').locator('..')).toContainText('12');
    await expect(keyStatisticsWidget.getByText('Content-Types').locator('..')).toContainText('11');
    await expect(keyStatisticsWidget.getByText('Components').locator('..')).toContainText('6');
    await expect(keyStatisticsWidget.getByText('Locales').locator('..')).toContainText('5');
    await expect(keyStatisticsWidget.getByText('Admins').locator('..')).toContainText('4');
    await expect(keyStatisticsWidget.getByText('Webhooks').locator('..')).toContainText('1');
    await expect(keyStatisticsWidget.getByText('API Tokens').locator('..')).toContainText('1');

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

    // TODO: Upload an asset
  });
});
