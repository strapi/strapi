import type { AdminUser, Options, PackageManager } from '../types';

// npm needs npx to run a local binary. yarn and pnpm run local binaries directly. None of them
// needs the `strapi` script in package.json, so the command also works for external templates.
const STRAPI_BIN: Record<PackageManager, [string, ...string[]]> = {
  npm: ['npx', 'strapi'],
  yarn: ['yarn', 'strapi'],
  pnpm: ['pnpm', 'strapi'],
};

export const DEFAULT_ADMIN_FIRSTNAME = 'Admin';

// Same rules as `strapi admin:create-user`, checked here so a bad value fails before the project
// is created instead of after the install.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Reads `--admin-email`, `--admin-password` and `--admin-firstname`.
 * No email and no password means no admin: the project is created without one.
 */
export const parseAdminOptions = ({
  adminEmail,
  adminPassword,
  adminFirstname,
}: Pick<Options, 'adminEmail' | 'adminPassword' | 'adminFirstname'>): AdminOptionsResult => {
  const email = adminEmail?.trim() ?? '';
  const password = adminPassword ?? '';
  const firstname = adminFirstname?.trim() || DEFAULT_ADMIN_FIRSTNAME;

  if (email === '' && password === '') {
    if (adminFirstname !== undefined) {
      return { ok: false, error: '--admin-firstname needs --admin-email and --admin-password' };
    }

    return { ok: true, admin: null };
  }

  if (email === '') {
    return { ok: false, error: '--admin-password needs --admin-email' };
  }

  if (password === '') {
    return { ok: false, error: '--admin-email needs --admin-password' };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: `--admin-email "${email}" is not a valid email address` };
  }

  const passwordError = getPasswordError(password);

  if (passwordError) {
    return { ok: false, error: `--admin-password ${passwordError}` };
  }

  return { ok: true, admin: { email: email.toLowerCase(), password, firstname } };
};

/**
 * File and arguments that create the admin. `admin:create-user` never prompts when a value comes
 * as a flag. `--non-interactive` is not passed, so the command also works with a template that
 * pins an older `@strapi/strapi`.
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
      `--password=${admin.password}`,
    ],
  };
};

/**
 * The command to show when the project has no admin. The quoted placeholders stay safe if someone
 * pastes the command without replacing them: the shell does not read `<` as a redirect.
 */
export const getCreateAdminCommandTemplate = (packageManager: PackageManager) =>
  [
    ...STRAPI_BIN[packageManager],
    'admin:create-user',
    '--firstname="<first name>"',
    '--email="<email>"',
    '--password="<password>"',
  ].join(' ');
