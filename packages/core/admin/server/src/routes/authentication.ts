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
      auth: false,
      middlewares: ['admin::rateLimit'],
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
      // `admin::rateLimit` keys on `${email}:${path}:${ip}` (middlewares/rateLimit.ts), but a
      // reset body carries a reset token, not an email -- the token itself must never become the
      // key, since that would make secret material part of a rate-limit bucket identifier. Every
      // reset in the deployment therefore collapses onto one shared
      // `unknownEmail:/admin/reset-password:<ip>` bucket, so at the middleware's own default
      // (`max: 5` per 5 minutes) a whole org behind NAT, or behind an unproxied reverse proxy,
      // would get five password resets total regardless of how many distinct accounts are
      // resetting. Raised to 4x the default (20) here, at the route level, rather than changed in
      // the shared middleware: this route is the one whose bucket is structurally forced to
      // collapse, and the middleware's per-route `{ name, config }` override exists exactly for
      // this (see `services/server/middleware.ts`'s `resolveMiddlewares`).
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
