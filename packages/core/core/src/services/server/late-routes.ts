import { routesOf } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { warnLateRegistration } from '../../utils/late-registration';
import { areRoutesRegistered } from './routes-registration';

type ModuleRoutes = Core.Plugin['routes'];

/** The routes of a module, with the key of the router that holds them (none for an array of routes). */
const routerEntriesOf = (routes: ModuleRoutes): Array<[string | undefined, Core.RouteInput[]]> => {
  if (Array.isArray(routes)) {
    return [[undefined, routes]];
  }

  return Object.entries(routes).map(([routerKey, router]) => [routerKey, routesOf(router) ?? []]);
};

const warnAboutModuleRoutes = (strapi: Core.Strapi, owner: string, routes: ModuleRoutes) => {
  for (const [routerKey, routerRoutes] of routerEntriesOf(routes)) {
    for (const route of routerRoutes) {
      // `server.initRouting()` gives every route it registers an `info`
      if (route.info !== undefined) {
        continue;
      }

      const name = `${route.method} ${route.path}`;
      const router = routerKey === undefined ? '' : ` (router "${routerKey}")`;

      warnLateRegistration(strapi, {
        surface: 'routes',
        key: JSON.stringify([owner, routerKey, name]),
        subject: `Route "${name}" of ${owner}${router}`,
        closedBy:
          'Strapi registered the routes (server.initRouting(), in the bootstrap phase, before the bootstrap functions of plugins and APIs)',
        effect: 'Strapi does not serve it, and contentAPI.getRoutesMap() does not list it',
        registerIn: 'in the routes of the plugin or API, or from a register function',
      });
    }
  }
};

/**
 * Development only: warns once per route about routes added to the routers of an API or plugin
 * after Strapi registered the routes. Strapi never serves them.
 *
 * `server.initRouting()` gives every route of every module an `info`: a route without one was
 * pushed into a router, or came with a router that replaced one, afterwards.
 */
export const warnAboutRoutesAddedAfterRouting = (strapi: Core.Strapi): void => {
  if (areRoutesRegistered(strapi) === false) {
    return;
  }

  for (const [apiName, api] of Object.entries(strapi.apis)) {
    warnAboutModuleRoutes(strapi, `api::${apiName}`, api.routes);
  }

  for (const [pluginName, plugin] of Object.entries(strapi.plugins)) {
    warnAboutModuleRoutes(strapi, `plugin::${pluginName}`, plugin.routes);
  }
};
