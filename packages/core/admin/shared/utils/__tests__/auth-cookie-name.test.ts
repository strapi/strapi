import { DEFAULT_AUTH_COOKIE_NAME, getAuthCookieName } from '../auth-cookie-name';

describe('getAuthCookieName', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  test('defaults to jwtToken', () => {
    expect(getAuthCookieName()).toBe(DEFAULT_AUTH_COOKIE_NAME);
  });

  test('uses STRAPI_ADMIN_AUTH_COOKIE_NAME when set', () => {
    process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME = 'my_custom_auth_cookie';

    expect(getAuthCookieName()).toBe('my_custom_auth_cookie');
  });

  test('trims surrounding whitespace', () => {
    process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME = ' my_custom_auth_cookie ';

    expect(getAuthCookieName()).toBe('my_custom_auth_cookie');
  });

  test('falls back to the default when the variable is empty or blank', () => {
    process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME = '   ';

    expect(getAuthCookieName()).toBe(DEFAULT_AUTH_COOKIE_NAME);
  });

  test.each(['bad name', 'bad;name', 'bad=name', 'bad,name'])(
    'warns and falls back to the default for the invalid name "%s"',
    (invalidName) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME = invalidName;

      expect(getAuthCookieName()).toBe(DEFAULT_AUTH_COOKIE_NAME);
      expect(warn).toHaveBeenCalledTimes(1);
    }
  );
});
