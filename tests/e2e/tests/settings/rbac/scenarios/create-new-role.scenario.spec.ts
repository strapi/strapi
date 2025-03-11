import { test, expect, type Page, type Locator } from '@playwright/test';

import { sharedSetup } from '../../../../utils/setup';
import { navToHeader, clickAndWait } from '../../../../utils/shared';

// Constants for the scenario
const OLD_ROLE = { name: 'Editor' };
const NEW_ROLE = { name: 'Publisher', description: 'Role with publishing capabilities' };
const TARGET_USER = { firstName: 'Editor', lastName: 'Testing', email: 'editor@testing.com' };
const USER_FULL_NAME = `${TARGET_USER.firstName} ${TARGET_USER.lastName}`;

/**
 * Navigate to the Roles management settings via the menu
 */
const goToAdminRolesPage = async (page: Page) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
};

/**
 * Navigate to the Users management page via the menu
 */
const goToUsersManagementPage = async (page: Page) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');
};

test.describe('RBAC - Full Role Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Perform shared setup to reset the database, log in, and prepare the environment
    await sharedSetup('rbac-full-role-flow', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      skipTour: true,
    });
  });

  test('Administrator creates, assigns, and edits a role', async ({ page }) => {
    // Step 1: create a new role
    await addPublisherRole(page);

    await goToAdminRolesPage(page);

    // Verify the new role in the list
    const roleLocator = page.getByRole('row', { name: NEW_ROLE.name });

    await expect(roleLocator).toBeVisible();
    await expect(roleLocator.getByRole('gridcell', { name: NEW_ROLE.name })).toBeVisible();
    await expect(roleLocator.getByRole('gridcell', { name: NEW_ROLE.description })).toBeVisible();

    // Step 2: assign the new role to a user
    await assignRoleToUser(page, USER_FULL_NAME, NEW_ROLE.name);

    // Verify the user has the correct role
    await goToUsersManagementPage(page);

    await expect(
      page.getByRole('row', { name: `${USER_FULL_NAME} ${TARGET_USER.email} ${NEW_ROLE.name}` })
    ).toBeVisible();

    // Step 3: edit the permissions of the role
    await editPublisherRole(page);

    // Verify the updated role in the list
    await goToAdminRolesPage(page);

    await expect(page.getByRole('row', { name: NEW_ROLE.name })).toBeVisible();

    // Step 4: revert the roles' assignment for the user
    await assignRoleToUser(page, USER_FULL_NAME, OLD_ROLE.name);

    // Step 5: delete the created role
    await deletePublisherRole(page);

    // Verify the role has been deleted
    await expect(page.getByRole('row', { name: NEW_ROLE.name, exact: true })).not.toBeVisible();
  });
});

const addPublisherRole = async (page: Page) => {
  await goToAdminRolesPage(page);

  await clickAndWait(page, page.getByRole('button', { name: 'Add new role' }).first());

  await page.getByRole('textbox', { name: 'Name' }).fill(NEW_ROLE.name);
  await page.getByRole('textbox', { name: 'Description' }).fill(NEW_ROLE.description);

  // Assign the "publish" permission for articles initially
  await page.getByRole('tab', { name: 'Collection Types' }).click();
  await page.getByRole('checkbox', { name: 'Select Publish article' }).check();

  // Save the newly created role
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
};

const editPublisherRole = async (page: Page) => {
  await goToAdminRolesPage(page);

  // Open the role edit page
  await clickAndWait(page, page.getByRole('row', { name: NEW_ROLE.name }));

  // Modify permissions
  await page.getByRole('tab', { name: 'Collection Types' }).click(); // Open permissions tab

  await page.getByRole('checkbox', { name: `Select Read article` }).check();
  await page.getByRole('checkbox', { name: `Select Update article` }).check();
  await page.getByRole('checkbox', { name: 'Select Create article' }).check();
  await page.getByRole('checkbox', { name: 'Select Delete article' }).check();

  await page.getByRole('checkbox', { name: 'Select Publish article' }).uncheck();

  // Save the updated role
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
};

const deletePublisherRole = async (page: Page) => {
  await goToAdminRolesPage(page);

  await page
    .getByRole('row', { name: NEW_ROLE.name })
    .getByRole('button', { name: 'Delete' })
    .click();

  // Confirm the deletion in the alert dialog
  await clickAndWait(page, page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }));
};

const assignRoleToUser = async (page: Page, userFullName: string, role: string) => {
  await goToUsersManagementPage(page); // Navigate to Users management page

  // Find the user's row
  const userRowLocator = page.getByRole('row', { name: userFullName });

  // Go to the user's edit view page
  await clickAndWait(page, userRowLocator.getByRole('link', { name: `Edit ${userFullName}` }));

  // Update the user's roles
  await page.getByLabel("User's roles*").locator('svg').last().click(); // Open role selector

  const listBoxLocator = page.getByRole('listbox');

  // Make sure all the roles are unchecked before selecting the new one
  for (const checkbox of await listBoxLocator.locator('button').all()) {
    await checkbox.uncheck();
  }

  // Assign the new role
  await listBoxLocator.getByLabel(role).locator('button').check();

  // Exit role selection
  await page.keyboard.press('Escape');

  // Save changes
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
};
