import { test, expect, type Page } from '@playwright/test';
import { describeOnCondition } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { findAndClose } from '../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';
const releaseName = 'Trent Crimm: The Independent';

const addEntryToRelease = async ({ page, releaseName }: { page: Page; releaseName: string }) => {
  // Open the add to release dialog
  await page.getByRole('button', { name: 'More document actions' }).click();
  await page.getByRole('menuitem', { name: 'Add to release' }).click();
  const addToReleaseDialog = await page.getByRole('dialog', { name: 'Add to release' });
  await expect(addToReleaseDialog).toBeVisible();
  await expect(
    addToReleaseDialog.getByRole('radio', { name: 'publish', exact: true })
  ).toBeChecked();
  // Select a release
  const submitReleaseButton = await page.getByRole('button', { name: 'Continue' });
  await expect(submitReleaseButton).toBeDisabled();
  await page.getByRole('combobox', { name: 'Select a release' }).click();
  await page.getByRole('option', { name: releaseName }).click();
  await expect(submitReleaseButton).toBeEnabled();
  await submitReleaseButton.click();
  // See the release the entry was added to
  await findAndClose(page, 'Entry added to release');
};

describeOnCondition(edition === 'EE')('Release page', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await page.getByRole('link', { name: 'Releases' }).click();
    page.getByRole('link', { name: `${releaseName}` }).click();
    await page.waitForURL('/admin/plugins/content-releases/*');
  });

  test.fixme(
    'A user should be able to add collection-type and single-type entries to a release and publish the release',
    async ({ page }) => {
      // Add a collection-type entry to the release
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Author' }).click();
      await page.getByRole('gridcell', { name: 'Led Tasso' }).click();
      await page.waitForURL('**/content-manager/collection-types/api::author.author/**');
      await addEntryToRelease({ page, releaseName });

      // Add a single-type entry to the release
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Upcoming Matches' }).click();
      await page.waitForURL('**/content-manager/single-types/api::upcoming-match.upcoming-match**');
      // Open the add to release dialog
      await addEntryToRelease({ page, releaseName });

      // Publish the release
      await page.getByRole('link', { name: 'Releases' }).click();
      await page.getByRole('link', { name: `${releaseName}` }).click();
      await page.getByRole('button', { name: 'Publish' }).click();
      expect(page.getByRole('heading', { name: releaseName })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Release edit and delete menu' })
      ).not.toBeVisible();
      await expect(page.getByRole('gridcell', { name: 'publish unpublish' })).not.toBeVisible();
      await expect(
        page.getByRole('gridcell', { name: 'This entry was published.' }).first()
      ).toBeVisible();
    }
  );

  test('A user should be able to edit and delete a release', async ({ page }) => {
    // Edit the release
    await page.getByRole('button', { name: 'Release edit and delete menu' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit release' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Name' }).fill('Trent Crimm: Independent');
    await page.getByRole('button', { name: 'Save' }).click();
    const editedEntryName = 'Trent Crimm: Independent';
    await expect(page.getByRole('heading', { name: editedEntryName })).toBeVisible();

    // Delete the release
    await page.getByRole('button', { name: 'Release edit and delete menu' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    // Wait for client side redirect to the releases page
    await page.waitForURL('/admin/plugins/content-releases');
    await expect(page.getByRole('link', { name: `${editedEntryName}` })).not.toBeVisible();
  });

  test.fixme(
    "A user should be able to change the entry groupings, update an entry's action, remove an entry from a release, and navigate to the entry in the content manager",
    async ({ page }) => {
      // Change the entry groupings
      await expect(page.getByRole('separator', { name: 'Article' })).toBeVisible();
      await expect(page.getByRole('separator', { name: 'Author' })).toBeVisible();
      await page.getByLabel('Group by').click();
      await page.getByRole('option', { name: 'Actions' }).click();
      await expect(page.getByRole('separator', { name: 'publish', exact: true })).toBeVisible();
      await expect(page.getByRole('separator', { name: 'unpublish' })).toBeVisible();

      // Change the entry grouping
      const row = await page.getByRole('row').filter({ hasText: 'West Ham post match analysis' });
      // The first row after the header is NOT the one we will update
      await expect(
        page
          .getByRole('row')
          .nth(1)
          .getByRole('gridcell', { name: 'Analyse post-match contre West Ham' })
      ).toBeVisible();
      // Update a given row's action
      await expect(row.getByRole('radio').first()).not.toBeChecked();
      row.locator('label').first().click();
      await expect(row.getByRole('radio').first()).toBeChecked();
      // The updated is now the first row after the header
      await expect(
        page.getByRole('row').nth(1).getByRole('gridcell', { name: 'West Ham post match analysis' })
      ).toBeVisible();

      // Navigate to a given row's entry in the content-manager
      await row.getByRole('button', { name: 'Release action options' }).click();
      await page.getByRole('menuitem', { name: 'Edit entry' }).click();
      await page.waitForURL('**/content-manager/collection-types/api::article.article/**');
      await expect(
        page.getByRole('heading', { name: 'West Ham post match analysis' })
      ).toBeVisible();

      // Return to release page
      await page.goBack();
      await page.waitForURL('/admin/plugins/content-releases/*');

      // Remove a given row's entry from the release
      await row.getByRole('button', { name: 'Release action options' }).click();
      await page.getByRole('menuitem', { name: 'Remove from release' }).click();
      await expect(row).not.toBeVisible();
    }
  );
});
