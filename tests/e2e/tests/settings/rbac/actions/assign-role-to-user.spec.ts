import { test, expect, type Page } from '@playwright/test';

import { sharedSetup } from '../../../../utils/setup';
import { navToHeader, clickAndWait } from '../../../../utils/shared';

// Constants for the created role
const TARGET_USER = { firstName: 'Editor', lastName: 'Testing' };
const ROLES = { new: 'Author', old: 'Editor' };

test.describe('RBAC - Assign Role to Users', () => {
  // Runs before each test
  test.beforeEach(async ({ page }) => {
    // Perform shared setup to reset the database, log in, and prepare the environment
    await sharedSetup('rbac-assign-roles-to-user', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      skipTour: true,
    });

    // Navigate to the Users management page
    await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');
  });

  // Test for verifying Super Admin can create a new role
  test('Super Admin can assign a role to any user', async ({ page }) => {
    const userFullName = `${TARGET_USER.firstName} ${TARGET_USER.lastName}`;

    // Step 1: find the "Editor" user
    const editorRowLocator = page.getByRole('row', { name: userFullName });

    // Step 2: go to the user view, wait for the page to load
    await clickAndWait(page, editorRowLocator.getByRole('link', { name: `Edit ${userFullName}` }));

    // Step 3: update the user's roles
    // Open the role selection list
    await page.getByLabel("User's roles*").locator('svg').last().click();
    // Remove the Editor role
    await page.getByRole('listbox').getByLabel(ROLES.old).locator('button').uncheck();
    // Add the Author role
    await page.getByRole('listbox').getByLabel(ROLES.new).locator('button').check();

    // Exit the roles' selection list context
    await page.keyboard.press('Escape');

    // Step 3: save the modifications
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    // Step 4: navigate back to the Users management page
    await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');

    // Step 5: make sure the user has the correct role and that the old one has been removed
    await expect(
      page.getByRole('row', { name: `${userFullName} editor@testing.com ${ROLES.old}` })
    ).not.toBeVisible();
    await expect(
      page.getByRole('row', { name: `${userFullName} editor@testing.com ${ROLES.new}` })
    ).toBeVisible();
  });
});
