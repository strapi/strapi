import { test, expect, type Page } from '@playwright/test';

import { sharedSetup } from '../../../../utils/setup';
import { navToHeader, clickAndWait } from '../../../../utils/shared';

// Constants for the edited role
const EDITED_ROLE = { name: 'Contractor', description: 'Role with contractor capabilities' };

/**
 * Navigate to the Roles management settings via the menu
 */
const goToAdminRolesPage = async (page: Page) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
};

test.describe('RBAC - Edit Roles', () => {
  // Runs before each test
  test.beforeEach(async ({ page }) => {
    // Perform shared setup to reset the database, log in, and prepare the environment
    await sharedSetup('rbac-edit-roles', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      skipTour: true,
    });

    // Navigate to the Roles management page
    await goToAdminRolesPage(page);
  });

  // Test for verifying Super Admin can edit an existing role
  test('Super Admin can edit an existing role', async ({ page }) => {
    // Step 1: click the "Editor" role row
    const editorRowLocator = page.getByRole('row', { name: 'Editor' });
    await clickAndWait(page, editorRowLocator);

    // Step 2: fill in the new role name and description
    await page.getByRole('textbox', { name: 'Name' }).fill(EDITED_ROLE.name);
    await page.getByRole('textbox', { name: 'Description' }).fill(EDITED_ROLE.description);

    // Step 3: modify the public permissions for articles
    await page.getByRole('tab', { name: 'Collection Types' }).click(); // Open permissions tab

    await page.getByRole('checkbox', { name: 'Select Read article' }).uncheck();
    await page.getByRole('checkbox', { name: 'Select Publish article' }).uncheck();
    await page.getByRole('checkbox', { name: 'Select Update article' }).uncheck();
    await page.getByRole('checkbox', { name: 'Select Delete article' }).uncheck();
    await page.getByRole('checkbox', { name: 'Select Publish article' }).uncheck();

    // Step 4: save the updated role
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    // Step 5: verify the changes in the role list
    // Navigate back to the Roles management page
    await goToAdminRolesPage(page);

    const roleLocator = page.getByRole('row', { name: EDITED_ROLE.name });

    await expect(roleLocator).toBeVisible();
    await expect(
      roleLocator.getByRole('gridcell', { name: EDITED_ROLE.name, exact: true })
    ).toBeVisible();
    await expect(
      roleLocator.getByRole('gridcell', { name: EDITED_ROLE.description, exact: true })
    ).toBeVisible();
  });
});
