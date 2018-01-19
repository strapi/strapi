'use strict';

const fs = require('fs')
const path = require('path');
const _ = require('lodash');
const request = require('request');

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

  getPlugins: (plugin, lang = 'en') => {
    return new Promise((resolve, reject) => {
      request({
        uri: `https://marketplace.strapi.io/plugins?lang=${lang}`,
        json: true,
        headers: {
          'cache-control': 'max-age=3600'
        }
      }, (err, response, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  },

  getActions: (plugins = [], withInfo = true) => {
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
      const initialState = {
        controllers: {}
      };

      if (withInfo) {
        initialState.information = plugins.find(plugin => plugin.id === key) || {};
      }

      acc[key] = Object.keys(strapi.plugins[key].controllers).reduce((obj, k) => {
        obj.controllers[k] = generateActions(strapi.plugins[key].controllers[k]);

        return obj;

      }, initialState);

      return acc;
    }, {});

    const permissions = {
      application: {
        controllers: appControllers.controllers,
      },
    };

    return _.merge(permissions, pluginsPermissions);;
  },

  getRole: async (roleId, plugins) => {
    const role = await strapi.query('role', 'users-permissions').findOne({ id: roleId }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot found this role');
    }

    // Add `information` key.
    role.permissions
      .filter(permission => permission.type !== 'application')
      .map((permission, index) => {
        role.permissions[index].information = plugins.find(plugin => plugin.id === permission.type) || {};
      });

    return role;
  },

  getRoles: async () => {
    const roles = await strapi.query('role', 'users-permissions').find({ sort: 'name ASC' }, []);

    for (let i = 0; i < roles.length; ++i) {
      roles[i].id = roles[i].id || roles[i]._id;
      roles[i].nb_users = await strapi.query('user', 'users-permissions').count({ role: roles[i].id });
    }

    return roles;
  },

  getRoutes: async () => {
    const routes = Object.keys(strapi.api || {}).reduce((acc, current) => {
      return acc.concat(strapi.api[current].config.routes);
    }, []);

    const pluginsRoutes = Object.keys(strapi.plugins || {}).reduce((acc, current) => {
      acc[current] = strapi.plugins[current].config.routes;

      return acc;
    }, []);

    return _.merge({ application: routes }, pluginsRoutes);
  },

  updatePermissions: async function (cb) {
    const actions = strapi.plugins['users-permissions'].config.actions || [];

    // Aggregate first level actions.
    const appActions = Object.keys(strapi.api || {}).reduce((acc, api) => {
      Object.keys(strapi.api[api].controllers)
        .map(controller => {
          const actions = Object.keys(strapi.api[api].controllers[controller])
            .map(action => `application.${controller}.${action}`);

          acc = acc.concat(actions);
      });

      return acc;
    }, []);

    // Aggregate plugins' actions.
    const pluginsActions = Object.keys(strapi.plugins).reduce((acc, plugin) => {
      Object.keys(strapi.plugins[plugin].controllers)
        .map(controller => {
          const actions = Object.keys(strapi.plugins[plugin].controllers[controller])
            .map(action => `${plugin}.${controller}.${action}`);

          acc = acc.concat(actions);
      });

      return acc;
    }, []);

    // Merge array into one.
    const currentActions = appActions.concat(pluginsActions);
    // Count permissions available.
    const permissions = await strapi.query('permission', 'users-permissions').count();

    // Compare to know if actions have been added or removed from controllers.
    if (!_.isEqual(actions, currentActions) || permissions < 1) {
      const splitted = (str) => {
        const [type, controller, action] = str.split('.');

        return { type, controller, action };
      };

      const defaultPolicy = (obj, role) => {
        const isCallback = obj.action === 'callback' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isRegister = obj.action === 'register' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isPassword = obj.action === 'forgotPassword' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isNewPassword = obj.action === 'changePassword' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isInit = obj.action === 'init' && obj.controller === 'userspermissions';
        const isMe = obj.action === 'me' && obj.controller === 'user' && obj.type === 'users-permissions';
        const enabled = isCallback || isRegister || role.type === 'root' || isInit || isPassword || isNewPassword || isMe;

        return Object.assign(obj, { enabled, policy: '' });
      };

      // Retrieve roles
      const roles = await strapi.query('role', 'users-permissions').find();

      // We have to know the difference to add or remove
      // the permissions entries in the database.
      const toRemove = _.difference(actions, currentActions).map(splitted);
      const toAdd = (permissions < 1 ? currentActions : _.difference(currentActions, actions))
          .map(splitted);

      // Execute request to update entries in database for each role.
      await Promise.all(
        roles.map(role =>
          Promise.all(
            toAdd
              .map(action => defaultPolicy(action, role))
              .map(action => strapi.query('permission', 'users-permissions')
                .addPermission(Object.assign(action, { role: role.id || role._id }))
              )
          )
        ),
        Promise.all(toRemove.map(action => strapi.query('permission', 'users-permissions').removePermission(action)))
      );

      this.writeActions(currentActions);
    }

    if (cb) {
      cb();
    }
  },

  initialize: async function (cb) {
    const roles = await strapi.query('role', 'users-permissions').count();

    // It's has been already initialized.
    if (roles > 0) {
      return await this.updatePermissions(cb);
    }

    // Create two first default roles.
    await Promise.all([
      strapi.query('role', 'users-permissions').createRole({
        name: 'Administrator',
        description: 'These users have all access in the project.',
        type: 'root'
      }),
      strapi.query('role', 'users-permissions').createRole({
        name: 'Guest',
        description: 'Default role given to unauthenticated user.',
        type: 'guest'
      }),
    ]);

    await this.updatePermissions(cb);
  },

  updateRole: async (roleId, body) => {
    const appRoles = strapi.plugins['users-permissions'].config.roles
    const updatedRole = _.pick(body, ['name', 'description', 'permissions']);
    _.set(appRoles, [roleId], updatedRole);

    // TODO:
    // - Call request.
    // Role.update()

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

  writeActions: (data) => {
    const actionsPath = path.join(strapi.config.appPath, 'plugins', 'users-permissions', 'config', 'actions.json');

    try {
      // Rewrite actions.json file.
      fs.writeFileSync(actionsPath, JSON.stringify({ actions: data }), 'utf8');
      // Set value to AST to avoid restart.
      _.set(strapi.plugins['users-permissions'], 'config.roles', data);
    } catch(err) {
      strapi.log.error(err);
    }
  },

  syncSchema: (cb) => {
    const Model = strapi.plugins['users-permissions'].models.user;

    if (Model.orm !== 'bookshelf') {
      return cb();
    }

    const tableName = Model.collectionName;

    new Promise((resolve, reject) => {
      strapi.connections[Model.connection].schema.hasTable(tableName)
      .then(exist => {
        if (!exist) {
          strapi.log.warn(`
⚠️  TABLE \`${tableName}\` DOESN'T EXIST

1️⃣  EXECUTE THE FOLLOWING SQL QUERY

CREATE TABLE "${tableName}" (
  id ${Model.client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
  username text,
  email text,
  provider text,
  role text,
  ${Model.client === 'pg' ? '"resetPasswordToken"' : 'resetPasswordToken'} text,
  password text,
  updated_at ${Model.client === 'pg' ? 'timestamp with time zone' : 'timestamp'},
  created_at ${Model.client === 'pg' ? 'timestamp with time zone' : 'timestamp'}
);

2️⃣  RESTART YOUR SERVER
          `);

          strapi.stop();
        }

        resolve();
      });
    })
    .then(() => {
      const attributes = _.cloneDeep(Model.attributes);
      attributes.id = {
        type: Model.client === 'pg' ? 'integer' : 'int'
      };
      attributes.updated_at = attributes.created_at = {
        type: Model.client === 'pg' ? 'timestamp with time zone' : 'timestamp'
      };

      let commands = '';

      const columnExist = (description, attribute) => {
        return new Promise((resolve, reject) => {
          strapi.connections[Model.connection].schema.hasColumn(tableName, attribute)
          .then(exist => {
            if (!exist) {
              if (description.type === 'string') {
                description.type = 'text';
              }

              commands += `\r\nALTER TABLE "${tableName}" ADD ${Model.client === 'pg' ? `"${attribute}"` : `${attribute}`} ${description.type};`;
            }

            resolve();
          });
        });
      };

      const testsColumns = Object.entries(attributes).map(([attribute, description]) => columnExist(description, attribute));
      Promise.all(testsColumns)
      .then(() => {
        if (!_.isEmpty(commands)) {
          strapi.log.warn(`
⚠️  TABLE \`${tableName}\` HAS MISSING COLUMNS

1️⃣  EXECUTE THE FOLLOWING SQL QUERIES
${commands}

2️⃣  RESTART YOUR SERVER
          `);

          strapi.stop();
        }

        cb();
      });
    });
  }
};
