import { test, expect } from '@playwright/test';

import { sharedSetup } from '../../../../utils/setup';
import { navToHeader, clickAndWait } from '../../../../utils/shared';

test.describe('RBAC - See Roles', () => {
  // Runs before each test
  test.beforeEach(async ({ page }) => {
    // Perform shared setup to reset the database, log in, and prepare the environment
    await sharedSetup('rbac-see-roles', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      skipTour: true,
    });

    // Navigate to the Roles management page
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
  });

  // Test for verifying Super Admin can view details of an existing role
  test('Super Admin can see an existing role', async ({ page }) => {
    // Step 1: click the "Editor" role row
    const editorRowLocator = page.getByRole('row', { name: 'Editor' });
    await clickAndWait(page, editorRowLocator);

    // Verify the details of the role
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Editor');
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Editors can manage and publish contents including those of other users.'
    );
  });
});
