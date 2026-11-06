import inquirer from 'inquirer';
import type { Command } from 'commander';
import { action as createAdminCommand, command, PASSWORD_ENV_VAR } from '../create-user';

const roleId = 1;
const load = jest.fn(() => mock) as any;

const create = jest.fn();
const getSuperAdmin = jest.fn(() => Promise.resolve({ id: roleId }));
const exists = jest.fn();

const admin = {
  services: {
    user: {
      create,
      exists,
    },
    role: {
      getSuperAdmin,
    },
  },
};

const mock = {
  load,
  admin,
};

jest.mock('@strapi/core', () => {
  const createStrapi: any = jest.fn(() => mock);
  const compileStrapi = jest.fn();

  return { createStrapi, compileStrapi };
});

describe('admin:create command', () => {
  beforeEach(() => {
    load.mockClear();
    create.mockClear();
    getSuperAdmin.mockClear();
  });

  test('createAdminCommand accepts direct input', async () => {
    const email = 'email@email.fr';
    const password = 'testPasword1234';
    const firstname = 'John';
    const lastname = 'Doe';

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await createAdminCommand({ email, password, firstname, lastname });

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(getSuperAdmin).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ email, password, firstname, lastname })
    );

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  describe('Handles prompt input', () => {
    test('Only prompt on TTY', async () => {
      const tmpTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;

      // throw so the code will stop executing
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('First name is required');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();
      expect(getSuperAdmin).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();

      process.stdin.isTTY = tmpTTY;
      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Stops if not confirmed', async () => {
      process.stdin.isTTY = true;
      const email = 'email@email.fr';
      const password = 'testPasword1234';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: false,
      });

      // throw so the code will stop executing
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(mockInquiry).toHaveBeenLastCalledWith([
        expect.objectContaining({
          message: expect.any(String),
          name: 'email',
          type: 'input',
        }),
        expect.objectContaining({
          message: expect.any(String),
          name: 'password',
          type: 'password',
        }),
        expect.objectContaining({
          message: expect.any(String),
          name: 'firstname',
          type: 'input',
        }),
        expect.objectContaining({
          message: expect.any(String),
          name: 'lastname',
          type: 'input',
        }),
        expect.objectContaining({
          message: expect.any(String),
          name: 'confirm',
          type: 'confirm',
        }),
      ]);
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(load).not.toHaveBeenCalled();
      expect(getSuperAdmin).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();

      mockExit.mockRestore();
      mockInquiry.mockRestore();
    });

    test('Calls the create method with user input', async () => {
      const email = 'email@email.fr';
      const password = 'testPasword1234';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createAdminCommand();

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(consoleLog).toHaveBeenCalled();
      expect(load).toHaveBeenCalled();
      expect(getSuperAdmin).toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email, password, firstname, lastname })
      );

      mockInquiry.mockRestore();
      mockExit.mockRestore();
      consoleLog.mockRestore();
    });

    test('Creates registration token if password is not passed', async () => {
      const email = 'email@email.fr';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        firstname,
        lastname,
        confirm: true,
      });

      await createAdminCommand();

      expect(getSuperAdmin).toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          firstname,
          lastname,
        })
      );
      expect.not.objectContaining({ password: expect.any(String), registrationToken: null });

      mockInquiry.mockRestore();
      mockExit.mockRestore();
      consoleLog.mockRestore();
    });

    test('Sets registration token to null if password is passed', async () => {
      const email = 'email@email.fr';
      const password = 'testPasword1234';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      await createAdminCommand();

      expect(getSuperAdmin).toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email, password, firstname, lastname, registrationToken: null })
      );

      mockInquiry.mockRestore();
      mockExit.mockRestore();
      consoleLog.mockRestore();
    });

    test('Stops if the user already exists', async () => {
      exists.mockImplementation(() => Promise.resolve(true));

      const email = 'email@email.fr';
      const password = 'testPasword1234';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('User with email "email@email.fr" already exists');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(exists).toHaveBeenCalledWith(expect.objectContaining({ email }));
      expect(getSuperAdmin).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();

      exists.mockRestore();
      mockExit.mockRestore();
      mockInquiry.mockRestore();
      consoleError.mockRestore();
    });
  });

  describe('Password from the environment', () => {
    const originalEnv = process.env.STRAPI_CLI_ADMIN_PASSWORD;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.STRAPI_CLI_ADMIN_PASSWORD;
      } else {
        process.env.STRAPI_CLI_ADMIN_PASSWORD = originalEnv;
      }
    });

    test('Reads the password from STRAPI_CLI_ADMIN_PASSWORD when --password is absent', async () => {
      process.env.STRAPI_CLI_ADMIN_PASSWORD = 'envPassword1234';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createAdminCommand({ email: 'email@email.fr', firstname: 'John' });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'envPassword1234', registrationToken: null })
      );

      mockExit.mockRestore();
      consoleLog.mockRestore();
    });

    test('Prefers --password over STRAPI_CLI_ADMIN_PASSWORD', async () => {
      process.env.STRAPI_CLI_ADMIN_PASSWORD = 'envPassword1234';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createAdminCommand({
        email: 'email@email.fr',
        firstname: 'John',
        password: 'flagPassword1234',
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'flagPassword1234' })
      );

      mockExit.mockRestore();
      consoleLog.mockRestore();
    });
    test('Still prompts on a TTY when only STRAPI_CLI_ADMIN_PASSWORD is set', async () => {
      process.env.STRAPI_CLI_ADMIN_PASSWORD = 'envPassword1234';
      const tmpTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email: 'email@email.fr',
        password: 'promptPassword1234',
        firstname: 'John',
        lastname: 'Doe',
        confirm: true,
      });

      await createAdminCommand();

      expect(mockInquiry).toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'promptPassword1234' })
      );

      process.stdin.isTTY = tmpTTY;
      mockExit.mockRestore();
      consoleLog.mockRestore();
      mockInquiry.mockRestore();
    });

    // create-strapi-app duplicates the name and searches for it in the help output
    test('Keeps the variable name that create-strapi-app expects in the help output', () => {
      expect(PASSWORD_ENV_VAR).toBe('STRAPI_CLI_ADMIN_PASSWORD');
      const cmd = command({} as Parameters<typeof command>[0]) as Command;

      expect(cmd.helpInformation()).toContain(PASSWORD_ENV_VAR);
    });
  });

  describe('Password strength', () => {
    test('Rejects a weak password by default', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand({
        email: 'email@email.fr',
        firstname: 'John',
        password: 'password',
      }).catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Password must contain at least one uppercase character');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(create).not.toHaveBeenCalled();

      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Rejects a password over 72 bytes', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand({
        email: 'email@email.fr',
        firstname: 'John',
        password: `Aa1${'é'.repeat(35)}`,
      }).catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Password must be at most 72 bytes long');
      expect(create).not.toHaveBeenCalled();

      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Rejects an unknown --allow-weak-password option', () => {
      const cmd = command({} as Parameters<typeof command>[0]) as Command;

      cmd.exitOverride().configureOutput({ writeErr() {} });

      expect(() => cmd.parse(['--allow-weak-password'], { from: 'user' })).toThrow();
    });
  });

  describe('Validation', () => {
    test('Handles invalid email', async () => {
      const email = 'email.@email.fr';
      const password = 'testPasword1234';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Invalid email address');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();

      exists.mockRestore();
      mockExit.mockRestore();
      mockInquiry.mockRestore();
      consoleError.mockRestore();
    });

    test('Handles short passwords', async () => {
      const email = 'email.@email.fr';
      const password = '123';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockReturnValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      } as any);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Password must be at least 8 characters long');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();

      exists.mockRestore();
      mockExit.mockRestore();
      mockInquiry.mockRestore();
      consoleError.mockRestore();
    });

    test('Handles passwords without lowercase characters', async () => {
      const email = 'email.@email.fr';
      const password = '12345678';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Password must contain at least one lowercase character');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();

      exists.mockRestore();
      mockExit.mockRestore();
      mockInquiry.mockRestore();
      consoleError.mockRestore();
    });

    test('Handles passwords without uppercase characters', async () => {
      const email = 'email.@email.fr';
      const password = '1234567a';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Password must contain at least one uppercase character');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();

      exists.mockRestore();
      mockExit.mockRestore();
      mockInquiry.mockRestore();
      consoleError.mockRestore();
    });

    test('Handles passwords without number', async () => {
      const email = 'email.@email.fr';
      const password = 'abcdefgH';
      const firstname = 'John';
      const lastname = 'Doe';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Password must contain at least one number');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();

      exists.mockRestore();
      mockExit.mockRestore();
      mockInquiry.mockRestore();
      consoleError.mockRestore();
    });
  });
});
