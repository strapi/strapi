import { validateConfig } from './validate-config';

type Env = {
  (key: string): string | undefined;
  (key: string, defaultValue: string): string;
};

/**
 * Defaults and validator of the plugin configuration.
 *
 * `auth` has no default: it is optional, the project's Better Auth options written with
 * `defineAuth()` (`'end-users'.config.auth` in config/plugins.ts).
 *
 * `appName` is optional and unset by default: the name an authenticator app shows for the account
 * (the two-factor issuer).
 *
 * `providers` is a list of provider package names (installed, then configured in the admin) and
 * `{ provider, options, enabled? }` entries (a built-in or a package configured here, locked in the
 * admin). Better Auth's own providers need nothing installed.
 *
 * `compat` is the Users & Permissions compatibility mode, config only. `compat.usersPermissions`
 * turns on the old routes and payloads. `compat.legacyJwt` accepts tokens the old plugin signed
 * (`secret`, `algorithm`) until `until`, a date such as `'2027-06-30'` (the end of that day, UTC).
 * `compat.refresh` turns on refresh tokens, sent in the body or, with `httpOnly`, in a cookie
 * (`cookie.secure` is left out here: it follows `NODE_ENV` unless set). `compat.connect.callbacks`
 * maps a provider id to the URL its front end receives the sign-in on, an absolute URL on a
 * trusted origin.
 *
 * `rateLimit.enabled` is `true` in every environment (Better Auth itself only limits in production).
 * `rateLimit.window` (seconds), `rateLimit.max` and `rateLimit.customRules` have no default here:
 * left out, Better Auth's own apply (10 seconds, 100 requests). `customRules` is Better Auth's own
 * shape, keyed by path.
 *
 * `rateLimit.storage` has no default here: it is `'database'` in production and `'memory'`
 * otherwise, which the engine decides from the environment when it starts.
 *
 * `session.cookieCache` is off by default. When it is on (a duration such as `'5m'`), Better Auth's
 * own `/get-session` answers from a signed cookie for that long without asking the database, so a
 * session that was revoked, or a user who was banned, still looks signed in to it until the cache
 * runs out: turning it on delays revocation by its duration. Strapi's own authorization is not
 * affected (it always reads the database).
 */
export default {
  default: ({ env }: { env: Env }) => ({
    secret: env('END_USERS_SECRET'),
    appName: undefined as string | undefined,
    trustedOrigins: [] as string[],
    cookies: { crossSite: false },
    session: { expiresIn: '7d', updateAge: '1d', cookieCache: false as string | false },
    compat: {
      usersPermissions: false,
      legacyJwt: {
        secret: env('JWT_SECRET'),
        until: null as string | null,
        algorithm: 'HS256',
      },
      refresh: {
        enabled: false,
        httpOnly: false,
        cookie: {
          name: 'strapi_up_refresh',
          sameSite: 'lax',
          path: '/',
          domain: null as string | null,
          maxAge: null as number | null,
        },
      },
      connect: { callbacks: {} as Record<string, string> },
    },
    rateLimit: { enabled: true },
    providers: [] as unknown[],
    explain: false,
  }),
  validator: (config: unknown) => validateConfig(config),
};
