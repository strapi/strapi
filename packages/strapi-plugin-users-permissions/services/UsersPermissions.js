'use strict';

const fs = require('fs')
const path = require('path');
const stringify = JSON.stringify;
const _ = require('lodash');
/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  getActions: () => {
    // Plugin user-permissions path
    const roleConfigPath = path.join(
      strapi.config.appPath,
      'plugins',
      'users-permissions',
      'config',
      'roles.json',
    );

    const generateActions = (data) => (
      Object.keys(data).reduce((acc, key) => {
        acc[key] = { enabled: false, policy: '' };

        return acc;
    }, {}));

    const appControllers = Object.keys(strapi.api).reduce((acc, key) => {
      acc.controllers[key] = generateActions(strapi.api[key].controllers[key]);

      return acc;
    }, { controllers: {} });

    const pluginsPermissions = Object.keys(strapi.plugins).reduce((acc, key) => {
      const pluginControllers = Object.keys(strapi.plugins[key].controllers).reduce((obj, k) => {
        obj.icon = strapi.plugins[key].package.strapi.icon;
        obj.controllers[k] = generateActions(strapi.plugins[key].controllers[k]);

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

    try {
      const permissionsJSON = require(roleConfigPath);

      if (_.isEmpty(_.get(permissionsJSON, ['0', 'permissions']))) {
        _.set(permissionsJSON, ['0', 'permissions'], allPermissions);
        fs.writeFileSync(roleConfigPath, stringify(permissionsJSON, null, 2), 'utf8');
      }
    } catch(err) {
      console.log(err);
    }

    return allPermissions;
  }
};
