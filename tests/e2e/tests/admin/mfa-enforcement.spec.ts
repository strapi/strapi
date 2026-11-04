import { test, expect, type Page } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { enrolViaUi, expireMfaGrace, totpFor, waitForNextTotpStep } from '../../../utils/mfa';
import { ADMIN_PASSWORD, EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD, TITLE_HOME } from '../../constants';

const LOCKED_MESSAGE =
  'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.';

const twoFactorCard = (page: Page) =>
  page.getByRole('region', { name: 'Two-factor authentication' });

/** The Security page saves every card with the one Save in its header. */
const saveSecuritySettings = (page: Page) => page.getByRole('button', { name: 'Save' });

const chooseRequirement = async (page: Page, label: string) => {
  await twoFactorCard(page).getByRole('combobox', { name: 'Requirement' }).click();
  await page.getByRole('option', { name: label }).click();
};

/** Sets the requirement to "Required for everyone" (the caller must be enrolled). */
const requireTwoFactorForEveryone = async (page: Page) => {
  await page.goto('/admin/settings/security');
  await chooseRequirement(page, 'Required for everyone');
  await saveSecuritySettings(page).click();
  // Raising enforcement is confirmed first, against the count of accounts it would affect.
  await page
    .getByRole('alertdialog', { name: 'Require two-factor authentication?' })
    .getByRole('button', { name: 'Require' })
    .click();
  await expect(page.getByText('Security settings saved.')).toBeVisible();
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
    await expect(twoFactorCard(page).getByRole('combobox', { name: 'Requirement' })).toHaveText(
      /Not required/
    );

    // Refused up front rather than after Save: the hint appears and Save stays disabled.
    await chooseRequirement(page, 'Required for everyone');
    await expect(
      twoFactorCard(page).getByText(/Set up two-factor authentication on your own account/)
    ).toBeVisible();
    await expect(saveSecuritySettings(page)).toBeDisabled();
    await expect(
      twoFactorCard(page).getByRole('link', { name: 'Go to your profile' })
    ).toHaveAttribute('href', /\/me$/);
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
    // Unlocking lowers someone else's protection, so the administrator confirms it is them: their
    // own password, and a fresh code (the login above spent the current step).
    const unlockDialog = page.getByRole('dialog', { name: 'Unlock this account?' });
    await unlockDialog.getByLabel('Current password*').fill(ADMIN_PASSWORD);
    await waitForNextTotpStep();
    await unlockDialog.getByLabel('Authentication code*').fill(totpFor(admin.secret));
    await unlockDialog.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByText('Account unlocked.')).toBeVisible();
    await expect(
      page.getByText(/^Not set up\. A new \d+-day grace period starts at their next login\.$/)
    ).toBeVisible();

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
    // The enrolment verify a moment ago consumed the current step account-wide
    await waitForNextTotpStep();
    await dialog.getByLabel('Authentication code*').fill(totpFor(newSecret));
    await dialog.getByRole('button', { name: 'Verify' }).click();
    const codesDialog = page.getByRole('dialog', { name: 'Save your recovery codes' });
    const codes = codesDialog.getByTestId('mfa-recovery-code');
    await codes.first().waitFor();
    expect(await codes.count()).toBe(10);
    await codesDialog.getByRole('checkbox', { name: /saved these codes/i }).check();
    await codesDialog.getByRole('button', { name: 'Done' }).click();
    await codesDialog.waitFor({ state: 'hidden' });
    // The replacement was made in this session, so this session is not notified of it.
    await expect(page.getByText(/Your authenticator app was replaced/)).toBeHidden();
  });
});
