import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Homepage - Content Releases Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the list of upcoming releases', async ({ page }) => {
    const upcomingReleasesWidget = page.getByLabel(/upcoming releases/i, { exact: true });
    await expect(upcomingReleasesWidget).toBeVisible();

    // Check that the not scheduled release is displayed
    const firstReleaseRow = upcomingReleasesWidget.getByRole('row').nth(0);
    await expect(firstReleaseRow).toBeVisible();
    await expect(
      firstReleaseRow.getByRole('gridcell', { name: /trent crimm: the independent/i })
    ).toBeVisible();
    await expect(firstReleaseRow.getByRole('gridcell', { name: /not scheduled/i })).toBeVisible();

    // Create a new scheduled release in the future
    await navToHeader(page, ['Releases'], 'Releases');

    const nextReleaseName = 'Next release';
    await page.getByRole('button', { name: /new release/i }).click();
    await page.getByRole('textbox', { name: /name/i }).fill(nextReleaseName);

    const date = new Date();
    const hours = date.getHours();
    const hoursFuture = (hours + 2) % 24;
    const hoursFutureFormatted = hoursFuture < 10 ? `0${hoursFuture}` : `${hoursFuture}`;

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
    await page.getByRole('option', { name: `${hoursFutureFormatted}:00`, exact: true }).click();

    await page.getByRole('button', { name: /continue/i }).click();
    await findAndClose(page, 'Release created');

    // Go back to the homepage
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    const nextReleaseRow = upcomingReleasesWidget.getByRole('row').nth(1);
    await expect(nextReleaseRow).toBeVisible();
    await expect(nextReleaseRow.getByRole('gridcell', { name: nextReleaseName })).toBeVisible();
    await expect(nextReleaseRow.getByRole('gridcell', { name: /empty/i })).toBeVisible();

    // Add an entry to the release
    await navToHeader(page, ['Content Manager', 'Cat'], 'Cat');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await page.getByRole('textbox', { name: /age/i }).fill('1');
    await page.getByRole('button', { name: /save/i }).click();
    await page.getByRole('button', { name: 'More document actions' }).click();
    await page.getByRole('menuitem', { name: 'Add to release' }).click();
    const addToReleaseDialog = await page.getByRole('dialog', { name: 'Add to release' });
    await expect(addToReleaseDialog).toBeVisible();
    await page.getByRole('combobox', { name: 'Select a release' }).click();
    await page.getByRole('option', { name: nextReleaseName }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await findAndClose(page, 'Entry added to release');

    // Go back to the homepage and check that the widget was updated
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    await expect(nextReleaseRow.getByRole('gridcell', { name: /blocked/i })).toBeVisible();
  });
});
