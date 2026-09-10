import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';
import { currentTotpStep } from '@strapi/utils';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  email?: string;
}

/**
 * `admin::mfa` is registered as a factory (`{ strapi } => createMfaService(...)`, see
 * `packages/core/admin/server/src/services/index.ts`), not a pre-built object like `admin::user`.
 * It is only instantiated when resolved through the services registry, i.e.
 * `strapi.service('admin::mfa')` -- `app.admin!.services.mfa` is the raw, uninstantiated factory
 * function and calling any method on it throws. Typed locally (rather than importing
 * `@strapi/admin`'s own, private `src/utils` service type) naming only the methods this command
 * calls, to avoid a deep cross-package import into another package's internals.
 */
interface MfaService {
  isEnrolled(userId: string): Promise<boolean>;
  countUnusedRecoveryCodes(userId: string): Promise<number>;
  config(): { recoveryCodeCount: number; step: number };
  isMfaRequiredFor(user: {
    id: unknown;
    password?: string | null;
    roles?: unknown;
  }): Promise<boolean>;
  /** Trusted devices: the user's live trusted browsers; only the count is printed. */
  listTrustedDevices(userId: string): Promise<unknown[]>;
}

async function printMfaState({ email }: CmdOptions) {
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
  const { recoveryCodeCount, step } = mfa.config();

  console.log(`email:             ${user.email}`);
  console.log(`enrolled:          ${enrolled ? 'yes' : 'no'}`);
  console.log(
    `enrolled at:       ${user.mfaEnabledAt ? new Date(user.mfaEnabledAt).toISOString() : '-'}`
  );
  console.log(`recovery codes:    ${unusedRecoveryCodes} of ${recoveryCodeCount} unused`);
  console.log(`server time:       ${new Date().toISOString()}`);
  console.log(`current totp step: ${currentTotpStep({ step })}`);

  const required = await mfa.isMfaRequiredFor(user);
  console.log(`required:          ${required ? 'yes' : 'no'}`);
  console.log(
    `grace until:       ${user.mfaGraceUntil ? new Date(user.mfaGraceUntil).toISOString() : '-'}`
  );
  console.log(
    `locked at:         ${user.mfaLockedAt ? new Date(user.mfaLockedAt).toISOString() : '-'}`
  );

  const trustedDevices = await mfa.listTrustedDevices(String(user.id));
  console.log(`trusted devices:   ${trustedDevices.length}`);

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
