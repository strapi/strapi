import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition, findAndClose, navToHeader } from '../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Homepage - Content Releases Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the entries chart widget', async ({ page }) => {
    const upcomingReleasesWidget = page.getByLabel(/upcoming releases/i, { exact: true });
    await expect(upcomingReleasesWidget).toBeVisible();
    await expect(upcomingReleasesWidget).toHaveText(/No releases/i);

    // Create a new release in the future
    await navToHeader(page, ['Releases'], 'Releases');

    await page.getByRole('button', { name: /new release/i }).click();
    await page.getByRole('textbox', { name: /name/i }).fill('Next release');

    const date = new Date();
    const hours = date.getHours();

    await page
      .getByRole('combobox', {
        name: /date/i,
      })
      .click();
    date.setDate(date.getDate() + 1);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    await page.getByLabel(formattedDate).click();

    await page.getByRole('combobox', { name: 'Time', exact: true }).click();
    await page.getByRole('option', { name: `${hours + 2}:00` }).click();

    await page.getByRole('button', { name: /continue/i }).click();
    await findAndClose(page, 'Release created');

    // Go back to the homepage
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const upcomingReleasesList = upcomingReleasesWidget.getByRole('row').nth(0);
    await expect(upcomingReleasesList).toBeVisible();
    await expect(
      upcomingReleasesList.getByRole('gridcell', { name: /Next release/i })
    ).toBeVisible();
    await expect(upcomingReleasesList.getByRole('gridcell', { name: /empty/i })).toBeVisible();
  });
});
