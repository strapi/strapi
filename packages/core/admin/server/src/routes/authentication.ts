/**
 * The ceiling for the three `/login/mfa*` routes, whose rate-limit bucket is structurally forced
 * to collapse onto the source IP (see `/login/mfa` below). Ten times the middleware default,
 * because one bucket now covers every admin behind a shared address rather than one account.
 */
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
      // Same structural bucket collapse as `/reset-password` below: the body carries a challenge
      // token, not an email, so `admin::rateLimit`'s `${email}:${path}:${ip}` key degrades to the
      // source IP for every caller. The token must not become the key (it is secret material),
      // so the ceiling is raised at the route level instead.
      //
      // This step is stricter than the `/login` that precedes it if left at the default: `/login`
      // keys on email and so is effectively per-account, while this one is shared by the whole
      // deployment behind a load balancer. Brute force is not what this bucket defends -- reaching
      // here at all costs a correct password, and the per-challenge cap (`maxChallengeAttempts`)
      // plus the account-scoped rolling window in `admin::mfa` are the real limits, both keyed on
      // the actual user. This is a coarse abuse backstop only.
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
      // Same reasoning as `/login/mfa`. This one evaluates no factor at all, it only mints
      // ceremony options against an existing challenge.
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
      // `admin::rateLimit` keys on `${email}:${path}:${ip}`, but a reset body carries a token,
      // not an email -- and the token must never become part of a bucket identifier. Every reset
      // in the deployment therefore collapses onto one shared
      // `unknownEmail:/admin/reset-password:<ip>` bucket, so at the middleware's default a whole
      // org behind NAT gets five password resets between them. Raised here at the route level
      // rather than in the shared middleware, because this route is the one whose bucket is
      // structurally forced to collapse.
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
