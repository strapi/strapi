const authenticated = (method: string, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: {
    policies: ['admin::isAuthenticatedAdmin'],
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
];
