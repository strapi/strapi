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
 * several `/mfa/me` calls, so a limited read turns an ordinary visit into a 429.
 *
 * The middleware default, five per five minutes, the same as `/login`. With a session the limiter
 * keys on the account and the route pattern (`rateLimitKey`), so colleagues behind one address do
 * not share a bucket and a parameter in the path does not buy a fresh one.
 */
const credentialGuarded = (method: string, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: {
    policies: ['admin::isMfaEnabled', 'admin::isAuthenticatedAdmin'],
    middlewares: ['admin::rateLimit'],
  },
});

/** `withPermission` plus the limiter: an administrator action on another user that verifies the
 * acting administrator's own password and code (see `assertActorReauth`). */
const credentialGuardedWithPermission = (
  method: string,
  path: string,
  handler: string,
  action: string
) => ({
  method,
  path,
  handler,
  config: {
    policies: [
      'admin::isMfaEnabled',
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: [action] } },
    ],
    middlewares: ['admin::rateLimit'],
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
  // These three lower another user's protection, so the acting administrator re-authenticates.
  credentialGuardedWithPermission(
    'POST',
    '/mfa/users/:id/unlock',
    'mfa.unlockUser',
    'admin::users.update'
  ),
  credentialGuardedWithPermission(
    'POST',
    '/mfa/users/:id/reset',
    'mfa.resetUser',
    'admin::users.update'
  ),
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
  // Verifies a password and a live code, so it belongs on the limiter with the other four.
  credentialGuarded('POST', '/mfa/passkeys/options', 'mfa.passkeyRegistrationOptions'),
  authenticated('POST', '/mfa/passkeys', 'mfa.registerPasskey'),
  authenticated('GET', '/mfa/passkeys', 'mfa.listPasskeys'),
  // POST, not DELETE: it carries a password and a code, and the admin fetch client sends no body
  // on a DELETE.
  credentialGuarded('POST', '/mfa/passkeys/remove', 'mfa.deletePasskey'),
  withPermission('GET', '/mfa/users/:id/passkeys', 'mfa.listUserPasskeys', 'admin::users.read'),
  // POST, not DELETE, for the reason `/mfa/passkeys/remove` gives: it carries credentials.
  credentialGuardedWithPermission(
    'POST',
    '/mfa/users/:id/passkeys/remove',
    'mfa.deleteUserPasskeys',
    'admin::users.update'
  ),
];
