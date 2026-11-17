import { expect, test } from '@playwright/test';

import { PASSWORD, signOut, signUp, totpFromUri, userButtonOf } from './helpers.ts';

test('enables two-factor on the account page and signs in with a code (cookie)', async ({
  page,
}) => {
  const email = await signUp(page, 'cookie');

  await page.goto('/account');
  await expect(page.getByRole('main').getByText('Two-factor authentication is off')).toBeVisible();

  // Enable: Strapi answers with the `otpauth://` URI the QR code is made of
  await page
    .getByRole('button', { name: /enable two-factor/i })
    .first()
    .click();

  const dialog = page.getByRole('dialog');
  const enabled = page.waitForResponse((response) => response.url().endsWith('/two-factor/enable'));

  await dialog.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await dialog.getByRole('button', { name: /enable two-factor/i }).click();

  const { totpURI } = await (await enabled).json();

  // The first code confirms the enrolment, and Strapi answers with the backup codes
  await dialog.locator('input[autocomplete="one-time-code"]').fill(totpFromUri(totpURI));
  await expect(dialog.getByText(/each code works once/i)).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();

  // (a toast says the same, so look in the page itself)
  await expect(page.getByRole('main').getByText('Two-factor authentication is on')).toBeVisible();

  // Signing in now takes the password and a code
  await signOut(page);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/two-factor/);
  await page.locator('input[autocomplete="one-time-code"]').fill(totpFromUri(totpURI));

  await expect(userButtonOf(page)).toBeVisible();
});

// The sign-in challenge reads a cookie (`strapi.two_factor`) that Bearer mode never has, so a user
// who turned two-factor on there could not sign in again: the example does not offer it.
test('does not offer two-factor in Bearer mode', async ({ page }) => {
  await signUp(page, 'bearer');

  await page.goto('/account');
  await expect(page.getByText(/active sessions/i).first()).toBeVisible();
  await expect(page.getByText(/two-factor/i)).toHaveCount(0);
});
