import { createCommand } from 'commander';
import { errors, yup } from '@strapi/utils';
import _ from 'lodash';
import type { QuestionCollection } from 'inquirer';
import { createStrapi, compileStrapi } from '@strapi/core';

import { runAction } from '../../utils/helpers';
import { getInquirer } from '../../utils/get-inquirer';
import type { StrapiCommand } from '../../types';

interface CmdOptions {
  email?: string;
  password?: string;
  firstname?: string;
  lastname?: string;
}

const emailValidator = yup.string().email('Invalid email address').lowercase();

const adminCreateSchema = yup.object().shape({
  email: emailValidator,
  password: yup.string(),
  firstname: yup.string().trim().required('First name is required'),
  lastname: yup.string(),
});

interface Answers {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  confirm: boolean;
}

/**
 * It's not an observable, in reality this is
 * `ReadOnlyArray<DistinctQuestion<Answers>>`
 * but then the logic of the validate function needs to change.
 */
const promptQuestions: QuestionCollection<Answers> = [
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
    type: 'password',
    name: 'password',
    message: 'Admin password?',
  },
  { type: 'input', name: 'firstname', message: 'First name?' },
  { type: 'input', name: 'lastname', message: 'Last name?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to create a new admin?',
  },
];

async function createAdmin({ email, password, firstname, lastname }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  // The password policy is stored in the database, so it can only be read once Strapi is loaded
  if (password !== undefined) {
    try {
      await app.admin!.services.user.assertPasswordIsValid(password);
    } catch (err) {
      if (err instanceof errors.ValidationError) {
        console.error(err.message);
        process.exit(1);
      }

      throw err;
    }
  }

  const user = await app.admin!.services.user.exists({ email });

  if (user) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const superAdminRole = await app.admin!.services.role.getSuperAdmin();

  await app.admin!.services.user.create({
    email,
    firstname,
    lastname,
    isActive: true,
    roles: [superAdminRole.id],
    ...(password && { password, registrationToken: null }),
  });

  console.log(`Successfully created new admin`);
  process.exit(0);
}

/**
 * Create new admin user
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  let { email, password, firstname, lastname } = cmdOptions;

  if (
    _.isEmpty(email) &&
    _.isEmpty(password) &&
    _.isEmpty(firstname) &&
    _.isEmpty(lastname) &&
    process.stdin.isTTY
  ) {
    const inquirer = await getInquirer();
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    ({ email, password, firstname, lastname } = inquiry);
  }

  try {
    await adminCreateSchema.validate({ email, password, firstname, lastname });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      console.error(err.errors[0]);
    }

    process.exit(1);
  }

  return createAdmin({ email, password, firstname, lastname });
};

/**
 * `$ strapi admin:create-user`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:create-user')
    .alias('admin:create')
    .description('Create a new admin')
    .option('-e, --email <email>', 'Email of the new admin')
    .option('-p, --password <password>', 'Password of the new admin')
    .option('-f, --firstname <first name>', 'First name of the new admin')
    .option('-l, --lastname <last name>', 'Last name of the new admin')
    .action(runAction('admin:create-user', action));
};

export { action, command };
