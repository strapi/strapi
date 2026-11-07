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
   * It extracts routes from the Strapi APIs by flattening their structure and
   * prepends the `api.rest.prefix` (default `/api`) that the runtime mounts
   * content-api routes under, so generated paths match the served URLs.
   *
   * @returns An array of {@link Core.Route} objects
   */
  public get routes(): Core.Route[] {
    const { apis } = this._strapi;
    const apiPrefix = this._strapi.config.get('api.rest.prefix', '/api') as string;

    const routes = Object.values(apis)
      // Extract and flatten each router from every API
      .flatMap((api) => Object.values(api.routes))
      // Extract and flatten the routes from each router, applying prefixes
      .flatMap((router: Core.Router) => {
        return router.routes.map((route: Core.Route) => {
          const hasOwnPrefix =
            route.config != null && Object.prototype.hasOwnProperty.call(route.config, 'prefix');

          const routerPrefix = hasOwnPrefix ? (route.config?.prefix ?? '') : (router.prefix ?? '');

          const fullPath =
            `${apiPrefix}${routerPrefix}${route.path}`.replace(/\/+/g, '/').replace(/\/$/, '') ||
            '/';

          return {
            ...route,
            path: fullPath,
          };
        });
      });

    debug('found %o routes in Strapi APIs', routes.length);

    return routes;
  }
}
