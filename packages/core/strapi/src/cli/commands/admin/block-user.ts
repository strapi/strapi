import _ from 'lodash';
import inquirer from 'inquirer';
import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  email?: string;
  block?: string;
}

interface Answers {
  email: string;
  block: string;
}

const promptQuestions: ReadonlyArray<inquirer.DistinctQuestion<Answers>> = [
  { type: 'input', name: 'email', message: 'User email?' },
  { type: 'input', name: 'block', message: 'User Blocked?' },
];

async function setBlock({ email, block }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const cleanEmail = email?.trim().toLowerCase();
  const cleanBlock = block?.trim().toLowerCase();

  if (cleanBlock !== 'true' && cleanBlock !== 'false') {
    console.error('Invalid block status. Use "true" or "false".');
    process.exit(1);
  }

  const user = await app.admin.services.user.findOneByEmail(cleanEmail);

  if (!user) {
    console.error(`User with email "${cleanEmail}" does not exist`);
    process.exit(1);
  }

  try {
    await app.admin!.services.user.updateById(user.id, { blocked: cleanBlock });
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`Successfully set ${cleanEmail} block status to ${cleanBlock}`);
  process.exit(0);
}

/**
 * Change a user's block status
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  const { email, block } = cmdOptions;

  if (_.isEmpty(email) && _.isEmpty(block) && process.stdin.isTTY) {
    const inquiry = await inquirer.prompt(promptQuestions);

    return setBlock(inquiry);
  }

  if (_.isEmpty(email) || _.isEmpty(block)) {
    console.error('Missing required options `email` or `block`');
    process.exit(1);
  }

  return setBlock({ email, block });
};

/**
 * `$ strapi admin:block-user`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:block-user')
    .alias('admin:block')
    .description("Set a user's block status")
    .option('-e, --email <email>', 'The user email')
    .option('-b, --block <true/false>', 'The user block status')
    .action(runAction('admin:block-user', action));
};

export { action, command };
