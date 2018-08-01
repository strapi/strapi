const RateLimit = require('koa2-ratelimit').RateLimit;

module.exports = async (ctx, next) => {
  const message = ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.ratelimit' }] }] : 'Too many attempts, please try again in a minute.';

  return RateLimit.middleware({
    interval: 1*60*1000,
    max: 5,
    prefixKey: `${ctx.request.url}:${ctx.request.ip}`,
    message
  })(ctx, next);
};
