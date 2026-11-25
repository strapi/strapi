import { describe, expect, it, vi } from 'vitest';

import {
  createAdminUser,
  getCreateAdminArgs,
  getCreateAdminCommandTemplate,
  getFailureReason,
  parseAdminOptions,
} from '../admin-command';

const noEnv = {};

describe('parseAdminOptions', () => {
  it('returns no admin when no admin flag is passed', () => {
    expect(parseAdminOptions({}, noEnv)).toEqual({ ok: true, admin: null });
  });

  it('returns no admin when only STRAPI_ADMIN_PASSWORD is set', () => {
    expect(parseAdminOptions({}, { STRAPI_ADMIN_PASSWORD: 'Secret123' })).toEqual({
      ok: true,
      admin: null,
    });
  });

  it('returns the admin, with a default first name and a lowercase email', () => {
    expect(
      parseAdminOptions({ adminEmail: 'Dev@Example.com', adminPassword: 'Secret123' }, noEnv)
    ).toEqual({
      ok: true,
      admin: { email: 'dev@example.com', password: 'Secret123', firstname: 'Admin' },
    });
  });

  it('keeps the first name when it is passed', () => {
    const result = parseAdminOptions(
      { adminEmail: 'dev@example.com', adminPassword: 'Secret123', adminFirstname: 'Kai' },
      noEnv
    );

    expect(result).toEqual({
      ok: true,
      admin: { email: 'dev@example.com', password: 'Secret123', firstname: 'Kai' },
    });
  });

  it('reads the password from STRAPI_ADMIN_PASSWORD', () => {
    const result = parseAdminOptions(
      { adminEmail: 'dev@example.com' },
      { STRAPI_ADMIN_PASSWORD: 'EnvSecret123' }
    );

    expect(result).toEqual({
      ok: true,
      admin: { email: 'dev@example.com', password: 'EnvSecret123', firstname: 'Admin' },
    });
  });

  it('uses --admin-password over STRAPI_ADMIN_PASSWORD', () => {
    const result = parseAdminOptions(
      { adminEmail: 'dev@example.com', adminPassword: 'FlagSecret123' },
      { STRAPI_ADMIN_PASSWORD: 'EnvSecret123' }
    );

    expect(result.ok && result.admin?.password).toBe('FlagSecret123');
  });

  it.each([
    [{ adminEmail: 'dev@example.com' }, '--admin-email needs --admin-password'],
    [{ adminPassword: 'Secret123' }, '--admin-password needs --admin-email'],
    [{ adminFirstname: 'Kai' }, '--admin-firstname needs --admin-email'],
    [{ adminEmail: 'not-an-email', adminPassword: 'Secret123' }, 'is not a valid email address'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'Sec1' }, 'at least 8 characters'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'SECRET123' }, 'lowercase'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'secret123' }, 'uppercase'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'SecretPass' }, 'number'],
  ])('rejects %o', (options, message) => {
    const result = parseAdminOptions(options, noEnv);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain(message);
  });

  // `strapi admin:create-user` rejects these, so the CLI must reject them before the install.
  it.each(['a.@x.com', 'a@x..com', 'a@-x.com', 'a@x.com.', 'a@x.1com'])(
    'rejects %s like admin:create-user does',
    (adminEmail) => {
      const result = parseAdminOptions({ adminEmail, adminPassword: 'Secret123' }, noEnv);

      expect(result.ok === false && result.error).toContain('is not a valid email address');
    }
  );

  it('accepts a quoted local part like admin:create-user does', () => {
    const result = parseAdminOptions(
      { adminEmail: '"dev team"@example.com', adminPassword: 'Secret123' },
      noEnv
    );

    expect(result.ok).toBe(true);
  });
});

describe('getCreateAdminArgs', () => {
  const admin = { email: 'dev@example.com', password: 'Secret 123', firstname: 'Kai' };

  it.each([
    ['npm', 'npx'],
    ['yarn', 'yarn'],
    ['pnpm', 'pnpm'],
  ] as const)('runs the local strapi binary with %s', (packageManager, file) => {
    expect(getCreateAdminArgs(packageManager, admin)).toEqual({
      file,
      args: ['strapi', 'admin:create-user', '--firstname=Kai', '--email=dev@example.com'],
      env: { STRAPI_ADMIN_PASSWORD: 'Secret 123' },
    });
  });

  it('never puts the password in the arguments', () => {
    const { args } = getCreateAdminArgs('npm', admin);

    expect(args.join(' ')).not.toContain(admin.password);
  });
});

describe('getCreateAdminCommandTemplate', () => {
  it('shows every value as a quoted placeholder', () => {
    expect(getCreateAdminCommandTemplate('npm')).toBe(
      'npx strapi admin:create-user --firstname="<first name>" --email="<email>" --password="<password>"'
    );
  });

  it('fills in the email and first name, quoted for the shell, and keeps the password hidden', () => {
    expect(
      getCreateAdminCommandTemplate('yarn', { email: "o'neil@example.com", firstname: 'Kai Lee' })
    ).toBe(
      `yarn strapi admin:create-user --firstname='Kai Lee' --email='o'\\''neil@example.com' --password="<password>"`
    );
  });
});

describe('getFailureReason', () => {
  it('returns the error line, not the stack frames after it', () => {
    const output = [
      '[2026-11-25 10:00:00.000] debug: Making request for https://analytics.strapi.io',
      'Error: Could not load js config file /app/config/server.js',
      '    at loadJsFile (/app/node_modules/@strapi/core/dist/utils/load-config-file.js:18:24)',
      '    at Array.reduce (<anonymous>)',
      '',
    ].join('\n');

    expect(getFailureReason(output)).toBe(
      'Error: Could not load js config file /app/config/server.js'
    );
  });

  it('returns the admin:create-user message', () => {
    expect(getFailureReason('User with email "dev@example.com" already exists\n')).toBe(
      'User with email "dev@example.com" already exists'
    );
  });

  it('falls back to the last line, then to a default', () => {
    expect(getFailureReason('first\nlast\n')).toBe('last');
    expect(getFailureReason('')).toBe('unknown error');
  });
});

describe('createAdminUser', () => {
  const scope = { packageManager: 'npm' as const, rootPath: '/tmp/my-app' };
  const admin = { email: 'dev@example.com', password: 'Secret123', firstname: 'Kai' };

  it('runs admin:create-user in the project, with stdin closed and the password in env', async () => {
    const run = vi.fn().mockResolvedValue({});

    await expect(createAdminUser(scope, admin, run)).resolves.toEqual({ ok: true });

    expect(run).toHaveBeenCalledWith(
      'npx',
      ['strapi', 'admin:create-user', '--firstname=Kai', '--email=dev@example.com'],
      expect.objectContaining({
        cwd: '/tmp/my-app',
        stdin: 'ignore',
        env: { STRAPI_ADMIN_PASSWORD: 'Secret123' },
      })
    );
  });

  it('returns the reason from the child output when the command fails', async () => {
    const run = vi.fn().mockRejectedValue(
      Object.assign(new Error('Command failed: npx strapi admin:create-user'), {
        all: 'User with email "dev@example.com" already exists',
      })
    );

    await expect(createAdminUser(scope, admin, run)).resolves.toEqual({
      ok: false,
      reason: 'User with email "dev@example.com" already exists',
    });
  });
});
