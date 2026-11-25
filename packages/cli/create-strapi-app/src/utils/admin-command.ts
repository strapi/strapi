import execa from 'execa';

import { EMAIL_REGEX } from './email-regex';
import type { AdminUser, Options, PackageManager } from '../types';

// npm needs npx to run a local binary. yarn and pnpm run local binaries directly. None of them
// needs the `strapi` script in package.json, so the command also works for external templates.
const STRAPI_BIN: Record<PackageManager, [string, ...string[]]> = {
  npm: ['npx', 'strapi'],
  yarn: ['yarn', 'strapi'],
  pnpm: ['pnpm', 'strapi'],
};

export const DEFAULT_ADMIN_FIRSTNAME = 'Admin';

/** `strapi admin:create-user` reads the password from this variable when `--password` is missing. */
export const ADMIN_PASSWORD_ENV = 'STRAPI_ADMIN_PASSWORD';

// Same rules as `strapi admin:create-user`, checked here so a bad value fails before the project
// is created instead of after the install. The email pattern is a copy of the core one.
const getPasswordError = (password: string) => {
  if (password.length < 8) return 'must be at least 8 characters long';
  if (!/[a-z]/.test(password)) return 'must contain at least one lowercase character';
  if (!/[A-Z]/.test(password)) return 'must contain at least one uppercase character';
  if (!/\d/.test(password)) return 'must contain at least one number';
  return null;
};

export type AdminOptionsResult =
  { ok: true; admin: AdminUser | null } | { ok: false; error: string };

/**
 * Reads `--admin-email`, `--admin-password` and `--admin-firstname`. The password can also come
 * from `STRAPI_ADMIN_PASSWORD`, which keeps it out of the shell history and the process list.
 * No email means no admin: the project is created without one. A password in the environment
 * alone does not ask for an admin, so a variable left set in a shell does not break other runs.
 */
export const parseAdminOptions = (
  {
    adminEmail,
    adminPassword,
    adminFirstname,
  }: Pick<Options, 'adminEmail' | 'adminPassword' | 'adminFirstname'>,
  env: NodeJS.ProcessEnv = process.env
): AdminOptionsResult => {
  const email = adminEmail?.trim() ?? '';
  const password = adminPassword || env[ADMIN_PASSWORD_ENV] || '';
  const firstname = adminFirstname?.trim() || DEFAULT_ADMIN_FIRSTNAME;

  if (email === '') {
    if (adminPassword) {
      return { ok: false, error: '--admin-password needs --admin-email' };
    }

    if (adminFirstname !== undefined) {
      return { ok: false, error: '--admin-firstname needs --admin-email' };
    }

    return { ok: true, admin: null };
  }

  if (password === '') {
    return {
      ok: false,
      error: `--admin-email needs --admin-password or the ${ADMIN_PASSWORD_ENV} environment variable`,
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: `--admin-email "${email}" is not a valid email address` };
  }

  const passwordError = getPasswordError(password);

  if (passwordError) {
    return { ok: false, error: `The admin password ${passwordError}` };
  }

  return { ok: true, admin: { email: email.toLowerCase(), password, firstname } };
};

/**
 * File, arguments and environment that create the admin. `admin:create-user` skips its prompt
 * when it gets a value as a flag. The password goes through the environment, never the arguments,
 * so it is not in the process list or in an execa error message.
 */
export const getCreateAdminArgs = (packageManager: PackageManager, admin: AdminUser) => {
  const [file, ...binArgs] = STRAPI_BIN[packageManager];

  return {
    file,
    args: [
      ...binArgs,
      'admin:create-user',
      `--firstname=${admin.firstname}`,
      `--email=${admin.email}`,
    ],
    env: { [ADMIN_PASSWORD_ENV]: admin.password },
  };
};

// Single quotes keep every character as typed. A `'` inside the value closes, escapes and reopens.
const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * The command to show when the project has no admin. Without an admin, every value is a quoted
 * placeholder: the shell does not read `<` as a redirect if someone pastes it as is. After a
 * failed attempt, the email and first name are filled in, and the password stays a placeholder.
 */
export const getCreateAdminCommandTemplate = (
  packageManager: PackageManager,
  admin?: Pick<AdminUser, 'email' | 'firstname'>
) =>
  [
    ...STRAPI_BIN[packageManager],
    'admin:create-user',
    `--firstname=${admin ? shellQuote(admin.firstname) : '"<first name>"'}`,
    `--email=${admin ? shellQuote(admin.email) : '"<email>"'}`,
    '--password="<password>"',
  ].join(' ');

const STACK_FRAME = /^\s*at\s/;
const ERROR_LINE = /error|already exists|required|invalid|must/i;

/**
 * The line of the child output that best says why the admin was not created. The output ends
 * with a stack trace when the app fails to load, so the last line is often a stack frame.
 */
export const getFailureReason = (output: string) => {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !STACK_FRAME.test(line));

  return lines.find((line) => ERROR_LINE.test(line)) ?? lines.at(-1) ?? 'unknown error';
};

export type CreateAdminResult = { ok: true } | { ok: false; reason: string };

type Run = (
  file: string,
  args: string[],
  options: execa.Options
) => Promise<unknown> | execa.ExecaChildProcess;

/** Runs `strapi admin:create-user` in the new project. */
export const createAdminUser = async (
  { packageManager, rootPath }: { packageManager: PackageManager; rootPath: string },
  admin: AdminUser,
  run: Run = execa
): Promise<CreateAdminResult> => {
  const { file, args, env } = getCreateAdminArgs(packageManager, admin);

  try {
    // stdin is closed, so nothing can wait for an answer.
    await run(file, args, { cwd: rootPath, env, stdin: 'ignore', all: true });

    return { ok: true };
  } catch (error) {
    // Read only the child output: `message` and `shortMessage` hold the command line.
    const output = (error as Partial<execa.ExecaError>).all ?? '';

    return { ok: false, reason: getFailureReason(output) };
  }
};
