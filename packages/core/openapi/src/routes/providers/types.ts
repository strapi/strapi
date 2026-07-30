import type { Core } from '@strapi/types';

/**
 * Interface representing a provider for routes.
 *
 * It extends {@link Iterable} to allow iteration over {@link Core.Route} objects.
 */
export interface RoutesProvider extends Iterable<Core.Route> {
  /**
   * Retrieves an array of routes.
   */
  get routes(): Core.Route[];
}
