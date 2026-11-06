import { randomInt } from 'node:crypto';

import { join } from 'node:path';

import chalk from 'chalk';
import execa from 'execa';
import fse from 'fs-extra';

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

/**
 * Option of `strapi admin:create-user` that also creates an admin token, and the prefix
 * of the stdout line that carries its key. Kept in sync with `@strapi/strapi`
 * (cli/commands/admin/create-user.ts). Its tests pin both values.
 */
export const ADMIN_TOKEN_OPTION = '--with-admin-token';
const ADMIN_TOKEN_LINE_REGEX = /^Admin token: ([a-f0-9]+)$/m;

export const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
export const DEFAULT_ADMIN_FIRSTNAME = 'Admin';

/**
 * The first admin user created at the end of the installation.
 * Never store this object in `Scope`: `Scope` feeds telemetry.
 */
export interface AdminUser {
  email: string;
  password: string;
  firstname: string;
  /** The CLI generated the password because it could not prompt. It prints it once, in the summary. */
  passwordGenerated: boolean;
}

export interface AdminUserPrompts {
  email: () => Promise<string>;
  password: () => Promise<string>;
}

export interface ResolveAdminUserOptions {
  /** Value of `--admin-email`, already checked with `validateEmail` */
  email?: string;
  /** The installer can ask questions: no `--non-interactive`, and a TTY */
  canPrompt: boolean;
  /** Value of `CREATE_STRAPI_APP_ADMIN_PASSWORD`, taken with `takeAdminPasswordFromEnv` */
  envPassword?: string;
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

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const GENERATED_PASSWORD_LENGTH = 24;

const pick = (chars: string) => chars[randomInt(chars.length)];

/**
 * Generates a random password that passes `validatePassword`.
 * 24 alphanumeric characters give about 142 bits of entropy, and the value needs no
 * quoting in a shell. `randomInt` uses the cryptographically secure generator of Node.js.
 */
export const generateAdminPassword = (length = GENERATED_PASSWORD_LENGTH): string => {
  const all = LOWERCASE + UPPERCASE + DIGITS;
  // One character of each required class, then random characters from the full set
  const chars = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS)];

  while (chars.length < length) {
    chars.push(pick(all));
  }

  // Fisher-Yates shuffle, so the required characters are not always at the start
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

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
 * Reads `CREATE_STRAPI_APP_ADMIN_PASSWORD` and removes it from `process.env`.
 * Call it before the installer starts any child process: the dependency install,
 * its lifecycle scripts, the seed, and `develop` must never see the password.
 */
export function takeAdminPasswordFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const password = env[ADMIN_PASSWORD_ENV_VAR] || undefined;

  delete env[ADMIN_PASSWORD_ENV_VAR];

  return password;
}

/**
 * The admin user is mandatory. Each value comes from the flag or the environment
 * variable, then from the prompt. Without prompts, the email uses the default
 * and the CLI generates a random password. There is no default password.
 */
export async function resolveAdminUser({
  email: emailFlag,
  canPrompt,
  envPassword,
  prompts,
}: ResolveAdminUserOptions): Promise<AdminUser> {
  if (envPassword !== undefined) {
    const result = validatePassword(envPassword);

    if (result !== true) {
      throw new AdminUserInputError(`${result}: ${chalk.bold(ADMIN_PASSWORD_ENV_VAR)}`);
    }
  }

  let email = emailFlag;

  if (email === undefined) {
    email = canPrompt ? await prompts.email() : DEFAULT_ADMIN_EMAIL;
  }

  let password = envPassword;
  let passwordGenerated = false;

  if (password === undefined) {
    if (canPrompt) {
      password = await prompts.password();
    } else {
      password = generateAdminPassword();
      passwordGenerated = true;
    }
  }

  return {
    email: normalizeEmail(email),
    password,
    firstname: DEFAULT_ADMIN_FIRSTNAME,
    passwordGenerated,
  };
}

/**
 * The command a user runs by hand to create the admin user.
 */
export const getManualAdminCommand = (
  packageManager: PackageManager,
  { withAdminToken = true }: { withAdminToken?: boolean } = {}
) => {
  const separator = packageManager === 'npm' ? ' --' : '';
  const tokenOption = withAdminToken ? ` ${ADMIN_TOKEN_OPTION}` : '';

  return `${packageManager} run strapi${separator} admin:create-user${tokenOption}`;
};

/**
 * File that receives the generated password and the admin token when stdout is not a TTY
 * (CI, Docker builds, agents), so that build logs never keep them.
 * The generated `.gitignore` lists it.
 */
export const CREDENTIALS_FILE = '.strapi-credentials.json';

export interface Credentials {
  email: string;
  /** Only a generated password. A password the user chose is never written. */
  password?: string;
  adminToken?: string;
}

