import type { Page } from '@playwright/test';
import { base32Decode, generateTotp } from '@strapi/utils';

/** A TOTP for the given base32 secret at the current 30-second step, same parameters as the server. */
export const totpFor = (secret: string): string =>
  generateTotp({
    secret: base32Decode(secret),
    step: 30,
    digits: 6,
    timestamp: Math.floor(Date.now() / 1000),
  });

/**
 * The server consumes each TOTP step once per account (`consumeTotpStep`) and accepts no future
 * step (`window.forward: 0`), so a second code inside the same 30-second step is refused. Call
 * this before any TOTP login that follows another TOTP use in the same test.
 */
export const waitForNextTotpStep = async (): Promise<void> => {
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1000));
};

/** Enrols the logged-in admin through the profile page. Returns what the dialog showed. */
export const enrolViaUi = async (page: Page, password: string) => {
  await page.goto('/admin/me');
  await page.getByRole('button', { name: 'Enable two-factor authentication' }).click();
  const dialog = page.getByRole('dialog', { name: 'Enable two-factor authentication' });
  await dialog.getByLabel('Current password*').fill(password);
  await dialog.getByRole('button', { name: 'Continue' }).click();

  const secret = (await dialog.getByTestId('mfa-manual-key').textContent())!.trim();
  await dialog.getByLabel('Authentication code*').fill(totpFor(secret));
  await dialog.getByRole('button', { name: 'Verify' }).click();

  // `allTextContents()` snapshots the DOM immediately and does not auto-wait like a single-element
  // locator method does, so without this the codes step can still be rendering (the verify
  // mutation has resolved but the codes list has not committed to the DOM yet) and this reads back
  // an empty array. Wait for the first code to actually be there before reading them all.
  const codesLocator = dialog.getByTestId('mfa-recovery-code');
  await codesLocator.first().waitFor();
  const recoveryCodes = await codesLocator.allTextContents();
  await dialog.getByRole('checkbox', { name: /saved these codes/i }).check();
  await dialog.getByRole('button', { name: 'I have saved my recovery codes' }).click();
  await dialog.waitFor({ state: 'hidden' });

  return { secret, recoveryCodes: recoveryCodes.map((c) => c.trim()) };
};
