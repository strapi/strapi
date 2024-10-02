import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

export interface PreviewConfig {
  enabled: boolean;
  config: {
    handler: (
      uid: UID.Schema,
      params: { documentId: string; locale: string; status: 'published' | 'draft' }
    ) => string | undefined;
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

      // If feature is enabled, handler must be provided
      if (!handler) {
        throw new errors.ValidationError(
          'Static Preview configuration is invalid. You must provide a handler function'
        );
      }

      // Handler must be a function
      if (typeof handler !== 'function') {
        throw new errors.ValidationError(
          'Static Preview configuration is invalid. Handler must be a function'
        );
      }
    },

    /**
     * Utility to get the preview handler from the configuration
     */
    getPreviewHandler() {
      const config = strapi.config.get('admin.preview') as PreviewConfig;
      const emptyHandler = () => {};

      if (!this.isEnabled()) {
        return emptyHandler;
      }

      return config?.config?.handler || emptyHandler;
    },
  };
};

export { createPreviewConfigService };
