'use strict';

const { has } = require('lodash/fp');

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    let rateLimitConfig = strapi.plugin('documentation').config('rateLimit');

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
        prefixKey: `${ctx.request.path}:${ctx.request.ip}`,
        handler() {
          return ctx.redirect(
            `${strapi.config.server.url}${
              strapi.config.get('plugin.documentation.x-strapi-config').path
            }${'?error=ToManyTries'}`
          );
        },
        ...rateLimitConfig,
        ...config,
      };

      return rateLimit.middleware(loadConfig)(ctx, next);
    }

    return next();
  };
