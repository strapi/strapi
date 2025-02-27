import { createCommand } from 'commander';
import { yup } from '@strapi/utils';
import _ from 'lodash';
import inquirer from 'inquirer';
import { createStrapi, compileStrapi } from '@strapi/core';

import { runAction } from '../../utils/helpers';
import type { StrapiCommand } from '../../types';

interface CmdOptions {
  email?: string;
}

const emailValidator = yup.string().email('Invalid email address').lowercase();

const adminDeleteSchema = yup.object().shape({
  email: emailValidator,
});

interface Answers {
  email: string;
  confirm: boolean;
}

/**
 * It's not an observable, in reality this is
 * `ReadOnlyArray<inquirer.DistinctQuestion<Answers>>`
 * but then the logic of the validate function needs to change.
 */
// eslint-disable-next-line rxjs/finnish
const promptQuestions: inquirer.QuestionCollection<Answers> = [
  {
    type: 'input',
    name: 'email',
    message: 'Admin email?',
    async validate(value: string) {
      const validEmail = await emailValidator.validate(value);
      return validEmail === value || validEmail;
    },
  },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to delete this admin?',
  },
];

async function deleteAdmin({ email }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const user = await app.admin.services.user.findOneByEmail(email);

  if (!user) {
    console.error(`User with email "${email}" does not exist`);
    process.exit(1);
  }

  try {
    await app.admin!.services.user.deleteById(user.id);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`Successfully deleted admin`);
  process.exit(0);
}

/**
 * Create new admin user
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  let { email } = cmdOptions;

  if (_.isEmpty(email) && process.stdin.isTTY) {
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    ({ email } = inquiry);
  }

  try {
    await adminDeleteSchema.validate({ email });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      console.error(err.errors[0]);
    }

    process.exit(1);
  }

  return deleteAdmin({ email });
};

/**
 * `$ strapi admin:create-user`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:delete-user')
    .alias('admin:delete')
    .description('Delete an existing admin')
    .option('-e, --email <email>', 'Email of the current admin')
    .action(runAction('admin:delete-user', action));
};

export { action, command };
