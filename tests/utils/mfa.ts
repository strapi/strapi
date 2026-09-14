import { spawnSync } from 'node:child_process';

import type { Page } from '@playwright/test';
import { base32Decode, generateTotp } from '@strapi/utils';

export const totpFor = (secret: string): string =>
  generateTotp({
    secret: base32Decode(secret),
    step: 30,
    digits: 6,
    timestamp: Math.floor(Date.now() / 1000),
  });

/** Each step is consumed once per account and no future step is accepted, so a second code inside
 * the same 30 seconds is refused. Call this before any TOTP use that follows another. */
export const waitForNextTotpStep = async (): Promise<void> => {
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1000));
};

export const enrolViaUi = async (page: Page, password: string) => {
  await page.goto('/admin/me');
  await page.getByRole('button', { name: 'Enable two-factor authentication' }).click();
  const dialog = page.getByRole('dialog', { name: 'Enable two-factor authentication' });
  await dialog.getByLabel('Current password*').fill(password);
  await dialog.getByRole('button', { name: 'Continue' }).click();

  const secret = (await dialog.getByTestId('mfa-manual-key').textContent())!.trim();
  await dialog.getByLabel('Authentication code*').fill(totpFor(secret));
  await dialog.getByRole('button', { name: 'Verify' }).click();

  // `allTextContents()` snapshots immediately and does not auto-wait, so without this it reads back
  // an empty array while the codes step is still committing to the DOM.
  const codesLocator = dialog.getByTestId('mfa-recovery-code');
  await codesLocator.first().waitFor();
  const recoveryCodes = await codesLocator.allTextContents();
  await dialog.getByRole('checkbox', { name: /saved these codes/i }).check();
  await dialog.getByRole('button', { name: 'I have saved my recovery codes' }).click();
  await dialog.waitFor({ state: 'hidden' });

  return { secret, recoveryCodes: recoveryCodes.map((c) => c.trim()) };
};

/**
 * Backdates the enrolment deadline so the next login locks the account. Writes the e2e app's
 * SQLite file directly, through the app's own `better-sqlite3` so no dependency reaches the
 * monorepo root. Strapi stores datetimes there as epoch milliseconds, hence the integer.
 */
export const expireMfaGrace = (email: string): void => {
  const appPath = process.env.TEST_APP_PATH;
  if (!appPath) {
    throw new Error('expireMfaGrace: TEST_APP_PATH is not set; run through `yarn test:e2e`.');
  }

  const script = `
    const path = require('path');
    const Database = require('better-sqlite3');
    const db = new Database(path.join(process.cwd(), '.tmp', 'data.db'));
    const info = db
      .prepare('UPDATE admin_users SET mfa_grace_until = ? WHERE email = ?')
      .run(Date.now() - 60_000, process.argv[1]);
    db.close();
    if (info.changes !== 1) {
      console.error('expected to update 1 row, updated ' + info.changes);
      process.exit(1);
    }
  `;

  const result = spawnSync('node', ['-e', script, email], { cwd: appPath, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`expireMfaGrace failed: ${result.stderr || result.stdout}`);
  }
};
