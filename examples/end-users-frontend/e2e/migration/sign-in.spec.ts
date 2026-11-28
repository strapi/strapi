import { expect, test } from '@playwright/test';

/** The user `seed-users-permissions.mjs` made with Users & Permissions, before the migration */
const EMAIL = 'migrated@example.com';

test('a user from before the migration signs in with their old password', async ({ page }) => {
  const password = process.env.E2E_MIGRATION_PASSWORD;

  expect(password).toBeTruthy();

  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(password as string);

  const signedIn = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/sign-in/email')
  );

  await page.getByRole('button', { name: /sign in/i }).click();
  expect((await signedIn).status()).toBe(200);

  await page.goto('/account');
  await expect(page.getByText(EMAIL).first()).toBeVisible();
});
