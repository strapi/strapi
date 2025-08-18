'use strict';

const template = require('lodash/template');
const { filter, map, pipe, prop } = require('lodash/fp');
const urlJoin = require('url-join');
const {
  template: { createStrictInterpolationRegExp },
  errors,
  objects,
} = require('@strapi/utils');

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
      if (!(Symbol.for('__type__') in action)) {
        return false;
      }

      return action[Symbol.for('__type__')].includes('content-api');
    };

    Object.entries(strapi.apis).forEach(([apiName, api]) => {
      const controllers = Object.entries(api.controllers).reduce(
        (acc, [controllerName, controller]) => {
          const contentApiActions = Object.fromEntries(
            Object.entries(controller).filter(([, action]) => isContentApi(action))
          );

          if (Object.keys(contentApiActions).length === 0) {
            return acc;
          }

          acc[controllerName] = Object.fromEntries(
            Object.keys(contentApiActions).map((key) => [
              key,
              {
                enabled: defaultEnable,
                policy: '',
              },
            ])
          );

          return acc;
        },
        {}
      );

      if (Object.keys(controllers).length > 0) {
        actionMap[`api::${apiName}`] = { controllers };
      }
    });

    Object.entries(strapi.plugins).forEach(([pluginName, plugin]) => {
      const controllers = Object.entries(plugin.controllers).reduce(
        (acc, [controllerName, controller]) => {
          const contentApiActions = Object.fromEntries(
            Object.entries(controller).filter(([, action]) => isContentApi(action))
          );

          if (Object.keys(contentApiActions).length === 0) {
            return acc;
          }

          acc[controllerName] = Object.fromEntries(
            Object.keys(contentApiActions).map((key) => [
              key,
              {
                enabled: defaultEnable,
                policy: '',
              },
            ])
          );

          return acc;
        },
        {}
      );

      if (Object.keys(controllers).length > 0) {
        actionMap[`plugin::${pluginName}`] = { controllers };
      }
    });

    return actionMap;
  },

  async getRoutes() {
    const routesMap = {};

    /**
     * Clean route object to remove circular references for JSON serialization
     */
    const cleanRouteForSerialization = (route) => {
      const { request, response, ...cleanedRoute } = route;

      // Remove request and response objects that may contain circular references
      return cleanedRoute;
    };

    Object.entries(strapi.apis).forEach(([apiName, api]) => {
      const routes = Object.values(api.routes)
        .flatMap((route) => {
          if ('routes' in route) {
            return route.routes;
          }

          return route;
        })
        .filter((route) => route.info.type === 'content-api');

      if (routes.length > 0) {
        const apiPrefix = strapi.config.get('api.rest.prefix');
        routesMap[`api::${apiName}`] = routes.map((route) =>
          // Apply clean for all routes
          cleanRouteForSerialization({
            ...route,
            path: urlJoin(apiPrefix, route.path),
          })
        );
      }
    });

    Object.entries(strapi.plugins).forEach(([pluginName, plugin]) => {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      const routes = Object.values(plugin.routes)
        .flatMap((route) => {
          if ('routes' in route) {
            return route.routes.map(transformPrefix);
          }

          return transformPrefix(route);
        })
        .filter((route) => route.info.type === 'content-api');

      if (routes.length > 0) {
        const apiPrefix = strapi.config.get('api.rest.prefix');
        routesMap[`plugin::${pluginName}`] = routes.map((route) =>
          // Apply clean for all routes
          cleanRouteForSerialization({
            ...route,
            path: urlJoin(apiPrefix, route.path),
          })
        );
      }
    });

    return routesMap;
  },

  async syncPermissions() {
    const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
    const dbPermissions = await strapi.db.query('plugin::users-permissions.permission').findMany();

    const permissionsFoundInDB = [...new Set(dbPermissions.map((permission) => permission.action))];

    const appActions = Object.entries(strapi.apis).flatMap(([apiName, api]) => {
      return Object.entries(api.controllers).flatMap(([controllerName, controller]) => {
        return Object.keys(controller).map((actionName) => {
          return `api::${apiName}.${controllerName}.${actionName}`;
        });
      });
    });

    const pluginsActions = Object.entries(strapi.plugins).flatMap(([pluginName, plugin]) => {
      return Object.entries(plugin.controllers).flatMap(([controllerName, controller]) => {
        return Object.keys(controller).map((actionName) => {
          return `plugin::${pluginName}.${controllerName}.${actionName}`;
        });
      });
    });

    const allActions = [...appActions, ...pluginsActions];

    const toDelete = permissionsFoundInDB.filter((action) => !allActions.includes(action));

    await Promise.all(
      toDelete.map((action) => {
        return strapi.db
          .query('plugin::users-permissions.permission')
          .delete({ where: { action } });
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
            return strapi.db.query('plugin::users-permissions.permission').create({
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
    const roleCount = await strapi.db.query('plugin::users-permissions.role').count();

    if (roleCount === 0) {
      await strapi.db.query('plugin::users-permissions.role').create({
        data: {
          name: 'Authenticated',
          description: 'Default role given to authenticated user.',
          type: 'authenticated',
        },
      });

      await strapi.db.query('plugin::users-permissions.role').create({
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
    return strapi.db
      .query('plugin::users-permissions.user')
      .update({ where: { id: user.id }, data: { role } });
  },

  template(layout, data) {
    const allowedTemplateVariables = objects.keysDeep(data);

    // Create a strict interpolation RegExp based on possible variable names
    const interpolate = createStrictInterpolationRegExp(allowedTemplateVariables, 'g');

    try {
      return template(layout, { interpolate, evaluate: false, escape: false })(data);
    } catch (e) {
      throw new errors.ApplicationError('Invalid email template');
    }
  },
});
