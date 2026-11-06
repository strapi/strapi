import { createCommand } from 'commander';
import { yup } from '@strapi/utils';
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
  withAdminToken?: boolean;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * The admin token created with `--with-admin-token`.
 * The lifespan must be one of the admin API values (7, 30, or 90 days, or unlimited).
 */
const ADMIN_TOKEN = {
  name: 'Installation token',
  description: 'Created by strapi admin:create-user --with-admin-token',
  lifespan: 30 * DAY_IN_MS,
};

/**
 * Prefix of the stdout line that carries the admin token key.
 * create-strapi-app parses this line: keep both in sync (the tests pin it).
 */
const ADMIN_TOKEN_OUTPUT_PREFIX = 'Admin token: ';

/**
 * Environment variable read when `--password` is absent.
 * Lets callers such as create-strapi-app pass the password without exposing it
 * in the process arguments. It must not start with `STRAPI_ADMIN_`, because
 * those variables are exposed to the admin panel bundle.
 * create-strapi-app duplicates this name and searches for it in the `--help` output:
 * keep both in sync (the tests pin them).
 */
const PASSWORD_ENV_VAR = 'STRAPI_CLI_ADMIN_PASSWORD';

const emailValidator = yup.string().email('Invalid email address').lowercase();

const passwordValidator = yup
  .string()
  .min(8, 'Password must be at least 8 characters long')
  // bcrypt ignores the bytes after the 72nd, and the admin API rejects longer passwords
  .test('max-bytes', 'Password must be at most 72 bytes long', (value) => {
    if (!value) return true;
    return new TextEncoder().encode(value).length <= 72;
  })
  .test('lowercase', 'Password must contain at least one lowercase character', (value) => {
    if (!value) return true;
    return /[a-z]/.test(value);
  })
  .test('uppercase', 'Password must contain at least one uppercase character', (value) => {
    if (!value) return true;
    return /[A-Z]/.test(value);
  })
  .test('number', 'Password must contain at least one number', (value) => {
    if (!value) return true;
    return /\d/.test(value);
  });

const adminCreateSchema = yup.object().shape({
  email: emailValidator,
  password: passwordValidator,
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
    async validate(value: string) {
      const validPassword = await passwordValidator.validate(value);
      return validPassword === value || validPassword;
    },
  },
  { type: 'input', name: 'firstname', message: 'First name?' },
  { type: 'input', name: 'lastname', message: 'Last name?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to create a new admin?',
  },
];

async function createAdmin({ email, password, firstname, lastname, withAdminToken }: CmdOptions) {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  const { services } = app.admin!;

  const user = await services.user.exists({ email });

  if (user) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const superAdminRole = await services.role.getSuperAdmin();

  const createUser = () =>
    services.user.create({
      email,
      firstname,
      lastname,
      isActive: true,
      roles: [superAdminRole.id],
      ...(password && { password, registrationToken: null }),
    });

  if (!withAdminToken) {
    await createUser();

    console.log(`Successfully created new admin`);
    process.exit(0);
    return;
  }

  // One transaction: if the token fails, the user is not created and the command can run again
  const accessKey: string = await app.db.transaction(async () => {
    const createdUser = await createUser();

    // The token service checks the roles of the owner (super admin ceiling)
    const owner = await services.user.findOne(createdUser.id);

    // The token gets every permission of its owner, as the admin panel offers it
    const ownerPermissions = await services.permission.findUserPermissions(owner);
    const adminPermissions = ownerPermissions
      .map(services.permission.sanitizePermission)
      .map((permission: Record<string, unknown>) =>
        _.pick(permission, ['action', 'subject', 'properties', 'conditions'])
      );

    const token = await services['api-token-admin'].create(
      { kind: 'admin', ...ADMIN_TOKEN, adminPermissions },
      owner
    );

    return token.accessKey;
  });

  console.log(`Successfully created new admin`);
  console.log(`${ADMIN_TOKEN_OUTPUT_PREFIX}${accessKey}`);
  process.exit(0);
}

/**
 * Create new admin user
 */
const action = async (cmdOptions: CmdOptions = {}) => {
  const { withAdminToken } = cmdOptions;
  let { email, password, firstname, lastname } = cmdOptions;

  // Take the password out of process.env before the app loads, so plugins and
  // bootstrap code never see it
  const envPassword = process.env[PASSWORD_ENV_VAR];
  delete process.env[PASSWORD_ENV_VAR];

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
  } else if (_.isEmpty(password) && !_.isEmpty(envPassword)) {
    // Read only without prompts, so a stray variable never disables the interactive mode
    password = envPassword;
  }

  try {
    await adminCreateSchema.validate({
      email,
      password,
      firstname,
      lastname,
    });
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      console.error(err.errors[0]);
    }

    process.exit(1);
  }

  return createAdmin({ email, password, firstname, lastname, withAdminToken });
};

/**
 * `$ strapi admin:create-user`
 */
const command: StrapiCommand = () => {
  return createCommand('admin:create-user')
    .alias('admin:create')
    .description('Create a new admin')
    .option('-e, --email <email>', 'Email of the new admin')
    .option('-p, --password <password>', `Password of the new admin (or set ${PASSWORD_ENV_VAR})`)
    .option('-f, --firstname <first name>', 'First name of the new admin')
    .option('-l, --lastname <last name>', 'Last name of the new admin')
    .option(
      '--with-admin-token',
      'Also create an admin token with all the permissions of the new admin (valid 30 days), and print it'
    )
    .action(runAction('admin:create-user', action));
};

export { action, command, PASSWORD_ENV_VAR, ADMIN_TOKEN_OUTPUT_PREFIX };
