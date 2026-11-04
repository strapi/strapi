import { action as unlockUserMfaCommand } from '../unlock-user-mfa';

const load = jest.fn(() => mock) as any;
const findOneByEmail = jest.fn();
const unlock = jest.fn();

const mfaServiceInstance = {
  unlock,
};

// The raw, uninstantiated factory, exactly as `services/index.ts` registers it. See
// `mfa-state.test.ts` for why a command must never reach it directly.
const mfaFactory = jest.fn(() => mfaServiceInstance);

const admin = {
  services: {
    mfa: mfaFactory,
    user: { findOneByEmail },
  },
};

// `Strapi.service(uid)`'s behaviour, the only way a command may reach the service.
const service = jest.fn((uid: string) => (uid === 'admin::mfa' ? mfaServiceInstance : undefined));

const mock = {
  load,
  admin,
  service,
};

jest.mock('@strapi/core', () => {
  const createStrapi: any = jest.fn(() => mock);
  const compileStrapi = jest.fn();

  return { createStrapi, compileStrapi };
});

describe('admin:unlock-user-mfa command', () => {
  beforeEach(() => {
    load.mockClear();
    findOneByEmail.mockClear();
    unlock.mockClear();
    mfaFactory.mockClear();
    service.mockClear();
  });

  test('unlocks the account and exits 0', async () => {
    const email = 'kai@doe.com';
    findOneByEmail.mockResolvedValue({ id: 1, email, mfaLockedAt: '2026-09-01T10:14:00.000Z' });
    unlock.mockResolvedValue(true);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await unlockUserMfaCommand({ email });

    expect(load).toHaveBeenCalled();
    expect(service).toHaveBeenCalledWith('admin::mfa');
    expect(mfaFactory).not.toHaveBeenCalled();
    expect(unlock).toHaveBeenCalledWith('1', { via: 'cli' });
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('looks the email up through the user service, which matches any case', async () => {
    findOneByEmail.mockResolvedValue({ id: 1, email: 'kai@doe.com' });
    unlock.mockResolvedValue(true);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await unlockUserMfaCommand({ email: 'KAI@doe.com' });

    expect(findOneByEmail).toHaveBeenCalledWith('KAI@doe.com');

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('exits non-zero when the account was not locked', async () => {
    const email = 'kai@doe.com';
    findOneByEmail.mockResolvedValue({ id: 1, email, mfaLockedAt: null });
    unlock.mockResolvedValue(false);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(unlockUserMfaCommand({ email })).rejects.toEqual(new Error('exit'));

    expect(unlock).toHaveBeenCalledWith('1', { via: 'cli' });
    expect(consoleError).toHaveBeenCalledWith(
      `${email} is not locked by two-factor enforcement. Nothing to do.`
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    consoleError.mockRestore();
  });

  test('exits non-zero when the email is unknown', async () => {
    const email = 'unknown@doe.com';
    findOneByEmail.mockResolvedValue(null);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(unlockUserMfaCommand({ email })).rejects.toEqual(new Error('exit'));

    expect(consoleError).toHaveBeenCalledWith(`No admin user found for ${email}`);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(service).not.toHaveBeenCalled();
    expect(unlock).not.toHaveBeenCalled();

    mockExit.mockRestore();
    consoleError.mockRestore();
  });
});
