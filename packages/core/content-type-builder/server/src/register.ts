import type { Core } from '@strapi/types';
import { mergeWith } from 'lodash/fp';

/**
 * Utility to extend Strapi configuration middlewares. Mainly used to extend the CSP directives from the security middleware.
 */
const extendMiddlewareConfiguration = (middleware = { name: '', config: {} }) => {
  const middlewares = strapi.config.get('middlewares') as (string | object)[];

  const configuredMiddlewares = middlewares.map((currentMiddleware) => {
    let _currentMiddleware = currentMiddleware as any;
    if (currentMiddleware === middleware.name) {
      // Use the new config object if the middleware has no config property yet
      _currentMiddleware = {
        name: 'strapi::security',
        config: {
          useDefaults: true,
          contentSecurityPolicy: {
            directives: {
              'img-src': ["'self'", 'data:', 'blob:'],
              'media-src': ["'self'", 'data:', 'blob:'],
              upgradeInsecureRequests: null,
            },
          },
        },
      };
    }

    if (_currentMiddleware.name === middleware.name) {
      // Deep merge (+ concat arrays) the new config with the current middleware config
      return mergeWith(
        (objValue, srcValue) => {
          if (Array.isArray(objValue)) {
            return objValue.concat(srcValue);
          }

          return undefined;
        },
        _currentMiddleware,
        middleware
      );
    }

    return _currentMiddleware;
  });

  strapi.config.set('middlewares', configuredMiddlewares);
};

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  extendMiddlewareConfiguration({
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        directives: {
          'img-src': [
            'strapi-ai-staging.s3.us-east-1.amazonaws.com',
            'strapi-ai-production.s3.us-east-1.amazonaws.com',
          ],
          'media-src': [
            'strapi-ai-staging.s3.us-east-1.amazonaws.com',
            'strapi-ai-production.s3.us-east-1.amazonaws.com',
          ],
        },
      },
    },
  });
};
