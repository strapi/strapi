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
   * @returns An array of {@link Core.Route} objects
   */
  public get routes(): Core.Route[] {
    const { apis } = this._strapi;

    const routes = Object.values(apis)
      // Extract and flatten each router from every API
      .flatMap((api) => Object.values(api.routes))
      // Extract and flatten the routes from each router
      .flatMap((router) => router.routes);

    debug('found %o routes in Strapi APIs', routes.length);

    return routes;
  }
}