/**
 * Writes the credentials file with owner-only permissions (0600) and returns its path.
 */
export async function writeCredentialsFile(rootPath: string, credentials: Credentials) {
  const filePath = join(rootPath, CREDENTIALS_FILE);
  const content = {
    ...credentials,
    note: 'Created by create-strapi-app. Store these values in a safe place, then delete this file.',
  };

  await fse.writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 });
  // `mode` applies only to a new file: also restrict an existing one
  await fse.chmod(filePath, 0o600);

  return filePath;
}

/**
 * Lines printed instead of the secrets when they went to the credentials file.
 */
export const getCredentialsFileSummary = (displayPath: string, credentials: Credentials) => [
  `The admin credentials are in ${chalk.bold(displayPath)} (readable only by you):`,
  ...(credentials.password ? ['  - the generated admin password'] : []),
  ...(credentials.adminToken ? ['  - the admin token'] : []),
  'The CLI does not print them, so that build logs do not keep them.',
  'Store them in a safe place, then delete the file.',
];

/**
 * Adds the credentials file to an existing `.gitignore` (for example from a template).
 */
export async function ensureCredentialsFileIgnored(rootPath: string) {
  const gitignorePath = join(rootPath, '.gitignore');

  if (!(await fse.pathExists(gitignorePath))) {
    return;
  }

  const content = await fse.readFile(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim());

  if (lines.includes(CREDENTIALS_FILE) || lines.includes(`/${CREDENTIALS_FILE}`)) {
    return;
  }

  const separator = content.length === 0 || content.endsWith('\n') ? '' : '\n';
  await fse.appendFile(gitignorePath, `${separator}${CREDENTIALS_FILE}\n`);
}

/**
 * Lines printed in the installation summary for the admin token.
 * This is the only place where the CLI shows the token.
 */
export const getAdminTokenSummary = (adminToken: string) => [
  'Admin token (valid 30 days, all the permissions of the admin user):',
  `  ${chalk.bold(adminToken)}`,
  'The CLI does not show it again. Store it in a safe place.',
  'The admin user can show it again in the admin panel: Settings > Admin tokens.',
  `Send it to the admin API in the header ${chalk.cyan('Authorization: Bearer <token>')}.`,
];

/**
 * Reads the admin token key from the `admin:create-user --with-admin-token` output.
 */
export const parseAdminToken = (stdout: string) => ADMIN_TOKEN_LINE_REGEX.exec(stdout)?.[1];

/**
 * Lines printed in the installation summary when the CLI generated the password.
 * This is the only place where the CLI shows the password.
 */
export const getGeneratedPasswordSummary = (adminUser: AdminUser) => [
  'Admin user:',
  `  Email    : ${chalk.bold(adminUser.email)}`,
  `  Password : ${chalk.bold(adminUser.password)}`,
  'The CLI generated this password and does not show it again. Store it in a safe place.',
];

const getErrorOutput = (error: unknown) => {
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error
      ? String((error as { stderr: unknown }).stderr)
      : '';

  return stderr || (error instanceof Error ? error.message : String(error));
};

export type CreateAdminUserResult =
  | {
      status: 'created';
      /** The admin token key. Undefined when the installed Strapi version cannot create it. */
      adminToken?: string;
    }
  | { status: 'unsupported' }
  | { status: 'failed'; error: string };

/**
 * Runs `strapi admin:create-user` inside the new project.
 * The password goes through the child environment, never through its arguments.
 */
export async function createAdminUser({
  rootPath,
  adminUser,
  withAdminToken = true,
}: {
  rootPath: string;
  adminUser: AdminUser;
  /** `--no-admin-token` sets it to false */
  withAdminToken?: boolean;
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

    const args = [
      'admin:create-user',
      '--email',
      adminUser.email,
      '--firstname',
      adminUser.firstname,
    ];

    const requestsAdminToken = withAdminToken && help.stdout.includes(ADMIN_TOKEN_OPTION);

    if (requestsAdminToken) {
      args.push(ADMIN_TOKEN_OPTION);
    }

    // stdout is piped, not shown: it carries the token, which the summary shows once
    const { stdout } = await execa('strapi', args, {
      ...execaOptions,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        [CHILD_PASSWORD_ENV_VAR]: adminUser.password,
        [ADMIN_PASSWORD_ENV_VAR]: undefined,
        FORCE_COLOR: '1',
      },
    });

    if (!requestsAdminToken) {
      return { status: 'created' };
    }

    const adminToken = parseAdminToken(stdout);

    if (adminToken === undefined) {
      return { status: 'failed', error: 'The admin token is missing from the command output' };
    }

    return { status: 'created', adminToken };
  } catch (error) {
    return { status: 'failed', error: getErrorOutput(error) };
  }
}
