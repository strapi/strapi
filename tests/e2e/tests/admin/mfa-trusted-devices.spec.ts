import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { enrolViaUi, totpFor, waitForNextTotpStep } from '../../../utils/mfa';
import { ADMIN_PASSWORD, EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD, TITLE_HOME } from '../../constants';

const TRUST_COOKIE = 'strapi_admin_mfa_trust';

/**
 * Logs the browser out the way the other MFA journeys do (drop every cookie, reload) while
 * keeping the trust cookie, which is the whole point of the feature under test.
 */
const logOutKeepingTrust = async (page: Page, context: BrowserContext) => {
  const trust = (await context.cookies()).filter((cookie) => cookie.name === TRUST_COOKIE);
  await context.clearCookies();
  await context.addCookies(trust);
  await page.goto('/admin');
};

/** Completes the second-factor screen with a fresh TOTP code, optionally ticking the trust box. */
const passChallenge = async (page: Page, secret: string, trust: boolean) => {
  await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
  await waitForNextTotpStep();
  await page.getByLabel('Authentication code*').fill(totpFor(secret));
  if (trust) {
    await page.getByRole('checkbox', { name: /^Trust this device for/ }).check();
  }
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveTitle(TITLE_HOME);
};

test.describe('Trusted devices', () => {
  test.beforeEach(async ({ page, context }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);
  });

  test('trust a browser after a code, skip the code next time, revoke it from the profile', async ({
    page,
    context,
  }) => {
    test.setTimeout(300_000);

    // 1. Shorten the trust period from the Security page. Shortening lowers nothing, so no
    //    re-authentication. The page has one Save per card; the trusted-devices card is second.
    await page.goto('/admin/settings/security');
    const days = page.getByRole('spinbutton', { name: 'Trust period (days)' });
    await expect(days).toHaveValue('30');
    await days.fill('7');
    await page.getByRole('button', { name: 'Save' }).nth(1).click();
    await expect(page.getByText('Saved')).toBeVisible();

    // 2. Enrol, log in again with a code, and trust the browser; the label carries the new period.
    const admin = await enrolViaUi(page, ADMIN_PASSWORD);
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(
      page.getByRole('checkbox', { name: 'Trust this device for 7 days' })
    ).toBeVisible();
    await passChallenge(page, admin.secret, true);
    const trust = (await context.cookies()).find((cookie) => cookie.name === TRUST_COOKIE);
    expect(trust).toBeDefined();
    expect(trust!.httpOnly).toBe(true);

    // 3. Log out keeping the trust cookie: the password alone is enough now.
    await logOutKeepingTrust(page, context);
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toHaveCount(0);

    // 4. The profile lists the browser as this device; revoke it.
    await page.goto('/admin/me');
    await expect(page.getByRole('heading', { name: 'Trusted devices' })).toBeVisible();
    await expect(page.getByText('This device', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Revoke trust' }).click();
    await page
      .getByRole('alertdialog', { name: 'Revoke this device?' })
      .getByRole('button', { name: 'Confirm' })
      .click();
    await expect(page.getByText('Device no longer trusted')).toBeVisible();
    await expect(page.getByText(/^No trusted devices\./)).toBeVisible();
    expect(
      (await context.cookies()).find((cookie) => cookie.name === TRUST_COOKIE)
    ).toBeUndefined();

    // 5. The next login is challenged again.
    await logOutKeepingTrust(page, context);
    await login({ page });
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
  });

  test("an administrator revokes another user's trusted devices from the user page", async ({
    page,
    context,
  }) => {
    test.setTimeout(300_000);

    // 1. The super admin enrols (needed to log back in later). The editor enrols and trusts.
    const admin = await enrolViaUi(page, ADMIN_PASSWORD);
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await expect(page).toHaveTitle(TITLE_HOME);
    const editor = await enrolViaUi(page, EDITOR_PASSWORD);
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await passChallenge(page, editor.secret, true);
    const editorTrust = (await context.cookies()).filter((cookie) => cookie.name === TRUST_COOKIE);
    expect(editorTrust).toHaveLength(1);

    // 2. The super admin logs in (password, then a code) and revokes from the editor's page.
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await passChallenge(page, admin.secret, false);
    await page.goto('/admin/settings/users?pageSize=10&page=1&sort=firstname');
    await page.getByRole('row', { name: new RegExp(EDITOR_EMAIL_ADDRESS) }).click();
    await expect(page.getByRole('heading', { name: /^Edit / })).toBeVisible();
    await expect(page.getByText('1 trusted device')).toBeVisible();
    await page.getByRole('button', { name: 'Revoke trusted devices' }).click();
    await page
      .getByRole('alertdialog', { name: "Revoke this user's trusted devices?" })
      .getByRole('button', { name: 'Confirm' })
      .click();
    await expect(page.getByText('Trusted devices revoked')).toBeVisible();
    await expect(page.getByText('No trusted devices')).toBeVisible();

    // 3. The editor's browser, trust cookie and all, is challenged again.
    await context.clearCookies();
    await context.addCookies(editorTrust);
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
  });
});
