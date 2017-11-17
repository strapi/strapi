'use strict';

const fs = require('fs')
const path = require('path');
const stringify = JSON.stringify;
const _ = require('lodash');
// const Service = strapi.plugins['users-permissions'].services;
/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  getActions: () => {
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

    return allPermissions;
  },

  getRoleConfigPath: () => (
    path.join(
      strapi.config.appPath,
      'plugins',
      'users-permissions',
      'config',
      'roles.json',
    )
  ),

  updateData: (data, diff = 'unset') => {
    const dataToCompare = strapi.plugins['users-permissions'].services.userspermissions.getActions();

    _.forEach(data, (roleData, roleId) => {
      const obj = diff === 'unset' ? roleData.permissions : dataToCompare;

      _.forEach(obj, (pluginData, pluginName) => {
        _.forEach(pluginData.controllers, (controllerActions, controllerName) => {
          _.forEach(controllerActions, (actionData, actionName) => {
            if (diff === 'unset') {
              if (!_.get(dataToCompare, [pluginName, 'controllers', controllerName])) {
                _.unset(data, [roleId, 'permissions',  pluginName, 'controllers', controllerName]);
                return;
              }

              if (!_.get(dataToCompare, [pluginName, 'controllers', controllerName, actionName])) {
                _.unset(data, [roleId, 'permissions', pluginName, 'controllers', controllerName, actionName]);
              }
            } else {
              if (!_.get(data, [roleId, 'permissions', pluginName, 'controllers', controllerName, actionName])) {
                _.set(data, [roleId, 'permissions', pluginName, 'controllers', controllerName, actionName], { enabled: false, policy: '' })
              }
            }
          });
        });
      });
    });

    return data;
  },

  updatePermissions: async () => {
    const Service = strapi.plugins['users-permissions'].services.userspermissions
    const appActions = Service.getActions();
    const roleConfigPath = Service.getRoleConfigPath();
    const writePermissions = Service.writePermissions;
    const currentRoles = require(roleConfigPath);
    const remove = await Service.updateData(_.cloneDeep(currentRoles));
    const added = await Service.updateData(_.cloneDeep(remove), 'set');

    if (!_.isEqual(currentRoles, added)) {
      writePermissions(added);
    }
  },

  writePermissions: (data) => {
    const roleConfigPath = strapi.plugins['users-permissions'].services.userspermissions.getRoleConfigPath();

    try {
      fs.writeFileSync(roleConfigPath, stringify(data, null, 2), 'utf8');
    } catch(err) {
      strapi.log.error(err);
    }
  }
};
