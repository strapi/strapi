'use strict';

const _ = require('lodash');

module.exports = {
  defaults: { 'users-permissions': { enabled: true } },
  load: {
    beforeInitialize() {
      strapi.config.middleware.load.before.unshift('users-permissions');
    },

    initialize() {
      _.forEach(strapi.admin.routes, value => {
        if (_.get(value.config, 'policies')) {
          value.config.policies.unshift('plugin::users-permissions.permissions');
        }
      });

      _.forEach(strapi.config.routes, value => {
        if (_.get(value.config, 'policies')) {
          value.config.policies.unshift('plugin::users-permissions.permissions');
        }
      });

      if (strapi.plugins) {
        _.forEach(strapi.plugins, plugin => {
          _.forEach(plugin.routes, route => {
            if (_.get(route.config, 'policies')) {
              route.config.policies.unshift('plugin::users-permissions.permissions');
            }
          });
        });
      }
    },
  },
};
