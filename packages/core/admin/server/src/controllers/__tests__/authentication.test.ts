// passport.authenticate must short-circuit so the chain never reaches the
// session-token middleware (which needs a real session manager).
import authController from '../authentication';
import { validateLoginSessionInput } from '../../validation/authentication';

jest.mock('koa-passport', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(() => (ctx: any) => {
      ctx.body = { data: { token: 'access-token' } };
    }),
  },
}));

jest.mock('../../validation/authentication', () => ({
  validateLoginSessionInput: jest.fn().mockResolvedValue(undefined),
  validateRegistrationInput: jest.fn(),
  validateAdminRegistrationInput: jest.fn(),
  validateRegistrationInfoQuery: jest.fn(),
  validateForgotPasswordInput: jest.fn(),
  validateResetPasswordInput: jest.fn(),
}));

const createContext = () => ({
  forbidden: jest.fn(),
  request: { body: { email: 'a@b.co', password: 'pw' }, ip: '127.0.0.1', headers: {} },
  state: {},
  cookies: { set: jest.fn() },
});

const setStrapi = (opts: { disableLocal?: boolean; ssoEnabled?: boolean }) => {
  const { disableLocal = false, ssoEnabled = false } = opts;
  global.strapi = {
    config: {
      get: jest.fn((key: string, defaultValue: unknown) =>
        key === 'admin.auth.disableLocalLoginForSSO' ? disableLocal : defaultValue
      ),
    },
    ee: {
      features: {
        isEnabled: jest.fn((feature: string) => (feature === 'sso' ? ssoEnabled : false)),
      },
    },
    eventHub: { emit: jest.fn() },
  } as any;
};

describe('Authentication Controller - login SSO gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects local login when disableLocalLoginForSSO is true and SSO is enabled', async () => {
    setStrapi({ disableLocal: true, ssoEnabled: true });
    const ctx = createContext();

    await authController.login(ctx as any, jest.fn() as any);

    expect(ctx.forbidden).toHaveBeenCalledWith(
      'Local login is disabled. Please authenticate via SSO.'
    );
    // gate short-circuits before validation runs
    expect(validateLoginSessionInput).not.toHaveBeenCalled();
  });

  test('allows local login when the flag is true but SSO is not enabled', async () => {
    setStrapi({ disableLocal: true, ssoEnabled: false });
    const ctx = createContext();

    await authController.login(ctx as any, jest.fn() as any);

    expect(ctx.forbidden).not.toHaveBeenCalled();
    expect(validateLoginSessionInput).toHaveBeenCalled();
  });

  test('allows local login when the flag is false', async () => {
    setStrapi({ disableLocal: false, ssoEnabled: true });
    const ctx = createContext();

    await authController.login(ctx as any, jest.fn() as any);

    expect(ctx.forbidden).not.toHaveBeenCalled();
    expect(validateLoginSessionInput).toHaveBeenCalled();
  });
});
