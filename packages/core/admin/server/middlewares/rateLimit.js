'use strict';

const utils = require('@strapi/utils');

const { RateLimitError } = utils.errors;

module.exports =
  (config, { strapi }) =>
  async (ctx, next) => {
    const ratelimit = require('koa2-ratelimit').RateLimit;

    const userEmail = ctx.request.body.email || 'unknownEmail';

    return ratelimit.middleware({
      interval: { min: 5 },
      max: 5,
      prefixKey: `${userEmail}${ctx.request.path}:${ctx.request.ip}`,
      handler() {
        throw new RateLimitError();
      },
      ...strapi.config.get('admin.ratelimit'),
      ...config,
    })(ctx, next);
  };
