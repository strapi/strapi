import { expect, test } from '../../../../fixtures';
import { RolePage, RolesPage, UserPage, UsersPage } from '../../../../pages';

// Constants for the scenario
const OLD_ROLE = { name: 'Editor' };
const NEW_ROLE = { name: 'Publisher', description: 'Role with publishing capabilities' };
const TARGET_USER = {
  firstname: 'Editor',
  lastname: 'Testing',
  email: 'editor@testing.com',
  password: 'Testing123!',
};
const USER_FULL_NAME = `${TARGET_USER.firstname} ${TARGET_USER.lastname}`;

// A user of its own with the Editor role, not the `editor` role user the other files log in with.
test.use({ seedPlan: { adminUsers: [{ ...TARGET_USER, roles: ['strapi-editor'] }] } });

test.describe('RBAC - Full Role Management Flow', () => {
  test('Administrator creates, assigns, and edits a role', async ({ page, seeded }) => {
    const [{ email }] = seeded.adminUsers;
    const roles = new RolesPage(page);
    const role = new RolePage(page);
    const users = new UsersPage(page);
    const user = new UserPage(page);

    /** Replaces the user's role, from the Users page. */
    const assignRoleToUser = async (from: string, to: string) => {
      await users.open();
      await users.openUser(USER_FULL_NAME);
      await user.changeRoles({ remove: [from], add: [to] });
      await user.save();
    };

    await page.goto('/admin');

    // Step 1: create a new role, with the "publish" permission for articles
    await roles.open();
    await roles.addRole();
    await role.fill(NEW_ROLE);
    await role.openPermissionsTab('Collection Types');
    await role.permission('Publish', 'article').check();
    await role.create();

    // Verify the new role in the list
    await roles.open();

    await expect(roles.row(NEW_ROLE.name)).toBeVisible();
    await expect(roles.cell(NEW_ROLE.name, NEW_ROLE.name)).toBeVisible();
    await expect(roles.cell(NEW_ROLE.name, NEW_ROLE.description)).toBeVisible();

    // Step 2: assign the new role to a user
    await assignRoleToUser(OLD_ROLE.name, NEW_ROLE.name);

    // Verify the user has the correct role
    await users.open();

    await expect(users.row(`${USER_FULL_NAME} ${email} ${NEW_ROLE.name}`)).toBeVisible();

    // Step 3: edit the permissions of the role
    await roles.open();
    await roles.openRole(NEW_ROLE.name);
    await role.openPermissionsTab('Collection Types');
    for (const action of ['Read', 'Update', 'Create', 'Delete']) {
      await role.permission(action, 'article').check();
    }
    await role.permission('Publish', 'article').uncheck();
    await role.save();

    // Verify the updated role in the list
    await roles.open();

    await expect(roles.row(NEW_ROLE.name)).toBeVisible();

    // Step 4: revert the roles' assignment for the user
    await assignRoleToUser(NEW_ROLE.name, OLD_ROLE.name);

    // Step 5: delete the created role
    await roles.open();
    await roles.deleteRole(NEW_ROLE.name);

    // Verify the role has been deleted
    await expect(roles.row(NEW_ROLE.name)).toBeHidden();
  });
});
