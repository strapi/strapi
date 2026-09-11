const authenticated = (method: string, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: {
    policies: ['admin::isMfaEnabled', 'admin::isAuthenticatedAdmin'],
    middlewares: ['admin::rateLimit'],
  },
});

/** Authenticated plus one `admin::hasPermissions` action: the administrator-facing routes. */
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
    middlewares: ['admin::rateLimit'],
  },
});

export default [
  authenticated('GET', '/mfa/me', 'mfa.me'),
  authenticated('POST', '/mfa/enrol', 'mfa.enrol'),
  authenticated('POST', '/mfa/enrol/verify', 'mfa.verifyEnrolment'),
  authenticated('POST', '/mfa/recovery-codes', 'mfa.regenerateRecoveryCodes'),
  authenticated('POST', '/mfa/recovery-codes/ack', 'mfa.acknowledgeRecoveryCodes'),
  authenticated('POST', '/mfa/disable', 'mfa.disable'),
  authenticated('GET', '/mfa/notices', 'mfa.notices'),
  authenticated('POST', '/mfa/notices/seen', 'mfa.markNoticesSeen'),
  // Trusted devices: the caller's own trusted browsers.
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
  // Passkeys: the caller's own passkeys. `/mfa/passkeys/options` is listed before the `:id` route
  // so the more specific path is registered first, even though the methods already differ.
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
