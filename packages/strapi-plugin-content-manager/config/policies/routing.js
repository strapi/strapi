const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;

  if (source && _.get(strapi.plugins, [source, 'config', 'layout', ctx.params.model, 'actions', ctx.request.route.action])) {
    const [ controller, action ] = _.get(strapi.plugins, [source, 'config', 'layout', ctx.params.model, 'actions', ctx.request.route.action], []).split('.');

    if (controller && action) {
      // Redirect to specific controller.
      return await strapi.plugins[source].controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
