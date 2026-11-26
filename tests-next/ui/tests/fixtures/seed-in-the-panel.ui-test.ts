import { expect, test } from '../../fixtures';

// Seeding and roles together: the page starts logged in as the default role (admin, Super Admin)
// and shows the data the file seeded.
test.use({ seedPlan: { adminRoles: [{ name: 'Reviewer', description: 'Seeded for this file' }] } });

test('the panel shows what the file seeded', async ({ page, seeded }) => {
  await page.goto(`/admin/settings/roles/${seeded.adminRoles[0].id}`);

  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Reviewer');
});

test.describe('as an editor', () => {
  test.use({ role: 'editor' });

  test('the seeded role is out of reach of the role', async ({ page, seeded }) => {
    await page.goto(`/admin/settings/roles/${seeded.adminRoles[0].id}`);

    await expect(
      page.getByText("You don't have the permissions to access that content")
    ).toBeVisible();
  });
});
