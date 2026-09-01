import type { Context } from 'koa';
import {
  getAccessCookieName,
  getAccessCookiePath,
  getAccessCookieDomain,
  getRefreshCookieOptions,
  resolveLogoutDeviceId,
  issueSession,
  REFRESH_COOKIE_NAME,
} from '../session-auth';
import { DEFAULT_AUTH_COOKIE_NAME } from '../auth-cookie-name';
import { DEFAULT_AUTH_COOKIE_PATH } from '../auth-cookie-path';
import { DEFAULT_AUTH_COOKIE_DOMAIN } from '../auth-cookie-domain';

describe('getAccessCookieName', () => {
  beforeEach(() => {
    global.strapi = {
      config: {
        get: jest.fn(() => undefined),
      },
    } as any;
  });

  test('defaults to jwtToken', () => {
    expect(getAccessCookieName()).toBe(DEFAULT_AUTH_COOKIE_NAME);
  });

  test('uses the admin.auth.cookie.name config', () => {
    global.strapi.config.get = jest.fn((key: string) =>
      key === 'admin.auth.cookie.name' ? 'config_cookie_name' : undefined
    ) as any;

    expect(getAccessCookieName()).toBe('config_cookie_name');
  });

  test('does not read the STRAPI_ADMIN_AUTH_COOKIE_NAME environment variable', () => {
    const ORIGINAL_ENV = process.env;
    process.env = { ...ORIGINAL_ENV, STRAPI_ADMIN_AUTH_COOKIE_NAME: 'env_cookie_name' };

    try {
      expect(getAccessCookieName()).toBe(DEFAULT_AUTH_COOKIE_NAME);
    } finally {
      process.env = ORIGINAL_ENV;
    }
  });
});

describe('getAccessCookiePath', () => {
  beforeEach(() => {
    global.strapi = {
      config: {
        get: jest.fn(() => undefined),
      },
    } as any;
  });

  test('defaults to /admin', () => {
    expect(getAccessCookiePath()).toBe(DEFAULT_AUTH_COOKIE_PATH);
  });

  test('uses the admin.auth.cookie.path config', () => {
    global.strapi.config.get = jest.fn((key: string) =>
      key === 'admin.auth.cookie.path' ? '/strapi-de/admin' : undefined
    ) as any;

    expect(getAccessCookiePath()).toBe('/strapi-de/admin');
  });
});

describe('getAccessCookieDomain', () => {
  beforeEach(() => {
    global.strapi = {
      config: {
        get: jest.fn(() => undefined),
      },
    } as any;
  });

  test('defaults to a host-only cookie', () => {
    expect(getAccessCookieDomain()).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
  });

  test('uses the admin.auth.cookie.domain config', () => {
    global.strapi.config.get = jest.fn((key: string) =>
      key === 'admin.auth.cookie.domain' ? 'strapi.test' : undefined
    ) as any;

    expect(getAccessCookieDomain()).toBe('strapi.test');
  });

  test('falls back to admin.auth.domain', () => {
    global.strapi.config.get = jest.fn((key: string) =>
      key === 'admin.auth.domain' ? 'legacy.strapi.test' : undefined
    ) as any;

    expect(getAccessCookieDomain()).toBe('legacy.strapi.test');
  });

  test('prefers admin.auth.cookie.domain over admin.auth.domain', () => {
    global.strapi.config.get = jest.fn((key: string) => {
      if (key === 'admin.auth.cookie.domain') return 'cookie.strapi.test';
      if (key === 'admin.auth.domain') return 'legacy.strapi.test';
      return undefined;
    }) as any;

    expect(getAccessCookieDomain()).toBe('cookie.strapi.test');
  });
});

describe('getRefreshCookieOptions', () => {
  const logWarn = jest.fn();

  beforeEach(() => {
    logWarn.mockReset();
    global.strapi = {
      config: {
        get: jest.fn(() => undefined),
      },
      log: {
        warn: logWarn,
      },
    } as any;
  });

  test('resolves the domain through the shared helper so it agrees with the access cookie', () => {
    global.strapi.config.get = jest.fn((key: string) =>
      key === 'admin.auth.cookie.domain' ? 'strapi.test' : undefined
    ) as any;

    expect(getRefreshCookieOptions().domain).toBe('strapi.test');
  });

  test('falls back to a host-only cookie and warns via strapi.log when the configured domain is invalid', () => {
    global.strapi.config.get = jest.fn((key: string) =>
      key === 'admin.auth.cookie.domain' ? 'strapi.test:1337' : undefined
    ) as any;

    expect(getRefreshCookieOptions().domain).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('strapi.test:1337'));
  });
});

describe('resolveLogoutDeviceId', () => {
  const findOne = jest.fn();
  const logDebug = jest.fn();

  beforeEach(() => {
    findOne.mockReset();
    logDebug.mockReset();
    global.strapi = {
      db: {
        query: jest.fn(() => ({ findOne })),
      },
      log: { debug: logDebug },
    } as any;
  });

  test('falls back to clientDeviceId when sessionId is missing', async () => {
    await expect(resolveLogoutDeviceId('42', undefined, 'client-device')).resolves.toBe(
      'client-device'
    );
    expect(findOne).not.toHaveBeenCalled();
    expect(logDebug).toHaveBeenCalled();
  });

  test('returns the session deviceId when the row is owned by the admin user', async () => {
    findOne.mockResolvedValue({
      userId: '42',
      origin: 'admin',
      deviceId: 'sso-device',
    });

    await expect(resolveLogoutDeviceId('42', 'session-1', 'client-device')).resolves.toBe(
      'sso-device'
    );
    expect(findOne).toHaveBeenCalledWith({ where: { sessionId: 'session-1' } });
  });

  test('falls back when the session is missing or not owned', async () => {
    findOne.mockResolvedValue({
      userId: '99',
      origin: 'admin',
      deviceId: 'other-device',
    });

    await expect(resolveLogoutDeviceId('42', 'session-1', 'client-device')).resolves.toBe(
      'client-device'
    );
    expect(logDebug).toHaveBeenCalled();
  });

  test('falls back when the session origin is not admin', async () => {
    findOne.mockResolvedValue({
      userId: '42',
      origin: 'users-permissions',
      deviceId: 'up-device',
    });

    await expect(resolveLogoutDeviceId('42', 'session-1', 'client-device')).resolves.toBe(
      'client-device'
    );
    expect(logDebug).toHaveBeenCalled();
  });

  test('falls back when the owned session has no deviceId string', async () => {
    findOne.mockResolvedValue({
      userId: '42',
      origin: 'admin',
      deviceId: null,
    });

    await expect(resolveLogoutDeviceId('42', 'session-1', 'client-device')).resolves.toBe(
      'client-device'
    );
  });
});

