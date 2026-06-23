'use strict';

const buildRefreshCookieOptions = (upSessions, isProduction) => {
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

module.exports = {
  buildRefreshCookieOptions,
};
