import type { CompatConfig } from './config';

/** The header a client sends to ask for the refresh token in a cookie instead of the body. */
export const REFRESH_COOKIE_HEADER = 'x-strapi-refresh-cookie';

const SAME_SITE = { lax: 'Lax', strict: 'Strict', none: 'None' } as const;

/** Whether the answer carries the refresh token in a cookie: by configuration or by the request. */
export const wantsRefreshCookie = (cfg: CompatConfig, headers: Headers | undefined): boolean =>
  cfg.refresh.httpOnly || headers?.get(REFRESH_COOKIE_HEADER) === 'httpOnly';

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const cookieValue = (headers: Headers | undefined, name: string): string | undefined => {
  for (const pair of (headers?.get('cookie') ?? '').split(';')) {
    const separator = pair.indexOf('=');

    if (separator !== -1 && pair.slice(0, separator).trim() === name) {
      const value = decode(pair.slice(separator + 1).trim());

      return value === '' ? undefined : value;
    }
  }

  return undefined;
};

/**
 * The refresh token a request carries: the cookie when there is one, the body's `refreshToken`
 * otherwise. `undefined` when there is none.
 */
export const readRefreshToken = (
  cfg: CompatConfig,
  headers: Headers | undefined,
  body: unknown
): string | undefined => {
  const fromCookie = cookieValue(headers, cfg.refresh.cookie.name);

  if (fromCookie) {
    return fromCookie;
  }

  const { refreshToken } = (typeof body === 'object' && body !== null ? body : {}) as {
    refreshToken?: unknown;
  };

  return typeof refreshToken === 'string' && refreshToken !== '' ? refreshToken : undefined;
};

const serialize = (cfg: CompatConfig, value: string, extra: string[]): string => {
  const { name, secure, sameSite, path, domain } = cfg.refresh.cookie;

  return [
    `${name}=${value}`,
    ...extra,
    `Path=${path}`,
    ...(domain ? [`Domain=${domain}`] : []),
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    `SameSite=${SAME_SITE[sameSite]}`,
  ].join('; ');
};

/** The `Set-Cookie` value that stores the token: httpOnly, and `maxAge` seconds when configured. */
export const writeRefreshCookie = (cfg: CompatConfig, token: string): string =>
  serialize(
    cfg,
    encodeURIComponent(token),
    cfg.refresh.cookie.maxAge === null ? [] : [`Max-Age=${cfg.refresh.cookie.maxAge}`]
  );

/** The `Set-Cookie` value that removes the cookie, with the attributes it was set with. */
export const clearRefreshCookie = (cfg: CompatConfig): string =>
  serialize(cfg, '', ['Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'Max-Age=0']);
