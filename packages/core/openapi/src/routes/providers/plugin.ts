import { type Core } from '@strapi/types';
import { createDebugger } from '../../utils';

import { AbstractRoutesProvider } from './abstract';

const debug = createDebugger('routes:provider:plugins');

/**
 * Class providing routes from Strapi plugins.
 *
 * This class extracts and consolidates routes registered by Strapi plugins,
 * accommodating different ways plugins may define their routes.
 *
 * @extends {@link AbstractRoutesProvider}
 */
export class PluginRoutesProvider extends AbstractRoutesProvider {
  /**
   * Retrieves all routes registered in the Strapi plugins.
   *
   * It handles two cases:
   * - The plugin's routes are directly provided as a {@link Core.Route}[].
   * - The plugin's routes are defined as a record of routers which contain their own list of routes.
   *
   * @returns An array of {@link Core.Route} objects.
   */
  public get routes(): Core.Route[] {
    const { plugins } = this._strapi;

    const routes = Object.values(plugins).flatMap((plugin) => {
      const { routes } = plugin;

      return Array.isArray(routes)
        ? routes
        : Object.values(routes).flatMap((router: Core.Router) => {
            return router.routes.map((route: Core.Route) => {
              const hasOwnPrefix =
                route.config != null &&
                Object.prototype.hasOwnProperty.call(route.config, 'prefix');

              const effectivePrefix = hasOwnPrefix
                ? (route.config?.prefix ?? '')
                : (router.prefix ?? '');

              const fullPath =
                (`${effectivePrefix}${route.path}` || '/')
                  .replace(/\/+/g, '/')
                  .replace(/\/$/, '') || '/';

              return {
                ...route,
                path: fullPath,
              };
            });
          });
    });

    debug('found %o routes in Strapi plugins', routes.length);

    return routes;
  }
}
