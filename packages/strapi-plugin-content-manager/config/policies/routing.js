const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;

  ctx.request.query.redirectQuery = {};

  if (source && _.get(strapi.plugins, [source, 'config', 'layout', 'actions', ctx.request.route.action])) {
    ctx.request.query.redirectQuery = _.get(strapi.plugins, [source, 'config', 'layout', 'actions']);
  }

  await next();
};
