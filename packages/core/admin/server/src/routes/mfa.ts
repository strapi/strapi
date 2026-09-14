/** Ten times the middleware default is what `/login/mfa` needs; these routes are rarer, but share
 * the same collapsed bucket, so they get the `/reset-password` allowance rather than the default.
 * An authenticated body carries no email, so `admin::rateLimit` keys on `unknownEmail:<path>:<ip>`
 * -- one bucket for every administrator behind a shared address, not one per account. At the
 * default of five, two colleagues enrolling from one office lock each other out. */
const CREDENTIAL_RATE_LIMIT = 20;

const authenticated = (method: string, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: {
    policies: ['admin::isMfaEnabled', 'admin::isAuthenticatedAdmin'],
  },
});

/**
 * For the handful of routes that verify a password or a TOTP code. Nothing else here is worth a
 * limiter: the rest are already behind a session and a permission, and none of them takes a secret
 * an attacker could guess. Reads in particular must stay off it -- the profile page alone spends
 * several `/mfa/me` calls, so a default-limited read turns an ordinary visit into a 429.
 */
const credentialGuarded = (method: string, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: {
    policies: ['admin::isMfaEnabled', 'admin::isAuthenticatedAdmin'],
    middlewares: [{ name: 'admin::rateLimit', config: { max: CREDENTIAL_RATE_LIMIT } }],
  },
});

const withPermission = (method: string, path: string, handler: string, action: string) => ({
  method,
  path,
  handler,
  config: {
    policies: [
      'admin::isMfaEnabled',
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: [action] } },
    ],
  },
});

export default [
  authenticated('GET', '/mfa/me', 'mfa.me'),
  credentialGuarded('POST', '/mfa/enrol', 'mfa.enrol'),
  credentialGuarded('POST', '/mfa/enrol/verify', 'mfa.verifyEnrolment'),
  credentialGuarded('POST', '/mfa/recovery-codes', 'mfa.regenerateRecoveryCodes'),
  authenticated('POST', '/mfa/recovery-codes/ack', 'mfa.acknowledgeRecoveryCodes'),
  credentialGuarded('POST', '/mfa/disable', 'mfa.disable'),
  authenticated('GET', '/mfa/notices', 'mfa.notices'),
  authenticated('POST', '/mfa/notices/seen', 'mfa.markNoticesSeen'),
  authenticated('GET', '/mfa/trusted-devices', 'mfa.listTrustedDevices'),
  authenticated('DELETE', '/mfa/trusted-devices', 'mfa.revokeAllTrustedDevices'),
  authenticated('DELETE', '/mfa/trusted-devices/:id', 'mfa.revokeTrustedDevice'),
  // Administrator actions on another user, gated like the users API itself.
  withPermission('POST', '/mfa/users/:id/unlock', 'mfa.unlockUser', 'admin::users.update'),
  withPermission('POST', '/mfa/users/:id/reset', 'mfa.resetUser', 'admin::users.update'),
  withPermission(
    'GET',
    '/mfa/users/:id/trusted-devices',
    'mfa.listUserTrustedDevices',
    'admin::users.read'
  ),
  withPermission(
    'DELETE',
    '/mfa/users/:id/trusted-devices',
    'mfa.revokeUserTrustedDevices',
    'admin::users.update'
  ),
  // The caller's own passkeys.
  authenticated('POST', '/mfa/passkeys/options', 'mfa.passkeyRegistrationOptions'),
  authenticated('POST', '/mfa/passkeys', 'mfa.registerPasskey'),
  authenticated('GET', '/mfa/passkeys', 'mfa.listPasskeys'),
  authenticated('DELETE', '/mfa/passkeys/:id', 'mfa.deletePasskey'),
  withPermission('GET', '/mfa/users/:id/passkeys', 'mfa.listUserPasskeys', 'admin::users.read'),
  withPermission(
    'DELETE',
    '/mfa/users/:id/passkeys',
    'mfa.deleteUserPasskeys',
    'admin::users.update'
  ),
];
