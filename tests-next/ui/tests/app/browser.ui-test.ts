import { expect, test } from '../../fixtures/app';

// The smallest browser test: each project (playwright.config.ts) opens the admin panel in its own
// browser. The app has no admin user yet, so the admin shows the registration form.
test('opens the admin panel in the browser of the project', async ({
  page,
  browserName,
  server,
}, testInfo) => {
  expect(browserName).toBe(testInfo.project.name);

  await page.goto(`${server.url}/admin`);

  await expect(page).toHaveURL(/\/admin\/auth\/register-admin$/);
  await expect(page.getByRole('heading', { name: 'Welcome to Strapi!' })).toBeVisible();
});
