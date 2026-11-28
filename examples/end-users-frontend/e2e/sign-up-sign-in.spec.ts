import { expect, test } from '@playwright/test';

import { NAME, PASSWORD, STRAPI_URL, signOut, signUp, userButtonOf } from './helpers.ts';

for (const mode of ['cookie', 'bearer'] as const) {
  test(`signs up and signs in from another origin (${mode})`, async ({ page, context }) => {
    const userButton = userButtonOf(page);

    // Signed up, and so signed in: the user button shows who it is
    const email = await signUp(page, mode);

    await expect(userButton).toContainText(NAME);
    await expect(userButton).toContainText(email);

    // The mode the page announces is the mode that was used: a session cookie on Strapi's origin in
    // cookie mode, and in Bearer mode no cookie at all, only a token the front end kept
    await expect(page.getByTestId('auth-mode')).toHaveText(mode);

    const cookies = await context.cookies(STRAPI_URL);
    const token = await page.evaluate(() => localStorage.getItem('end-users.bearer-token'));

    if (mode === 'cookie') {
      expect(cookies.map((cookie) => cookie.name)).toContain('strapi.session_token');
      expect(token).toBeNull();

      // `cookies.crossSite` in the Strapi example: another site (the cross-site project, which
      // opens the page on 127.0.0.1) only gets a cookie that is `SameSite=None` and `Secure`
      expect(cookies.find((cookie) => cookie.name === 'strapi.session_token')).toMatchObject({
        sameSite: 'None',
        secure: true,
      });
    } else {
      expect(cookies).toEqual([]);
      expect(token).toEqual(expect.any(String));
    }

    // A full page load starts from nothing but the cookie or the token
    await page.goto('/account');
    await expect(userButton).toBeVisible();
    await expect(page.getByText(/active sessions/i).first()).toBeVisible();
    await expect(page.getByText(/current session/i)).toBeVisible();

    // Sign out, then sign in again with the same credentials
    await signOut(page);

    if (mode === 'bearer') {
      expect(await page.evaluate(() => localStorage.getItem('end-users.bearer-token'))).toBeNull();
    }

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(userButton).toBeVisible();

    // Still signed in after a reload
    await page.reload();
    await expect(userButton).toBeVisible();
  });
}
