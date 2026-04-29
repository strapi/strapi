'use strict';

const path = require('path');
const utils = require('@strapi/utils');
const { isString, has, toLower } = require('lodash/fp');

const { RateLimitError } = utils.errors;

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
 */
const ROUTES_WITHOUT_IDENTIFIER = [
  '/auth/local',
  '/auth/reset-password',
  '/auth/change-password',
];

const isOAuthCallbackPath = (requestPath) => requestPath.includes('/connect/');

const routeUsesEmailIdentifier = (requestPath) => {
  if (isOAuthCallbackPath(requestPath)) {
    return false;
  }

  return !ROUTES_WITHOUT_IDENTIFIER.some((route) => requestPath.endsWith(route));
};

const buildPrefixKey = (ctx) => {
  const requestPath = isString(ctx.request.path)
    ? toLower(path.normalize(ctx.request.path))
    : 'invalidPath';

  if (!routeUsesEmailIdentifier(requestPath)) {
    return `noIdentifier:${requestPath}:${ctx.request.ip}`;
  }

  const userIdentifier = toLower(ctx.request.body.email) || 'unknownIdentifier';
  return `${userIdentifier}:${requestPath}:${ctx.request.ip}`;
};

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    let rateLimitConfig = strapi.config.get('plugin::users-permissions.ratelimit');

    if (!rateLimitConfig) {
      rateLimitConfig = {
        enabled: true,
      };
    }

    if (!has('enabled', rateLimitConfig)) {
      rateLimitConfig.enabled = true;
    }

    if (rateLimitConfig.enabled === true) {
      const rateLimit = require('koa2-ratelimit').RateLimit;

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: buildPrefixKey(ctx),
        handler() {
          throw new RateLimitError();
        },
        ...rateLimitConfig,
        ...config,
      };

      return rateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };

module.exports.buildPrefixKey = buildPrefixKey;
module.exports.ROUTES_WITHOUT_IDENTIFIER = ROUTES_WITHOUT_IDENTIFIER;
