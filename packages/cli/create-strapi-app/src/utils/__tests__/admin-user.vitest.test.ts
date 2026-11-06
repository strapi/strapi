import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import execa from 'execa';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  ADMIN_PASSWORD_ENV_VAR,
  ADMIN_TOKEN_OPTION,
  AdminUserInputError,
  CHILD_PASSWORD_ENV_VAR,
  CREDENTIALS_FILE,
  DEFAULT_ADMIN_EMAIL,
  createAdminUser,
  ensureCredentialsFileIgnored,
  generateAdminPassword,
  getAdminTokenSummary,
  getCredentialsFileSummary,
  getGeneratedPasswordSummary,
  getManualAdminCommand,
  parseAdminToken,
  resolveAdminUser,
  takeAdminPasswordFromEnv,
  validateEmail,
  validatePassword,
  writeCredentialsFile,
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

describe('generateAdminPassword', () => {
  it('generates 24 alphanumeric characters that pass the strength rules', () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generateAdminPassword();

      expect(password).toMatch(/^[a-zA-Z0-9]{24}$/);
      expect(validatePassword(password)).toBe(true);
    }
  });

  it('passes the strength rules at the minimum length', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(validatePassword(generateAdminPassword(8))).toBe(true);
    }
  });

  it('generates a different password each time', () => {
    const passwords = new Set(Array.from({ length: 100 }, () => generateAdminPassword()));

    expect(passwords.size).toBe(100);
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

    const adminUser = await resolveAdminUser({ prompts, canPrompt: true });

    expect(prompts.email).toHaveBeenCalled();
    expect(prompts.password).toHaveBeenCalled();
    expect(adminUser).toEqual({
      email: 'prompted@example.com',
      password: 'PromptedPass1',
      firstname: 'Admin',
      passwordGenerated: false,
    });
  });

  it('uses the default email and generates a strong password when it cannot prompt', async () => {
    const prompts = makePrompts();

    const adminUser = await resolveAdminUser({ prompts, canPrompt: false });

    expect(adminUser).toEqual({
      email: DEFAULT_ADMIN_EMAIL,
      password: expect.stringMatching(/^[a-zA-Z0-9]{24}$/),
      firstname: 'Admin',
      passwordGenerated: true,
    });
    expect(validatePassword(adminUser.password)).toBe(true);
    expect(prompts.email).not.toHaveBeenCalled();
    expect(prompts.password).not.toHaveBeenCalled();
  });

  it('fills only the missing value when it cannot prompt', async () => {
    const withEmail = await resolveAdminUser({
      prompts: makePrompts(),
      canPrompt: false,
      email: 'flag@example.com',
    });
    expect(withEmail).toMatchObject({ email: 'flag@example.com', passwordGenerated: true });
    expect(validatePassword(withEmail.password)).toBe(true);

    const withPassword = await resolveAdminUser({
      prompts: makePrompts(),
      canPrompt: false,
      envPassword: 'EnvPassword1',
    });
    expect(withPassword).toMatchObject({
      email: DEFAULT_ADMIN_EMAIL,
      password: 'EnvPassword1',
      passwordGenerated: false,
    });
  });

  it('prefers the flag and the environment variable over the prompts', async () => {
    const prompts = makePrompts();

    for (const canPrompt of [true, false]) {
      const adminUser = await resolveAdminUser({
        prompts,
        canPrompt,
        email: 'flag@example.com',
        envPassword: 'EnvPassword1',
      });

      expect(adminUser).toEqual({
        email: 'flag@example.com',
        password: 'EnvPassword1',
        firstname: 'Admin',
        passwordGenerated: false,
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
    });

    expect(prompts.email).not.toHaveBeenCalled();
    expect(prompts.password).toHaveBeenCalled();
    expect(adminUser?.email).toBe('flag@example.com');
  });

  it('rejects a weak password from the environment variable', async () => {
    await expect(
      resolveAdminUser({ prompts: makePrompts(), envPassword: 'password', canPrompt: false })
    ).rejects.toThrow(AdminUserInputError);
  });
});

