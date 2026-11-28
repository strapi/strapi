import { expect, test } from '../../../fixtures';
import { UserPage, UsersPage } from '../../../pages';

const TARGET_USER = {
  firstname: 'Editor',
  lastname: 'Testing',
  email: 'editor@testing.com',
  password: 'Testing123!',
};
const ROLES = { new: 'Author', old: 'Editor' };

// A user of its own, not the `editor` role user the other files log in with.
test.use({ seedPlan: { adminUsers: [{ ...TARGET_USER, roles: ['strapi-editor'] }] } });

test.describe('RBAC - Assign Role to Users', () => {
  test('Super Admin can assign a role to any user', async ({ page, seeded }) => {
    const [{ email }] = seeded.adminUsers;
    const userFullName = `${TARGET_USER.firstname} ${TARGET_USER.lastname}`;
    const users = new UsersPage(page);
    const user = new UserPage(page);

    await users.goto();
    await users.openUser(userFullName);

    await user.changeRoles({ remove: [ROLES.old], add: [ROLES.new] });
    await user.save();

    await users.open();

    await expect(users.row(`${userFullName} ${email} ${ROLES.old}`)).toBeHidden();
    await expect(users.row(`${userFullName} ${email} ${ROLES.new}`)).toBeVisible();
  });
});
