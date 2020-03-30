'use strict';

const _ = require('lodash');
const request = require('request');

/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  async createRole(params) {
    if (!params.type) {
      params.type = _.snakeCase(_.deburr(_.toLower(params.name)));
    }

    const role = await strapi
      .query('role', 'users-permissions')
      .create(_.omit(params, ['users', 'permissions']));

    const arrayOfPromises = Object.keys(params.permissions || {}).reduce(
      (acc, type) => {
        Object.keys(params.permissions[type].controllers).forEach(
          controller => {
            Object.keys(
              params.permissions[type].controllers[controller]
            ).forEach(action => {
              acc.push(
                strapi.query('permission', 'users-permissions').create({
                  role: role.id,
                  type,
                  controller,
                  action: action.toLowerCase(),
                  ...params.permissions[type].controllers[controller][action],
                })
              );
            });
          }
        );

        return acc;
      },
      []
    );

    // Use Content Manager business logic to handle relation.
    if (params.users && params.users.length > 0)
      arrayOfPromises.push(
        strapi.query('role', 'users-permissions').update(
          {
            id: role.id,
          },
          { users: params.users }
        )
      );

    return await Promise.all(arrayOfPromises);
  },

  async deleteRole(roleID, publicRoleID) {
    const role = await strapi
      .query('role', 'users-permissions')
      .findOne({ id: roleID }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot found this role');
    }

    // Move users to guest role.
    const arrayOfPromises = role.users.reduce((acc, user) => {
      acc.push(
        strapi.query('user', 'users-permissions').update(
          {
            id: user.id,
          },
          {
            role: publicRoleID,
          }
        )
      );

      return acc;
    }, []);

    // Remove permissions related to this role.
    role.permissions.forEach(permission => {
      arrayOfPromises.push(
        strapi.query('permission', 'users-permissions').delete({
          id: permission.id,
        })
      );
    });

    // Delete the role.
    arrayOfPromises.push(
      strapi.query('role', 'users-permissions').delete({ id: roleID })
    );

    return await Promise.all(arrayOfPromises);
  },

  getPlugins(lang = 'en') {
    return new Promise(resolve => {
      request(
        {
          uri: `https://marketplace.strapi.io/plugins?lang=${lang}`,
          json: true,
          timeout: 3000,
          headers: {
            'cache-control': 'max-age=3600',
          },
        },
        (err, response, body) => {
          if (err || response.statusCode !== 200) {
            return resolve([]);
          }

          resolve(body);
        }
      );
    });
  },

  getActions(plugins = [], withInfo = true) {
    const generateActions = data =>
      Object.keys(data).reduce((acc, key) => {
        if (_.isFunction(data[key])) {
          acc[key] = { enabled: false, policy: '' };
        }

        return acc;
      }, {});

    const appControllers = Object.keys(strapi.api || {})
      .filter(key => !!strapi.api[key].controllers)
      .reduce(
        (acc, key) => {
          Object.keys(strapi.api[key].controllers).forEach(controller => {
            acc.controllers[controller] = generateActions(
              strapi.api[key].controllers[controller]
            );
          });

          return acc;
        },
        { controllers: {} }
      );

    const pluginsPermissions = Object.keys(strapi.plugins).reduce(
      (acc, key) => {
        const initialState = {
          controllers: {},
        };

        if (withInfo) {
          initialState.information =
            plugins.find(plugin => plugin.id === key) || {};
        }

        acc[key] = Object.keys(strapi.plugins[key].controllers).reduce(
          (obj, k) => {
            obj.controllers[k] = generateActions(
              strapi.plugins[key].controllers[k]
            );

            return obj;
          },
          initialState
        );

        return acc;
      },
      {}
    );

    const permissions = {
      application: {
        controllers: appControllers.controllers,
      },
    };

    return _.merge(permissions, pluginsPermissions);
  },

  async getRole(roleID, plugins) {
    const role = await strapi
      .query('role', 'users-permissions')
      .findOne({ id: roleID }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot find this role');
    }

    // Group by `type`.
    const permissions = role.permissions.reduce((acc, permission) => {
      _.set(
        acc,
        `${permission.type}.controllers.${permission.controller}.${permission.action}`,
        {
          enabled: _.toNumber(permission.enabled) == true,
          policy: permission.policy,
        }
      );

      if (
        permission.type !== 'application' &&
        !acc[permission.type].information
      ) {
        acc[permission.type].information =
          plugins.find(plugin => plugin.id === permission.type) || {};
      }

      return acc;
    }, {});

    return {
      ...role,
      permissions,
    };
  },

  async getRoles() {
    const roles = await strapi
      .query('role', 'users-permissions')
      .find({ _sort: 'name' }, []);

    for (let i = 0; i < roles.length; ++i) {
      roles[i].nb_users = await strapi
        .query('user', 'users-permissions')
        .count({ role: roles[i].id });
    }

    return roles;
  },

  async getRoutes() {
    const routes = Object.keys(strapi.api || {}).reduce((acc, current) => {
      return acc.concat(_.get(strapi.api[current].config, 'routes', []));
    }, []);
    const clonedPlugins = _.cloneDeep(strapi.plugins);
    const pluginsRoutes = Object.keys(clonedPlugins || {}).reduce(
      (acc, current) => {
        const routes = _.get(
          clonedPlugins,
          [current, 'config', 'routes'],
          []
        ).reduce((acc, curr) => {
          const prefix = curr.config.prefix;
          const path =
            prefix !== undefined
              ? `${prefix}${curr.path}`
              : `/${current}${curr.path}`;
          _.set(curr, 'path', path);

          return acc.concat(curr);
        }, []);

        acc[current] = routes;

        return acc;
      },
      {}
    );

    return _.merge({ application: routes }, pluginsRoutes);
  },

  async updatePermissions() {
    // fetch all the current permissions from the database, and format them into an array of actions.
    const databasePermissions = await strapi
      .query('permission', 'users-permissions')
      .find({ _limit: -1 });

    const actionsMap = databasePermissions.reduce((acc, permission) => {
      acc[`${permission.type}.${permission.controller}.${permission.action}`] =
        permission.id;
      return acc;
    }, {});
    const stringActions = Object.keys(actionsMap);

    // Aggregate first level actions.
    const appActions = Object.keys(strapi.api || {}).reduce((acc, api) => {
      Object.keys(_.get(strapi.api[api], 'controllers', {})).forEach(
        controller => {
          const actions = Object.keys(strapi.api[api].controllers[controller])
            .filter(action =>
              _.isFunction(strapi.api[api].controllers[controller][action])
            )
            .map(action => `application.${controller}.${action.toLowerCase()}`);

          acc = acc.concat(actions);
        }
      );

      return acc;
    }, []);

    // Aggregate plugins' actions.
    const pluginsActions = Object.keys(strapi.plugins).reduce((acc, plugin) => {
      Object.keys(strapi.plugins[plugin].controllers).forEach(controller => {
        const actions = Object.keys(
          strapi.plugins[plugin].controllers[controller]
        )
          .filter(action =>
            _.isFunction(strapi.plugins[plugin].controllers[controller][action])
          )
          .map(action => `${plugin}.${controller}.${action.toLowerCase()}`);

        acc = acc.concat(actions);
      });

      return acc;
    }, []);

    // Merge array into one.
    const currentActions = appActions.concat(pluginsActions);
    // Count permissions available.
    const permissions = databasePermissions.length;

    // Compare to know if actions have been added or removed from controllers.
    if (!_.isEqual(stringActions, currentActions) || permissions < 1) {
      const splitted = str => {
        const [type, controller, action] = str.split('.');

        return { type, controller, action };
      };

      const defaultPolicy = (obj, role) => {
        const isAdminCallback =
          obj.action === 'admincallback' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isAdminRegister =
          obj.action === 'adminregister' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isCallback =
          obj.action === 'callback' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isConnect =
          obj.action === 'connect' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions';
        const isPassword =
          obj.action === 'forgotpassword' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isRegister =
          obj.action === 'register' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isConfirmation =
          obj.action === 'emailconfirmation' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isNewPassword =
          obj.action === 'resetpassword' &&
          obj.controller === 'auth' &&
          obj.type === 'users-permissions' &&
          role.type === 'public';
        const isInit =
          obj.action === 'init' && obj.controller === 'userspermissions';
        const isMe =
          obj.action === 'me' &&
          obj.controller === 'user' &&
          obj.type === 'users-permissions';
        const isReload = obj.action === 'autoreload';
        const enabled =
          isCallback ||
          isRegister ||
          isInit ||
          isPassword ||
          isNewPassword ||
          isMe ||
          isReload ||
          isConnect ||
          isConfirmation ||
          isAdminCallback ||
          isAdminRegister;

        return Object.assign(obj, { enabled, policy: '' });
      };

      // Retrieve roles
      const roles = await strapi
        .query('role', 'users-permissions')
        .find({}, []);

      // We have to know the difference to add or remove
      // the permissions entries in the database.
      const toRemove = _.difference(stringActions, currentActions).map(
        splitted
      );

      const toAdd = (permissions < 1
        ? currentActions
        : _.difference(currentActions, stringActions)
      ).map(splitted);

      const query = strapi.query('permission', 'users-permissions');

      const createActions = role =>
        Promise.all(
          toAdd.map(action => {
            const data = {
              ...defaultPolicy(action, role),
              role: role.id,
            };

            return query.create(data);
          })
        );

      // Execute request to update entries in database for each role.
      await Promise.all([
        Promise.all(roles.map(createActions)),
        Promise.all(toRemove.map(action => query.delete(action))),
      ]);
    }
  },

  async removeDuplicate() {
    const { primaryKey } = strapi.query('permission', 'users-permissions');

    // Retrieve permissions by creation date (ID or ObjectID).
    const permissions = await strapi
      .query('permission', 'users-permissions')
      .find({ _sort: `${primaryKey}`, _limit: -1 });

    const value = permissions.reduce(
      (acc, permission) => {
        const key = `${permission.type}.controllers.${permission.controller}.${permission.action}.${permission.role[primaryKey]}`;

        const index = acc.toKeep.findIndex(element => element === key);

        if (index === -1) {
          acc.toKeep.push(key);
        } else {
          acc.toRemove.push(permission[primaryKey]);
        }

        return acc;
      },
      {
        toKeep: [],
        toRemove: [],
      }
    );

    if (value.toRemove.length > 0) {
      return strapi.query('permission', 'users-permissions').delete({
        [`${primaryKey}_in`]: value.toRemove,
      });
    }
    return Promise.resolve();
  },

  async initialize() {
    const roleCount = await strapi.query('role', 'users-permissions').count();

    // It has already been initialized.
    if (roleCount > 0) {
      await this.updatePermissions();
      await this.removeDuplicate();
      return;
    }

    // Create two first default roles.
    await strapi.query('role', 'users-permissions').create({
      name: 'Authenticated',
      description: 'Default role given to authenticated user.',
      type: 'authenticated',
    });

    await strapi.query('role', 'users-permissions').create({
      name: 'Public',
      description: 'Default role given to unauthenticated user.',
      type: 'public',
    });

    return this.updatePermissions();
  },

  async updateRole(roleID, body) {
    const [role, authenticated] = await Promise.all([
      this.getRole(roleID, []),
      strapi
        .query('role', 'users-permissions')
        .findOne({ type: 'authenticated' }, []),
    ]);

    await strapi
      .query('role', 'users-permissions')
      .update({ id: roleID }, _.pick(body, ['name', 'description']));

    await Promise.all(
      Object.keys(body.permissions || {}).reduce((acc, type) => {
        Object.keys(body.permissions[type].controllers).forEach(controller => {
          Object.keys(body.permissions[type].controllers[controller]).forEach(
            action => {
              const bodyAction =
                body.permissions[type].controllers[controller][action];
              const currentAction = _.get(
                role.permissions,
                `${type}.controllers.${controller}.${action}`,
                {}
              );

              if (!_.isEqual(bodyAction, currentAction)) {
                acc.push(
                  strapi.query('permission', 'users-permissions').update(
                    {
                      role: roleID,
                      type,
                      controller,
                      action: action.toLowerCase(),
                    },
                    bodyAction
                  )
                );
              }
            }
          );
        });

        return acc;
      }, [])
    );

    // Add user to this role.
    const newUsers = _.differenceBy(body.users, role.users, 'id');
    await Promise.all(newUsers.map(user => this.updateUserRole(user, roleID)));

    const oldUsers = _.differenceBy(role.users, body.users, 'id');
    await Promise.all(
      oldUsers.map(user => this.updateUserRole(user, authenticated.id))
    );
  },

  async updateUserRole(user, role) {
    return strapi
      .query('user', 'users-permissions')
      .update({ id: user.id }, { role });
  },

  template(layout, data) {
    const compiledObject = _.template(layout);
    return compiledObject(data);
  },
};
