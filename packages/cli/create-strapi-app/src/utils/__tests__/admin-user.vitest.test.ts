import execa from 'execa';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  ADMIN_PASSWORD_ENV_VAR,
  AdminUserInputError,
  CHILD_PASSWORD_ENV_VAR,
  createAdminUser,
  getManualAdminCommand,
  resolveAdminUser,
  validateEmail,
  validatePassword,
} from '../admin-user';
import type { AdminUser } from '../admin-user';

vi.mock('execa', () => ({ default: vi.fn() }));

const mockedExeca = execa as unknown as Mock;

const makePrompts = () => ({
  email: vi.fn().mockResolvedValue('Prompted@Example.com'),
  password: vi.fn().mockResolvedValue('PromptedPass1'),
});

describe('validatePassword', () => {
  it.each([
    ['Short1', 'Password must be at least 8 characters long'],
    ['12345678', 'Password must contain at least one lowercase character'],
    ['password1', 'Password must contain at least one uppercase character'],
    ['Password', 'Password must contain at least one number'],
  ])('rejects %s', (password, message) => {
    expect(validatePassword(password)).toBe(message);
  });

  it('accepts a strong password', () => {
    expect(validatePassword('Password1')).toBe(true);
  });

  it('rejects a password over 72 bytes', () => {
    expect(validatePassword(`Aa1${'é'.repeat(35)}`)).toBe('Password must be at most 72 bytes long');
    expect(validatePassword(`Aa1${'b'.repeat(69)}`)).toBe(true);
  });
});

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail(' Admin@Example.com ')).toBe(true);
  });

  it.each([
    '',
    'admin',
    'admin@',
    'admin@example',
    'a b@example.com',
    'email.@email.fr',
    '.email@email.fr',
    'em..ail@email.fr',
    'email@-email.fr',
  ])('rejects %j', (email) => {
    expect(validateEmail(email)).toBe('Invalid email address');
  });
});

describe('resolveAdminUser', () => {
  it('prompts for the email and the password when it can prompt', async () => {
    const prompts = makePrompts();

    const adminUser = await resolveAdminUser({ prompts, env: {}, canPrompt: true });

    expect(prompts.email).toHaveBeenCalled();
    expect(prompts.password).toHaveBeenCalled();
    expect(adminUser).toEqual({
      email: 'prompted@example.com',
      password: 'PromptedPass1',
      firstname: 'Admin',
    });
  });

  it('skips the admin user when it cannot prompt and has no input', async () => {
    const prompts = makePrompts();

    const adminUser = await resolveAdminUser({ prompts, env: {}, canPrompt: false });

    expect(adminUser).toBeUndefined();
    expect(prompts.email).not.toHaveBeenCalled();
    expect(prompts.password).not.toHaveBeenCalled();
  });

  it('prefers the flag and the environment variable over the prompts', async () => {
    const prompts = makePrompts();

    for (const canPrompt of [true, false]) {
      const adminUser = await resolveAdminUser({
        prompts,
        canPrompt,
        email: 'flag@example.com',
        env: { [ADMIN_PASSWORD_ENV_VAR]: 'EnvPassword1' },
      });

      expect(adminUser).toEqual({
        email: 'flag@example.com',
        password: 'EnvPassword1',
        firstname: 'Admin',
      });
    }

    expect(prompts.email).not.toHaveBeenCalled();
    expect(prompts.password).not.toHaveBeenCalled();
  });

  it('prompts only for the missing value', async () => {
    const prompts = makePrompts();

    const adminUser = await resolveAdminUser({
      prompts,
      canPrompt: true,
      email: 'flag@example.com',
      env: {},
    });

    expect(prompts.email).not.toHaveBeenCalled();
    expect(prompts.password).toHaveBeenCalled();
    expect(adminUser?.email).toBe('flag@example.com');
  });

  it.each([
    [{ email: 'flag@example.com', env: {} }],
    [{ env: { [ADMIN_PASSWORD_ENV_VAR]: 'EnvPassword1' } }],
  ])('rejects partial input when it cannot prompt', async (input) => {
    await expect(
      resolveAdminUser({ prompts: makePrompts(), canPrompt: false, ...input })
    ).rejects.toBeInstanceOf(AdminUserInputError);
  });

  it('rejects a weak password from the environment variable', async () => {
    await expect(
      resolveAdminUser({
        prompts: makePrompts(),
        env: { [ADMIN_PASSWORD_ENV_VAR]: 'password' },
        canPrompt: true,
      })
    ).rejects.toThrow('Password must contain at least one uppercase character');
  });
});

describe('getManualAdminCommand', () => {
  it('adds the npm argument separator only for npm', () => {
    expect(getManualAdminCommand('npm')).toBe('npm run strapi -- admin:create-user');
    expect(getManualAdminCommand('yarn')).toBe('yarn run strapi admin:create-user');
    expect(getManualAdminCommand('pnpm')).toBe('pnpm run strapi admin:create-user');
  });
});

describe('createAdminUser', () => {
  const adminUser: AdminUser = {
    email: 'admin@example.com',
    password: 'Secret-Password1',
    firstname: 'Admin',
  };

  beforeEach(() => {
    mockedExeca.mockReset();
  });

  const mockHelp = (stdout: string) => {
    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) =>
      args.includes('--help') ? { stdout } : { stdout: '' }
    );
  };

  it('sends the password through the environment, never through the arguments', async () => {
    mockHelp(`-p, --password <password>  Password (or set ${CHILD_PASSWORD_ENV_VAR})`);

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toEqual({ status: 'created' });

    const createCall = mockedExeca.mock.calls.find(([, args]) => !args.includes('--help'));
    expect(createCall).toBeDefined();

    const [command, args, options] = createCall!;
    expect(command).toBe('strapi');
    expect(args).toEqual([
      'admin:create-user',
      '--email',
      'admin@example.com',
      '--firstname',
      'Admin',
    ]);
    expect(JSON.stringify(args)).not.toContain(adminUser.password);
    expect(options.env[CHILD_PASSWORD_ENV_VAR]).toBe(adminUser.password);
    expect(options.cwd).toBe('/app');
  });

  it('reports an older Strapi version without running it interactively', async () => {
    mockHelp('-p, --password <password>  Password of the new admin');

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toEqual({ status: 'unsupported' });
    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it('reports a failure of the --help command as a failure', async () => {
    mockedExeca.mockRejectedValue(
      Object.assign(new Error('Command failed'), { stderr: 'Cannot find module' })
    );

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toEqual({ status: 'failed', error: 'Cannot find module' });
    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it('returns the error output when the command fails', async () => {
    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args.includes('--help')) {
        return { stdout: CHILD_PASSWORD_ENV_VAR };
      }

      throw Object.assign(new Error('Command failed'), { stderr: 'connect ECONNREFUSED' });
    });

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toEqual({ status: 'failed', error: 'connect ECONNREFUSED' });
  });
});
