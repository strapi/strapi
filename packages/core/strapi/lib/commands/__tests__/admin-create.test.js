'use strict';

const roleId = 1;
const load = jest.fn(() => mock);

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

jest.mock('../../index', () => {
  const impl = jest.fn(() => mock);

  impl.compile = jest.fn();

  return impl;
});

const inquirer = require('inquirer');
const createAdminCommand = require('../admin-create');

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

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: false,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
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

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockImplementationOnce(async () => ({
        email,
        password,
        firstname,
        lastname,
        confirm: true,
      }));

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
