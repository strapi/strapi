import { mergeWith } from 'lodash/fp';

export const CSP_DEFAULTS = {
  'connect-src': ["'self'", 'https:'],
  'img-src': ["'self'", 'data:', 'blob:', 'https://market-assets.strapi.io'],
  'media-src': ["'self'", 'data:', 'blob:'],
} as const;

/**
 * Utility to extend Strapi middleware configuration. Mainly used to extend the CSP directives from the security middleware.
 *
 * @param middlewares - Array of middleware configurations
 * @param middleware - Middleware configuration to merge/add
 * @returns Modified middlewares array with the new configuration merged
 */
export const extendMiddlewareConfiguration = (
  middlewares: (string | { name?: string; config?: any })[],
  middleware: { name: string; config?: any }
) => {
  return middlewares.map((currentMiddleware) => {
    if (typeof currentMiddleware === 'string' && currentMiddleware === middleware.name) {
      // Use the new config object if the middleware has no config property yet
      return middleware;
    }

    if (typeof currentMiddleware === 'object' && currentMiddleware.name === middleware.name) {
      // Deep merge (+ concat arrays) the new config with the current middleware config
      return mergeWith(
        (objValue, srcValue) => {
          if (Array.isArray(objValue)) {
            return Array.from(new Set(objValue.concat(srcValue)));
          }
          return undefined;
        },
        currentMiddleware,
        middleware
      );
    }

    return currentMiddleware;
  });
};
