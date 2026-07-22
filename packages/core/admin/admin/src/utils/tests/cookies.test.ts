import { getCookieValue, setCookie, deleteCookie } from '../cookies';

describe('Cookie Utilities', () => {
  beforeEach(() => {
    // Clear all cookies before each test (jsdom ignores Path, so a single expire is enough)
    document.cookie.split(';').forEach((cookie) => {
      const [name] = cookie.split('=');
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    });
  });

  describe('setCookie', () => {
    it('should set a cookie with the correct value', () => {
      setCookie('testCookie', 'testValue', 1);
      expect(document.cookie).toContain('testCookie=testValue');
    });

    it('should set a session cookie when no expiration is given', () => {
      setCookie('sessionCookie', 'sessionValue');
      expect(document.cookie).toContain('sessionCookie=sessionValue');
    });
  });

  describe('getCookieValue', () => {
    it('should return the correct cookie value', () => {
      document.cookie = 'user=JohnDoe; Path=/;';
      expect(getCookieValue('user')).toBe('JohnDoe');
    });

    it('should return null for a non-existing cookie', () => {
      expect(getCookieValue('nonExistent')).toBeNull();
    });
  });

  describe('deleteCookie', () => {
    it('should delete a cookie', () => {
      document.cookie = 'deleteMe=value; Path=/;';
      deleteCookie('deleteMe');
      expect(getCookieValue('deleteMe')).toBeNull();
    });
  });

  describe('AUTH_COOKIE_NAME', () => {
    const ORIGINAL_ENV = process.env;

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    const loadAuthCookieName = (): string => {
      let name = '';
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        name = require('../cookies').AUTH_COOKIE_NAME;
      });
      return name;
    };

    it('should default to jwtToken', () => {
      process.env = { ...ORIGINAL_ENV };
      delete process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME;

      expect(loadAuthCookieName()).toBe('jwtToken');
    });

    it('should use STRAPI_ADMIN_AUTH_COOKIE_NAME when set', () => {
      process.env = { ...ORIGINAL_ENV, STRAPI_ADMIN_AUTH_COOKIE_NAME: 'my_custom_auth_cookie' };

      expect(loadAuthCookieName()).toBe('my_custom_auth_cookie');
    });
  });

  describe('AUTH_COOKIE_PATH', () => {
    const ORIGINAL_ENV = process.env;

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    const loadAuthCookiePath = (): string => {
      let path = '';
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        path = require('../cookies').AUTH_COOKIE_PATH;
      });
      return path;
    };

    it('should default to /admin', () => {
      process.env = { ...ORIGINAL_ENV };
      delete process.env.STRAPI_ADMIN_AUTH_COOKIE_PATH;

      expect(loadAuthCookiePath()).toBe('/admin');
    });

    it('should use STRAPI_ADMIN_AUTH_COOKIE_PATH when set', () => {
      process.env = { ...ORIGINAL_ENV, STRAPI_ADMIN_AUTH_COOKIE_PATH: '/strapi-de/admin' };

      expect(loadAuthCookiePath()).toBe('/strapi-de/admin');
    });
  });

  describe('AUTH_COOKIE_DOMAIN', () => {
    const ORIGINAL_ENV = process.env;

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    const loadAuthCookieDomain = (): string | undefined => {
      let domain: string | undefined;
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        domain = require('../cookies').AUTH_COOKIE_DOMAIN;
      });
      return domain;
    };

    it('should default to a host-only cookie (undefined)', () => {
      process.env = { ...ORIGINAL_ENV };
      delete process.env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN;

      expect(loadAuthCookieDomain()).toBeUndefined();
    });

    it('should use STRAPI_ADMIN_AUTH_COOKIE_DOMAIN when set', () => {
      process.env = { ...ORIGINAL_ENV, STRAPI_ADMIN_AUTH_COOKIE_DOMAIN: 'strapi.test' };

      expect(loadAuthCookieDomain()).toBe('strapi.test');
    });
  });

  // jsdom's cookie store ignores Path/Domain, so assert on the emitted
  // `document.cookie` write strings instead — that is where the domain-aware
  // logout fix lives.
  describe('domain-scoped set/delete write strings', () => {
    const ORIGINAL_ENV = process.env;

    afterEach(() => {
      process.env = ORIGINAL_ENV;
      jest.restoreAllMocks();
    });

    const withEnv = (
      env: Record<string, string | undefined>,
      fn: (writes: string[], mod: typeof import('../cookies')) => void
    ): void => {
      const nextEnv = { ...ORIGINAL_ENV, ...env };
      // Explicit `undefined` in `env` means "unset this var" (host-only case).
      for (const [key, value] of Object.entries(env)) {
        if (value === undefined) {
          delete nextEnv[key];
        }
      }
      process.env = nextEnv;
      const writes: string[] = [];
      const spy = jest
        .spyOn(document, 'cookie', 'set')
        .mockImplementation((value: string) => writes.push(value));
      try {
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('../cookies');
          fn(writes, mod);
        });
      } finally {
        spy.mockRestore();
      }
    };

    it('sets the cookie with the configured Domain and Path', () => {
      withEnv(
        { STRAPI_ADMIN_AUTH_COOKIE_DOMAIN: 'strapi.test', STRAPI_ADMIN_AUTH_COOKIE_PATH: '/admin' },
        (writes, mod) => {
          mod.setCookie('jwtToken', 'abc');
          const setWrite = writes.find((w) => w.startsWith('jwtToken=abc'));
          expect(setWrite).toContain('Path=/admin');
          expect(setWrite).toContain('Domain=strapi.test');
        }
      );
    });

    it('deletes across both the configured Domain and host-only', () => {
      withEnv(
        { STRAPI_ADMIN_AUTH_COOKIE_DOMAIN: 'strapi.test', STRAPI_ADMIN_AUTH_COOKIE_PATH: '/admin' },
        (writes, mod) => {
          mod.deleteCookie('jwtToken');
          const expiries = writes.filter((w) => w.includes('Expires=Thu, 01 Jan 1970'));
          // configured path × {host-only, domain} and legacy Path=/ × {host-only, domain}
          expect(
            expiries.some((w) => w.includes('Path=/admin') && w.includes('Domain=strapi.test'))
          ).toBe(true);
          expect(expiries.some((w) => w.includes('Path=/admin') && !w.includes('Domain='))).toBe(
            true
          );
          expect(
            expiries.some((w) => w.includes('Path=/') && w.includes('Domain=strapi.test'))
          ).toBe(true);
        }
      );
    });

    it('omits the Domain attribute entirely when host-only', () => {
      withEnv(
        { STRAPI_ADMIN_AUTH_COOKIE_PATH: '/admin', STRAPI_ADMIN_AUTH_COOKIE_DOMAIN: undefined },
        (writes, mod) => {
          mod.deleteCookie('jwtToken');
          expect(writes.every((w) => !w.includes('Domain='))).toBe(true);
        }
      );
    });
  });
});
