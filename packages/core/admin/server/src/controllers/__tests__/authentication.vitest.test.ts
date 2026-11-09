import { describe, test, expect, beforeEach, vi } from 'vitest';
import passport from 'koa-passport';
import { emitAudit, errors } from '@strapi/utils';

import authentication from '../authentication';

vi.mock('@strapi/utils', async () => ({
  ...(await vi.importActual<typeof import('@strapi/utils')>('@strapi/utils')),
  emitAudit: vi.fn(async () => {}),
}));

vi.mock('koa-passport', async () => ({ __esModule: true, default: { authenticate: vi.fn() } }));

const getService = vi.hoisted(() => vi.fn());

vi.mock('../../utils', () => ({
  getService: (...args: unknown[]) => getService(...args),
}));

const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('Authentication controller, failed login', () => {
  const findOne = vi.fn();

  const login = async (err: unknown, user: unknown, info?: { message: string }) => {
    vi.mocked(passport.authenticate).mockImplementation(
      (_strategy: any, _options: any, callback: any) => () => callback(err, user, info)
    );

    const ctx = {
      request: { body: { email: 'Ana@Acme.com', password: 'Password123' } },
      state: {},
      notImplemented: vi.fn(),
    };

    const result = authentication.login(ctx as any, vi.fn()).catch((error: unknown) => error);
    const thrown = await result;
    await flush();

    return { ctx, thrown };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findOne.mockResolvedValue({ id: 7, email: 'ana@acme.com' });

    global.strapi = {
      db: { query: vi.fn(() => ({ findOne })) },
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn() },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('logs a background service rejection after Strapi teardown', async () => {
    const error = new Error('email failed');
    const logger = { error: vi.fn() };
    let reject!: (error: Error) => void;

    getService.mockReturnValue({
      forgotPassword: vi.fn(
        () =>
          new Promise<void>((_, rejectPromise) => {
            reject = rejectPromise;
          })
      ),
    });
    global.strapi = { log: logger } as any;

    const ctx = {
      request: { body: { email: 'admin@strapi.io' } },
      status: 0,
    };

    await authentication.forgotPassword(ctx as any);
    global.strapi = { plugins: {} } as any;
    reject(error);
    await flush();

    expect(ctx.status).toBe(204);
    expect(logger.error).toHaveBeenCalledWith('Failed to process the forgot-password request', {
      error,
    });
  });
});
