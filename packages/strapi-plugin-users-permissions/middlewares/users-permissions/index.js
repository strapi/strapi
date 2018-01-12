'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = strapi => {
  return {
    beforeInitialize: function() {
      strapi.config.middleware.load.before.unshift('users-permissions');
    },

    initialize: function(cb) {
      _.forEach(strapi.config.routes, value => {
        if (_.get(value.config, 'policies')) {
          value.config.policies.unshift('plugins.users-permissions.permissions');
        }
      });

      if (strapi.plugins) {
        _.forEach(strapi.plugins, (plugin, name) => {
          _.forEach(plugin.config.routes, value => {
            if (_.get(value.config, 'policies')) {
              value.config.policies.unshift('plugins.users-permissions.permissions');
            }
          });
        });
      }

      cb();
    }
  };
};
