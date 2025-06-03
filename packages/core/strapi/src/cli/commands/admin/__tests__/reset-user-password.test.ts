import inquirer from 'inquirer';
import { action as resetAdminPasswordCommand } from '../reset-user-password';

const load = jest.fn(() => mock) as any;
const resetPasswordByEmail = jest.fn();
const admin = {
  services: {
    user: {
      resetPasswordByEmail,
    },
  },
};

const mock = {
  load,
  admin,
};

jest.mock('@strapi/core', () => {
  const createStrapi = jest.fn(() => mock);

  const compileStrapi = jest.fn();

  return { createStrapi, compileStrapi };
});

describe('admin:reset-password command', () => {
  beforeEach(() => {
    load.mockClear();
    resetPasswordByEmail.mockClear();
  });

  test('resetAdminPasswordCommand accepts direct input', async () => {
    const email = 'email@email.fr';
    const password = 'testPasword1234';

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await resetAdminPasswordCommand({ email, password });

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(resetPasswordByEmail).toHaveBeenCalledWith(email, password);

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

      await resetAdminPasswordCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Missing required options `email` or `password`');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();
      expect(resetPasswordByEmail).not.toHaveBeenCalled();

      process.stdin.isTTY = tmpTTY;
      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Stops if not confirmed', async () => {
      process.stdin.isTTY = true;
      const email = 'email@email.fr';
      const password = 'testPasword1234';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        confirm: false,
      });

      // throw so the code will stop executing
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await resetAdminPasswordCommand().catch((err) => {
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
          name: 'confirm',
          type: 'confirm',
        }),
      ]);
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(load).not.toHaveBeenCalled();
      expect(resetPasswordByEmail).not.toHaveBeenCalled();

      mockExit.mockRestore();
      mockInquiry.mockRestore();
    });

    test('Calls the reset method with user input', async () => {
      const email = 'email@email.fr';
      const password = 'testPasword1234';

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        password,
        confirm: true,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await resetAdminPasswordCommand();

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(consoleLog).toHaveBeenCalled();
      expect(load).toHaveBeenCalled();
      expect(resetPasswordByEmail).toHaveBeenCalledWith(email, password);

      mockInquiry.mockRestore();
      mockExit.mockRestore();
      consoleLog.mockRestore();
    });
  });
});
