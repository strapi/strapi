'use strict';

const _ = require('lodash');
const { filter, map, pipe, prop } = require('lodash/fp');
const urlJoin = require('url-join');

const { getService } = require('../utils');

const DEFAULT_PERMISSIONS = [
  { action: 'plugin::users-permissions.auth.callback', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.connect', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.forgotPassword', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.resetPassword', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.register', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.emailConfirmation', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.sendEmailConfirmation', roleType: 'public' },
  { action: 'plugin::users-permissions.user.me', roleType: 'authenticated' },
  { action: 'plugin::users-permissions.auth.changePassword', roleType: 'authenticated' },
];

const transformRoutePrefixFor = (pluginName) => (route) => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

module.exports = ({ strapi }) => ({
  getActions({ defaultEnable = false } = {}) {
    const actionMap = {};

    const isContentApi = (action) => {
      if (!_.has(action, Symbol.for('__type__'))) {
        return false;
      }

      return action[Symbol.for('__type__')].includes('content-api');
    };

    _.forEach(strapi.api, (api, apiName) => {
      const controllers = _.reduce(
        api.controllers,
        (acc, controller, controllerName) => {
          const contentApiActions = _.pickBy(controller, isContentApi);

          if (_.isEmpty(contentApiActions)) {
            return acc;
          }

          acc[controllerName] = _.mapValues(contentApiActions, () => {
            return {
              enabled: defaultEnable,
              policy: '',
            };
          });

          return acc;
        },
        {}
      );

      if (!_.isEmpty(controllers)) {
        actionMap[`api::${apiName}`] = { controllers };
      }
    });

    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const controllers = _.reduce(
        plugin.controllers,
        (acc, controller, controllerName) => {
          const contentApiActions = _.pickBy(controller, isContentApi);

          if (_.isEmpty(contentApiActions)) {
            return acc;
          }

          acc[controllerName] = _.mapValues(contentApiActions, () => {
            return {
              enabled: defaultEnable,
              policy: '',
            };
          });

          return acc;
        },
        {}
      );

      if (!_.isEmpty(controllers)) {
        actionMap[`plugin::${pluginName}`] = { controllers };
      }
    });

    return actionMap;
  },

  async getRoutes() {
    const routesMap = {};

    _.forEach(strapi.api, (api, apiName) => {
      const routes = _.flatMap(api.routes, (route) => {
        if (_.has(route, 'routes')) {
          return route.routes;
        }

        return route;
      }).filter((route) => route.info.type === 'content-api');

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`api::${apiName}`] = routes.map((route) => ({
        ...route,
        path: urlJoin(apiPrefix, route.path),
      }));
    });

    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      const routes = _.flatMap(plugin.routes, (route) => {
        if (_.has(route, 'routes')) {
          return route.routes.map(transformPrefix);
        }

        return transformPrefix(route);
      }).filter((route) => route.info.type === 'content-api');

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`plugin::${pluginName}`] = routes.map((route) => ({
        ...route,
        path: urlJoin(apiPrefix, route.path),
      }));
    });

    return routesMap;
  },

  async syncPermissions() {
    const roles = await strapi.query('plugin::users-permissions.role').findMany();
    const dbPermissions = await strapi.query('plugin::users-permissions.permission').findMany();

    const permissionsFoundInDB = _.uniq(_.map(dbPermissions, 'action'));

    const appActions = _.flatMap(strapi.api, (api, apiName) => {
      return _.flatMap(api.controllers, (controller, controllerName) => {
        return _.keys(controller).map((actionName) => {
          return `api::${apiName}.${controllerName}.${actionName}`;
        });
      });
    });

    const pluginsActions = _.flatMap(strapi.plugins, (plugin, pluginName) => {
      return _.flatMap(plugin.controllers, (controller, controllerName) => {
        return _.keys(controller).map((actionName) => {
          return `plugin::${pluginName}.${controllerName}.${actionName}`;
        });
      });
    });

    const allActions = [...appActions, ...pluginsActions];

    const toDelete = _.difference(permissionsFoundInDB, allActions);

    // Register actions into the content API action provider
    // TODO: do this in the content API bootstrap phase instead
    allActions.forEach((action) => strapi.contentAPI.permissions.providers.action.register(action));

    await Promise.all(
      toDelete.map((action) => {
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
          toCreate.map((action) => {
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
