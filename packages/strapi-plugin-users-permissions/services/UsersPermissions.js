'use strict';

const fakeData = require('../config/fakeData.json');
const _ = require('lodash');
/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  getActions: () => {

    // TODO
    const appControllers = Object.keys(strapi.api).reduce((acc, key) => {
      const actions = Object.keys(strapi.api[key].controllers[key]).reduce((obj, k) => {
        obj[k] = { enabled: false, policy: 'test' };

        return obj;
      }, {});
      acc.controllers[key] = actions;

      return acc;
    }, { controllers: {} });

    const pluginsPermissions = Object.keys(strapi.plugins).reduce((acc, key) => {
      const pluginControllers = Object.keys(strapi.plugins[key].controllers).reduce((obj, k) => {
        const actions = Object.keys(strapi.plugins[key].controllers[k]).reduce((obj, k) => {
          obj[k] = { enabled: false, policy: 'test' };

          return obj;
        }, {});

        obj.icon = strapi.plugins[key].package.strapi.icon;
        obj.controllers[k] = actions;

        return obj;

      }, { icon: '', controllers: {} });

      acc[key] = pluginControllers;

      return acc;
    }, {});

    const permissions = {
      application: {
        icon: '',
        controllers: appControllers.controllers,
      },
    };

    const allPermissions = _.merge(permissions, pluginsPermissions);

    return allPermissions;
  }
};
