import type { Core } from '@strapi/types';
import { errors, extendMiddlewareConfiguration } from '@strapi/utils';

export type HandlerParams = {
  documentId: string;
  locale: string;
  status: 'published' | 'draft';
};

/**
 * @deprecated Use Core.Config.Admin['preview'] from @strapi/types instead
 * Keeping for backward compatibility
 */
export type PreviewConfig = NonNullable<Core.Config.Admin['preview']>;

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
    getPreviewHandler(): NonNullable<Core.Config.Admin['preview']>['config']['handler'] {
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
