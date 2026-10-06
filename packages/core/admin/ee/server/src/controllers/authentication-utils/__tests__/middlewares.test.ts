import passport from 'koa-passport';
import { authenticate, redirectWithAuth } from '../middlewares';
import { DEFAULT_AUTH_COOKIE_NAME } from '../../../../../../shared/utils/auth-cookie-name';
import { REFRESH_COOKIE_NAME } from '../../../../../../shared/utils/session-auth';

jest.mock('../utils', () => ({
  __esModule: true,
  default: {
    getPrefixedRedirectUrls: jest.fn(() => ({
      success: '/admin/auth/login/success',
      error: '/admin/auth/login/error',
    })),
    getAdminStore: jest.fn(),
  },
}));

jest.mock('koa-passport', () => ({ __esModule: true, default: { authenticate: jest.fn() } }));

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

const { getSessionManager, buildCookieOptionsWithExpiry } = jest.requireMock(
  '../../../../../../shared/utils/session-auth'
) as {
  getSessionManager: jest.Mock;
  buildCookieOptionsWithExpiry: jest.Mock;
};

describe('redirectWithAuth', () => {
  const user = { id: 42, email: 'admin@example.com' };
  const sanitizeUser = jest.fn((u: unknown) => ({ ...(u as object), sanitized: true }));
  const generateRefreshToken = jest.fn(async () => ({
    token: 'refresh-token',
    absoluteExpiresAt: '2099-01-01T00:00:00.000Z',
  }));
  const generateAccessToken = jest.fn(async () => ({ token: 'access-token' }));

  const createCtx = (overrides: Record<string, unknown> = {}) => {
    const cookiesSet = jest.fn();
    const redirect = jest.fn();
    return {
      params: { provider: 'google' },
      state: { user },
      request: {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      cookies: { set: cookiesSet },
      redirect,
      cookiesSet,
      ...overrides,
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
      generateRefreshToken,
      generateAccessToken,
    }));
  });

  test('stores session metadata from the SSO callback request', async () => {
    const ctx = createCtx();

    await redirectWithAuth(ctx as any, jest.fn());

    expect(generateRefreshToken).toHaveBeenCalledWith('42', 'device-id', {
      type: 'refresh',
      metadata: expect.objectContaining({
        deviceName: 'Chrome on macOS',
        loginAt: expect.any(String),
      }),
    });
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/auth/login/success');
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

  test('respects admin.auth.cookie.domain for the access cookie', async () => {
    (global.strapi.config.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: unknown) => {
        if (key === 'admin.auth.cookie.domain') return 'strapi.test';
        if (key === 'admin.auth.cookie.secure') return false;
        if (key === 'admin.auth.cookie.name') return undefined;
        if (key === 'admin.auth.cookie.path') return undefined;
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
        domain: 'strapi.test',
      })
    );
  });

  test('falls back to admin.auth.domain for the access cookie domain', async () => {
    (global.strapi.config.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: unknown) => {
        if (key === 'admin.auth.domain') return 'legacy.strapi.test';
        if (key === 'admin.auth.cookie.secure') return false;
        if (key === 'admin.auth.cookie.name') return undefined;
        if (key === 'admin.auth.cookie.path') return undefined;
        if (key === 'admin.auth.cookie.domain') return undefined;
        return defaultValue;
      }
    );

    const ctx = createCtx();

    await redirectWithAuth(ctx as any, jest.fn());

    expect(ctx.cookiesSet).toHaveBeenCalledWith(
      DEFAULT_AUTH_COOKIE_NAME,
      'access-token',
      expect.objectContaining({
        domain: 'legacy.strapi.test',
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

describe('SSO login failures', () => {
  const { getAdminStore } = jest.requireMock('../utils').default as { getAdminStore: jest.Mock };
  const findOneByEmail = jest.fn();
  const createUser = jest.fn();
  const findRole = jest.fn();
  const emit = jest.fn();

  const providers = { autoRegister: true, defaultRole: 3 };
  const profile = { email: 'ana@acme.com', firstname: 'Ana', lastname: 'Doe' };

  const createCtx = () => ({
    params: { provider: 'okta' },
    state: {} as Record<string, unknown>,
    redirect: jest.fn(),
  });

  const runAuthenticate = async (error: unknown, idpProfile: unknown) => {
    jest
      .mocked(passport.authenticate)
      .mockImplementation(
        (_provider: any, _options: any, callback: any) => () => callback(error, idpProfile)
      );

    const ctx = createCtx();
    const next = jest.fn();
    await authenticate(ctx as any, next);
    return { ctx, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      admin: {
        services: {
          user: { findOneByEmail, create: createUser },
          role: { findOne: findRole },
        },
      },
      log: { error: jest.fn() },
      eventHub: { emit },
    } as any;

    getAdminStore.mockResolvedValue({ get: jest.fn(async () => ({ providers })) });
    findOneByEmail.mockResolvedValue(null);
    findRole.mockResolvedValue({ id: 3 });
  });

  test('emits sso_connection_error when the provider returns no profile', async () => {
    const providerError = new Error('idp down');
    const { ctx } = await runAuthenticate(providerError, null);

    expect(emit).toHaveBeenCalledWith('admin.auth.error', {
      error: providerError,
      provider: 'okta',
      reason: 'sso_connection_error',
    });
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/auth/login/error');
  });

  test('emits sso_connection_error with a default error when the profile has no email', async () => {
    await runAuthenticate(null, { firstname: 'Ana' });

    expect(emit).toHaveBeenCalledWith('admin.auth.error', {
      error: expect.any(Error),
      provider: 'okta',
      reason: 'sso_connection_error',
    });
  });

  test('emits account_inactive with the account id and email only for a deactivated user', async () => {
    findOneByEmail.mockResolvedValue({
      id: 7,
      email: 'ana@acme.com',
      isActive: false,
      password: '$2a$10$hash',
    });

    const { ctx, next } = await runAuthenticate(null, profile);

    expect(emit).toHaveBeenCalledWith('admin.auth.error', {
      error: expect.any(Error),
      provider: 'okta',
      reason: 'account_inactive',
      user: { id: 7, email: 'ana@acme.com' },
    });
    expect(next).not.toHaveBeenCalled();
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/auth/login/error');
  });

  test.each([
    ['auto-registration is off', { autoRegister: false, defaultRole: 3 }, profile],
    ['there is no default role', { autoRegister: true, defaultRole: null }, profile],
    ['the profile has no name', providers, { email: 'ana@acme.com' }],
  ])('emits sso_registration_disabled when %s', async (_, storedProviders, idpProfile) => {
    getAdminStore.mockResolvedValue({ get: jest.fn(async () => ({ providers: storedProviders })) });

    await runAuthenticate(null, idpProfile);

    expect(emit).toHaveBeenCalledWith('admin.auth.error', {
      error: expect.any(Error),
      provider: 'okta',
      reason: 'sso_registration_disabled',
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  test('emits sso_role_misconfigured when the default role does not exist', async () => {
    findRole.mockResolvedValue(null);

    await runAuthenticate(null, profile);

    expect(emit).toHaveBeenCalledWith('admin.auth.error', {
      error: expect.any(Error),
      provider: 'okta',
      reason: 'sso_role_misconfigured',
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  test('emits admin.auth.autoRegistration with the created user, unchanged', async () => {
    const created = { id: 9, email: 'ana@acme.com', roles: [{ id: 3 }] };
    createUser.mockResolvedValue(created);

    const { ctx, next } = await runAuthenticate(null, profile);

    expect(emit).toHaveBeenCalledWith('admin.auth.autoRegistration', {
      user: created,
      provider: 'okta',
    });
    expect(ctx.state.user).toBe(created);
    expect(next).toHaveBeenCalled();
  });

  test('waits for admin.auth.autoRegistration listeners before continuing', async () => {
    createUser.mockResolvedValue({ id: 9, email: 'ana@acme.com', roles: [{ id: 3 }] });
    let listenersDone = false;
    emit.mockImplementationOnce(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
      listenersDone = true;
    });

    let doneWhenNextRan: boolean | undefined;
    jest
      .mocked(passport.authenticate)
      .mockImplementation(
        (_provider: any, _options: any, callback: any) => () => callback(null, profile)
      );
    await authenticate(
      createCtx() as any,
      jest.fn(async () => {
        doneWhenNextRan = listenersDone;
      })
    );

    expect(doneWhenNextRan).toBe(true);
  });

  test('emits unexpected_error with the account, and no session user, when the session cannot be created', async () => {
    getSessionManager.mockImplementation(() => {
      throw new Error('session store down');
    });

    const ctx = {
      params: { provider: 'okta' },
      state: { user: { id: 7, email: 'ana@acme.com', password: '$2a$10$hash' } } as {
        user?: unknown;
      },
      redirect: jest.fn(),
    };
    let userWhenEmitted: unknown = 'not emitted';
    emit.mockImplementationOnce(() => {
      userWhenEmitted = ctx.state.user;
    });

    await redirectWithAuth(ctx as any, jest.fn());

    expect(userWhenEmitted).toBeUndefined();

    expect(emit).toHaveBeenCalledWith('admin.auth.error', {
      error: expect.any(Error),
      provider: 'okta',
      reason: 'unexpected_error',
      user: { id: 7, email: 'ana@acme.com' },
    });
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/auth/login/error');
  });
});
