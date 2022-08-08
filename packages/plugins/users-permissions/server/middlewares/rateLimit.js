'use strict';

module.exports = (config, { strapi }) => async (ctx, next) => {
  const ratelimit = require('koa2-ratelimit').RateLimit;

  const message = [
    {
      messages: [
        {
          id: 'Auth.form.error.ratelimit',
          message: 'Too many attempts, please try again in a minute.',
        },
      ],
    },
  ];

  return ratelimit.middleware({
    interval: 1 * 60 * 1000,
    max: 5,
    prefixKey: `${ctx.request.path}:${ctx.request.ip}`,
    message,
    ...strapi.config.get('plugin.users-permissions.ratelimit'),
    ...config,
  })(ctx, next);
};
