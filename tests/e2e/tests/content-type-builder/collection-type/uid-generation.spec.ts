import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { sharedSetup } from '../../../../utils/setup';
import { clickAndWait } from '../../../../utils/shared';
import { waitForRestart } from '../../../../utils/restart';

test.describe('Content Type UID Generation', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-uid-generation', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });

    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Should generate UID from singular name, not display name', async ({ page }) => {
    // Create a new collection type
    await page.getByRole('button', { name: 'Create new collection type' }).click();
    await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();

    // Fill in "Members" as display name
    const displayName = page.getByLabel('Display name');
    await displayName.fill('Members');

    // Wait for auto-generation
    await page.waitForTimeout(500);

    // manually change singular name to "member"
    const singularIdField = page.getByLabel('API ID (Singular)');
    await singularIdField.clear();
    await singularIdField.fill('member');

    // Verify it has the value we set
    await expect(singularIdField).toHaveValue('member');

    // Verify plural name is "members"
    const pluralIdField = page.getByLabel('API ID (Plural)');
    await expect(pluralIdField).toHaveValue('members');

    // Continue to add fields
    await page.getByRole('button', { name: 'Continue' }).click();

    // Add a field - use the same selector as the helper function
    await clickAndWait(page, page.getByRole('button', { name: 'Add new field' }).first());

    // Select Text field type
    await page.getByRole('button', { name: 'Text Small or long' }).click();

    // Fill in field name
    await page.getByLabel('Name', { exact: true }).fill('title');

    // Finish adding the field
    await page.getByRole('button', { name: 'Finish' }).click();

    // Save the content type
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // After restart, verify the content type appears in the list
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();

    // Navigate to the created content type
    await clickAndWait(page, page.getByRole('link', { name: 'Members' }));

    // Verify the URL uses the singular name "member" in UID, not "members"
    await expect(page).toHaveURL(/content-types\/api::member\.member$/);
  });

  test('Should show error when singular and plural names are the same', async ({ page }) => {
    // This test verifies that if "Cities" is used as display name and the singular name
    // is NOT manually corrected to "city", there should be a validation error because
    // singular and plural names cannot be the same.

    // Create a new collection type
    await page.getByRole('button', { name: 'Create new collection type' }).click();
    await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();

    // Fill in "Cities" as display name
    const displayName = page.getByLabel('Display name');
    await displayName.fill('Cities');

    // Wait for auto-generation
    await page.waitForTimeout(500);

    // Singular name will be auto-generated as "cities" (just slugified, NOT singularized)
    const singularIdField = page.getByLabel('API ID (Singular)');
    await expect(singularIdField).toHaveValue('cities');

    // Plural should also be "cities"
    const pluralIdField = page.getByLabel('API ID (Plural)');
    await expect(pluralIdField).toHaveValue('cities');

    // Try to continue - should be blocked due to validation error
    await page.getByRole('button', { name: 'Continue' }).click();

    // Verify validation errors appear
    await expect(page.getByText('This value cannot be the same as the plural one')).toBeVisible();
    await expect(page.getByText('This value cannot be the same as the singular one')).toBeVisible();

    // The user should not be able to proceed without fixing this
    // Let's verify we're still on the same modal
    await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();

    // Now fix it by correcting the singular name to "city"
    await singularIdField.clear();
    await singularIdField.fill('city');

    // Now we should be able to continue
    await page.getByRole('button', { name: 'Continue' }).click();

    // Verify we moved to the field addition screen
    await expect(page.getByRole('button', { name: 'Add new field' }).first()).toBeVisible();

    // Add a field
    await clickAndWait(page, page.getByRole('button', { name: 'Add new field' }).first());
    await page.getByRole('button', { name: 'Text Small or long' }).click();
    await page.getByLabel('Name', { exact: true }).fill('name');
    await page.getByRole('button', { name: 'Finish' }).click();

    // Save the content type
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // After restart, verify the content type was created with the corrected singular name
    await expect(page.getByRole('link', { name: 'Cities' })).toBeVisible();
    await clickAndWait(page, page.getByRole('link', { name: 'Cities' }));

    // Verify the URL uses the corrected singular name "city" in the UID
    await expect(page).toHaveURL(/content-types\/api::city\.city$/);
  });
});
