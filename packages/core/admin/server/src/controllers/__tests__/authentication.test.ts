import passport from 'koa-passport';
import { emitAudit, errors } from '@strapi/utils';

import authentication from '../authentication';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(async () => {}),
}));

jest.mock('koa-passport', () => ({ __esModule: true, default: { authenticate: jest.fn() } }));

const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('Authentication controller, failed login', () => {
  const findOne = jest.fn();

  const login = async (err: unknown, user: unknown, info?: { message: string }) => {
    jest
      .mocked(passport.authenticate)
      .mockImplementation(
        (_strategy: any, _options: any, callback: any) => () => callback(err, user, info)
      );

    const ctx = {
      request: { body: { email: 'Ana@Acme.com', password: 'Password123' } },
      state: {},
      notImplemented: jest.fn(),
    };

    const result = authentication.login(ctx as any, jest.fn()).catch((error: unknown) => error);
    const thrown = await result;
    await flush();

    return { ctx, thrown };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue({ id: 7, email: 'ana@acme.com' });

    global.strapi = {
      db: { query: jest.fn(() => ({ findOne })) },
      eventHub: { emit: jest.fn() },
      log: { error: jest.fn() },
    } as any;
  });

  test.each([
    ['Invalid credentials', 'invalid_credentials'],
    ['User not active', 'account_inactive'],
  ])('emits %s with the account found by lowercased email', async (message, reason) => {
    const { thrown } = await login(null, false, { message });

    expect(thrown).toBeInstanceOf(errors.ApplicationError);
    expect(findOne).toHaveBeenCalledWith({
      select: ['id', 'email'],
      where: { email: 'ana@acme.com' },
    });
    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error: new Error(message),
      provider: 'local',
      reason,
      user: { id: 7, email: 'ana@acme.com' },
    });
  });

  test('emits login_not_allowed for an SSO-locked account and rethrows the error', async () => {
    const lockedError = new errors.UnauthorizedError('Login not allowed', {
      code: 'LOGIN_NOT_ALLOWED',
    });

    const { thrown } = await login(lockedError, false);

    expect(thrown).toBe(lockedError);
    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error: lockedError,
      provider: 'local',
      reason: 'login_not_allowed',
      user: { id: 7, email: 'ana@acme.com' },
    });
  });

  test('emits unexpected_error for any other passport error and answers 501', async () => {
    const error = new Error('db down');

    const { ctx } = await login(error, false);

    expect(ctx.notImplemented).toHaveBeenCalled();
    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error,
      provider: 'local',
      reason: 'unexpected_error',
      user: { id: 7, email: 'ana@acme.com' },
    });
  });

  test('emits without an account when no user has that email', async () => {
    findOne.mockResolvedValue(null);

    await login(null, false, { message: 'Invalid credentials' });

    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error: new Error('Invalid credentials'),
      provider: 'local',
      reason: 'invalid_credentials',
    });
  });

  test('still emits, without an account, when the lookup fails', async () => {
    findOne.mockRejectedValue(new Error('db down'));

    await login(null, false, { message: 'Invalid credentials' });

    expect(emitAudit).toHaveBeenCalledWith(
      { strapi },
      'admin.auth.error',
      expect.not.objectContaining({ user: expect.anything() })
    );
  });
});

describe('Authentication controller, forgot password', () => {
  const forgotPassword = jest.fn();
  const log = { error: jest.fn() };

  const requestReset = async () => {
    const ctx = { request: { body: { email: 'ana@acme.com' } }, status: 404 };
    await authentication.forgotPassword(ctx as any);
    return ctx;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    log.error.mockReset();

    global.strapi = {
      log,
      admin: { services: { auth: { forgotPassword } } },
    } as any;
  });

  test('answers 204 without waiting, and logs a rejection that lands after teardown', async () => {
    let reject!: (error: unknown) => void;
    forgotPassword.mockReturnValue(
      new Promise((_resolve, rejectPromise) => {
        reject = rejectPromise;
      })
    );

    const ctx = await requestReset();
    expect(ctx.status).toBe(204);
    expect(forgotPassword).toHaveBeenCalledWith({ email: 'ana@acme.com' });

    // strapi.destroy() deletes the global while the reset email can still be in flight. The
    // unit setup defines the global as non-configurable, so swap in an instance with no logger.
    global.strapi = {} as any;
    const error = new Error('can not resolve Mx');
    reject(error);
    await flush();

    expect(log.error).toHaveBeenCalledWith('Failed to process the forgot-password request', {
      error,
    });
  });

  test('never leaves the rejection unhandled, even when logging it fails', async () => {
    forgotPassword.mockRejectedValue(new Error('can not resolve Mx'));
    log.error.mockImplementation(() => {
      throw new Error('logger closed');
    });

    const ctx = await requestReset();
    await flush();

    expect(ctx.status).toBe(204);
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});
