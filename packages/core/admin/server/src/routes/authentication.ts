/** Ten times the middleware default, because the bucket covers every admin behind a shared
 * address rather than one account (see `/login/mfa` below). */
const MFA_LOGIN_RATE_LIMIT = 50;

export default [
  {
    method: 'POST',
    path: '/login',
    handler: 'authentication.login',
    config: {
      auth: false,
      middlewares: ['admin::rateLimit'],
    },
  },
  {
    method: 'POST',
    path: '/login/mfa',
    handler: 'authentication.loginMfa',
    config: {
      policies: ['admin::isMfaEnabled'],
      auth: false,
      // The body carries a challenge token, not an email, so `admin::rateLimit`'s key degrades to the
      // source IP -- and the token must never become the key. Left at the default this is stricter than
      // the `/login` before it, which keys per-account. A coarse abuse backstop only: the real limits
      // are the per-challenge cap and the account-scoped window, both keyed on the user.
      middlewares: [{ name: 'admin::rateLimit', config: { max: MFA_LOGIN_RATE_LIMIT } }],
    },
  },
  {
    method: 'POST',
    path: '/login/mfa/webauthn/options',
    handler: 'authentication.loginMfaWebauthnOptions',
    config: {
      policies: ['admin::isMfaEnabled'],
      auth: false,
      // Same as `/login/mfa`, though this evaluates no factor at all.
      middlewares: [{ name: 'admin::rateLimit', config: { max: MFA_LOGIN_RATE_LIMIT } }],
    },
  },
  {
    method: 'POST',
    path: '/login/mfa/webauthn',
    handler: 'authentication.loginMfaWebauthn',
    config: {
      policies: ['admin::isMfaEnabled'],
      auth: false,
      // Same reasoning as `/login/mfa`.
      middlewares: [{ name: 'admin::rateLimit', config: { max: MFA_LOGIN_RATE_LIMIT } }],
    },
  },
  {
    method: 'POST',
    path: '/access-token',
    handler: 'authentication.accessToken',
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/register-admin',
    handler: 'authentication.registerAdmin',
    config: {
      auth: false,
      middlewares: ['admin::rateLimit'],
    },
  },
  {
    method: 'GET',
    path: '/registration-info',
    handler: 'authentication.registrationInfo',
    config: { auth: false },
  },
  {
    method: 'POST',
    path: '/register',
    handler: 'authentication.register',
    config: { auth: false },
  },
  {
    method: 'POST',
    path: '/forgot-password',
    handler: 'authentication.forgotPassword',
    config: {
      auth: false,
      middlewares: ['plugin::email.rateLimit'],
    },
  },
  {
    method: 'POST',
    path: '/reset-password',
    handler: 'authentication.resetPassword',
    config: {
      auth: false,
      // Same collapse: a reset body carries a token, not an email, so every reset in the deployment
      // shares one `unknownEmail:<path>:<ip>` bucket -- five between a whole org behind NAT.
      middlewares: [{ name: 'admin::rateLimit', config: { max: 20 } }],
    },
  },
  {
    method: 'POST',
    path: '/logout',
    handler: 'authentication.logout',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
