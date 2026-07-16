import { redirectWithAuth } from '../middlewares';
import { DEFAULT_AUTH_COOKIE_NAME } from '../../../../../../shared/utils/auth-cookie-name';
import { REFRESH_COOKIE_NAME } from '../../../../../../shared/utils/session-auth';

jest.mock('../utils', () => ({
  __esModule: true,
  default: {
    getPrefixedRedirectUrls: jest.fn(() => ({
      success: '/admin/auth/login/success',
      error: '/admin/auth/login/error',
    })),
  },
}));

jest.mock('../../../../../../shared/utils/session-auth', () => {
  const actual = jest.requireActual('../../../../../../shared/utils/session-auth');
  return {
    ...actual,
    getSessionManager: jest.fn(),
    generateDeviceId: jest.fn(() => 'device-id'),
    buildCookieOptionsWithExpiry: jest.fn(() => ({
      httpOnly: true,
      secure: false,
      overwrite: true,
      path: '/admin',
      sameSite: 'lax',
    })),
  };
});

const {
  getSessionManager,
  buildCookieOptionsWithExpiry,
} = jest.requireMock('../../../../../../shared/utils/session-auth') as {
  getSessionManager: jest.Mock;
  buildCookieOptionsWithExpiry: jest.Mock;
};

describe('redirectWithAuth', () => {
  const user = { id: 42, email: 'admin@example.com' };
  const sanitizeUser = jest.fn((u: unknown) => ({ ...(u as object), sanitized: true }));

  const createCtx = () => {
    const cookiesSet = jest.fn();
    const redirect = jest.fn();
    return {
      params: { provider: 'google' },
      state: { user },
      cookies: { set: cookiesSet },
      redirect,
      cookiesSet,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // unit.setup.js rewrites strapi.service('admin::x') → strapi.admin.services.x
    global.strapi = {
      admin: {
        services: {
          user: { sanitizeUser },
        },
      },
      config: {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'admin.auth.cookie.secure') return false;
          if (key === 'admin.auth.domain') return undefined;
          if (key === 'admin.auth.cookie.name') return undefined;
          if (key === 'admin.auth.cookie.path') return defaultValue;
          return undefined;
        }),
      },
      log: { error: jest.fn() },
      eventHub: { emit: jest.fn() },
    } as any;

    getSessionManager.mockReturnValue(() => ({
      generateRefreshToken: jest.fn(async () => ({
        token: 'refresh-token',
        absoluteExpiresAt: '2099-01-01T00:00:00.000Z',
      })),
      generateAccessToken: jest.fn(async () => ({ token: 'access-token' })),
    }));
  });

  test('sets the access cookie path to /admin by default', async () => {
    const ctx = createCtx();

    await redirectWithAuth(ctx as any, jest.fn());

    expect(global.strapi.log.error).not.toHaveBeenCalled();
    expect(ctx.cookiesSet).toHaveBeenCalledWith(
      DEFAULT_AUTH_COOKIE_NAME,
      'access-token',
      expect.objectContaining({
        httpOnly: false,
        path: '/admin',
        overwrite: true,
      })
    );
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/auth/login/success');
  });

  test('respects admin.auth.cookie.path for the access cookie', async () => {
    (global.strapi.config.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: unknown) => {
        if (key === 'admin.auth.cookie.path') return '/custom-admin';
        if (key === 'admin.auth.cookie.secure') return false;
        if (key === 'admin.auth.cookie.name') return undefined;
        if (key === 'admin.auth.domain') return undefined;
        return defaultValue;
      }
    );

    const ctx = createCtx();

    await redirectWithAuth(ctx as any, jest.fn());

    expect(ctx.cookiesSet).toHaveBeenCalledWith(
      DEFAULT_AUTH_COOKIE_NAME,
      'access-token',
      expect.objectContaining({
        path: '/custom-admin',
      })
    );
  });

  test('still sets the refresh cookie via buildCookieOptionsWithExpiry', async () => {
    const ctx = createCtx();

    await redirectWithAuth(ctx as any, jest.fn());

    expect(buildCookieOptionsWithExpiry).toHaveBeenCalledWith(
      'refresh',
      '2099-01-01T00:00:00.000Z'
    );
    expect(ctx.cookiesSet).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh-token',
      expect.objectContaining({ path: '/admin' })
    );
  });
});
