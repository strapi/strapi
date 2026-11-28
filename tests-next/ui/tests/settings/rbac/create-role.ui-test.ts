import { expect, test } from '../../../fixtures';
import { RolePage, RolesPage } from '../../../pages';

const NEW_ROLE = { name: 'Publisher', description: 'Role with publishing capabilities' };

test.describe('RBAC - Create Roles', () => {
  test('Super Admin can create a new role', { tag: ['@critical'] }, async ({ page }) => {
    const roles = new RolesPage(page);
    const role = new RolePage(page);

    await roles.goto();
    await roles.addRole();

    await role.fill(NEW_ROLE);
    await role.openPermissionsTab('Collection Types');
    await role.permission('Publish', 'article').check();
    await role.create();

    await roles.open();

    await expect(roles.row(NEW_ROLE.name)).toBeVisible();
    await expect(roles.cell(NEW_ROLE.name, NEW_ROLE.name)).toBeVisible();
    await expect(roles.cell(NEW_ROLE.name, NEW_ROLE.description)).toBeVisible();
  });
});
