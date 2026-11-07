/**
 * Declarations of the `strapi-server` entry of `@strapi/plugin-users-permissions`, a JavaScript
 * package. They register its config and middleware contracts for applications with
 * `typescript.strictTypes`, until the plugin moves to TypeScript and emits its own declarations
 * (https://github.com/strapi/strapi/pull/27928).
 *
 * Nothing checks this file against `server/src/config.js` or `server/src/middlewares/rateLimit.js`:
 * update it by hand when they change.
 */

/** The `jwtManagement` modes of the Content API authentication. */
export type JwtManagement = 'legacy-support' | 'refresh';

/**
 * `strapi.config.get('plugin::users-permissions')`: the plugin config merged with its defaults
 * (`server/src/config.js`).
 */
export type UsersPermissionsConfig = {
  /** `JWT_SECRET`, unset when the environment does not define it. */
  jwtSecret?: string;
  /** Options of the plugin JWTs (`legacy-support` mode), e.g. `expiresIn`. */
  jwt: { expiresIn?: string | number; [option: string]: unknown };
  jwtManagement: JwtManagement;
  /** Session manager lifespans, in seconds, and the refresh cookie (`refresh` mode). */
  sessions: {
    accessTokenLifespan: number;
    maxRefreshTokenLifespan: number;
    idleRefreshTokenLifespan: number;
    maxSessionLifespan: number;
    idleSessionLifespan: number;
    httpOnly: boolean;
    cookie?: {
      name?: string;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none' | boolean;
      path?: string;
      domain?: string;
      maxAge?: number;
    };
  };
  /** Options of the authentication routes' rate limit. */
  ratelimit: { interval: number; max: number; [option: string]: unknown };
  layout: { user: { actions: { create: string; update: string } } };
  callback: {
    /** Throws when a provider callback URL is not allowed. */
    validate(callback: string, provider: { callback: string }): void;
  };
  /** Extra user fields the register route accepts. */
  register?: { allowedFields?: string[] };
  /** Password validation rules of the register and password routes. */
  validationRules?: Record<string, unknown>;
};

/**
 * The koa context the callbacks receive. `koa` is not a dependency of the plugin, which these
 * declarations cannot reference: `never` accepts a callback typed with any context.
 */
type Context = never;

/** A duration in milliseconds, or in units such as `{ min: 5 }`. */
type Duration =
  | number
  | Partial<Record<'ms' | 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year', number>>;

/**
 * The route config of the `plugin::users-permissions.rateLimit` middleware: options of
 * koa2-ratelimit's `RateLimit.middleware`, which ships no types. The middleware spreads them over
 * the `ratelimit` plugin config and forwards the result, so other options reach koa2-ratelimit
 * unchecked. It sets `handler` and `prefixKey` itself, over any value passed here.
 */
export type RateLimitMiddlewareConfig = {
  /** How long to keep records of requests. */
  interval?: Duration;
  /** Requests allowed before responses are delayed. */
  delayAfter?: number;
  /** Base delay of a delayed response, multiplied by the number of recent hits. */
  timeWait?: Duration;
  /** Requests allowed per `interval` before responding with `statusCode`. */
  max?: number;
  message?: unknown;
  messageKey?: string;
  statusCode?: number;
  /** Whether to send the rate limit headers. */
  headers?: boolean;
  /** Whether failed requests (status >= 400) are not counted. */
  skipFailedRequests?: boolean;
  prefixKeySeparator?: string;
  /** User ids that are never limited. */
  whitelist?: string[];
  store?: unknown;
  keyGenerator?: (ctx: Context) => string | Promise<string>;
  getUserIdFromKey?: (key: string) => string;
  skip?: (ctx: Context) => boolean | Promise<boolean>;
  getUserId?: (ctx: Context) => string | Promise<string>;
  onLimitReached?: (ctx: Context) => unknown;
  weight?: (ctx: Context) => number | Promise<number>;
  [option: string]: unknown;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        'plugin::users-permissions': UsersPermissionsConfig;
      }

      interface PackageMiddlewares {
        // Its auth routes name it without config (`server/src/routes/content-api/auth.js`).
        'plugin::users-permissions.rateLimit': RateLimitMiddlewareConfig | undefined;
      }
    }
  }
}

/** The plugin's server entry. Untyped, as the JavaScript entry was without these declarations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const usersPermissions: any;
export default usersPermissions;
