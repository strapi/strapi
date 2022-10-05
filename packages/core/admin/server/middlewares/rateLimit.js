'use strict';

const utils = require('@strapi/utils');

const { RateLimitError } = utils.errors;

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    const ratelimit = require('koa2-ratelimit').RateLimit;

    return ratelimit.middleware({
      interval: { min: 15 },
      max: 5,
      prefixKey: `${ctx.request.path}:${ctx.request.ip}`,
      handler() {
        throw new RateLimitError();
      },
      ...strapi.config.get('admin.ratelimit'),
      ...config,
    })(ctx, next);
  };
