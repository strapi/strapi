/**
 * What becomes of each Users & Permissions config key (`config/plugins.ts`, `users-permissions`)
 * when a project moves to this plugin. `target` is the key to set instead, or `null` when the key
 * has no counterpart, in which case `note` says why and what to do.
 */
export const UP_CONFIG_MAP: Record<string, { target: string | null; note: string }> = {
  jwtSecret: {
    target: 'compat.legacyJwt.secret',
    note: 'Only needed while tokens signed with it are still in use; they are accepted until compat.legacyJwt.until.',
  },
  jwt: {
    target: 'session.expiresIn',
    note: 'New sessions are not JWTs. Their lifetime is the session lifetime; the algorithm applies to old tokens only (compat.legacyJwt.algorithm).',
  },
  jwtManagement: {
    target: 'compat.refresh.enabled',
    note: "'refresh' maps to compat.refresh.enabled; 'legacy-support' needs nothing, a session token takes the place of the JWT.",
  },
  'sessions.accessTokenLifespan': {
    target: null,
    note: 'There is no separate access token: the session token lasts as long as the session (session.expiresIn).',
  },
  'sessions.maxRefreshTokenLifespan': {
    target: 'session.expiresIn',
    note: 'The session lifetime bounds how long a refresh can go on.',
  },
  'sessions.idleRefreshTokenLifespan': {
    target: 'session.updateAge',
    note: 'A session is renewed when it is used after this long.',
  },
  'sessions.maxSessionLifespan': {
    target: 'session.expiresIn',
    note: 'The longest a session lasts, however often it is used.',
  },
  'sessions.idleSessionLifespan': {
    target: 'session.updateAge',
    note: 'A session is renewed when it is used after this long.',
  },
  'sessions.httpOnly': {
    target: 'compat.refresh.httpOnly',
    note: 'Sends the refresh token in a cookie the browser script cannot read.',
  },
  'sessions.cookie.name': {
    target: 'compat.refresh.cookie.name',
    note: 'Defaults to the name Users & Permissions uses.',
  },
  'sessions.cookie.path': { target: 'compat.refresh.cookie.path', note: 'Defaults to /.' },
  'sessions.cookie.domain': {
    target: 'compat.refresh.cookie.domain',
    note: 'Unset by default.',
  },
  'sessions.cookie.sameSite': {
    target: 'compat.refresh.cookie.sameSite',
    note: "'lax', 'strict' or 'none'.",
  },
  'sessions.cookie.secure': {
    target: 'compat.refresh.cookie.secure',
    note: 'Follows NODE_ENV when not set.',
  },
  'sessions.cookie.maxAge': {
    target: 'compat.refresh.cookie.maxAge',
    note: 'Unset by default: the cookie lasts as long as the session.',
  },
  'ratelimit.enabled': { target: 'rateLimit.enabled', note: 'On by default in every environment.' },
  'ratelimit.interval': {
    target: 'rateLimit.window',
    note: 'Seconds here; Users & Permissions took milliseconds.',
  },
  'ratelimit.max': { target: 'rateLimit.max', note: 'Requests per window.' },
  // The next five are not keys of Users & Permissions itself: it hands its `ratelimit` object to the
  // rate limiter it uses, so a project can set them there
  'ratelimit.delayAfter': {
    target: null,
    note: 'Passed through to the rate limiter, not a key of its own. Requests are refused past the limit; they are not slowed down first. Use rateLimit.customRules to set a limit per path.',
  },
  'ratelimit.timeWait': {
    target: null,
    note: 'Passed through to the rate limiter, not a key of its own. There is no delay step: see rateLimit.window for how long a client waits.',
  },
  'ratelimit.prefixKey': {
    target: null,
    note: 'Passed through to the rate limiter, not a key of its own. Limits are kept per client address and path.',
  },
  'ratelimit.whitelist': {
    target: 'rateLimit.customRules',
    note: "Passed through to the rate limiter, not a key of its own. Set a path's rule to false to leave it out of the limit.",
  },
  'ratelimit.store': {
    target: 'rateLimit.storage',
    note: "Passed through to the rate limiter, not a key of its own. Here it is 'database' or 'memory'.",
  },
  'register.allowedFields': {
    target: null,
    note: 'Set in the admin under Settings, as the sign-up registration fields.',
  },
  'validationRules.validatePassword': {
    target: null,
    note: 'Set in the admin under Settings, as the password rules (length and character classes). Custom logic in the function is not carried over: express it with those rules or in a hook.',
  },
  'callback.validate': {
    target: 'compat.connect.callbacks',
    note: "The plugin checked a callback sent with a request against the provider's own callback, by origin and path. Here each provider has one callback URL set in this key, and its origin has to be trusted.",
  },
  layout: {
    target: null,
    note: 'Not used: the admin lays out the user, role and profile screens itself.',
  },
};
