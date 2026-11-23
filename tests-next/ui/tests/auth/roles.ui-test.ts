import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/app';
import { CREDENTIALS, ROLES, type Role } from '../../fixtures/auth';

// Each role starts logged in through its storage state (fixtures/auth.ts), with no login form.
// Settings > Users tells the roles apart: only the Super Admin can read the admin users.
const canReadUsers: Record<Role, boolean> = { admin: true, editor: false, author: false };

/**
 * Resolves once the page painted two frames, so React committed what it had to render. A string,
 * since it runs in the page and the suite's tsconfig has no DOM types.
 */
const twoFrames = (page: Page) =>
  page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');

for (const role of ROLES) {
  test.describe(`role: ${role}`, () => {
    test.use({ role });

    test(`starts logged in as ${role}, with its permissions`, async ({ page }) => {
      // The home page shows the tour overview once this answers, so wait for it before checking
      // the tour is hidden: an earlier check would pass even with the tour on.
      const tourMeta = page.waitForResponse((res) => res.url().endsWith('/admin/guided-tour-meta'));
      await page.goto('/admin');
      await expect(
        page.getByRole('heading', { name: `Hello ${CREDENTIALS[role].firstname}` })
      ).toBeVisible();
      // The storage state turns the guided tour off. Without it, the admin's home page shows the
      // tour overview (to the first Super Admin only). Two frames after the meta response, React
      // has rendered the overview if it is on.
      await tourMeta;
      await twoFrames(page);
      await expect(page.getByRole('heading', { name: 'Discover your application!' })).toBeHidden();

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
