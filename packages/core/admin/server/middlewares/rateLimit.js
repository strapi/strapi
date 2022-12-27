'use strict';

const utils = require('@strapi/utils');
const { has, toLower } = require('lodash/fp');

const { RateLimitError } = utils.errors;

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    let ratelimitConfig = strapi.config.get('admin.ratelimit');

    if (!ratelimitConfig) {
      ratelimitConfig = {
        enabled: true,
      };
    }

    if (!has('enabled', ratelimitConfig)) {
      ratelimitConfig.enabled = true;
    }

    if (ratelimitConfig.enabled === true) {
      const ratelimit = require('koa2-ratelimit').RateLimit;

      const userEmail = toLower(ctx.request.body.email) || 'unknownEmail';

      const loadConfig = {
        interval: { min: 5 },
        max: 5,
        prefixKey: `${userEmail}:${ctx.request.path}:${ctx.request.ip}`,
        handler() {
          throw new RateLimitError();
        },
        ...ratelimitConfig,
        ...config,
      };

      console.log(loadConfig);

      return ratelimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };
