import _ from 'lodash';
import inquirer from 'inquirer';
import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  email?: string;
  active?: boolean;
}

interface Answers {
  email: string;
  active: boolean;
}

const promptQuestions: ReadonlyArray<inquirer.DistinctQuestion<Answers>> = [
  { type: 'input', name: 'email', message: 'User email?' },
  { type: 'checkbox', name: 'active', message: 'User Active?' },
];

async function setActive({ email, active }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const user = await app.admin.services.user.findOneByEmail(email);

  if (!user) {
    console.error(`User with email "${email}" does not exist`);
    process.exit(1);
  }

  try {
    await app.admin!.services.user.updateById(user.id, { isActive: active });
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`Successfully set user's active status`);
  process.exit(0);
}

/**
 * Change a user's active status
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  const { email, active } = cmdOptions;

  if (_.isEmpty(email) && _.isEmpty(active) && process.stdin.isTTY) {
    const inquiry = await inquirer.prompt(promptQuestions);

    return setActive(inquiry);
  }

  if (_.isEmpty(email) || _.isEmpty(active)) {
    console.error('Missing required options `email` or `active`');
    process.exit(1);
  }

  console.log('active value', active);

  return setActive({ email, active });
};

/**
 * `$ strapi admin:active-user`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:active-user')
    .alias('admin:active')
    .description("Set a user's active status")
    .option('-e, --email <email>', 'The user email')
    .option('-a, --active <true/false>', 'The user active status')
    .action(runAction('admin:active-user', action));
};

export { action, command };
