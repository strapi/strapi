import { getAccessCookieName } from '../session-auth';
import { DEFAULT_AUTH_COOKIE_NAME } from '../auth-cookie-name';

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
