import { resolveAuthCookieName } from '../../../shared/utils/auth-cookie-name';
import { resolveAuthCookiePath } from '../../../shared/utils/auth-cookie-path';

/**
 * Resolved once at module load: the build inlines `admin.auth.cookie.name`
 * into the bundle as `STRAPI_ADMIN_AUTH_COOKIE_NAME`.
 */
export const AUTH_COOKIE_NAME = resolveAuthCookieName(process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME);

/**
 * Resolved once at module load: the build inlines `admin.auth.cookie.path`
 * into the bundle as `STRAPI_ADMIN_AUTH_COOKIE_PATH`.
 */
export const AUTH_COOKIE_PATH = resolveAuthCookiePath(process.env.STRAPI_ADMIN_AUTH_COOKIE_PATH);

/** Paths previously used by the client for the access cookie; cleared on set/delete. */
const LEGACY_AUTH_COOKIE_PATHS = ['/'] as const;

const expireCookieAtPath = (name: string, path: string): void => {
  document.cookie = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

/**
 * Retrieves the value of a specified cookie.
 *
 * @param name - The name of the cookie to retrieve.
 * @returns The decoded cookie value if found, otherwise null.
 */
export const getCookieValue = (name: string): string | null => {
  let result = null;
  const cookieArray = document.cookie.split(';');
  cookieArray.forEach((cookie) => {
    const [key, value] = cookie.split('=').map((item) => item.trim());
    if (key === name) {
      result = decodeURIComponent(value);
    }
  });
  return result;
};

/**
 * Sets a cookie with the given name, value, and optional expiration time.
 * Uses `admin.auth.cookie.path` (inlined at build time) so the access cookie
 * stays scoped to the same path as the httpOnly refresh cookie.
 *
 * @param name - The name of the cookie.
 * @param value - The value of the cookie.
 * @param days - (Optional) Number of days until the cookie expires. If omitted, the cookie is a session cookie.
 */
export const setCookie = (name: string, value: string, days?: number): void => {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; Expires=${date.toUTCString()}`;
  }

  // Drop legacy Path=/ copies so login does not leave a duplicate root cookie.
  for (const legacyPath of LEGACY_AUTH_COOKIE_PATHS) {
    if (legacyPath !== AUTH_COOKIE_PATH) {
      expireCookieAtPath(name, legacyPath);
    }
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=${AUTH_COOKIE_PATH}${expires}`;
};

/**
 * Deletes a cookie by setting its expiration date to a past date.
 * Clears both the configured path and legacy Path=/ so logout works after upgrades.
 *
 * @param name - The name of the cookie to delete.
 */
export const deleteCookie = (name: string): void => {
  const paths = new Set<string>([AUTH_COOKIE_PATH, ...LEGACY_AUTH_COOKIE_PATHS]);
  for (const path of paths) {
    expireCookieAtPath(name, path);
  }
};
