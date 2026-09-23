import { DEFAULT_AUTH_COOKIE_PATH, resolveAuthCookiePath } from '../auth-cookie-path';

describe('resolveAuthCookiePath', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterEach(() => {
    warnSpy.mockClear();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('defaults to /admin when unset or blank', () => {
    expect(resolveAuthCookiePath()).toBe(DEFAULT_AUTH_COOKIE_PATH);
    expect(resolveAuthCookiePath('')).toBe(DEFAULT_AUTH_COOKIE_PATH);
    expect(resolveAuthCookiePath('   ')).toBe(DEFAULT_AUTH_COOKIE_PATH);
  });

  it('returns a configured absolute path', () => {
    expect(resolveAuthCookiePath('/strapi-de/admin')).toBe('/strapi-de/admin');
    expect(resolveAuthCookiePath('/admin')).toBe('/admin');
  });

  it('rejects relative or invalid paths', () => {
    expect(resolveAuthCookiePath('admin')).toBe(DEFAULT_AUTH_COOKIE_PATH);
    expect(resolveAuthCookiePath('/admin;HttpOnly')).toBe(DEFAULT_AUTH_COOKIE_PATH);
    expect(warnSpy).toHaveBeenCalled();
  });
});
