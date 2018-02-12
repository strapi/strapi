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
  createRole: async (params) => {
    if (!strapi.plugins['content-manager']) {
      return new Error('This feature requires to install the Content Manager plugin');
    }

    if (!params.type) {
      params.type = _.snakeCase(_.deburr(_.toLower(params.name)));
    }

    const role = await strapi.query('role', 'users-permissions').create(_.omit(params, ['users', 'permissions']));

    const arrayOfPromises = Object.keys(params.permissions).reduce((acc, type) => {
      Object.keys(params.permissions[type].controllers).forEach(controller => {
        Object.keys(params.permissions[type].controllers[controller]).forEach(action => {
          acc.push(strapi.query('permission', 'users-permissions').addPermission({
            role: role._id || role.id,
            type,
            controller,
            action: action.toLowerCase(),
            ...params.permissions[type].controllers[controller][action]
          }));
        });
      });

      return acc;
    }, []);

    // Use Content Manager business logic to handle relation.
    arrayOfPromises.push(strapi.plugins['content-manager'].services['contentmanager'].edit({
      id: role._id || role.id,
      model: 'role'
    }, {
      users: params.users
    }, 'users-permissions'));

    return await Promise.all(arrayOfPromises);
  },

  deleteRole: async (roleID, guestID) => {
    const role = await strapi.query('role', 'users-permissions').findOne({ id: roleID }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot found this role');
    }

    if (role.type === 'root') {
      return new Error(`You cannot delete the root admin role.`);
    }

    // Move users to guest role.
    const arrayOfPromises = role.users.reduce((acc, user) => {
      acc.push(strapi.query('user', 'users-permissions').update({
        id: user._id || user.id
      }, {
        role: guestID
      }))

      return acc;
    }, []);

    // Remove permissions related to this role.
    role.permissions.forEach(permission => {
      arrayOfPromises.push(strapi.query('permission', 'users-permissions').delete({
        id: permission._id || permission.id
      }));
    })

    // Delete the role.
    arrayOfPromises.push(strapi.query('role', 'users-permissions').delete({
      id: roleID
    }));

    return await Promise.all(arrayOfPromises);
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
        if (_.isFunction(data[key])) {
          acc[key] = { enabled: false, policy: '' };
        }

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

  getRole: async (roleID, plugins) => {
    const role = await strapi.query('role', 'users-permissions').findOne({ id: roleID }, ['users', 'permissions']);

    if (!role) {
      throw new Error('Cannot found this role');
    }

    // Group by `type`.
    role.permissions = role.permissions.reduce((acc, permission) => {
      _.set(acc, `${permission.type}.controllers.${permission.controller}.${permission.action}`, {
        enabled: _.toNumber(permission.enabled) == true,
        policy: permission.policy
      });

      if (permission.type !== 'application' && !acc[permission.type].information) {
        acc[permission.type].information = plugins.find(plugin => plugin.id === permission.type) || {};
      }

      return acc;
    }, {});

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
            .filter(action => _.isFunction(strapi.api[api].controllers[controller][action]))
            .map(action => `application.${controller}.${action.toLowerCase()}`);

          acc = acc.concat(actions);
      });

      return acc;
    }, []);

    // Aggregate plugins' actions.
    const pluginsActions = Object.keys(strapi.plugins).reduce((acc, plugin) => {
      Object.keys(strapi.plugins[plugin].controllers)
        .map(controller => {
          const actions = Object.keys(strapi.plugins[plugin].controllers[controller])
            .filter(action => _.isFunction(strapi.plugins[plugin].controllers[controller][action]))
            .map(action => `${plugin}.${controller}.${action.toLowerCase()}`);

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
        const isConnect = obj.action === 'connect' && obj.controller === 'auth' && obj.type === 'users-permissions';
        const isRegister = obj.action === 'register' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isPassword = obj.action === 'forgotpassword' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isNewPassword = obj.action === 'changepassword' && obj.controller === 'auth' && obj.type === 'users-permissions' && role.type === 'guest';
        const isInit = obj.action === 'init' && obj.controller === 'userspermissions';
        const isMe = obj.action === 'me' && obj.controller === 'user' && obj.type === 'users-permissions';
        const isReload = obj.action === 'autoreload';
        const enabled = isCallback || isRegister || role.type === 'root' || isInit || isPassword || isNewPassword || isMe || isReload || isConnect;

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
      strapi.query('role', 'users-permissions').create({
        name: 'Administrator',
        description: 'These users have all access in the project.',
        type: 'root'
      }),
      strapi.query('role', 'users-permissions').create({
        name: 'Guest',
        description: 'Default role given to unauthenticated user.',
        type: 'guest'
      }),
    ]);

    await this.updatePermissions(cb);
  },

  updateRole: async function (roleID, body) {
    const [role, root, guest] = await Promise.all([
      this.getRole(roleID, []),
      strapi.query('role', 'users-permissions').findOne({ type: 'root' }, []),
      strapi.query('role', 'users-permissions').findOne({ type: 'guest' }, [])
    ]);

    const arrayOfPromises = Object.keys(body.permissions).reduce((acc, type) => {
      Object.keys(body.permissions[type].controllers).forEach(controller => {
        Object.keys(body.permissions[type].controllers[controller]).forEach(action => {
          const bodyAction = body.permissions[type].controllers[controller][action];
          const currentAction = _.get(role.permissions, `${type}.controllers.${controller}.${action}`, {});

          if (_.differenceWith([bodyAction], [currentAction]).length > 0) {
            acc.push(strapi.query('permission', 'users-permissions').update({
              role: roleID,
              type,
              controller,
              action: action.toLowerCase()
            }, bodyAction));
          }
        });
      });

      return acc;
    }, []);

    // Add user to this role.
    _.differenceBy(body.users, role.users, role._id ? '_id' : 'id')
      .filter(user => user.role !== `${root._id || root.id}`.toString())
      .forEach(user => {
        arrayOfPromises.push(this.updateUserRole(user, roleID));
      })

    // Remove user to this role and link him to guest.
    _.differenceBy(role.users, body.users, role._id ? '_id' : 'id')
      .filter(user => user.role !== `${root._id || root.id}`.toString())
      .forEach(user => {
        arrayOfPromises.push(this.updateUserRole(user, guest._id || guest.id));
      });


    return Promise.all(arrayOfPromises);
  },

  updateUserRole: async (user, role) => {
    return strapi.query('user', 'users-permissions').update({
      id: user._id || user.id
    }, {
      role: role.toString()
    });
  },

  writeActions: (data) => {
    const actionsPath = path.join(strapi.config.appPath, 'plugins', 'users-permissions', 'config', 'actions.json');

    try {
      // Stop auto reload.
      strapi.reload.isReloading = false;
      // Rewrite actions.json file.
      fs.writeFileSync(actionsPath, JSON.stringify({ actions: data }), 'utf8');
      // Set value to AST to avoid restart.
      _.set(strapi.plugins['users-permissions'], 'config.actions', data);
      // Restart to watch files.
      strapi.reload.isReloading = true;
    } catch(err) {
      strapi.log.error(err);
    }
  },

  syncSchema: async (cb) => {
    if (strapi.plugins['users-permissions'].models.user.orm !== 'bookshelf') {
      return cb();
    }

    // Extract necessary information from plugin's models.
    const {
      user: { collectionName: userTableName, connection: userConnection, client: userClient },
      role: { collectionName: roleTableName, connection: roleConnection, client: roleClient },
      permission: { collectionName: permissionTableName, connection: permissionConnection, client: permissionClient }
    } = strapi.plugins['users-permissions'].models;

    const details = {
      user: {
        tableName: userTableName,
        connection: userConnection,
        client: userClient
      },
      role: {
        tableName: roleTableName,
        connection: roleConnection,
        client: roleClient
      },
      permission: {
        tableName: permissionTableName,
        connection: permissionConnection,
        client: permissionClient
      }
    };

    // Check if the tables are existing.
    const hasTables = await Promise.all(Object.keys(details).map(name =>
      strapi.connections[details[name].connection].schema.hasTable(details[name].tableName)
    ));

    const missingTables = [];
    const tablesToCreate = [];

    for (let index = 0; index < hasTables.length; ++index) {
      const hasTable = hasTables[index];
      const currentModel = Object.keys(details)[index];
      const quote = details[currentModel].client === 'pg' ? '"' : '`';

      if (!hasTable) {
        missingTables.push(`
⚠️  TABLE \`${details[currentModel].tableName}\` DOESN'T EXIST`);

        switch (currentModel) {
          case 'user':
            tablesToCreate.push(`

CREATE TABLE ${quote}${details[currentModel].tableName}${quote} (
  id ${details[currentModel].client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
  username text,
  email text,
  provider text,
  role ${details[currentModel].client === 'pg' ? 'integer' : 'int'},
  ${quote}resetPasswordToken${quote} text,
  password text,
  updated_at ${details[currentModel].client === 'pg' ? 'timestamp with time zone' : 'timestamp'},
  created_at ${details[currentModel].client === 'pg' ? 'timestamp with time zone' : 'timestamp'}
);`);
            break;
          case 'role':
            tablesToCreate.push(`

CREATE TABLE ${quote}${details[currentModel].tableName}${quote} (
  id ${details[currentModel].client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
  name text,
  description text,
  type text
);`);
            break;
          case 'permission':
            tablesToCreate.push(`

CREATE TABLE ${quote}${details[currentModel].tableName}${quote} (
  id ${details[currentModel].client === 'pg' ? 'SERIAL' : 'INT AUTO_INCREMENT'} NOT NULL PRIMARY KEY,
  role ${details[currentModel].client === 'pg' ? 'integer' : 'int'},
  type text,
  controller text,
  action text,
  enabled boolean,
  policy text
);`);
            break;
          default:

        }
      }
    }

    if (!_.isEmpty(tablesToCreate)) {
      tablesToCreate.unshift(`

1️⃣  EXECUTE THE FOLLOWING SQL QUERY`);

      tablesToCreate.push(`

2️⃣  RESTART YOUR SERVER`)
      strapi.log.warn(missingTables.concat(tablesToCreate).join(''));

      // Stop the server.
      strapi.stop();
    }

    const missingColumns = [];
    const tablesToAlter = [];

    for (let index = 0; index < hasTables.length; ++index) {
      const currentModel = Object.keys(details)[index];
      const quote = details[currentModel].client === 'pg' ? '"' : '`';
      const attributes = {
        id: {
          type: details[currentModel].client === 'pg' ? 'integer' : 'int'
        },
        ..._.cloneDeep(strapi.plugins['users-permissions'].models[currentModel].attributes)
      };

      // Add created_at and updated_at attributes for the model User.
      if (currentModel === 'user') {
        Object.assign(attributes, {
          created_at: {
            type: details[currentModel].client === 'pg' ? 'timestamp with time zone' : 'timestamp'
          },
          updated_at: {
            type: details[currentModel].client === 'pg' ? 'timestamp with time zone' : 'timestamp'
          }
        });
      }

      const columns = Object.keys(attributes);

      // Check if there are the required attributes.
      const hasColumns = await Promise.all(columns.map(attribute =>
        strapi.connections[details[currentModel].connection].schema.hasColumn(details[currentModel].tableName, attribute)
      ));

      hasColumns.forEach((hasColumn, index) => {
        const currentColumn = columns[index];
        const attribute = attributes[currentColumn];

        if (!hasColumn && !attribute.collection) {
          const currentType = attribute.model ? 'integer' : attribute.type;
          const type = currentType === 'string' ? 'text' : currentType;

          missingColumns.push(`
⚠️  TABLE \`${details[currentModel].tableName}\` HAS MISSING COLUMNS`);

          tablesToAlter.push(`

ALTER TABLE ${quote}${details[currentModel].tableName}${quote} ADD ${details[currentModel].client === 'pg' ? `${quote}${currentColumn}${quote}` : `${currentColumn}`} ${type};`);
        }
      });
    }

    if (!_.isEmpty(tablesToAlter)) {
      tablesToAlter.unshift(`

1️⃣  EXECUTE THE FOLLOWING SQL QUERIES`);

      tablesToAlter.push(`

2️⃣  RESTART YOUR SERVER`)
      strapi.log.warn(missingColumns.concat(tablesToAlter).join(''));

      // Stop the server.
      return strapi.stop();
    }

    cb();
  },

  template: (layout, data) => {
    const compiledObject = _.template(layout);
    return compiledObject(data);
  }
};