describe('issueSession', () => {
  const user = { id: 11, email: 'admin@example.com' } as any;
  const sanitizedUser = { id: 11, email: 'admin@example.com' };
  const sanitizeUser = jest.fn(() => sanitizedUser);

  const setStrapi = (sessionManagerFn?: jest.Mock) => {
    global.strapi = {
      config: { get: jest.fn(() => undefined) },
      log: { error: jest.fn(), warn: jest.fn() },
      admin: { services: { user: { sanitizeUser } } },
      ...(sessionManagerFn ? { sessionManager: sessionManagerFn } : {}),
    } as any;
  };

  const buildSessionManager = (overrides: {
    generateRefreshToken?: jest.Mock;
    generateAccessToken?: jest.Mock;
  }) => {
    const generateRefreshToken =
      overrides.generateRefreshToken ??
      jest.fn(() => Promise.resolve({ token: 'refresh-token', absoluteExpiresAt: undefined }));
    const generateAccessToken =
      overrides.generateAccessToken ?? jest.fn(() => Promise.resolve({ token: 'access-token' }));
    const sessionManagerFn = jest.fn(() => ({ generateRefreshToken, generateAccessToken }));

    return { sessionManagerFn, generateRefreshToken, generateAccessToken };
  };

  const buildCtx = (body: Record<string, unknown> = {}) => {
    const cookiesSet = jest.fn();
    const internalServerError = jest.fn();
    const ctx = {
      request: { body, secure: false, headers: {} },
      cookies: { set: cookiesSet },
      internalServerError,
    } as unknown as Context;

    return { ctx, cookiesSet, internalServerError };
  };

  beforeEach(() => {
    sanitizeUser.mockClear();
  });

  test('sets the refresh cookie and returns the access token', async () => {
    const { sessionManagerFn, generateRefreshToken } = buildSessionManager({});
    setStrapi(sessionManagerFn);

    const { ctx, cookiesSet } = buildCtx();

    await issueSession(ctx, user);

    expect(sessionManagerFn).toHaveBeenCalledWith('admin');
    expect(generateRefreshToken).toHaveBeenCalledWith(
      String(user.id),
      expect.any(String),
      expect.objectContaining({ type: 'session' })
    );
    expect(cookiesSet).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh-token',
      expect.any(Object)
    );
    expect(ctx.body).toEqual({
      data: { token: 'access-token', accessToken: 'access-token', user: sanitizedUser },
    });
    expect(sanitizeUser).toHaveBeenCalledWith(user);
  });

  test('honours rememberMe from the request body by minting a refresh-type session', async () => {
    const { sessionManagerFn, generateRefreshToken } = buildSessionManager({});
    setStrapi(sessionManagerFn);

    const { ctx } = buildCtx({ rememberMe: true });

    await issueSession(ctx, user);

    expect(generateRefreshToken).toHaveBeenCalledWith(
      String(user.id),
      expect.any(String),
      expect.objectContaining({ type: 'refresh' })
    );
  });

  test('lets deviceId/rememberMe options override the request body (reset-password parity)', async () => {
    const { sessionManagerFn, generateRefreshToken } = buildSessionManager({});
    setStrapi(sessionManagerFn);

    // Body asks for rememberMe and carries its own deviceId; the explicit options must win over
    // both, exactly like resetPassword forcing a fresh device id and a session-type cookie.
    const { ctx } = buildCtx({ rememberMe: true, deviceId: 'body-device' });

    await issueSession(ctx, user, { deviceId: 'forced-device', rememberMe: false });

    expect(generateRefreshToken).toHaveBeenCalledWith(
      String(user.id),
      'forced-device',
      expect.objectContaining({ type: 'session' })
    );
  });

  test('falls back to internalServerError when the session manager is unavailable', async () => {
    setStrapi(undefined);

    const { ctx, internalServerError, cookiesSet } = buildCtx();

    await issueSession(ctx, user);

    expect(internalServerError).toHaveBeenCalled();
    expect(cookiesSet).not.toHaveBeenCalled();
    expect(ctx.body).toBeUndefined();
  });

  test('falls back to internalServerError when generateAccessToken errors, after the cookie is already set', async () => {
    const { sessionManagerFn } = buildSessionManager({
      generateAccessToken: jest.fn(() => Promise.resolve({ error: 'boom' } as any)),
    });
    setStrapi(sessionManagerFn);

    const { ctx, internalServerError, cookiesSet } = buildCtx();

    await issueSession(ctx, user);

    expect(cookiesSet).toHaveBeenCalled();
    expect(internalServerError).toHaveBeenCalled();
    expect(ctx.body).toBeUndefined();
  });
});
