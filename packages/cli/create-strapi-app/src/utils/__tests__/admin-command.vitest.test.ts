import { describe, expect, it } from 'vitest';

import {
  getCreateAdminArgs,
  getCreateAdminCommandTemplate,
  parseAdminOptions,
} from '../admin-command';

describe('parseAdminOptions', () => {
  it('returns no admin when no admin flag is passed', () => {
    expect(parseAdminOptions({})).toEqual({ ok: true, admin: null });
  });

  it('returns the admin, with a default first name and a lowercase email', () => {
    expect(
      parseAdminOptions({ adminEmail: 'Dev@Example.com', adminPassword: 'Secret123' })
    ).toEqual({
      ok: true,
      admin: { email: 'dev@example.com', password: 'Secret123', firstname: 'Admin' },
    });
  });

  it('keeps the first name when it is passed', () => {
    const result = parseAdminOptions({
      adminEmail: 'dev@example.com',
      adminPassword: 'Secret123',
      adminFirstname: 'Kai',
    });

    expect(result).toEqual({
      ok: true,
      admin: { email: 'dev@example.com', password: 'Secret123', firstname: 'Kai' },
    });
  });

  it.each([
    [{ adminEmail: 'dev@example.com' }, '--admin-email needs --admin-password'],
    [{ adminPassword: 'Secret123' }, '--admin-password needs --admin-email'],
    [{ adminFirstname: 'Kai' }, '--admin-firstname needs --admin-email and --admin-password'],
    [{ adminEmail: 'not-an-email', adminPassword: 'Secret123' }, 'is not a valid email address'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'Sec1' }, 'at least 8 characters'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'SECRET123' }, 'lowercase'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'secret123' }, 'uppercase'],
    [{ adminEmail: 'dev@example.com', adminPassword: 'SecretPass' }, 'number'],
  ])('rejects %o', (options, message) => {
    const result = parseAdminOptions(options);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain(message);
  });
});

describe('getCreateAdminArgs', () => {
  const admin = { email: 'dev@example.com', password: 'Secret 123', firstname: 'Kai' };

  it.each([
    ['npm', 'npx', ['strapi']],
    ['yarn', 'yarn', ['strapi']],
    ['pnpm', 'pnpm', ['strapi']],
  ] as const)('runs the local strapi binary with %s', (packageManager, file, binArgs) => {
    expect(getCreateAdminArgs(packageManager, admin)).toEqual({
      file,
      args: [
        ...binArgs,
        'admin:create-user',
        '--firstname=Kai',
        '--email=dev@example.com',
        // one argument each, so a space in a value needs no shell quoting
        '--password=Secret 123',
      ],
    });
  });
});

describe('getCreateAdminCommandTemplate', () => {
  it('shows every value as a quoted placeholder', () => {
    expect(getCreateAdminCommandTemplate('npm')).toBe(
      'npx strapi admin:create-user --firstname="<first name>" --email="<email>" --password="<password>"'
    );
  });
});
