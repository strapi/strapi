import { expect, test } from '../../../fixtures';
import { RolesPage } from '../../../pages';

// A role with users can't be deleted: the legacy spec deleted the Author user first. A seeded
// role has none.
const ROLE = { name: 'Translator', description: 'Role with no users, to delete' };

test.use({ seedPlan: { adminRoles: [ROLE] } });

test.describe('RBAC - Delete Roles', () => {
  test('Super Admin can delete an existing role', async ({ page, seeded }) => {
    const [role] = seeded.adminRoles;
    const roles = new RolesPage(page);

    await roles.goto();
    await roles.deleteRole(role.name);

    await expect(roles.row(role.name)).toBeHidden();
  });
});
