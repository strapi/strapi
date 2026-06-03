import inquirer from 'inquirer';
import { action as blockUserCommand } from '../block-user';

const load = jest.fn(() => mock) as any;
const findOneByEmail = jest.fn();
const updateById = jest.fn();

const admin = {
  services: {
    user: {
      findOneByEmail,
      updateById,
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

describe('admin:block-user command', () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    load.mockClear();
    findOneByEmail.mockClear();
    updateById.mockClear();
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
  });

  test('accepts direct input and sets blocked to true', async () => {
    const email = 'email@email.fr';
    const block = 'true';
    findOneByEmail.mockResolvedValue({ id: 1, email });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await blockUserCommand({ email, block });

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(findOneByEmail).toHaveBeenCalledWith(email);
    expect(updateById).toHaveBeenCalledWith(1, { blocked: true });
    expect(typeof updateById.mock.calls[0][1].blocked).toBe('boolean');

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('accepts direct input and sets blocked to false', async () => {
    const email = 'email@email.fr';
    const block = 'false';
    findOneByEmail.mockResolvedValue({ id: 1, email });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await blockUserCommand({ email, block });

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(updateById).toHaveBeenCalledWith(1, { blocked: false });
    expect(typeof updateById.mock.calls[0][1].blocked).toBe('boolean');

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('exits with error for invalid block status', async () => {
    const email = 'email@email.fr';
    const block = 'invalid';

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await blockUserCommand({ email, block }).catch((err) => {
      expect(err).toEqual(new Error('exit'));
    });

    expect(consoleError).toBeCalledWith('Invalid block status. Use "true" or "false".');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(updateById).not.toHaveBeenCalled();

    mockExit.mockRestore();
    consoleError.mockRestore();
  });

  test('exits with error when user not found', async () => {
    const email = 'notfound@email.fr';
    const block = 'true';
    findOneByEmail.mockResolvedValue(null);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await blockUserCommand({ email, block }).catch((err) => {
      expect(err).toEqual(new Error('exit'));
    });

    expect(consoleError).toBeCalledWith(`User with email "${email}" does not exist`);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(updateById).not.toHaveBeenCalled();

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

      await blockUserCommand().catch((err) => {
        expect(err).toEqual(new Error('exit'));
      });

      expect(consoleError).toBeCalledWith('Missing required options `email` or `block`');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(load).not.toHaveBeenCalled();
      expect(updateById).not.toHaveBeenCalled();

      process.stdin.isTTY = tmpTTY;
      mockExit.mockRestore();
      consoleError.mockRestore();
    });

    test('Calls the update method with user input from prompt', async () => {
      process.stdin.isTTY = true;
      const email = 'email@email.fr';
      const block = 'true';
      findOneByEmail.mockResolvedValue({ id: 1, email });

      const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
        email,
        block,
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await blockUserCommand();

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(consoleLog).toHaveBeenCalled();
      expect(load).toHaveBeenCalled();
      expect(updateById).toHaveBeenCalledWith(1, { blocked: true });

      mockInquiry.mockRestore();
      mockExit.mockRestore();
      consoleLog.mockRestore();
    });
  });
});