describe('takeAdminPasswordFromEnv', () => {
  it('returns the password and removes it from the environment', () => {
    const env: NodeJS.ProcessEnv = { [ADMIN_PASSWORD_ENV_VAR]: 'EnvPassword1', OTHER: 'kept' };

    expect(takeAdminPasswordFromEnv(env)).toBe('EnvPassword1');
    expect(env).toEqual({ OTHER: 'kept' });
  });

  it('treats an empty value as absent', () => {
    expect(takeAdminPasswordFromEnv({ [ADMIN_PASSWORD_ENV_VAR]: '' })).toBeUndefined();
  });
});

describe('getGeneratedPasswordSummary', () => {
  it('names the email and the generated password', () => {
    const text = getGeneratedPasswordSummary({
      email: DEFAULT_ADMIN_EMAIL,
      password: 'Generated1Password',
      firstname: 'Admin',
      passwordGenerated: true,
    }).join('\n');

    expect(text).toContain(DEFAULT_ADMIN_EMAIL);
    expect(text).toContain('Generated1Password');
  });
});

describe('getManualAdminCommand', () => {
  it('adds the npm argument separator only for npm', () => {
    expect(getManualAdminCommand('npm')).toBe(
      'npm run strapi -- admin:create-user --with-admin-token'
    );
    expect(getManualAdminCommand('yarn')).toBe(
      'yarn run strapi admin:create-user --with-admin-token'
    );
    expect(getManualAdminCommand('pnpm')).toBe(
      'pnpm run strapi admin:create-user --with-admin-token'
    );
  });
});

describe('getManualAdminCommand with --no-admin-token', () => {
  it('leaves out --with-admin-token', () => {
    expect(getManualAdminCommand('npm', { withAdminToken: false })).toBe(
      'npm run strapi -- admin:create-user'
    );
  });
});

