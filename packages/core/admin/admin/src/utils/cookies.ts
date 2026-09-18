import { resolveAuthCookieDomain } from '../../../shared/utils/auth-cookie-domain';
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

/**
 * Resolved once at module load: the build inlines `admin.auth.cookie.domain`
 * into the bundle as `STRAPI_ADMIN_AUTH_COOKIE_DOMAIN`. `undefined` means the
 * cookie is host-only.
 */
export const AUTH_COOKIE_DOMAIN = resolveAuthCookieDomain(
  process.env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN
);

/** Paths previously used by the client for the access cookie; cleared on set/delete. */
const LEGACY_AUTH_COOKIE_PATHS = ['/'] as const;

const expireCookieAt = (name: string, path: string, domain?: string): void => {
  const domainAttr = domain ? `; Domain=${domain}` : '';
  document.cookie = `${name}=; Path=${path}${domainAttr}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};

/**
 * Every `(path, domain)` key the access cookie may live under: the configured
 * key plus the legacy-path and host-only variants written by older versions or
 * previous configs. The browser cookie store keys entries by
 * `(name, domain, path)`, so each combination is a distinct entry.
 */
const cookieKeyMatrix = (): Array<{ path: string; domain: string | undefined }> => {
  const paths = new Set<string>([AUTH_COOKIE_PATH, ...LEGACY_AUTH_COOKIE_PATHS]);
  const domains = new Set<string | undefined>([undefined, AUTH_COOKIE_DOMAIN]);

  const matrix: Array<{ path: string; domain: string | undefined }> = [];
  for (const path of paths) {
    for (const domain of domains) {
      matrix.push({ path, domain });
    }
  }
  return matrix;
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
 * Uses `admin.auth.cookie.path` and `admin.auth.cookie.domain` (both inlined
 * at build time) so the access cookie stays scoped to the same path and domain
 * as the httpOnly refresh cookie and the EE SSO access cookie. The cookie is
 * marked `Secure` whenever the page is served over TLS.
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

  // Expire every other key the cookie may live under (legacy Path=/, host-only
  // copies written before a domain was configured). A stale same-name entry at
  // an equal-length path sorts first in document.cookie by creation time
  // (RFC 6265 §5.4), so leaving one behind would shadow the token written below.
  for (const { path, domain } of cookieKeyMatrix()) {
    if (path !== AUTH_COOKIE_PATH || domain !== AUTH_COOKIE_DOMAIN) {
      expireCookieAt(name, path, domain);
    }
  }

  const domainAttr = AUTH_COOKIE_DOMAIN ? `; Domain=${AUTH_COOKIE_DOMAIN}` : '';
  // Mark the token Secure when the page itself is served over TLS — the
  // browser's own criterion — so it is never attached to plain-http requests.
  // Expiry writes stay flag-free on purpose: deletion targets the (name,
  // domain, path) key regardless of Secure, and from an http origin a
  // flag-free write can still clear non-Secure entries (no origin can carry
  // the Secure flag over http, and Secure entries are untouchable from there
  // either way).
  const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=${AUTH_COOKIE_PATH}${domainAttr}${expires}${secureAttr}`;
};

/**
 * Deletes a cookie by setting its expiration date to a past date.
 *
 * Expires every combination of {configured path, legacy Path=/} and
 * {configured domain, host-only}. A `Domain`-scoped cookie is a distinct entry
 * from a host-only one in the browser cookie store, so both must be cleared or
 * remote logout leaves the EE SSO cookie (written with `Domain` by the server)
 * behind, rehydrating a dead session into an infinite login redirect.
 *
 * @param name - The name of the cookie to delete.
 */
export const deleteCookie = (name: string): void => {
  for (const { path, domain } of cookieKeyMatrix()) {
    expireCookieAt(name, path, domain);
  }
};
