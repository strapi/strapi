import { expect, test } from '../../../fixtures';
import { RolePage, RolesPage } from '../../../pages';

test.describe('RBAC - See Roles', () => {
  test('Super Admin can see an existing role', async ({ page }) => {
    const roles = new RolesPage(page);
    const role = new RolePage(page);

    await roles.goto();
    await roles.openRole('Editor');

    await expect(role.name).toHaveValue('Editor');
    await expect(role.description).toHaveValue(
      'Editors can manage and publish contents including those of other users.'
    );
  });
});
