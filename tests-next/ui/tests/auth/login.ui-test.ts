import { CREDENTIALS, expect, test } from '../../fixtures';

// The only tests that go through the login form: every other test starts logged in through its
// role's storage state.
test.use({ role: null });

const { email, password, firstname } = CREDENTIALS.admin;

test.beforeEach(async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/auth\/login$/);
});

test('logs in with the login form', { tag: '@smoke' }, async ({ page }) => {
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: `Hello ${firstname}` })).toBeVisible();
});

test('rejects a wrong password', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(`${password}-wrong`);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('Invalid credentials')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/auth\/login$/);
});
