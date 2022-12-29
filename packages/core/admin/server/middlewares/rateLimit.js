'use strict';

const utils = require('@strapi/utils');
const { has, toLower } = require('lodash/fp');

const { RateLimitError } = utils.errors;

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    let rateLimitConfig = strapi.config.get('admin.rateLimit');

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

      const userEmail = toLower(ctx.request.body.email) || 'unknownEmail';

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: `${userEmail}:${ctx.request.path}:${ctx.request.ip}`,
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
