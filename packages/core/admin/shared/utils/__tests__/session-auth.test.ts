import { getAccessCookieName, getAccessCookiePath } from '../session-auth';
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
