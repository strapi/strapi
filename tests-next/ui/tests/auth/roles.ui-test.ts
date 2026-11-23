import { expect, test } from '../../fixtures/app';
import { CREDENTIALS, ROLES, type Role } from '../../fixtures/auth';

// Each role starts logged in through its storage state (fixtures/auth.ts), with no login form.
// Settings > Users tells the roles apart: only the Super Admin can read the admin users.
const canReadUsers: Record<Role, boolean> = { admin: true, editor: false, author: false };

for (const role of ROLES) {
  test.describe(`role: ${role}`, () => {
    test.use({ role });

    test(`starts logged in as ${role}, with its permissions`, async ({ page }) => {
      await page.goto('/admin');
      await expect(
        page.getByRole('heading', { name: `Hello ${CREDENTIALS[role].firstname}` })
      ).toBeVisible();

      await page.goto('/admin/settings/users');
      const users = page.getByRole('row').filter({ hasText: CREDENTIALS.author.email });
      const noPermissions = page.getByText("You don't have the permissions to access that content");
      if (canReadUsers[role]) {
        await expect(users).toBeVisible();
      } else {
        await expect(noPermissions).toBeVisible();
        await expect(users).toBeHidden();
      }
    });
  });
}
