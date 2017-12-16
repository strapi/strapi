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
  createRole: (role) => {
    const appRoles = strapi.plugins['users-permissions'].config.roles;
    const highestId = Math.max(...Object.keys(appRoles).map(Number)) + 1;
    const newRole = _.pick(role, ['name', 'description', 'permissions']);

    _.set(appRoles, highestId.toString(), newRole);

    _.forEach(role.users, (user) => {
      module.exports.updateUserRole(user, highestId);
    });

    module.exports.writePermissions(appRoles);
  },

  deleteRole: async (roleId) => {
    const appRoles = strapi.plugins['users-permissions'].config.roles

    module.exports.writePermissions(_.omit(appRoles, [roleId]));

    const users = await strapi.query('user', 'users-permissions').find(strapi.utils.models.convertParams('user', {
      role: roleId
    }));

    _.forEach(users, (user) => {
      module.exports.updateUserRole(user, '1');
    });
  },

  getActions: () => {
    const generateActions = (data) => (
      Object.keys(data).reduce((acc, key) => {
        acc[key] = { enabled: false, policy: '' };

        return acc;
    }, {}));

    const appControllers = Object.keys(strapi.api || {}).reduce((acc, key) => {
      acc.controllers[key] = generateActions(strapi.api[key].controllers[key]);

      return acc;
    }, { controllers: {} });

    const pluginsPermissions = Object.keys(strapi.plugins).reduce((acc, key) => {
      acc[key] = Object.keys(strapi.plugins[key].controllers).reduce((obj, k) => {
        obj.controllers[k] = generateActions(strapi.plugins[key].controllers[k]);

        return obj;

      }, { controllers: {} });

      return acc;
    }, {});

    const permissions = {
      application: {
        controllers: appControllers.controllers,
      },
    };

    return _.merge(permissions, pluginsPermissions);;
  },

  getRole: async (roleId) => {
    const appRoles = strapi.plugins['users-permissions'].config.roles
    appRoles[roleId].users = await strapi.query('user', 'users-permissions').find(strapi.utils.models.convertParams('user', { role: roleId }));

    return appRoles[roleId];
  },

  getRoles: async () => {
    const roles = strapi.plugins['users-permissions'].config.roles;
    const usersCount = await strapi.query('user', 'users-permissions').countByRoles();
    const formattedRoles = Object.keys(roles).reduce((acc, key) => {
      const role = _.pick(roles[key], ['name', 'description']);

      _.set(role, 'id', key);
      _.set(role, 'nb_users', _.get(_.find(usersCount, { _id: parseFloat(key) }), 'total', 0));
      acc.push(role);

      return acc;
    }, []);

    return formattedRoles;
  },

  getRoutes: async () => {
    const apiRoutes = strapi.api ? Object.keys(strapi.api).reduce((acc, current) => {
      return acc.concat(strapi.api[current].config.routes);
    }, []) : [];

    const pluginsRoutes = Object.keys(strapi.plugins).reduce((acc, current) => {
      acc[current] = strapi.plugins[current].config.routes;

      return acc;
    }, []);

    return _.merge({ application: apiRoutes}, pluginsRoutes);
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
            } else if (!_.get(data, [roleId, 'permissions', pluginName, 'controllers', controllerName, actionName])) {
              const isCallback = actionName === 'callback' && controllerName === 'auth' && pluginName === 'users-permissions' && roleId === '1';
              const isRegister = actionName === 'register' && controllerName === 'auth' && pluginName === 'users-permissions' && roleId === '1';
              const isPassword = actionName === 'forgotPassword' && controllerName === 'auth' && pluginName === 'users-permissions' && roleId === '1';
              const isNewPassword = actionName === 'changePassword-password' && controllerName === 'auth' && pluginName === 'users-permissions' && roleId === '1';
              const isInit = actionName === 'init' && controllerName === 'userspermissions';
              const enabled = isCallback || isRegister || roleId === '0' || isInit || isPassword || isNewPassword;

              _.set(data, [roleId, 'permissions', pluginName, 'controllers', controllerName, actionName], { enabled, policy: '' })
            }
          });
        });
      });
    });

    return data;
  },

  updatePermissions: async (cb) => {
    const appActions = module.exports.getActions();
    const writePermissions = module.exports.writePermissions;
    const currentRoles = strapi.plugins['users-permissions'].config.roles || {
      '0': {
        description: '',
        name: 'Administrator',
        permissions: {
          application: {
            controllers: {},
          },
        },
      },
      '1': {
        description: '',
        name: 'Guest',
        permissions: {
          application: {
            controllers: {},
          },
        },
      },
    };

    const remove = await module.exports.updateData(_.cloneDeep(currentRoles));
    const added = await module.exports.updateData(_.cloneDeep(remove), 'set');

    if (!_.isEqual(currentRoles, added)) {
      writePermissions(added);
    }

    if (cb) {
      cb();
    }
  },

  updateRole: async (roleId, body) => {
    const appRoles = strapi.plugins['users-permissions'].config.roles
    const updatedRole = _.pick(body, ['name', 'description', 'permissions']);
    _.set(appRoles, [roleId], updatedRole);

    module.exports.writePermissions(appRoles);

    const currentUsers = await strapi.query('user', 'users-permissions').find(strapi.utils.models.convertParams('user', {
      role: roleId
    }));
    const userToAdd = _.differenceBy(body.users, currentUsers.toJSON ? currentUsers.toJSON() : currentUsers, 'id');
    const userToRemove = _.differenceBy(currentUsers.toJSON ? currentUsers.toJSON() : currentUsers, body.users, 'id');

    _.forEach(userToAdd, (user) => {
      module.exports.updateUserRole(user, roleId);
    });
    _.forEach(userToRemove, (user) => {
      module.exports.updateUserRole(user, '1');
    });
  },

  updateUserRole: async (user, role) => {
    strapi.query('user', 'users-permissions').update({
      _id: user._id || user.id,
      role: role.toString()
    });
  },

  writePermissions: (data) => {
    const roleConfigPath = module.exports.getRoleConfigPath();

    try {
      fs.writeFileSync(roleConfigPath, stringify({ roles: data }, null, 2), 'utf8');
      _.set(strapi.plugins['users-permissions'], 'config.roles', data);
    } catch(err) {
      strapi.log.error(err);
    }
  },
};
