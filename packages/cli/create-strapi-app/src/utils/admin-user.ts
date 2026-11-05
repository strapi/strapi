import chalk from 'chalk';
import execa from 'execa';

import type { PackageManager } from '../types';

/**
 * Environment variable that holds the admin password for create-strapi-app.
 * It must not start with `STRAPI_ADMIN_`: Vite exposes those variables to the admin bundle.
 */
export const ADMIN_PASSWORD_ENV_VAR = 'CREATE_STRAPI_APP_ADMIN_PASSWORD';

/**
 * Environment variable read by `strapi admin:create-user` when `--password` is absent.
 * create-strapi-app cannot import `@strapi/strapi`, so the name is duplicated.
 * The `@strapi/strapi` create-user tests pin the name and its presence in `--help`.
 */
export const CHILD_PASSWORD_ENV_VAR = 'STRAPI_CLI_ADMIN_PASSWORD';

export const DEFAULT_ADMIN_FIRSTNAME = 'Admin';

/**
 * The first admin user created at the end of the installation.
 * Never store this object in `Scope`: `Scope` feeds telemetry.
 */
export interface AdminUser {
  email: string;
  password: string;
  firstname: string;
}

export interface AdminUserPrompts {
  email: () => Promise<string>;
  password: () => Promise<string>;
}

export interface ResolveAdminUserOptions {
  /** Value of `--admin-email`, already checked with `validateEmail` */
  email?: string;
  /** The installer can ask questions: no `--quickstart`, no `--non-interactive`, and a TTY */
  canPrompt: boolean;
  env?: NodeJS.ProcessEnv;
  prompts: AdminUserPrompts;
}

// A strict subset of the yup `.email()` rule used by `strapi admin:create-user`:
// dot-atom local part (no leading, trailing, or consecutive dots) and a dotted domain
const EMAIL_CHAR = "a-z\\d!#$%&'*+\\-/=?^_`{|}~\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF";
const DOMAIN_CHAR = 'a-z\\d\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF';
const TLD_CHAR = 'a-z\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF';
const EMAIL_REGEX = new RegExp(
  `^[${EMAIL_CHAR}]+(\\.[${EMAIL_CHAR}]+)*` +
    `@(([${DOMAIN_CHAR}]|[${DOMAIN_CHAR}][${DOMAIN_CHAR}\\-._~]*[${DOMAIN_CHAR}])\\.)+` +
    `([${TLD_CHAR}]|[${TLD_CHAR}][${DOMAIN_CHAR}\\-._~]*[${TLD_CHAR}])$`,
  'i'
);

const MAX_PASSWORD_BYTES = 72;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Returns `true` or an error message, as inquirer `validate` expects.
 */
export const validateEmail = (email: string): true | string => {
  return EMAIL_REGEX.test(normalizeEmail(email)) ? true : 'Invalid email address';
};

/**
 * Same rules as `strapi admin:create-user` and the admin API validators.
 * Returns `true` or an error message, as inquirer `validate` expects.
 */
export const validatePassword = (password: string): true | string => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  // bcrypt ignores the bytes after the 72nd
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} bytes long`;
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase character';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase character';
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  return true;
};

export class AdminUserInputError extends Error {}

/**
 * Resolves each value from the flag or the environment variable, then from the prompt.
 * Returns `undefined` when the installer cannot prompt and got no value: the user then
 * registers the first admin in the admin panel, as before this step existed.
 */
export async function resolveAdminUser({
  email: emailFlag,
  canPrompt,
  env = process.env,
  prompts,
}: ResolveAdminUserOptions): Promise<AdminUser | undefined> {
  const envPassword = env[ADMIN_PASSWORD_ENV_VAR] || undefined;

  if (envPassword !== undefined) {
    const result = validatePassword(envPassword);

    if (result !== true) {
      throw new AdminUserInputError(`${result}: ${chalk.bold(ADMIN_PASSWORD_ENV_VAR)}`);
    }
  }

  if (!canPrompt) {
    if (emailFlag === undefined && envPassword === undefined) {
      return undefined;
    }

    if (emailFlag === undefined || envPassword === undefined) {
      throw new AdminUserInputError(
        `Without prompts, set both ${chalk.bold('--admin-email')} and ${chalk.bold(ADMIN_PASSWORD_ENV_VAR)}, or neither`
      );
    }
  }

  const email = emailFlag ?? (await prompts.email());
  const password = envPassword ?? (await prompts.password());

  return {
    email: normalizeEmail(email),
    password,
    firstname: DEFAULT_ADMIN_FIRSTNAME,
  };
}

/**
 * The command a user runs by hand to create the admin user.
 */
export const getManualAdminCommand = (packageManager: PackageManager) => {
  const separator = packageManager === 'npm' ? ' --' : '';

  return `${packageManager} run strapi${separator} admin:create-user`;
};

const getErrorOutput = (error: unknown) => {
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error
      ? String((error as { stderr: unknown }).stderr)
      : '';

  return stderr || (error instanceof Error ? error.message : String(error));
};

export type CreateAdminUserResult =
  { status: 'created' } | { status: 'unsupported' } | { status: 'failed'; error: string };

/**
 * Runs `strapi admin:create-user` inside the new project.
 * The password goes through the child environment, never through its arguments.
 */
export async function createAdminUser({
  rootPath,
  adminUser,
}: {
  rootPath: string;
  adminUser: AdminUser;
}): Promise<CreateAdminUserResult> {
  const execaOptions = {
    cwd: rootPath,
    preferLocal: true,
    localDir: rootPath,
  };

  try {
    // `admin:create-user` reads the password from the environment only in recent versions,
    // and templates can pin an older `@strapi/strapi`
    const help = await execa('strapi', ['admin:create-user', '--help'], execaOptions);

    if (!help.stdout.includes(CHILD_PASSWORD_ENV_VAR)) {
      return { status: 'unsupported' };
    }

    await execa(
      'strapi',
      ['admin:create-user', '--email', adminUser.email, '--firstname', adminUser.firstname],
      {
        ...execaOptions,
        stdio: ['ignore', 'inherit', 'pipe'],
        env: {
          [CHILD_PASSWORD_ENV_VAR]: adminUser.password,
          [ADMIN_PASSWORD_ENV_VAR]: undefined,
          FORCE_COLOR: '1',
        },
      }
    );

    return { status: 'created' };
  } catch (error) {
    return { status: 'failed', error: getErrorOutput(error) };
  }
}
