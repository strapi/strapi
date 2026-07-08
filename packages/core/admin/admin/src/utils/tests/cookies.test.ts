import { getCookieValue, setCookie, deleteCookie } from '../cookies';

describe('Cookie Utilities', () => {
  beforeEach(() => {
    // Clear all cookies before each test
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
});
