import type { CookieSetOptions, SessionsConfig } from '../types';

/** Build refresh cookie attributes with secure defaults for production. */
const buildRefreshCookieOptions = (
  upSessions: SessionsConfig,
  isProduction: boolean
): CookieSetOptions => {
  const isSecure =
    typeof upSessions.cookie?.secure === 'boolean' ? upSessions.cookie?.secure : isProduction;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: upSessions.cookie?.sameSite ?? 'lax',
    path: upSessions.cookie?.path ?? '/',
    domain: upSessions.cookie?.domain,
    maxAge: upSessions.cookie?.maxAge,
    overwrite: true,
  };
};

export { buildRefreshCookieOptions };