describe('credentials file', () => {
  let rootPath: string;

  beforeEach(() => {
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-credentials-'));
  });

  afterEach(() => {
    fs.rmSync(rootPath, { recursive: true, force: true });
  });

  it('writes the credentials with owner-only permissions', async () => {
    const filePath = await writeCredentialsFile(rootPath, {
      email: 'admin@example.com',
      password: 'Generated1',
      adminToken: 'ab12',
    });

    expect(filePath).toBe(path.join(rootPath, CREDENTIALS_FILE));
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toMatchObject({
      email: 'admin@example.com',
      password: 'Generated1',
      adminToken: 'ab12',
    });

    if (process.platform !== 'win32') {
      expect((fs.statSync(filePath).mode % 0o1000).toString(8)).toBe('600');
    }
  });

  it('restricts an existing file too', async () => {
    const filePath = path.join(rootPath, CREDENTIALS_FILE);
    fs.writeFileSync(filePath, '{}', { mode: 0o644 });

    await writeCredentialsFile(rootPath, { email: 'admin@example.com', adminToken: 'ab12' });

    if (process.platform !== 'win32') {
      expect((fs.statSync(filePath).mode % 0o1000).toString(8)).toBe('600');
    }
  });

  it('prints the path and never the secrets', () => {
    const text = getCredentialsFileSummary(`./app/${CREDENTIALS_FILE}`, {
      email: 'admin@example.com',
      password: 'Generated1',
      adminToken: 'ab12cd34',
    }).join('\n');

    expect(text).toContain(CREDENTIALS_FILE);
    expect(text).not.toContain('Generated1');
    expect(text).not.toContain('ab12cd34');
  });

  it('adds the file to an existing .gitignore once', async () => {
    const gitignorePath = path.join(rootPath, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules');

    await ensureCredentialsFileIgnored(rootPath);
    await ensureCredentialsFileIgnored(rootPath);

    expect(fs.readFileSync(gitignorePath, 'utf8')).toBe(`node_modules\n${CREDENTIALS_FILE}\n`);
  });

  it('does not create a .gitignore', async () => {
    await ensureCredentialsFileIgnored(rootPath);

    expect(fs.existsSync(path.join(rootPath, '.gitignore'))).toBe(false);
  });
});

describe('parseAdminToken', () => {
  const key = 'ab12'.repeat(64);

  it('reads the key from its own line among other output', () => {
    expect(
      parseAdminToken(`[info] Strapi loaded\nSuccessfully created new admin\nAdmin token: ${key}\n`)
    ).toBe(key);
  });

  it('returns undefined without a token line', () => {
    expect(parseAdminToken('Successfully created new admin\n')).toBeUndefined();
    expect(parseAdminToken('Admin token: not-hex\n')).toBeUndefined();
  });
});

describe('getAdminTokenSummary', () => {
  it('shows the token and how to use it', () => {
    const text = getAdminTokenSummary('ab12').join('\n');

    expect(text).toContain('ab12');
    expect(text).toContain('Authorization: Bearer');
  });
});

describe('createAdminUser', () => {
  const adminUser: AdminUser = {
    email: 'admin@example.com',
    password: 'Secret-Password1',
    firstname: 'Admin',
    passwordGenerated: false,
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

  it('sends a generated password like any other password', async () => {
    mockHelp(CHILD_PASSWORD_ENV_VAR);

    const generated = { ...adminUser, password: generateAdminPassword(), passwordGenerated: true };
    await createAdminUser({ rootPath: '/app', adminUser: generated });

    const createCall = mockedExeca.mock.calls.find(([, args]) => !args.includes('--help'));
    expect(createCall![1]).not.toContain('--allow-weak-password');
    expect(createCall![2].env[CHILD_PASSWORD_ENV_VAR]).toBe(generated.password);
  });

  it('requests the admin token and returns it from the piped output', async () => {
    const key = 'cd34'.repeat(64);

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) =>
      args.includes('--help')
        ? { stdout: `${CHILD_PASSWORD_ENV_VAR} ${ADMIN_TOKEN_OPTION}` }
        : { stdout: `Successfully created new admin\nAdmin token: ${key}\n` }
    );

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toEqual({ status: 'created', adminToken: key });

    const createCall = mockedExeca.mock.calls.find(([, args]) => !args.includes('--help'));
    expect(createCall![1]).toContain(ADMIN_TOKEN_OPTION);
    // The token must not reach the terminal before the summary
    expect(createCall![2].stdio[1]).toBe('pipe');
  });

  it('fails when the token line is missing from the output', async () => {
    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) =>
      args.includes('--help')
        ? { stdout: `${CHILD_PASSWORD_ENV_VAR} ${ADMIN_TOKEN_OPTION}` }
        : { stdout: 'Successfully created new admin\n' }
    );

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toMatchObject({ status: 'failed' });
  });

  it('does not request a token with --no-admin-token', async () => {
    mockHelp(`${CHILD_PASSWORD_ENV_VAR} ${ADMIN_TOKEN_OPTION}`);

    const result = await createAdminUser({ rootPath: '/app', adminUser, withAdminToken: false });

    expect(result).toEqual({ status: 'created' });

    const createCall = mockedExeca.mock.calls.find(([, args]) => !args.includes('--help'));
    expect(createCall![1]).not.toContain(ADMIN_TOKEN_OPTION);
  });

  it('creates the user without a token when Strapi has no --with-admin-token', async () => {
    mockHelp(CHILD_PASSWORD_ENV_VAR);

    const result = await createAdminUser({ rootPath: '/app', adminUser });

    expect(result).toEqual({ status: 'created' });

    const createCall = mockedExeca.mock.calls.find(([, args]) => !args.includes('--help'));
    expect(createCall![1]).not.toContain(ADMIN_TOKEN_OPTION);
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
