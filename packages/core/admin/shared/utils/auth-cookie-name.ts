/**
 * Name of the cookie holding the admin auth (access) token, configurable
 * through `admin.auth.cookie.name` so it cannot collide with a same-named
 * cookie set by another application on a shared parent domain.
 *
 * Browser-safe single source for both sides of the SSO handoff: the admin
 * panel cannot read server config, so the build transports the config value
 * into the bundle through the internal `STRAPI_ADMIN_AUTH_COOKIE_NAME`
 * variable (see create-build-context.ts in @strapi/strapi); the server
 * resolves the same config at runtime. Renaming the cookie requires an admin
 * rebuild, like any other admin config change.
 */
export const DEFAULT_AUTH_COOKIE_NAME = 'jwtToken';

// RFC 6265 cookie-name token characters.
const VALID_COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const resolveAuthCookieName = (
  configuredName?: string,
  warn: (message: string) => void = console.warn
): string => {
  const cookieName = (configuredName || '').trim();

  if (!cookieName) {
    return DEFAULT_AUTH_COOKIE_NAME;
  }

  if (!VALID_COOKIE_NAME.test(cookieName)) {
    warn(
      `Ignoring invalid admin auth cookie name "${cookieName}" (must only contain RFC 6265 cookie-name characters); using "${DEFAULT_AUTH_COOKIE_NAME}" instead.`
    );
    return DEFAULT_AUTH_COOKIE_NAME;
  }

  return cookieName;
};
