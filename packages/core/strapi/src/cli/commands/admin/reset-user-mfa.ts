import _ from 'lodash';
import type { DistinctQuestion } from 'inquirer';
import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { getInquirer } from '../../utils/get-inquirer';

interface CmdOptions {
  email?: string;
}

interface Answers {
  email: string;
  confirm: boolean;
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
  disable(userId: string): Promise<void>;
  recordEvent(userId: string, type: 'reset', metadata?: { via?: 'cli' }): Promise<void>;
  notify(userId: string, type: 'reset'): void;
}

const promptQuestions: ReadonlyArray<DistinctQuestion<Answers>> = [
  { type: 'input', name: 'email', message: 'User email?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: "Do you really want to reset this user's two-factor authentication?",
  },
];

async function resetMfa({ email }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const user = await app.db.query('admin::user').findOne({ where: { email } });

  if (!user) {
    console.error(`No admin user found for ${email}`);
    process.exit(1);
  }

  const mfa = app.service('admin::mfa') as MfaService;

  await mfa.disable(String(user.id));

  // Sessions are evicted before the event is recorded and the notice is sent: a failing event
  // write must never leave an attacker holding a live session past this reset.
  await app.sessionManager('admin').invalidateRefreshToken(String(user.id));

  await mfa.recordEvent(String(user.id), 'reset', { via: 'cli' });
  mfa.notify(String(user.id), 'reset');

  console.log(`Two-factor authentication reset for ${email}. All sessions were invalidated.`);
  process.exit(0);
}

/**
 * Reset user's two-factor authentication
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  const { email } = cmdOptions;

  if (_.isEmpty(email) && process.stdin.isTTY) {
    const inquirer = await getInquirer();
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    return resetMfa(inquiry);
  }

  if (_.isEmpty(email)) {
    console.error('Missing required option `email`');
    process.exit(1);
  }

  return resetMfa({ email });
};

/**
 * `$ strapi admin:reset-user-mfa`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:reset-user-mfa')
    .alias('admin:reset-mfa')
    .description("Reset an admin user's two-factor authentication")
    .option('-e, --email <email>', 'The user email')
    .action(runAction('admin:reset-user-mfa', action));
};

export { action, command };
