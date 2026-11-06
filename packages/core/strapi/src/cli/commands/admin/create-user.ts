import { createCommand } from 'commander';
import { errors, yup } from '@strapi/utils';
import _ from 'lodash';
import type { QuestionCollection } from 'inquirer';
import type { Core } from '@strapi/types';
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

/**
 * The password policy is stored in the database, so a password can only be checked once Strapi
 * is loaded, after the prompts. In interactive mode, asks for the password again until it is
 * valid instead of losing every answer; otherwise exits with an error.
 */
async function ensureValidPassword(
  app: Core.Strapi,
  password: string,
  interactive: boolean
): Promise<string> {
  let candidate = password;

  for (;;) {
    try {
      await app.admin!.services.user.assertPasswordIsValid(candidate);
      return candidate;
    } catch (err) {
      if (!(err instanceof errors.ValidationError)) {
        throw err;
      }

      console.error(err.message);

      if (!interactive) {
        process.exit(1);
      }
    }

    const inquirer = await getInquirer();
    ({ password: candidate } = await inquirer.prompt<{ password: string }>([
      { type: 'password', name: 'password', message: 'Admin password?' },
    ]));
  }
}

async function createAdmin(
  { email, password: initialPassword, firstname, lastname }: CmdOptions,
  { interactive = false }: { interactive?: boolean } = {}
) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  // Before the password, so a retried password is never lost to an email already taken
  const user = await app.admin!.services.user.exists({ email });

  if (user) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const password =
    initialPassword === undefined
      ? undefined
      : await ensureValidPassword(app, initialPassword, interactive);

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
  let interactive = false;

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
    interactive = true;
  }

  try {
    await adminCreateSchema.validate({ email, password, firstname, lastname });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      console.error(err.errors[0]);
    }

    process.exit(1);
  }

  return createAdmin({ email, password, firstname, lastname }, { interactive });
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
