import type { Context, Next } from 'koa';
import type { Core } from '@strapi/types';
import koa2Ratelimit from 'koa2-ratelimit';

import path from 'path';
import { errors } from '@strapi/utils';
import lodash from 'lodash';

const { toLower, isString, has } = lodash;

// The koa2-ratelimit types below are local on purpose. `@types/koa2-ratelimit` depends on mongoose
// (and through it on mongodb and @aws-sdk), so it cannot be a runtime dependency. The published
// declarations of this plugin must not reference types that apps cannot resolve. `globals.d.ts`
// types the `koa2-ratelimit` import for the same reason.

/** A rate limit duration: milliseconds, or time units that add up, such as `{ min: 5 }`. */
type RateLimitDuration =
  | number
  | Partial<Record<'ms' | 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year', number>>;

/**
 * The `plugin::users-permissions.ratelimit` config and the `rateLimit` route middleware config.
 * The middleware passes the other rate limiter options, such as `delayAfter` or `store`, as is.
 */
type RateLimitConfig = {
  enabled?: boolean;
  interval?: RateLimitDuration;
  max?: number;
  [option: string]: unknown;
};

type RequestContext = { request: { path?: unknown; ip?: string; body?: unknown } };

const { RateLimitError } = errors;

/**
 * Routes where the rate-limit key MUST NOT include a user identifier
 * derived from `ctx.request.body.email`.
 *
 * On these routes the request body either has no `email` field
 * (e.g. /auth/local uses `identifier`, /auth/reset-password uses
 * `code`, /auth/change-password uses `currentPassword`) or the
 * field is not part of the route contract. Including the
 * attacker-controlled `body.email` in the rate-limit key on these
 * routes lets a caller obtain a fresh key on every request by
 * varying that field, effectively bypassing per-IP throttling.
 *
 * Comparison uses endsWith so the check is stable under any router
 * mount prefix (e.g. `/api/auth/local`).
 *
 * @see https://github.com/strapi/strapi/security/advisories/GHSA-7mqx-wwh4-f9fw
 *
 * When adding a new `rateLimit`-protected auth route whose body does not
 * use `email` as the real identifier, add its path suffix here (or an
 * equivalent `routeUsesEmailIdentifier` rule) so the key cannot be split
 * with arbitrary `body.email` values.
 */
const ROUTES_WITHOUT_IDENTIFIER = ['/auth/local', '/auth/reset-password', '/auth/change-password'];

const isOAuthCallbackPath = (requestPath: string) => requestPath.includes('/connect/');

const routeUsesEmailIdentifier = (requestPath: string) => {
  if (isOAuthCallbackPath(requestPath)) {
    return false;
  }

  return !ROUTES_WITHOUT_IDENTIFIER.some((route) => requestPath.endsWith(route));
};

/**
 * Paths suitable for route matching and prefix keys: POSIX-normalized,
 * lower-cased, trailing slashes removed so `/api/auth/local` and
 * `/api/auth/local/` share one bucket.
 */
const normalizeRequestPathForRateLimit = (requestPath: string) => {
  const normalized = path.posix.normalize(requestPath);
  const lower = normalized.toLowerCase();
  return lower.replace(/\/+$/, '') || '/';
};

const getEmailIdentifierForKey = (body: unknown) => {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('email' in body) ||
    !isString(body.email) ||
    body.email === ''
  ) {
    return 'unknownIdentifier';
  }

  return toLower(body.email);
};

const buildPrefixKey = (ctx: RequestContext) => {
  let requestPath;
  if (!isString(ctx.request.path)) {
    requestPath = 'invalidPath';
  } else {
    requestPath = normalizeRequestPathForRateLimit(ctx.request.path);
    if (requestPath === '.' || requestPath === '..') {
      requestPath = 'invalidPath';
    }
  }

  if (!routeUsesEmailIdentifier(requestPath)) {
    return `noIdentifier:${requestPath}:${ctx.request.ip}`;
  }

  const userIdentifier = getEmailIdentifierForKey(ctx.request.body);
  return `${userIdentifier}:${requestPath}:${ctx.request.ip}`;
};

const buildRateLimitLoadConfig = (
  ctx: RequestContext,
  rateLimitConfig: RateLimitConfig,
  routeMiddlewareConfig: RateLimitConfig
) => {
  return {
    interval: { min: 5 },
    max: 5,
    ...rateLimitConfig,
    ...routeMiddlewareConfig,
    handler() {
      throw new RateLimitError();
    },
    prefixKey: buildPrefixKey(ctx),
  };
};

const rateLimitMiddleware =
  (config: RateLimitConfig, { strapi }: { strapi: Core.Strapi }) =>
  async (ctx: Context, next: Next) => {
    let rateLimitConfig = strapi.config.get<RateLimitConfig>('plugin::users-permissions.ratelimit');

    if (!rateLimitConfig) {
      rateLimitConfig = {
        enabled: true,
      };
    }

    if (!has(rateLimitConfig, 'enabled')) {
      rateLimitConfig.enabled = true;
    }

    if (rateLimitConfig.enabled === true) {
      const rateLimit = koa2Ratelimit.RateLimit;

      const loadConfig = buildRateLimitLoadConfig(ctx, rateLimitConfig, config);

      return rateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };

export {
  buildPrefixKey,
  ROUTES_WITHOUT_IDENTIFIER,
  normalizeRequestPathForRateLimit,
  buildRateLimitLoadConfig,
};

// Keep the helpers on the registered middleware, where the JavaScript plugin exposed them.
export default Object.assign(rateLimitMiddleware, {
  buildPrefixKey,
  ROUTES_WITHOUT_IDENTIFIER,
  normalizeRequestPathForRateLimit,
  buildRateLimitLoadConfig,
});
