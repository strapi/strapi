const _ = require('lodash');
const { logger } = require('strapi-utils');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;

  if (source && _.get(strapi.plugins, [source, 'config', 'layout', ctx.params.model, 'actions', ctx.request.route.action])) {
    const [ controller, action ] = _.get(strapi.plugins, [source, 'config', 'layout', ctx.params.model, 'actions', ctx.request.route.action], []).split('.');

    if (controller && action) {
      logger.debug('Redirecting to controller %s and action %s', controller, action)
      return await strapi.plugins[source].controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
