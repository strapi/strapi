/**
 * Name of the cookie holding the admin auth (access) token.
 *
 * Configurable through the `STRAPI_ADMIN_AUTH_COOKIE_NAME` environment
 * variable so the cookie cannot collide with a same-named cookie set by
 * another application on a shared parent domain.
 *
 * This module is browser-safe and is the single source of truth for both
 * sides of the SSO handoff: the admin panel inlines the variable at build
 * time, the server reads it at runtime. The variable must therefore be set
 * both when the admin panel is built and when the server runs, otherwise the
 * two sides disagree on the cookie name.
 */
export const DEFAULT_AUTH_COOKIE_NAME = 'jwtToken';

// RFC 6265 cookie-name token characters.
const VALID_COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const getAuthCookieName = (): string => {
  const configured = (process.env.STRAPI_ADMIN_AUTH_COOKIE_NAME || '').trim();

  if (!configured) {
    return DEFAULT_AUTH_COOKIE_NAME;
  }

  if (!VALID_COOKIE_NAME.test(configured)) {
    console.warn(
      `Ignoring invalid STRAPI_ADMIN_AUTH_COOKIE_NAME "${configured}" (must only contain RFC 6265 cookie-name characters); using "${DEFAULT_AUTH_COOKIE_NAME}" instead.`
    );
    return DEFAULT_AUTH_COOKIE_NAME;
  }

  return configured;
};
