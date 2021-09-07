'use strict';

const _ = require('lodash');
const { filter, map, pipe, prop } = require('lodash/fp');

const { getService } = require('../utils');

const DEFAULT_PERMISSIONS = [
  { action: 'plugin::users-permissions.auth.admincallback', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.adminregister', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.callback', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.connect', roleType: null },
  { action: 'plugin::users-permissions.auth.forgotpassword', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.resetpassword', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.register', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.emailconfirmation', roleType: 'public' },
  { action: 'plugin::users-permissions.user.me', roleType: null },
];

const transformRoutePrefixFor = pluginName => route => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

module.exports = ({ strapi }) => ({
  getPlugins(lang = 'en') {
    const request = require('request');
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

  // TODO: Filter on content-api only
  getActions() {
    const actionMap = {};

    _.forEach(strapi.api, (api, apiName) => {
      const controllers = _.mapValues(api.controllers, controller => {
        return _.mapValues(controller, () => {
          return { enabled: false, policy: '' };
        });
      });

      actionMap[`api::${apiName}`] = { controllers };
    });

    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const controllers = _.mapValues(plugin.controllers, controller => {
        return _.mapValues(controller, () => {
          return { enabled: false, policy: '' };
        });
      });

      actionMap[`plugin::${pluginName}`] = { controllers };
    });

    return actionMap;
  },

  // TODO: Filter on content-api only
  async getRoutes() {
    const routesMap = {};

    _.forEach(strapi.api, (api, apiName) => {
      const routes = _.flatMap(api.routes, route => {
        if (_.has(route, 'routes')) {
          return route.routes;
        }

        return route;
      });

      if (routes.length === 0) {
        return;
      }

      routesMap[`api::${apiName}`] = routes;
    });

    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      const routes = _.flatMap(plugin.routes, route => {
        if (_.has(route, 'routes')) {
          return route.routes.map(transformPrefix);
        }

        return transformPrefix(route);
      });

      if (routes.length === 0) {
        return;
      }

      routesMap[`plugin::${pluginName}`] = routes;
    });

    return routesMap;
  },

  async syncPermissions() {
    const roles = await strapi.query('plugin::users-permissions.role').findMany();
    const dbPermissions = await strapi.query('plugin::users-permissions.permission').findMany();

    const permissionsFoundInDB = _.uniq(_.map(dbPermissions, 'action'));

    const appActions = _.flatMap(strapi.api, (api, apiName) => {
      return _.flatMap(api.controllers, (controller, controllerName) => {
        return _.keys(controller).map(actionName => {
          return `api::${apiName}.${controllerName}.${_.toLower(actionName)}`;
        });
      });
    });

    const pluginsActions = _.flatMap(strapi.plugins, (plugin, pluginName) => {
      return _.flatMap(plugin.controllers, (controller, controllerName) => {
        return _.keys(controller).map(actionName => {
          return `plugin::${pluginName}.${controllerName}.${_.toLower(actionName)}`;
        });
      });
    });

    const allActions = [...appActions, ...pluginsActions];

    const toDelete = _.difference(permissionsFoundInDB, allActions);

    await Promise.all(
      toDelete.map(action => {
        return strapi.query('plugin::users-permissions.permission').delete({ where: { action } });
      })
    );

    if (permissionsFoundInDB.length === 0) {
      // create default permissions
      for (const role of roles) {
        const toCreate = pipe(
          filter(({ roleType }) => roleType === role.type || roleType === null),
          map(prop('action'))
        )(DEFAULT_PERMISSIONS);

        await Promise.all(
          toCreate.map(action => {
            return strapi.query('plugin::users-permissions.permission').create({
              data: {
                action,
                role: role.id,
              },
            });
          })
        );
      }
    }
  },

  async initialize() {
    const roleCount = await strapi.query('plugin::users-permissions.role').count();

    if (roleCount === 0) {
      await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: 'Authenticated',
          description: 'Default role given to authenticated user.',
          type: 'authenticated',
        },
      });

      await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: 'Public',
          description: 'Default role given to unauthenticated user.',
          type: 'public',
        },
      });
    }

    return getService('users-permissions').syncPermissions();
  },

  async updateUserRole(user, role) {
    return strapi
      .query('plugin::users-permissions.user')
      .update({ where: { id: user.id }, data: { role } });
  },

  template(layout, data) {
    const compiledObject = _.template(layout);
    return compiledObject(data);
  },
});
