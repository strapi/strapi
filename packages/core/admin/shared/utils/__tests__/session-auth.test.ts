import { getAccessCookieName, getAccessCookiePath, resolveLogoutDeviceId } from '../session-auth';
import { DEFAULT_AUTH_COOKIE_NAME } from '../auth-cookie-name';
import { DEFAULT_AUTH_COOKIE_PATH } from '../auth-cookie-path';

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
