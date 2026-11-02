import inquirer from 'inquirer';
import { errors } from '@strapi/utils';
import { action as createAdminCommand } from '../create-user';

const roleId = 1;
const load = jest.fn(() => mock) as any;

const create = jest.fn();
const getSuperAdmin = jest.fn(() => Promise.resolve({ id: roleId }));
const exists = jest.fn();
const assertPasswordIsValid = jest.fn();

const admin = {
  services: {
    user: {
      assertPasswordIsValid,
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
    assertPasswordIsValid.mockReset();
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

    test('Rejects a password breaking the policy read from the loaded app', async () => {
      const email = 'email@email.fr';
      const password = '123';
      const firstname = 'John';
      const lastname = 'Doe';
      const message = 'Invalid password. The password must be at least 12 characters.';

      assertPasswordIsValid.mockRejectedValue(new errors.ValidationError(message));

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand({ email, password, firstname, lastname }).catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(load).toHaveBeenCalled();
      expect(assertPasswordIsValid).toHaveBeenCalledWith(password);
      expect(consoleError).toHaveBeenCalledWith(message);
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(create).not.toHaveBeenCalled();

      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Checks an empty password instead of treating it as absent', async () => {
      assertPasswordIsValid.mockRejectedValue(new errors.ValidationError('Invalid password.'));

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createAdminCommand({
        email: 'email@email.fr',
        password: '',
        firstname: 'John',
      }).catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(assertPasswordIsValid).toHaveBeenCalledWith('');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(create).not.toHaveBeenCalled();

      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Does not check the policy when no password is passed', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await createAdminCommand({ email: 'email@email.fr', firstname: 'John' });

      expect(assertPasswordIsValid).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalled();

      mockExit.mockRestore();
      consoleLog.mockRestore();
    });

    test('Does not swallow an unexpected error while checking the password', async () => {
      const failure = new Error('database unavailable');
      assertPasswordIsValid.mockRejectedValue(failure);

      await expect(
        createAdminCommand({ email: 'email@email.fr', password: 'abc', firstname: 'John' })
      ).rejects.toBe(failure);

      expect(create).not.toHaveBeenCalled();
    });
  });
});
