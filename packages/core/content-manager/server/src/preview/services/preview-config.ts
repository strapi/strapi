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
    handler: (uid: UID.Schema, params: HandlerParams) => string | undefined;
  };
}

/**
 * Read configuration for static preview
 */
const createPreviewConfigService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
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
