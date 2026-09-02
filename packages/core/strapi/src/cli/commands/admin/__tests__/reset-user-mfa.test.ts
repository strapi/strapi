import inquirer from 'inquirer';
import { action as resetUserMfaCommand } from '../reset-user-mfa';

const load = jest.fn(() => mock) as any;
const findOne = jest.fn();
const disable = jest.fn();
const recordEvent = jest.fn();
const notify = jest.fn();
const invalidateRefreshToken = jest.fn();
const sessionManager = jest.fn(() => ({ invalidateRefreshToken }));

const admin = {
  services: {
    mfa: {
      disable,
      recordEvent,
      notify,
    },
  },
};

const db = {
  query: jest.fn(() => ({ findOne })),
};

const mock = {
  load,
  admin,
  db,
  sessionManager,
};

jest.mock('@strapi/core', () => {
  const createStrapi: any = jest.fn(() => mock);
  const compileStrapi = jest.fn();

  return { createStrapi, compileStrapi };
});

describe('admin:reset-user-mfa command', () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    load.mockClear();
    findOne.mockClear();
    disable.mockClear();
    recordEvent.mockClear();
    notify.mockClear();
    invalidateRefreshToken.mockClear();
    sessionManager.mockClear();
    db.query.mockClear();
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
  });

  test('clears enrolment for the given email', async () => {
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({ id: 1, email });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await resetUserMfaCommand({ email });

    expect(load).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith('admin::user');
    expect(findOne).toHaveBeenCalledWith({ where: { email } });
    expect(disable).toHaveBeenCalledWith('1');
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('invalidates the user sessions as well', async () => {
    // otherwise an attacker holding a live session survives the reset meant to evict them
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({ id: 1, email });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await resetUserMfaCommand({ email });

    expect(sessionManager).toHaveBeenCalledWith('admin');
    expect(invalidateRefreshToken).toHaveBeenCalledWith('1');

    // Ordering matters: a failing event write must never leave an attacker's session alive, so
    // sessions are evicted before the reset is recorded and notified.
    const disableOrder = disable.mock.invocationCallOrder[0];
    const evictOrder = invalidateRefreshToken.mock.invocationCallOrder[0];
    const recordOrder = recordEvent.mock.invocationCallOrder[0];
    const notifyOrder = notify.mock.invocationCallOrder[0];

    expect(disableOrder).toBeLessThan(evictOrder);
    expect(evictOrder).toBeLessThan(recordOrder);
    expect(recordOrder).toBeLessThan(notifyOrder);

    expect(recordEvent).toHaveBeenCalledWith('1', 'reset', { via: 'cli' });
    expect(notify).toHaveBeenCalledWith('1', 'reset');

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('exits non-zero when the email is unknown', async () => {
    const email = 'unknown@doe.com';
    findOne.mockResolvedValue(null);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await resetUserMfaCommand({ email }).catch((err) => {
      expect(err).toEqual(new Error('exit'));
    });

    expect(consoleError).toHaveBeenCalledWith(`No admin user found for ${email}`);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(disable).not.toHaveBeenCalled();
    expect(invalidateRefreshToken).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();

    mockExit.mockRestore();
    consoleError.mockRestore();
  });

  test('requires confirmation when run interactively', async () => {
    process.stdin.isTTY = true;
    const email = 'kai@doe.com';

    const mockInquiry = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
      email,
      confirm: false,
    });

    // throw so the code will stop executing, same as declining the prompt does in production
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await resetUserMfaCommand().catch((err) => {
      expect(err).toEqual(new Error('exit'));
    });

    expect(mockInquiry).toHaveBeenLastCalledWith([
      expect.objectContaining({
        message: expect.any(String),
        name: 'email',
        type: 'input',
      }),
      expect.objectContaining({
        message: "Do you really want to reset this user's two-factor authentication?",
        name: 'confirm',
        type: 'confirm',
      }),
    ]);
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(load).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
    expect(invalidateRefreshToken).not.toHaveBeenCalled();

    mockInquiry.mockRestore();
    mockExit.mockRestore();
  });
});
