/**
 * Path attribute of the admin auth (access) token cookie, configurable
 * through `admin.auth.cookie.path` so multiple Strapi instances on the same
 * parent domain can keep separate cookies (e.g. `/strapi-de/admin`).
 *
 * Browser-safe single source for both sides of the handoff: the admin panel
 * cannot read server config, so the build transports the config value into
 * the bundle through the internal `STRAPI_ADMIN_AUTH_COOKIE_PATH` variable
 * (see create-build-context.ts in @strapi/strapi); the server resolves the
 * same config at runtime. Changing the path requires an admin rebuild, like
 * any other admin config change.
 *
 * Defaults to `/admin` to match the refresh-cookie path used by
 * `getRefreshCookieOptions`.
 */
export const DEFAULT_AUTH_COOKIE_PATH = '/admin';

const isValidCookiePath = (path: string): boolean => {
  if (!path.startsWith('/')) {
    return false;
  }

  // RFC 6265 path-av: any CHAR except CTLs or ";".
  // eslint-disable-next-line no-control-regex -- CTL chars are exactly what RFC 6265 forbids
  return !/[\x00-\x1F\x7F;]/.test(path);
};

export const resolveAuthCookiePath = (
  configuredPath?: string,
  warn: (message: string) => void = console.warn
): string => {
  const cookiePath = (configuredPath || '').trim();

  if (!cookiePath) {
    return DEFAULT_AUTH_COOKIE_PATH;
  }

  if (!isValidCookiePath(cookiePath)) {
    warn(
      `Ignoring invalid admin auth cookie path "${cookiePath}" (must be an absolute path without ";"); using "${DEFAULT_AUTH_COOKIE_PATH}" instead.`
    );
    return DEFAULT_AUTH_COOKIE_PATH;
  }

  return cookiePath;
};
