import { action as mfaStateCommand } from '../mfa-state';

const SECRET = 'super-secret-totp-value-do-not-log';

const load = jest.fn(() => mock) as any;
const findOne = jest.fn();
const isEnrolled = jest.fn();
const countUnusedRecoveryCodes = jest.fn();
const config = jest.fn();
const isMfaRequiredFor = jest.fn(() => Promise.resolve(true));
const countLiveTrustedDevices = jest.fn(() => Promise.resolve(0));
const currentTotpStep = jest.fn(() => 0);

const mfaServiceInstance = {
  isEnrolled,
  countUnusedRecoveryCodes,
  config,
  isMfaRequiredFor,
  countLiveTrustedDevices,
  currentTotpStep,
};

// Mirrors the REAL registration shape (`packages/core/admin/server/src/services/index.ts`):
// `admin.services.mfa` is the raw, uninstantiated FACTORY function -- only the services registry
// ever calls it. A command that reads `app.admin.services.mfa.isEnrolled(...)` directly would be
// calling `.isEnrolled` on this function itself (undefined), not on the service.
const mfaFactory = jest.fn(() => mfaServiceInstance);

const admin = {
  services: {
    mfa: mfaFactory,
  },
};

const db = {
  query: jest.fn(() => ({ findOne })),
};

// Mirrors `Strapi.service(uid)` (`packages/core/core/src/Strapi.ts`): resolves the already
// instantiated service for a known uid, `undefined` for anything else. The command must go
// through this, never through `admin.services.mfa` directly.
const service = jest.fn((uid: string) => (uid === 'admin::mfa' ? mfaServiceInstance : undefined));

const mock = {
  load,
  admin,
  db,
  service,
};

jest.mock('@strapi/core', () => {
  const createStrapi: any = jest.fn(() => mock);
  const compileStrapi = jest.fn();

  return { createStrapi, compileStrapi };
});

describe('admin:mfa-state command', () => {
  beforeEach(() => {
    load.mockClear();
    findOne.mockClear();
    isEnrolled.mockClear();
    countUnusedRecoveryCodes.mockClear();
    config.mockClear();
    isMfaRequiredFor.mockClear();
    countLiveTrustedDevices.mockClear();
    currentTotpStep.mockClear();
    db.query.mockClear();
    mfaFactory.mockClear();
    service.mockClear();

    config.mockReturnValue({ recoveryCodeCount: 10 });
    countLiveTrustedDevices.mockResolvedValue(0);
  });

  test('exits non-zero when the email is unknown', async () => {
    const email = 'unknown@doe.com';
    findOne.mockResolvedValue(null);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(mfaStateCommand({ email })).rejects.toEqual(new Error('exit'));

    expect(consoleError).toHaveBeenCalledWith(`No admin user found for ${email}`);
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(service).not.toHaveBeenCalled();
    expect(isEnrolled).not.toHaveBeenCalled();

    mockExit.mockRestore();
    consoleError.mockRestore();
  });

  test('never selects or prints the secret', async () => {
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({
      id: 1,
      email,
      mfaEnabledAt: '2026-09-01T10:14:00.000Z',
      mfaGraceUntil: null,
      mfaLockedAt: null,
      // Seeded even though the command's own `select` should never ask for it -- if the
      // implementation ever widens that `select` or prints the raw row, this must be what
      // fails the test.
      mfaSecret: SECRET,
      mfaPendingSecret: SECRET,
    });
    isEnrolled.mockResolvedValue(true);
    countUnusedRecoveryCodes.mockResolvedValue(7);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await mfaStateCommand({ email });

    expect(service).toHaveBeenCalledWith('admin::mfa');
    expect(mfaFactory).not.toHaveBeenCalled();

    const findOneArg = findOne.mock.calls[0][0];
    expect(findOneArg.where).toEqual({ email });
    expect(findOneArg.select).not.toContain('mfaSecret');
    expect(findOneArg.select).not.toContain('mfaPendingSecret');

    for (const call of consoleLog.mock.calls) {
      for (const arg of call) {
        expect(String(arg)).not.toContain(SECRET);
      }
    }

    expect(mockExit).toHaveBeenCalledWith(0);

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('prints the enforcement state, and selects password only for the resolver', async () => {
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({
      id: 1,
      email,
      mfaEnabledAt: '2026-09-01T10:14:00.000Z',
      mfaGraceUntil: '2026-09-08T10:14:00.000Z',
      mfaLockedAt: '2026-09-09T10:14:00.000Z',
      password: 'hashed-password',
    });
    isEnrolled.mockResolvedValue(true);
    countUnusedRecoveryCodes.mockResolvedValue(7);
    isMfaRequiredFor.mockResolvedValue(true);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await mfaStateCommand({ email });

    const findOneArg = findOne.mock.calls[0][0];
    expect(findOneArg.select).toEqual(expect.arrayContaining(['mfaGraceUntil', 'mfaLockedAt']));
    expect(findOneArg.select).not.toContain('mfaSecret');
    expect(findOneArg.select).not.toContain('mfaPendingSecret');
    expect(findOneArg.populate).toEqual(['roles']);

    expect(isMfaRequiredFor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, password: 'hashed-password' })
    );
    expect(consoleLog).toHaveBeenCalledWith('required:          yes');
    expect(consoleLog).toHaveBeenCalledWith('grace until:       2026-09-08T10:14:00.000Z');
    expect(consoleLog).toHaveBeenCalledWith('locked at:         2026-09-09T10:14:00.000Z');

    for (const call of consoleLog.mock.calls) {
      for (const arg of call) {
        expect(String(arg)).not.toContain('hashed-password');
      }
    }

    expect(mockExit).toHaveBeenCalledWith(0);

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  // The step comes from the mfa service, which owns the TOTP implementation and the configured
  // step length; the command only prints it.
  test("prints the mfa service's current totp step", async () => {
    const email = 'kai@doe.com';

    findOne.mockResolvedValue({ id: 1, email, mfaEnabledAt: null });
    isEnrolled.mockResolvedValue(false);
    countUnusedRecoveryCodes.mockResolvedValue(10);
    currentTotpStep.mockReturnValue(59346643);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await mfaStateCommand({ email });

    expect(consoleLog).toHaveBeenCalledWith('current totp step: 59346643');

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  // A diagnostic writes nothing: `listTrustedDevices` would delete the expired rows it met.
  test('prints the number of live trusted devices without pruning any', async () => {
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({ id: 1, email, mfaEnabledAt: new Date('2026-01-01T00:00:00.000Z') });
    isEnrolled.mockResolvedValue(true);
    countUnusedRecoveryCodes.mockResolvedValue(10);
    countLiveTrustedDevices.mockResolvedValue(2);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await mfaStateCommand({ email });

    expect(countLiveTrustedDevices).toHaveBeenCalledWith('1');
    expect(consoleLog).toHaveBeenCalledWith('trusted devices:   2');

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  test('finds the user whatever the case of the typed email', async () => {
    findOne.mockResolvedValue(null);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(mfaStateCommand({ email: ' Kai@Doe.COM ' })).rejects.toThrow('exit');

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'kai@doe.com' } })
    );

    mockExit.mockRestore();
    consoleError.mockRestore();
  });
});
