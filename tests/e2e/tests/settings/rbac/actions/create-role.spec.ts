import { test, expect, type Page } from '@playwright/test';

import { sharedSetup } from '../../../../utils/setup';
import { navToHeader, clickAndWait } from '../../../../utils/shared';

// Constants for the created role
const NEW_ROLE = { name: 'Publisher', description: 'Role with publishing capabilities' };

/**
 * Navigate to the Roles management settings via the menu
 */
const goToAdminRolesPage = async (page: Page) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
};

test.describe('RBAC - Create Roles', () => {
  // Runs before each test
  test.beforeEach(async ({ page }) => {
    // Perform shared setup to reset the database, log in, and prepare the environment
    await sharedSetup('rbac-roles', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      skipTour: true,
    });

    // Navigate to the Roles management page
    await goToAdminRolesPage(page);
  });

  // Test for verifying Super Admin can create a new role
  test('Super Admin can create a new role', async ({ page }) => {
    // Step 1: click "Create new role"
    await clickAndWait(page, page.getByRole('button', { name: 'Add new role' }).first());

    // Step 2: fill in the role name and description
    await page.getByRole('textbox', { name: 'Name' }).fill(NEW_ROLE.name);
    await page.getByRole('textbox', { name: 'Description' }).fill(NEW_ROLE.description);

    // Step 3: assign the public "publish" permission for articles
    await page.getByRole('tab', { name: 'Collection Types' }).click(); // Select permissions tab
    await page.getByRole('checkbox', { name: 'Select Publish article' }).check();

    // Step 4: save the newly created role
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    // Step 5: verify the newly created role in the list
    await goToAdminRolesPage(page); // Go back to the Roles management page

    const roleLocator = page.getByRole('row', { name: NEW_ROLE.name });

    await expect(roleLocator).toBeVisible();
    await expect(roleLocator.getByRole('gridcell', { name: NEW_ROLE.name })).toBeVisible();
    await expect(roleLocator.getByRole('gridcell', { name: NEW_ROLE.description })).toBeVisible();
  });
});
