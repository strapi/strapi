import { test, expect } from '@playwright/test';

import { sharedSetup } from '../../../../utils/setup';
import { navToHeader, clickAndWait } from '../../../../utils/shared';

test.describe('RBAC - Delete Roles', () => {
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
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
  });

  // Test for verifying Super Admin can delete an existing role
  test('Super Admin can delete an existing role', async ({ page }) => {
    // Step 1: locate the "Author" role row
    const authorRowLocator = page.getByRole('row', { name: 'Author' });

    // Step 2: delete the role
    await authorRowLocator.getByRole('button', { name: 'Delete' }).click();

    // Step 3: confirm deletion in the alert dialog
    await clickAndWait(
      page,
      page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' })
    );

    // Step 4: verify the role no longer appears in the list
    await expect(page.getByRole('row', { name: 'Author', exact: true })).not.toBeVisible();
  });
});
