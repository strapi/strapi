/**
 * Domain attribute of the admin auth (access) token cookie, configurable
 * through `admin.auth.cookie.domain` (falling back to `admin.auth.domain`) so
 * multiple Strapi instances under the same parent domain share, or stay
 * isolated to, the intended host.
 *
 * Browser-safe single source for both sides of the handoff: the admin panel
 * cannot read server config, so the build transports the config value into
 * the bundle through the internal `STRAPI_ADMIN_AUTH_COOKIE_DOMAIN` variable
 * (see create-build-context.ts in @strapi/strapi); the server resolves the
 * same config at runtime. Changing the domain requires an admin rebuild, like
 * any other admin config change.
 *
 * Defaults to `undefined` (host-only cookie) to match the browser default and
 * the refresh-cookie behaviour in `getRefreshCookieOptions` when no domain is
 * configured. A host-only cookie and a `Domain`-scoped cookie are distinct
 * entries in the browser cookie store, so set and delete must agree on the
 * domain or logout leaves a colliding copy behind.
 */
export const DEFAULT_AUTH_COOKIE_DOMAIN = undefined;

const isValidCookieDomain = (domain: string): boolean => {
  // RFC 6265 domain-av: a host name. No leading dot required, no scheme, no
  // path, no port, and none of the control/attribute-separator characters.
  return !/[\x00-\x1F\x7F;,\s/:]/.test(domain);
};

export const resolveAuthCookieDomain = (
  configuredDomain?: string,
  warn: (message: string) => void = console.warn
): string | undefined => {
  const cookieDomain = (configuredDomain || '').trim();

  if (!cookieDomain) {
    return DEFAULT_AUTH_COOKIE_DOMAIN;
  }

  if (!isValidCookieDomain(cookieDomain)) {
    warn(
      `Ignoring invalid admin auth cookie domain "${cookieDomain}" (must be a bare host name); using a host-only cookie instead.`
    );
    return DEFAULT_AUTH_COOKIE_DOMAIN;
  }

  return cookieDomain;
};
