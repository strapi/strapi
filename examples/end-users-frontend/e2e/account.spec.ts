import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';

import { ADMIN_EMAIL, ADMIN_PASSWORD, registerAdminIfMissing } from './admin/helpers.ts';
import { NAME, PASSWORD, STRAPI_URL, userButtonOf, writeFromPage, type Mode } from './helpers.ts';
import { linkIn, waitForEmail } from './read-email.ts';

/**
 * Email verification is a setting of Strapi (Settings > End users > Sign-in), so this spec turns it
 * on through the admin API as an administrator, and off again when it is done: the other specs sign
 * up and are signed in at once. The emails are the ones the example Strapi writes to
 * `examples/end-users/.tmp/emails` (`e2e/read-email.ts`).
 */
const setEmailVerification = async (required: boolean) => {
  await registerAdminIfMissing();

  const api = await playwrightRequest.newContext({ baseURL: STRAPI_URL });

  try {
    const login = await api.post('/admin/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    expect(login.ok(), `POST /admin/login answered ${login.status()}`).toBe(true);

    const { data } = (await login.json()) as { data: { token: string } };

    const saved = await api.put('/end-users/settings', {
      headers: { Authorization: `Bearer ${data.token}` },
      data: { signUp: { requireEmailVerification: required } },
    });

    expect(saved.ok(), `PUT /end-users/settings answered ${saved.status()}`).toBe(true);
  } finally {
    await api.dispose();
  }
};

test.beforeAll(() => setEmailVerification(true));
test.afterAll(() => setEmailVerification(false));

const newEmail = (mode: Mode, label: string) => `e2e-${label}-${mode}-${Date.now()}@example.com`;

/** Fills in the sign-up page. With verification required there is no session: the user is sent home. */
const submitSignUp = async (page: Page, mode: Mode, email: string) => {
  await page.goto(`/sign-up?mode=${mode}`);
  await page.getByLabel('Name').fill(NAME);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign up/i }).click();
};

/** Signs in through the sign-in page (the tab keeps `mode` only if it is on the address) */
const signIn = async (page: Page, mode: Mode, email: string, password = PASSWORD) => {
  await page.goto(`/sign-in?mode=${mode}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
};

/** Signs up and follows the link of the verification email. Gives the address, verified. */
const signUpVerified = async (page: Page, mode: Mode, label: string) => {
  const email = newEmail(mode, label);
  const since = Date.now();

  await submitSignUp(page, mode, email);

  const verification = await waitForEmail(email, /confirm your email address/i, since);

  // Strapi verifies the address and sends the browser back to the front end
  await page.goto(linkIn(verification));
  await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5173\//);

  return email;
};

for (const mode of ['cookie', 'bearer'] as const) {
  test.describe(`account flows (${mode})`, () => {
    test('signs up, verifies the email from the message, and gets a welcome', async ({ page }) => {
      const email = newEmail(mode, 'verify');
      const since = Date.now();

      await submitSignUp(page, mode, email);

      // Verification is required: no session came with the sign-up
      const verification = await waitForEmail(email, /confirm your email address/i, since);

      await expect(userButtonOf(page)).toBeHidden();
      expect(verification.text).toContain(email);

      // The link verifies the address, and then the welcome follows
      const verifiedAt = Date.now();

      await page.goto(linkIn(verification));
      await waitForEmail(email, /welcome/i, verifiedAt);

      // Now the user can sign in
      await signIn(page, mode, email);
      await expect(userButtonOf(page)).toBeVisible();
      await expect(userButtonOf(page)).toContainText(email);
    });

    test('resets a forgotten password from the message and signs in with the new one', async ({
      page,
    }) => {
      const email = await signUpVerified(page, mode, 'reset');
      const newPassword = ['N3w', 'Passw0rd!long'].join('-');
      const since = Date.now();

      await page.goto(`/sign-in?mode=${mode}`);
      await page.getByRole('link', { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/\/forgot-password/);

      await page.getByLabel('Email').fill(email);
      await page.getByRole('button', { name: /send reset link/i }).click();
      await expect(page).toHaveURL(/\/reset-link-sent/);

      // The link goes through Strapi and ends on the front end's reset page, with the token
      const reset = await waitForEmail(email, /reset your password/i, since);

      await page.goto(linkIn(reset));
      await expect(page).toHaveURL(/\/reset-password\?token=/);

      await page.getByLabel('Password', { exact: true }).fill(newPassword);
      await page.getByRole('button', { name: /reset password/i }).click();
      await expect(page).toHaveURL(/\/sign-in/);

      // The old password is gone, the new one signs in
      await signIn(page, mode, email, newPassword);
      await expect(userButtonOf(page)).toBeVisible();
      await expect(userButtonOf(page)).toContainText(email);
    });

    test('changes the email and verifies the new address', async ({ page }) => {
      const email = await signUpVerified(page, mode, 'change-old');
      const changedTo = newEmail(mode, 'change-new');

      await signIn(page, mode, email);
      await expect(userButtonOf(page)).toBeVisible();

      // The example has no screen for it: the request is the one Better Auth's client sends
      const since = Date.now();
      const status = await writeFromPage(page, mode, {
        method: 'POST',
        path: '/api/auth/change-email',
        body: {
          newEmail: changedTo,
          callbackURL: `${page.url().split('/').slice(0, 3).join('/')}/`,
        },
      });

      expect(status).toBe(200);

      // The confirmation goes to the new address, and only following it changes the email
      const confirmation = await waitForEmail(changedTo, /confirm your new email address/i, since);

      await page.reload();
      await expect(userButtonOf(page)).toContainText(email);

      await page.goto(linkIn(confirmation));
      await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5173\//);
      await page.reload();

      await expect(userButtonOf(page)).toContainText(changedTo);

      // The new address signs in
      await signIn(page, mode, changedTo);
      await expect(userButtonOf(page)).toContainText(changedTo);
    });
  });
}
