import { DEFAULT_AUTH_COOKIE_NAME, resolveAuthCookieName } from '../auth-cookie-name';

describe('resolveAuthCookieName', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('defaults to jwtToken for undefined, empty, and blank values', () => {
    expect(resolveAuthCookieName(undefined)).toBe(DEFAULT_AUTH_COOKIE_NAME);
    expect(resolveAuthCookieName('')).toBe(DEFAULT_AUTH_COOKIE_NAME);
    expect(resolveAuthCookieName('   ')).toBe(DEFAULT_AUTH_COOKIE_NAME);
  });

  test('returns the configured name', () => {
    expect(resolveAuthCookieName('my_custom_auth_cookie')).toBe('my_custom_auth_cookie');
  });

  test('trims surrounding whitespace', () => {
    expect(resolveAuthCookieName(' my_custom_auth_cookie ')).toBe('my_custom_auth_cookie');
  });

  test.each(['bad name', 'bad;name', 'bad=name', 'bad,name'])(
    'warns and falls back to the default for the invalid name "%s"',
    (invalidName) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(resolveAuthCookieName(invalidName)).toBe(DEFAULT_AUTH_COOKIE_NAME);
      expect(warn).toHaveBeenCalledTimes(1);
    }
  );
});
