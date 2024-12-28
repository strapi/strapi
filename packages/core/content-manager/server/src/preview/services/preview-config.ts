import { mergeWith } from 'lodash/fp';

import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

export type HandlerParams = {
  documentId: string;
  locale: string;
  status: 'published' | 'draft';
};

export interface PreviewConfig {
  enabled: boolean;
  config: {
    // List of CSP allowed origins. This is a shortcut to setting it up inside `config/middlewares.js`
    allowedOrigins: string[];
    handler: (uid: UID.Schema, params: HandlerParams) => string | undefined;
  };
}

/**
 * Utility to extend Strapi configuration middlewares. Mainly used to extend the CSP directives from the security middleware.
 */
const extendMiddlewareConfiguration = (middleware = { name: '', config: {} }) => {
  const middlewares = strapi.config.get('middlewares') as (string | object)[];

  const configuredMiddlewares = middlewares.map((currentMiddleware) => {
    if (currentMiddleware === middleware.name) {
      // Use the new config object if the middleware has no config property yet
      return middleware;
    }

    // @ts-expect-error - currentMiddleware is not a string
    if (currentMiddleware.name === middleware.name) {
      // Deep merge (+ concat arrays) the new config with the current middleware config
      return mergeWith(
        (objValue, srcValue) => {
          if (Array.isArray(objValue)) {
            return objValue.concat(srcValue);
          }

          return undefined;
        },
        currentMiddleware,
        middleware
      );
    }

    return currentMiddleware;
  });

  strapi.config.set('middlewares', configuredMiddlewares);
};

/**
 * Read configuration for static preview
 */
const createPreviewConfigService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    register() {
      if (!this.isEnabled()) {
        return;
      }

      const config = strapi.config.get('admin.preview') as PreviewConfig;

      /**
       * Register the allowed origins for CSP, so the preview URL can be displayed
       */
      if (config.config?.allowedOrigins) {
        extendMiddlewareConfiguration({
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'frame-src': config.config.allowedOrigins,
              },
            },
          },
        });
      }
    },

    isEnabled() {
      const config = strapi.config.get('admin.preview') as PreviewConfig;

      if (!config) {
        return false;
      }

      return config?.enabled ?? true;
    },

    /**
     * Validate if the configuration is valid
     */
    validate() {
      if (!this.isEnabled()) {
        return;
      }

      const handler = this.getPreviewHandler();

      // Handler must be a function
      if (typeof handler !== 'function') {
        throw new errors.ValidationError(
          'Preview configuration is invalid. Handler must be a function'
        );
      }
    },

    /**
     * Utility to get the preview handler from the configuration
     */
    getPreviewHandler(): PreviewConfig['config']['handler'] {
      const config = strapi.config.get('admin.preview') as PreviewConfig;

      const emptyHandler = () => {
        return undefined;
      };

      if (!this.isEnabled()) {
        return emptyHandler;
      }

      return config?.config?.handler || emptyHandler;
    },
  };
};

export { createPreviewConfigService };
