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

/** See `reset-user-mfa.ts` for why the service is resolved through `app.service`. */
interface MfaService {
  unlock(userId: string, actor: { via: 'cli' }): Promise<boolean>;
}

const promptQuestions: ReadonlyArray<DistinctQuestion<Answers>> = [
  { type: 'input', name: 'email', message: 'User email?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Unlock this account? Their next login starts a fresh enrolment grace period.',
  },
];

async function unlockMfa({ email }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const user = await app.db
    .query('admin::user')
    .findOne({ where: { email }, select: ['id', 'email', 'mfaLockedAt'] });

  if (!user) {
    console.error(`No admin user found for ${email}`);
    process.exit(1);
  }

  const mfa = app.service('admin::mfa') as MfaService;
  const unlocked = await mfa.unlock(String(user.id), { via: 'cli' });

  if (!unlocked) {
    console.error(`${email} is not locked by two-factor enforcement. Nothing to do.`);
    process.exit(1);
  }

  console.log(
    `${email} unlocked. Their next login starts a fresh two-factor enrolment grace period.`
  );
  process.exit(0);
}

const action = async (cmdOptions: CmdOptions = {}) => {
  const { email } = cmdOptions;

  if (_.isEmpty(email) && process.stdin.isTTY) {
    const inquirer = await getInquirer();
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    return unlockMfa(inquiry);
  }

  if (_.isEmpty(email)) {
    console.error('Missing required option `email`');
    process.exit(1);
  }

  return unlockMfa({ email });
};

/**
 * `$ strapi admin:unlock-user-mfa`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:unlock-user-mfa')
    .alias('admin:unlock-mfa')
    .description(
      "Unlock an admin user's account locked by two-factor enforcement (restarts their grace period)"
    )
    .option('-e, --email <email>', 'The user email')
    .action(runAction('admin:unlock-user-mfa', action));
};

export { action, command };
