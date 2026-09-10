import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { enrolViaUi, totpFor, waitForNextTotpStep } from '../../../utils/mfa';
import { ADMIN_PASSWORD, TITLE_HOME } from '../../constants';

// WebAuthn will not run against an IP-literal origin, so this file alone talks to the app over
// `localhost`. The server's expected origin is pinned to match in tests/app-template/config/admin.js.
test.use({ baseURL: `http://localhost:${process.env.PORT ?? 8000}` });

/**
 * Attaches a virtual WebAuthn authenticator to this page over CDP, so a passkey can actually be
 * created and asserted. Platform-authenticator shaped (`internal` transport, user verification
 * already satisfied, presence simulated automatically), which is what a Touch ID / Windows Hello
 * passkey looks like to the page -- and what passkeys requests with
 * `residentKey: 'preferred', userVerification: 'preferred'`.
 *
 * The authenticator is bound to the CDP session, not to the cookie jar, so it survives
 * `context.clearCookies()` and every navigation in these journeys. That is the whole point: the
 * passkey registered while logged in must still be there at the next login.
 */
const attachVirtualAuthenticator = async (page: Page, context: BrowserContext) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
};

/** Completes the second-factor screen with a fresh TOTP code. */
const passChallenge = async (page: Page, secret: string) => {
  await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
  await waitForNextTotpStep();
  await page.getByLabel('Authentication code*').fill(totpFor(secret));
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveTitle(TITLE_HOME);
};

/** Registers one passkey from the profile page. The caller must already be TOTP-enrolled. */
const addPasskey = async (page: Page, name: string, secret: string) => {
  await page.goto('/admin/me');
  await expect(page.getByRole('heading', { name: 'Passkeys' })).toBeVisible();
  await page.getByRole('button', { name: 'Add a passkey' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a passkey' });
  await dialog.getByLabel('Passkey name*').fill(name);
  await dialog.getByLabel('Current password*').fill(ADMIN_PASSWORD);
  // The enrolment (or a previous login) consumed the current step account-wide
  await waitForNextTotpStep();
  await dialog.getByLabel('Authentication code*').fill(totpFor(secret));
  await dialog.getByRole('button', { name: 'Add passkey' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await expect(page.getByText('Passkey added')).toBeVisible();
};

test.describe('Passkeys', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'The WebAuthn virtual authenticator is only reachable through CDP, and Playwright exposes CDP for Chromium only; Firefox and WebKit offer no equivalent, so the ceremony cannot be driven there.'
    );

    await resetDatabaseAndImportDataFromPath('with-admin');
    await context.clearCookies();
    await attachVirtualAuthenticator(page, context);
    await page.goto('/admin');
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);
  });

  test('register a passkey, then sign in with it instead of a code', async ({ page, context }) => {
    test.setTimeout(300_000);

    // 1. Enrol in TOTP first: a passkey is always a second factor added by an enrolled user,
    //    never a replacement, so the profile section does not even render before this.
    const admin = await enrolViaUi(page, ADMIN_PASSWORD);
    await addPasskey(page, 'Virtual platform key', admin.secret);
    await expect(page.getByRole('gridcell', { name: 'Virtual platform key' })).toBeVisible();
    await expect(page.getByText('Not yet')).toBeVisible();

    // 2. Fresh session: the password is still required, and the challenge screen now offers the
    //    passkey beside the code field.
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
    await expect(page.getByLabel('Authentication code*')).toBeVisible();

    // 3. The ceremony runs against the virtual authenticator and lands in the admin.
    await page.getByRole('button', { name: 'Use a passkey' }).click();
    await expect(page).toHaveTitle(TITLE_HOME);

    // 4. The server stamped the use, and recorded a notice for the registration.
    await page.goto('/admin/me');
    await expect(page.getByRole('gridcell', { name: 'Virtual platform key' })).toBeVisible();
    await expect(page.getByText('Not yet')).toHaveCount(0);
    await expect(page.getByText(/A passkey was added to your account/)).toBeVisible();

    // 5. Removing it puts the account back on codes only.
    await page.getByRole('button', { name: 'Remove passkey' }).click();
    await page
      .getByRole('alertdialog', { name: 'Remove this passkey?' })
      .getByRole('button', { name: 'Confirm' })
      .click();
    await expect(page.getByText('Passkey removed')).toBeVisible();
    await expect(page.getByText(/^No passkeys\./)).toBeVisible();

    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use a passkey' })).toHaveCount(0);
    // The authenticator app still works, which is the whole reason removal costs nothing
    await passChallenge(page, admin.secret);
  });

  test('turning the policy off deletes every registered passkey', async ({ page, context }) => {
    test.setTimeout(300_000);

    const admin = await enrolViaUi(page, ADMIN_PASSWORD);
    await addPasskey(page, 'Virtual platform key', admin.secret);

    // 1. Turn passkeys off from the Security page. This is the one direction that needs
    //    re-authentication: it deletes every passkey every administrator registered. The caller is
    //    enrolled, so the dialog asks for a code as well as the password.
    await page.goto('/admin/settings/security');
    const passkeyCard = page.getByRole('region', { name: 'Passkeys' });
    const allow = passkeyCard.getByRole('checkbox', {
      name: 'Allow users to sign in with a passkey',
    });
    await expect(allow).toBeChecked();
    await allow.uncheck();
    await passkeyCard.getByRole('button', { name: 'Save' }).click();

    const dialog = page.getByRole('dialog', { name: 'Turn passkeys off?' });
    await expect(dialog).toContainText(
      'Turning passkeys off deletes every passkey your users have registered.'
    );
    await dialog.getByLabel('Current password*').fill(ADMIN_PASSWORD);
    await waitForNextTotpStep();
    await dialog.getByLabel('Authentication code*').fill(totpFor(admin.secret));
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Saved')).toBeVisible();

    // 2. The profile no longer offers passkeys at all -- `/mfa/me` reports the policy off.
    await page.goto('/admin/me');
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Passkeys' })).toHaveCount(0);

    // 3. And the next login is code-only: the row is gone, so nothing to offer.
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use a passkey' })).toHaveCount(0);
    await passChallenge(page, admin.secret);

    // 4. Turning the policy back on does not resurrect anything: the rows were deleted, which is
    //    the whole reason the off-transition is gated.
    await page.goto('/admin/settings/security');
    await page
      .getByRole('region', { name: 'Passkeys' })
      .getByRole('checkbox', { name: 'Allow users to sign in with a passkey' })
      .check();
    await page
      .getByRole('region', { name: 'Passkeys' })
      .getByRole('button', { name: 'Save' })
      .click();
    await expect(page.getByText('Saved')).toBeVisible();
    await page.goto('/admin/me');
    await expect(page.getByText(/^No passkeys\./)).toBeVisible();
  });
});
