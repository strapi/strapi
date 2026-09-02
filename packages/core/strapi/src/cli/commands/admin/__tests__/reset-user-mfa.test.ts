import inquirer from 'inquirer';
import { action as resetUserMfaCommand } from '../reset-user-mfa';

const load = jest.fn(() => mock) as any;
const findOne = jest.fn();
const disable = jest.fn();
const recordEvent = jest.fn();
const notify = jest.fn();
const invalidateRefreshToken = jest.fn();
const sessionManager = jest.fn(() => ({ invalidateRefreshToken }));

const mfaServiceInstance = {
  disable,
  recordEvent,
  notify,
};

// Mirrors the REAL registration shape (`packages/core/admin/server/src/services/index.ts`):
// `admin.services.mfa` is the raw, uninstantiated FACTORY function -- only the services registry
// ever calls it. A command that reads `app.admin.services.mfa.disable(...)` directly would be
// calling `.disable` on this function itself (undefined), not on the service.
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
  sessionManager,
  service,
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
    mfaFactory.mockClear();
    service.mockClear();
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
    expect(service).toHaveBeenCalledWith('admin::mfa');
    expect(mfaFactory).not.toHaveBeenCalled();
    expect(disable).toHaveBeenCalledWith('1');
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  // F6: `notify` emits the eventHub event synchronously then starts the email send. The command
  // used to call `notify(...)` and immediately `process.exit(0)` without waiting for it, so the
  // process could tear down before the detached email promise ever settled and the reset email
  // would silently never send. `notify` now returns that promise, and the command must await it
  // before exiting.
  test('awaits notify before exiting, so the reset email cannot be dropped by an early exit', async () => {
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({ id: 1, email });

    let releaseNotify: (() => void) | undefined;
    notify.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseNotify = resolve;
        })
    );

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const run = resetUserMfaCommand({ email });

    // Drains every pending microtask (the chain of already-resolved awaits ahead of `notify` in
    // the command) without waiting on `notify`'s own still-unresolved promise: a macrotask
    // boundary (`setImmediate`) only runs once the microtask queue is empty, and the only thing
    // keeping it non-empty here is that promise.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    // `notify` was called, but its promise has not resolved yet -- `process.exit` must not have
    // run before it does.
    expect(notify).toHaveBeenCalledWith('1', 'reset');
    expect(mockExit).not.toHaveBeenCalled();

    releaseNotify!();
    await run;

    expect(mockExit).toHaveBeenCalledWith(0);
    // Direct ordering evidence, not just "eventually both happened": notify's own call happens
    // before exit, and (via the not-yet-called assertion above) exit could not have run until the
    // returned promise resolved.
    expect(notify.mock.invocationCallOrder[0]).toBeLessThan(mockExit.mock.invocationCallOrder[0]);

    mockExit.mockRestore();
    consoleLog.mockRestore();
    notify.mockReset();
  });

  test('invalidates the user sessions as well', async () => {
    // otherwise an attacker holding a live session survives the reset meant to evict them
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({ id: 1, email });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await resetUserMfaCommand({ email });

    expect(service).toHaveBeenCalledWith('admin::mfa');
    expect(mfaFactory).not.toHaveBeenCalled();
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
    expect(service).not.toHaveBeenCalled();
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
    expect(service).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
    expect(invalidateRefreshToken).not.toHaveBeenCalled();

    mockInquiry.mockRestore();
    mockExit.mockRestore();
  });
});
