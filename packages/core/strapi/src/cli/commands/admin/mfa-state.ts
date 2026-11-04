import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  email?: string;
}

/** See `reset-user-mfa.ts` for why the service is resolved through `app.service`. */
interface MfaService {
  isEnrolled(userId: string): Promise<boolean>;
  countUnusedRecoveryCodes(userId: string): Promise<number>;
  config(): { recoveryCodeCount: number };
  /** The server's current TOTP step, from the configured step length. */
  currentTotpStep(): number;
  isMfaRequiredFor(user: {
    id: unknown;
    password?: string | null;
    roles?: unknown;
  }): Promise<boolean>;
  /** Read-only: unlike `listTrustedDevices` it deletes nothing it finds expired. */
  countLiveTrustedDevices(userId: string): Promise<number>;
}

async function printMfaState({ email: typed }: CmdOptions) {
  // Admin emails are stored lowercased (`normalizeEmail`), so a lookup with the address as typed
  // misses on any capital letter.
  const email = String(typed ?? '')
    .trim()
    .toLowerCase();
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  // `password` is selected only so `isMfaRequiredFor`'s no-local-password check can run -- it is
  // never printed. Never `mfaSecret`/`mfaPendingSecret`, the fields the encrypted TOTP secrets
  // live in.
  const user = await app.db.query('admin::user').findOne({
    where: { email },
    select: ['id', 'email', 'mfaEnabledAt', 'mfaGraceUntil', 'mfaLockedAt', 'password'],
    populate: ['roles'],
  });

  if (!user) {
    console.error(`No admin user found for ${email}`);
    process.exit(1);
  }

  const mfa = app.service('admin::mfa') as MfaService;

  const enrolled = await mfa.isEnrolled(String(user.id));
  const unusedRecoveryCodes = await mfa.countUnusedRecoveryCodes(String(user.id));
  const { recoveryCodeCount } = mfa.config();

  console.log(`email:             ${user.email}`);
  console.log(`enrolled:          ${enrolled ? 'yes' : 'no'}`);
  console.log(
    `enrolled at:       ${user.mfaEnabledAt ? new Date(user.mfaEnabledAt).toISOString() : '-'}`
  );
  console.log(`recovery codes:    ${unusedRecoveryCodes} of ${recoveryCodeCount} unused`);
  console.log(`server time:       ${new Date().toISOString()}`);
  console.log(`current totp step: ${mfa.currentTotpStep()}`);

  const required = await mfa.isMfaRequiredFor(user);
  console.log(`required:          ${required ? 'yes' : 'no'}`);
  console.log(
    `grace until:       ${user.mfaGraceUntil ? new Date(user.mfaGraceUntil).toISOString() : '-'}`
  );
  console.log(
    `locked at:         ${user.mfaLockedAt ? new Date(user.mfaLockedAt).toISOString() : '-'}`
  );

  // A diagnostic command writes nothing: `listTrustedDevices` prunes the dead rows it meets.
  const trustedDevices = await mfa.countLiveTrustedDevices(String(user.id));
  console.log(`trusted devices:   ${trustedDevices}`);

  process.exit(0);
}

/**
 * Print a user's two-factor authentication state
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  const { email } = cmdOptions;

  if (!email) {
    console.error('Missing required option `email`');
    process.exit(1);
  }

  return printMfaState({ email });
};

/**
 * `$ strapi admin:mfa-state`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:mfa-state')
    .description("Print an admin user's two-factor authentication state")
    .option('-e, --email <email>', 'The user email')
    .action(runAction('admin:mfa-state', action));
};

export { action, command };
