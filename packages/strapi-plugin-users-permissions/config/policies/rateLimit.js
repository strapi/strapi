const RateLimit = require('koa2-ratelimit').RateLimit;

module.exports = async (ctx, next) => {
  const message = ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.ratelimit' }] }] : 'Too many attempts, please try again in a minute.';

  return RateLimit.middleware(Object.assign({}, {
    interval: 1*60*1000,
    max: 5,
    prefixKey: `${ctx.request.url}:${ctx.request.ip}`,
    message
  }, strapi.plugins['users-permissions'].config.ratelimit))(ctx, next);
};
