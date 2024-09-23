import _ from 'lodash';
import inquirer from 'inquirer';
import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  email?: string;
  password?: string;
}

interface Answers {
  email: string;
  password: string;
  confirm: boolean;
}

const promptQuestions: ReadonlyArray<inquirer.DistinctQuestion<Answers>> = [
  { type: 'input', name: 'email', message: 'User email?' },
  { type: 'password', name: 'password', message: 'New password?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: "Do you really want to reset this user's password?",
  },
];

async function changePassword({ email, password }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  await app.admin!.services.user.resetPasswordByEmail(email, password);

  console.log(`Successfully reset user's password`);
  process.exit(0);
}

/**
 * Reset user's password
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  const { email, password } = cmdOptions;

  if (_.isEmpty(email) && _.isEmpty(password) && process.stdin.isTTY) {
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    return changePassword(inquiry);
  }

  if (_.isEmpty(email) || _.isEmpty(password)) {
    console.error('Missing required options `email` or `password`');
    process.exit(1);
  }

  return changePassword({ email, password });
};

/**
 * `$ strapi admin:reset-user-password`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:reset-user-password')
    .alias('admin:reset-password')
    .description("Reset an admin user's password")
    .option('-e, --email <email>', 'The user email')
    .option('-p, --password <password>', 'New password for the user')
    .action(runAction('admin:reset-user-password', action));
};

export { action, command };
