import type { Core, Data } from '@strapi/types';

import _ from 'lodash';
import urlJoin from 'url-join';
import { template, errors, objects, sanitizeRoutesMapForSerialization } from '@strapi/utils';
import type { ActionsMap, Permission, PluginContext, Role, User } from '../types';

import { getService } from '../utils';

const { createStrictInterpolationRegExp } = template;

const DEFAULT_PERMISSIONS = [
  { action: 'plugin::users-permissions.auth.callback', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.connect', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.forgotPassword', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.resetPassword', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.register', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.emailConfirmation', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.sendEmailConfirmation', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.refresh', roleType: 'public' },
  { action: 'plugin::users-permissions.auth.logout', roleType: 'authenticated' },
  { action: 'plugin::users-permissions.auth.getSessions', roleType: 'authenticated' },
  { action: 'plugin::users-permissions.auth.revokeSession', roleType: 'authenticated' },
  { action: 'plugin::users-permissions.user.me', roleType: 'authenticated' },
  { action: 'plugin::users-permissions.auth.changePassword', roleType: 'authenticated' },
];

const transformRoutePrefixFor = (pluginName: string) => (route: Core.Route) => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

/** Discover Content API permissions and manage default role setup. */
export default ({ strapi }: PluginContext) => ({
  getActions({ defaultEnable = false } = {}): ActionsMap {
    const actionMap: ActionsMap = {};

    const isContentApi = (action: Core.Controller[string]) => {
      if (!_.has(action, Symbol.for('__type__'))) {
        return false;
      }

      const types: unknown = Reflect.get(action, Symbol.for('__type__'));
      return Array.isArray(types) && types.includes('content-api');
    };

    for (const [apiName, api] of Object.entries(strapi.apis)) {
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
        {} as ActionsMap[string]['controllers']
      );

      if (!_.isEmpty(controllers)) {
        actionMap[`api::${apiName}`] = { controllers };
      }
    }

    for (const [pluginName, plugin] of Object.entries(strapi.plugins)) {
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
        {} as ActionsMap[string]['controllers']
      );

      if (!_.isEmpty(controllers)) {
        actionMap[`plugin::${pluginName}`] = { controllers };
      }
    }

    // Return a deeply cloned version to avoid circular references
    return _.cloneDeep(actionMap);
  },

  async getRoutes() {
    const routesMap: Record<string, Core.Route[]> = {};

    for (const [apiName, api] of Object.entries(strapi.apis)) {
      const routes = Object.values(api.routes)
        .flatMap((route) => ('routes' in route ? route.routes : route))
        .filter((route) => route.info.type === 'content-api');

      if (routes.length === 0) {
        continue;
      }

      const apiPrefix = strapi.config.get<string>('api.rest.prefix');
      routesMap[`api::${apiName}`] = routes.map((route) => ({
        ...route,
        path: urlJoin(apiPrefix, route.path),
      }));
    }

    for (const [pluginName, plugin] of Object.entries(strapi.plugins)) {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      const routes = Object.values(plugin.routes)
        .flatMap((route) => ('routes' in route ? route.routes : route))
        .map((route) => transformPrefix(route))
        .filter((route) => route.info.type === 'content-api');

      if (routes.length === 0) {
        continue;
      }

      const apiPrefix = strapi.config.get<string>('api.rest.prefix');
      routesMap[`plugin::${pluginName}`] = routes.map((route) => ({
        ...route,
        path: urlJoin(apiPrefix, route.path),
      }));
    }

    return sanitizeRoutesMapForSerialization(routesMap);
  },

  async syncPermissions() {
    const roles: Role[] = await strapi.db.query('plugin::users-permissions.role').findMany();
    const dbPermissions: Permission[] = await strapi.db
      .query('plugin::users-permissions.permission')
      .findMany();

    const permissionsFoundInDB = _.uniq(_.map(dbPermissions, 'action'));

    const appActions = _.flatMap(strapi.apis, (api, apiName) => {
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
        const toCreate = DEFAULT_PERMISSIONS.filter(
          ({ roleType }) => roleType === role.type || roleType === null
        ).map(({ action }) => action);

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

  async initialize(): Promise<void> {
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

    return getService(strapi, 'users-permissions').syncPermissions();
  },

  async updateUserRole(user: Pick<User, 'id'>, role: Data.ID) {
    return strapi.db
      .query('plugin::users-permissions.user')
      .update({ where: { id: user.id }, data: { role } });
  },

  template(layout: string, data: Record<string, unknown>) {
    const allowedTemplateVariables = objects.keysDeep(data);

    // Create a strict interpolation RegExp based on possible variable names
    const interpolate = createStrictInterpolationRegExp(allowedTemplateVariables, 'g');

    try {
      return _.template(layout, { interpolate, evaluate: /($^)/, escape: /($^)/ })(data);
    } catch {
      throw new errors.ApplicationError('Invalid email template');
    }
  },
});
