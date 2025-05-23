import { test, expect } from '@playwright/test';
import { clickAndWait, describeOnCondition, skipCtbTour } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { waitForRestart } from '../../utils/restart';
import { resetFiles } from '../../utils/file-reset';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Releases page', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await resetFiles();
    await page.goto('/admin');
    await login({ page });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('A user should be able to create a release without scheduling it and view their pending and done releases', async ({
    page,
  }) => {
    // Navigate to the releases page
    await page.getByRole('link', { name: 'Releases' }).click();

    await expect(page.getByRole('link', { name: `Trent Crimm: The Independent` })).toBeVisible();

    // Open the 'Done' tab panel
    await page.getByRole('tab', { name: 'Done' }).click();
    await expect(page.getByRole('link', { name: `Nate: A wonder kid` })).toBeVisible();

    // Open the create release dialog
    await page.getByRole('button', { name: 'New release' }).click();
    await expect(page.getByRole('dialog', { name: 'New release' })).toBeVisible();

    // Create a release
    const newReleaseName = 'The Diamond Dogs';
    await page.getByRole('textbox', { name: 'Name' }).fill(newReleaseName);
    // Uncheck default scheduling of a release and save
    await page.getByRole('checkbox', { name: 'Schedule release' }).uncheck();
    await page.getByRole('button', { name: 'Continue' }).click();
    // Wait for client side redirect to created release
    await page.waitForURL('/admin/plugins/content-releases/*');
    await expect(page.getByRole('heading', { name: newReleaseName })).toBeVisible();

    // Navigate back to the release page to see the newly created release
    await page.getByRole('link', { name: 'Releases' }).click();
    await expect(page.getByRole('link', { name: `${newReleaseName}` })).toBeVisible();
  });

  test('A user should be able to create a release with scheduling info and view their pending and done releases', async ({
    page,
  }) => {
    // Navigate to the releases page
    await clickAndWait(page, page.getByRole('link', { name: 'Releases' }));

    // Open the create release dialog
    await clickAndWait(page, page.getByRole('button', { name: 'New release' }));
    await expect(page.getByRole('dialog', { name: 'New release' })).toBeVisible();

    // Create a release
    const newReleaseName = 'The Diamond Dogs';
    await page.getByRole('textbox', { name: 'Name' }).fill(newReleaseName);

    // Select valid date and time
    await page
      .getByRole('combobox', {
        name: 'Date',
      })
      .click();

    const date = new Date();
    date.setDate(date.getDate() + 1);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    await page.getByLabel(formattedDate).click();

    await page.getByRole('combobox', { name: /^time$/i }).click();

    await page.getByRole('option', { name: '08:00' }).click();

    await clickAndWait(page, page.getByRole('button', { name: 'Continue' }));

    // Wait for client side redirect to created release
    await page.waitForURL('/admin/plugins/content-releases/*');

    await expect(page.getByRole('heading', { name: newReleaseName })).toBeVisible();

    // Navigate back to the release page to see the newly created release
    await clickAndWait(page, page.getByRole('link', { name: 'Releases' }));
    await expect(page.getByRole('link', { name: `${newReleaseName}` })).toBeVisible();
  });

  test('A user should be able to perform bulk release on entries', async ({ page }) => {
    await test.step('bulk release', async () => {
      // Navigate to the releases page
      await clickAndWait(page, page.getByRole('link', { name: 'Releases' }));
      await page.getByRole('button', { name: 'New release' }).click();
      await expect(page.getByRole('dialog', { name: 'New release' })).toBeVisible();
      // Create a new release
      const newReleaseName = 'The Diamond Dogs';
      await page.getByRole('textbox', { name: 'Name' }).fill(newReleaseName);
      // Uncheck default scheduling of a release and save
      await page.getByRole('checkbox', { name: 'Schedule release' }).uncheck();
      await clickAndWait(page, page.getByRole('button', { name: 'Continue' }));
      // Wait for client side redirect to created release
      await page.waitForURL('/admin/plugins/content-releases/*');
      await expect(page.getByRole('heading', { name: newReleaseName })).toBeVisible();

      // Navigate to the content manager
      await clickAndWait(page, page.getByRole('link', { name: 'Open the Content Manager' }));
      await page.waitForURL('/admin/content-manager/collection-types/*');
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();

      // Select all entries to release
      await page.getByRole('checkbox', { name: 'Select all entries' }).check();
      await clickAndWait(page, page.getByRole('button', { name: 'add to release' }));

      // Wait for the add to release dialog to appear
      await page
        .getByRole('combobox', {
          name: 'Select a release',
        })
        .click();

      await page.getByRole('option', { name: 'The Diamond Dogs' }).click();
      await page.getByText('unpublish', { exact: true }).click();
      await clickAndWait(page, page.getByText('continue'));
      await page.getByText(/Successfully added to release./).waitFor({
        state: 'visible',
        timeout: 5000,
      });
    });

    await test.step('releases should be updated in the release column of list view', async () => {
      const releaseColumn = page.getByRole('button', { name: '1 release' });
      await clickAndWait(page, releaseColumn.first());
      await expect(page.getByText('The Diamond Dogs')).toBeVisible();
    });
  });

  test('Should not show "add to release" bulk action for content types without draft & publish enabled', async ({
    page,
  }) => {
    // Publish articles, otherwise they'll be deleted when we disable draft & publish
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await page.getByRole('checkbox', { name: 'Select all entries' }).check();
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await page.getByRole('button', { name: 'Publish' }).click();
    const publishConfirmationDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(publishConfirmationDialog).toBeVisible();
    await publishConfirmationDialog.getByRole('button', { name: 'Publish' }).click();

    // Disable draft & publish for the Article content type
    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
    await skipCtbTour(page);
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Edit', exact: true }));
    await clickAndWait(page, page.getByRole('tab', { name: /advanced settings/i }));
    await page.getByLabel('Draft & publish').click();
    const ctbConfirmationDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(ctbConfirmationDialog).toBeVisible();
    await ctbConfirmationDialog.getByRole('button', { name: /disable/i }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));
    await waitForRestart(page);

    // Go to the content manager and bulk select articlesto make sure the "add to release" does not show up
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Select all entries' }).check();
    await expect(page.getByRole('button', { name: /add to release/i })).not.toBeVisible();
  });
});
