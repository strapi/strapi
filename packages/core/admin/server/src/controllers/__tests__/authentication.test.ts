import passport from 'koa-passport';
import { emitAudit, errors } from '@strapi/utils';

import authentication from '../authentication';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
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
