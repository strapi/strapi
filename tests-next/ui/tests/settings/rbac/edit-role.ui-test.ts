import { expect, test } from '../../../fixtures';
import { RolePage, RolesPage } from '../../../pages';

const EDITED_ROLE = { name: 'Contractor', description: 'Role with contractor capabilities' };

test.describe('RBAC - Edit Roles', () => {
  test('Super Admin can edit an existing role', async ({ page }) => {
    const roles = new RolesPage(page);
    const role = new RolePage(page);

    await roles.goto();
    await roles.openRole('Editor');

    await role.fill(EDITED_ROLE);
    await role.openPermissionsTab('Collection Types');
    for (const action of ['Read', 'Publish', 'Update', 'Delete']) {
      await role.permission(action, 'article').uncheck();
    }
    await role.save();

    await roles.open();

    await expect(roles.row(EDITED_ROLE.name)).toBeVisible();
    await expect(roles.cell(EDITED_ROLE.name, EDITED_ROLE.name)).toBeVisible();
    await expect(roles.cell(EDITED_ROLE.name, EDITED_ROLE.description)).toBeVisible();
  });
});
