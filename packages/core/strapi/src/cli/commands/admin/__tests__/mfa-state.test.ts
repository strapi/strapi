import { action as mfaStateCommand } from '../mfa-state';

const SECRET = 'super-secret-totp-value-do-not-log';

const load = jest.fn(() => mock) as any;
const findOne = jest.fn();
const isEnrolled = jest.fn();
const countUnusedRecoveryCodes = jest.fn();
const config = jest.fn();
const isMfaRequiredFor = jest.fn(() => Promise.resolve(true));

const mfaServiceInstance = {
  isEnrolled,
  countUnusedRecoveryCodes,
  config,
  isMfaRequiredFor,
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
    db.query.mockClear();
    mfaFactory.mockClear();
    service.mockClear();

    config.mockReturnValue({ recoveryCodeCount: 10, step: 30 });
  });

  test('exits non-zero when the email is unknown', async () => {
    const email = 'unknown@doe.com';
    findOne.mockResolvedValue(null);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await mfaStateCommand({ email }).catch((err) => {
      expect(err).toEqual(new Error('exit'));
    });

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

  test('current totp step line matches currentTotpStep for the configured step', async () => {
    const email = 'kai@doe.com';
    const step = 30;
    const frozenNow = new Date('2026-09-01T11:02:10.000Z').getTime();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(frozenNow);

    findOne.mockResolvedValue({ id: 1, email, mfaEnabledAt: null });
    isEnrolled.mockResolvedValue(false);
    countUnusedRecoveryCodes.mockResolvedValue(10);
    config.mockReturnValue({ recoveryCodeCount: 10, step });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await mfaStateCommand({ email });

    // Same computation the command itself must use, `currentTotpStep`'s own formula, at the
    // same frozen clock -- not a hardcoded number the implementation could happen to also print.
    const expectedStep = Math.floor(frozenNow / 1000 / step);

    expect(consoleLog).toHaveBeenCalledWith(`current totp step: ${expectedStep}`);

    dateSpy.mockRestore();
    mockExit.mockRestore();
    consoleLog.mockRestore();
  });
});
