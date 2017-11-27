const _ = require('lodash');

module.exports = strapi => {
  return {
    initialize: function(cb) {
      _.forEach(strapi.config.routes, value => {
        value.config.policies.unshift('plugins.users-permissions.isAuthenticated');
      });

      if (strapi.plugins) {
        _.forEach(strapi.plugins, (plugin, name) => {
          _.forEach(plugin.config.routes, value => {
            value.config.policies.unshift('plugins.users-permissions.isAuthenticated');
          });
        });
      }

      cb();
    }
  };
};
