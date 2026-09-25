import type { Core } from '@strapi/types';
import { createDebugger } from '../../utils';

import { AbstractRoutesProvider } from './abstract';

const debug = createDebugger('routes:provider:api');

/**
 * Class representing a provider for API routes.
 *
 * This class retrieves and provides access to routes registered in the Strapi
 * APIs.
 *
 * @extends {@link AbstractRoutesProvider}
 */
export class ApiRoutesProvider extends AbstractRoutesProvider {
  /**
   * Retrieves all routes registered in the Strapi APIs.
   *
   * It extracts routes from the Strapi APIs by flattening their
   * structure and consolidating them into a single array of {@link Core.Route}.
   *
   * Route paths are resolved to their full public path by prepending the
   * effective prefix. Unlike plugin routers, API routers don't carry the
   * global REST prefix themselves: the server mounts them with the
   * `api.rest.prefix` config (`/api` by default), so we resolve it from
   * the config when the router has no explicit prefix.
   *
   * @returns An array of {@link Core.Route} objects
   */
  public get routes(): Core.Route[] {
    const { apis } = this._strapi;

    // API routers are served under the configured REST prefix (`/api` by default)
    const apiPrefix = this._strapi.config.get('api.rest.prefix', '/api');

    const routes = Object.values(apis)
      // Extract and flatten each router from every API
      .flatMap((api) => Object.values(api.routes))
      // Extract the routes from each router, resolving their full public path
      .flatMap((router) =>
        router.routes.map((route) => {
          const hasOwnPrefix =
            route.config != null && Object.prototype.hasOwnProperty.call(route.config, 'prefix');

          const effectivePrefix = hasOwnPrefix
            ? (route.config?.prefix ?? '')
            : (router.prefix ?? apiPrefix);

          const fullPath =
            (`${effectivePrefix}${route.path}` || '/').replace(/\/+/g, '/').replace(/\/$/, '') ||
            '/';

          return {
            ...route,
            path: fullPath,
          };
        })
      );

    debug('found %o routes in Strapi APIs', routes.length);

    return routes;
  }
}
