import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { enrolViaUi, totpFor, waitForNextTotpStep } from '../../../utils/mfa';
import { ADMIN_PASSWORD, TITLE_HOME } from '../../constants';

test.describe('Two-factor authentication', () => {
  test.beforeEach(async ({ page, context }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);
  });

  test('enrolment journey: enable, acknowledge codes, see the enabled state', async ({ page }) => {
    const { recoveryCodes } = await enrolViaUi(page, ADMIN_PASSWORD);

    expect(recoveryCodes).toHaveLength(10);
    await expect(page.getByText(/^Enabled since/)).toBeVisible();
    await expect(page.getByText('10 recovery codes left')).toBeVisible();
    await expect(page.getByText('Recovery codes not saved')).toHaveCount(0);
  });

  test('login journey: password, then a code; then a recovery code; wrong codes are refused', async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);

    const { secret, recoveryCodes } = await enrolViaUi(page, ADMIN_PASSWORD);

    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible();

    await page.getByLabel('Authentication code*').fill('000000');
    await page.getByRole('button', { name: 'Verify' }).click();
    // Not `getByRole('alert')`: the app also renders a persistent, empty `#live-region-alert` with
    // the same role for screen-reader announcements, so that query hits Playwright's strict-mode
    // guard (two matches). `getByText` sidesteps it, matching the pattern `login.spec.ts` already
    // uses for `Invalid credentials`.
    await expect(page.getByText('Invalid code')).toBeVisible();

    // the step used at enrolment is consumed account-wide; wait for the next one
    await waitForNextTotpStep();
    await page.getByLabel('Authentication code*').fill(totpFor(secret));
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveTitle(TITLE_HOME);

    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await page.getByLabel('Authentication code*').fill(recoveryCodes[0]);
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveTitle(TITLE_HOME);

    await page.goto('/admin/me');
    await expect(page.getByText('9 recovery codes left')).toBeVisible();
    await expect(page.getByText(/A recovery code was used to log in/)).toBeVisible();
  });

  test('disable journey: requires password and code, then password-only login works again', async ({
    page,
    context,
  }) => {
    const { secret } = await enrolViaUi(page, ADMIN_PASSWORD);

    await page.getByRole('button', { name: 'Disable two-factor authentication' }).click();
    const dialog = page.getByRole('dialog', { name: 'Disable two-factor authentication' });
    await dialog.getByLabel('Current password*').fill(ADMIN_PASSWORD);
    await waitForNextTotpStep();
    await dialog.getByLabel('Authentication code*').fill(totpFor(secret));
    await dialog.getByRole('button', { name: 'Disable two-factor authentication' }).click();
    await expect(page.getByText('Not enabled')).toBeVisible();

    await context.clearCookies();
    await page.goto('/admin');
    await login({ page });
    await expect(page).toHaveTitle(TITLE_HOME);
  });
});
