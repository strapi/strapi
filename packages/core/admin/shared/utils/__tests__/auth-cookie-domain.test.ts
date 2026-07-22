import { DEFAULT_AUTH_COOKIE_DOMAIN, resolveAuthCookieDomain } from '../auth-cookie-domain';

describe('resolveAuthCookieDomain', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterEach(() => {
    warnSpy.mockClear();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('defaults to a host-only cookie when unset or blank', () => {
    expect(resolveAuthCookieDomain()).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(resolveAuthCookieDomain('')).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(resolveAuthCookieDomain('   ')).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
  });

  it('returns a configured bare host name', () => {
    expect(resolveAuthCookieDomain('strapi.test')).toBe('strapi.test');
    expect(resolveAuthCookieDomain('.strapi.test')).toBe('.strapi.test');
    expect(resolveAuthCookieDomain('cms.strapi.test')).toBe('cms.strapi.test');
  });

  it('rejects domains with schemes, paths, ports, or attribute separators', () => {
    expect(resolveAuthCookieDomain('https://strapi.test')).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(resolveAuthCookieDomain('strapi.test/admin')).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(resolveAuthCookieDomain('strapi.test:1337')).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(resolveAuthCookieDomain('strapi.test;HttpOnly')).toBe(DEFAULT_AUTH_COOKIE_DOMAIN);
    expect(warnSpy).toHaveBeenCalled();
  });
});
