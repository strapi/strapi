const pathToRegexp = require('path-to-regexp');
const _ = require('lodash');

module.exports = async (ctx, next) => {
  const config = strapi.plugins['users-permissions'].config;
  let match = false;

  const matchRoute = async (route, plugin) => {
    if (match) {
      return false;
    }

    let value = _.clone(route.path);

    if (route.config.prefix !== undefined) {
      value = route.config.prefix + value;
    } else if (plugin) {
      value = `${plugin}/${value}`;
    }

    const re = pathToRegexp(value);
    match = re.test(ctx.url) && ctx.method === route.method;

    if (match) {
      const permissions = _.get(config, ['0', 'permissions', plugin || 'application']);
      const action = _.get(permissions, `controllers.${route.handler.toLowerCase()}`);

      if (action.enabled) {
        await next();
      } else {
        ctx.unauthorized('Nop!');
      }
    }
  };

  _.forEach(strapi.config.routes, value => {
    matchRoute(value);
  });

  if (strapi.plugins) {
    _.forEach(strapi.plugins, (plugin, name) => {
      _.forEach(plugin.config.routes, value => {
        matchRoute(value, name);
      });
    });
  }
};
