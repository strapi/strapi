import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';
import { testWithPageObjects as test, expect } from './fixtures';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Homepage - Content Releases Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user should see the list of upcoming releases', async ({ page, releases }) => {
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
    const nextReleaseName = 'Next release';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await releases.goto();
    // Success navigates to the release details page; the toast is too brief to assert reliably in CI.
    await releases.createRelease(nextReleaseName, { date: tomorrow, time: '08:00' });

    // Go back to the homepage
    await clickAndWait(page, page.getByRole('link', { name: /^home$/i }));
    // Scheduled releases are listed before undated ones
    const nextReleaseRow = upcomingReleasesWidget.getByRole('row').nth(0);
    await expect(nextReleaseRow).toBeVisible();
    await expect(nextReleaseRow.getByRole('gridcell', { name: nextReleaseName })).toBeVisible();
    await expect(nextReleaseRow.getByRole('gridcell', { name: /empty/i })).toBeVisible();
    await expect(
      upcomingReleasesWidget
        .getByRole('row')
        .nth(1)
        .getByRole('gridcell', { name: /trent crimm: the independent/i })
    ).toBeVisible();

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
