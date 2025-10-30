import type { Core, UID } from '@strapi/types';
import { errors, extendMiddlewareConfiguration } from '@strapi/utils';

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
        const middlewares = strapi.config.get('middlewares') as (
          | string
          | { name?: string; config?: any }
        )[];

        const configuredMiddlewares = extendMiddlewareConfiguration(middlewares, {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              directives: {
                'frame-src': config.config.allowedOrigins,
              },
            },
          },
        });

        strapi.config.set('middlewares', configuredMiddlewares);
      }
    },

    isConfigured() {
      const config = strapi.config.get('admin.preview') as PreviewConfig;
      return config?.enabled === false || config?.config?.handler != null;
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
      const emptyHandler = () => {
        return undefined;
      };

      if (!this.isEnabled()) {
        return emptyHandler;
      }

      const config = strapi.config.get('admin.preview') as PreviewConfig;

      return config?.config?.handler || emptyHandler;
    },
  };
};

export { createPreviewConfigService };
