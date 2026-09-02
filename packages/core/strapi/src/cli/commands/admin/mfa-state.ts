import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';
import { currentTotpStep } from '@strapi/utils';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  email?: string;
}

async function printMfaState({ email }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  // Only what this command needs to display -- never `mfaSecret`, the field the encrypted TOTP
  // secret lives in.
  const user = await app.db
    .query('admin::user')
    .findOne({ where: { email }, select: ['id', 'email', 'mfaEnabledAt'] });

  if (!user) {
    console.error(`No admin user found for ${email}`);
    process.exit(1);
  }

  const enrolled = await app.admin!.services.mfa.isEnrolled(String(user.id));
  const unusedRecoveryCodes = await app.admin!.services.mfa.countUnusedRecoveryCodes(
    String(user.id)
  );
  const { recoveryCodeCount, step } = app.admin!.services.mfa.config();

  console.log(`email:             ${user.email}`);
  console.log(`enrolled:          ${enrolled ? 'yes' : 'no'}`);
  console.log(
    `enrolled at:       ${user.mfaEnabledAt ? new Date(user.mfaEnabledAt).toISOString() : '-'}`
  );
  console.log(`recovery codes:    ${unusedRecoveryCodes} of ${recoveryCodeCount} unused`);
  console.log(`server time:       ${new Date().toISOString()}`);
  console.log(`current totp step: ${currentTotpStep({ step })}`);

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
