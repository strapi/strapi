import inquirer from 'inquirer';
import { action as deleteUserCommand } from '../delete-user';

const load = jest.fn(() => mock) as any;
const findOneByEmail = jest.fn();
const deleteById = jest.fn();

const admin = {
  services: {
    user: {
      findOneByEmail,
      deleteById,
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

describe('admin:delete-user command', () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    load.mockClear();
    findOneByEmail.mockClear();
    deleteById.mockClear();
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
  });

  test('accepts direct input and deletes the user', async () => {
    const email = 'email@email.fr';
    findOneByEmail.mockResolvedValue({ id: 1, email });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await deleteUserCommand({ email });

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalledWith('Successfully deleted admin');
    expect(load).toHaveBeenCalled();
    expect(findOneByEmail).toHaveBeenCalledWith(email);
    expect(deleteById).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('exits with error when user not found', async () => {
    const email = 'notfound@email.fr';
    findOneByEmail.mockResolvedValue(null);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await deleteUserCommand({ email }).catch((err) => {
      expect(err).toEqual(new Error('exit'));
    });

    expect(consoleError).toBeCalledWith(`User with email "${email}" does not exist`);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(deleteById).not.toHaveBeenCalled();

    mockExit.mockRestore();
    consoleError.mockRestore();
  });

  describe('Handles prompt input', () => {
    test('Only prompt on TTY', async () => {
      const tmpTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await deleteUserCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Missing required option `email`');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(deleteById).not.toHaveBeenCalled();

      process.stdin.isTTY = tmpTTY;
      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Stops if not confirmed', async () => {
      process.stdin.isTTY = true;
      const email = 'email@email.fr';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        confirm: false,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await deleteUserCommand().catch((err) => {
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
          name: 'confirm',
          type: 'confirm',
        }),
      ]);
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(load).not.toHaveBeenCalled();
      expect(deleteById).not.toHaveBeenCalled();

      mockExit.mockRestore();
      mockInquiry.mockRestore();
    });

    test('Calls the delete method with user input', async () => {
      process.stdin.isTTY = true;
      const email = 'email@email.fr';
      findOneByEmail.mockResolvedValue({ id: 1, email });

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await deleteUserCommand();

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(consoleLog).toHaveBeenCalled();
      expect(load).toHaveBeenCalled();
      expect(deleteById).toHaveBeenCalledWith(1);

      mockInquiry.mockRestore();
      mockExit.mockRestore();
      consoleLog.mockRestore();
    });
  });

  describe('Validation', () => {
    test('Handles invalid email', async () => {
      const email = 'invalid-email';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await deleteUserCommand({ email }).catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Invalid email address');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();

      mockExit.mockRestore();
      consoleError.mockRestore();
    });
  });
});
