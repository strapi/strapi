const _ = require('lodash');

module.exports = strapi => {
  return {
    beforeInitialize: function() {
      strapi.config.middleware.load.before.unshift('users-permissions');
    },

    initialize: function(cb) {
      _.forEach(strapi.config.routes, value => {
        value.config.policies.unshift('plugins.users-permissions.permissions');
      });

      if (strapi.plugins) {
        _.forEach(strapi.plugins, (plugin, name) => {
          _.forEach(plugin.config.routes, value => {
            value.config.policies.unshift('plugins.users-permissions.permissions');
          });
        });
      }

      cb();
    }
  };
};
