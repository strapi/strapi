import { test, expect, type Page } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { enrolViaUi, expireMfaGrace, totpFor, waitForNextTotpStep } from '../../../utils/mfa';
import { ADMIN_PASSWORD, EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD, TITLE_HOME } from '../../constants';

const LOCKED_MESSAGE =
  'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.';

/** Sets the requirement to Required from the Security page (the caller must be enrolled). */
const requireTwoFactorForEveryone = async (page: Page) => {
  await page.goto('/admin/settings/security');
  await page.getByRole('radio', { name: /^Required/ }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
};

test.describe('Two-factor enforcement', () => {
  test.beforeEach(async ({ page, context }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);
  });

  test('the Security page refuses to require two-factor for others before the caller has enrolled', async ({
    page,
  }) => {
    await page.goto('/admin/settings/security');
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Optional/ })).toBeChecked();

    await page.getByRole('radio', { name: /^Required/ }).check();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByText('Enrol in two-factor authentication before requiring it for others')
    ).toBeVisible();
  });

  test('required mode: grace banner, lock, unlock from the user page, enrol, replace authenticator', async ({
    page,
    context,
  }) => {
    test.setTimeout(300_000);

    // 1. The super admin enrols, then requires two-factor for everyone.
    const admin = await enrolViaUi(page, ADMIN_PASSWORD);
    await requireTwoFactorForEveryone(page);

    // 2. The editor logs in with a password only, starts a grace period and sees the banner.
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await expect(page).toHaveTitle(TITLE_HOME);
    await expect(
      page.getByText(/Set up two-factor authentication before .+, or your account will be locked/)
    ).toBeVisible();

    // 3. The grace period expires; the next password login is refused with the locked message.
    expireMfaGrace(EDITOR_EMAIL_ADDRESS);
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await expect(page.getByText(LOCKED_MESSAGE)).toBeVisible();

    // 4. The super admin logs in (password, then a code) and unlocks the editor from the user page.
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await waitForNextTotpStep();
    await page.getByLabel('Authentication code*').fill(totpFor(admin.secret));
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveTitle(TITLE_HOME);

    await page.goto('/admin/settings/users?pageSize=10&page=1&sort=firstname');
    await page.getByRole('row', { name: new RegExp(EDITOR_EMAIL_ADDRESS) }).click();
    await expect(page.getByRole('heading', { name: /^Edit / })).toBeVisible();
    await expect(page.getByText(/^Locked for password login since/)).toBeVisible();
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page
      .getByRole('alertdialog', { name: 'Unlock this account?' })
      .getByRole('button', { name: 'Confirm' })
      .click();
    await expect(page.getByText('Account unlocked')).toBeVisible();
    await expect(page.getByText('Not enrolled', { exact: true })).toBeVisible();

    // 5. The editor logs in again (fresh grace), enrols, and the banner goes away.
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await expect(page).toHaveTitle(TITLE_HOME);
    await expect(page.getByText(/Set up two-factor authentication before/)).toBeVisible();
    const editor = await enrolViaUi(page, EDITOR_PASSWORD);
    await expect(page.getByText(/Set up two-factor authentication before/)).toHaveCount(0);
    // Disable is gone while required; Replace is offered instead.
    await expect(
      page.getByRole('button', { name: 'Disable two-factor authentication' })
    ).toHaveCount(0);

    // 6. The editor replaces their authenticator using a recovery code as the current factor.
    await page.getByRole('button', { name: 'Replace authenticator' }).click();
    const dialog = page.getByRole('dialog', { name: 'Replace authenticator' });
    await dialog.getByLabel('Current password*').fill(EDITOR_PASSWORD);
    await dialog.getByLabel('Authentication code*').fill(editor.recoveryCodes[0]);
    await dialog.getByRole('button', { name: 'Continue' }).click();
    const newSecret = (await dialog.getByTestId('mfa-manual-key').textContent())!.trim();
    expect(newSecret).not.toBe(editor.secret);
    // the enrolment verify a moment ago consumed the current step account-wide
    await waitForNextTotpStep();
    await dialog.getByLabel('Authentication code*').fill(totpFor(newSecret));
    await dialog.getByRole('button', { name: 'Verify' }).click();
    const codes = dialog.getByTestId('mfa-recovery-code');
    await codes.first().waitFor();
    expect(await codes.count()).toBe(10);
    await dialog.getByRole('checkbox', { name: /saved these codes/i }).check();
    await dialog.getByRole('button', { name: 'I have saved my recovery codes' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await expect(page.getByText(/Your authenticator app was replaced/)).toBeVisible();
  });
});
