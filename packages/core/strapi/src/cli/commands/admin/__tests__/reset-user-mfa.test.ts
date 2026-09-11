import inquirer from 'inquirer';
import { action as resetUserMfaCommand } from '../reset-user-mfa';

const load = jest.fn(() => mock) as any;
const findOne = jest.fn();
const resetUser = jest.fn();
const invalidateRefreshToken = jest.fn();
const sessionManager = jest.fn(() => ({ invalidateRefreshToken }));

// The command delegates the whole reset (disable, evict sessions, record, notify) to the
// service, which is the same method `POST /mfa/users/:id/reset` calls. What is left for this
// suite to prove is the command's own job: resolve the email, delegate once, and not exit before
// the notification promise settles. The orchestration itself is covered in the admin service's
// own tests.
const mfaServiceInstance = {
  resetUser,
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
    resetUser.mockClear();
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
    expect(resetUser).toHaveBeenCalledWith('1', { via: 'cli' });
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(consoleLog).toHaveBeenCalled();

    mockExit.mockRestore();
    consoleLog.mockRestore();
  });

  // `resetUser` returns the (never-rejecting) notification promise. Firing it and immediately
  // calling `process.exit(0)` tears the process down before the email settles, so the reset mail
  // silently never sends. Exit must wait for it.
  test('awaits the reset before exiting, so the reset email cannot be dropped by an early exit', async () => {
    const email = 'kai@doe.com';
    findOne.mockResolvedValue({ id: 1, email });

    let releaseReset: (() => void) | undefined;
    resetUser.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseReset = resolve;
        })
    );

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    const run = resetUserMfaCommand({ email });

    // Drains every pending microtask (the chain of already-resolved awaits ahead of `resetUser`
    // in the command) without waiting on its own still-unresolved promise: a macrotask boundary
    // (`setImmediate`) only runs once the microtask queue is empty, and the only thing keeping it
    // non-empty here is that promise.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    // `resetUser` was called, but its promise has not resolved yet -- `process.exit` must not
    // have run before it does.
    expect(resetUser).toHaveBeenCalledWith('1', { via: 'cli' });
    expect(mockExit).not.toHaveBeenCalled();

    releaseReset!();
    await run;

    expect(mockExit).toHaveBeenCalledWith(0);
    // Direct ordering evidence, not just "eventually both happened".
    expect(resetUser.mock.invocationCallOrder[0]).toBeLessThan(
      mockExit.mock.invocationCallOrder[0]
    );

    mockExit.mockRestore();
    consoleLog.mockRestore();
    resetUser.mockReset();
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
    expect(resetUser).not.toHaveBeenCalled();

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

    // Throw so the code will stop executing, same as declining the prompt does in production
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
    expect(resetUser).not.toHaveBeenCalled();

    mockInquiry.mockRestore();
    mockExit.mockRestore();
  });
});
