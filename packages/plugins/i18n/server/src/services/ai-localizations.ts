import type { Core } from '@strapi/types';

const createAILocalizationsService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    // Async to avoid changing the signature later (there will be a db check in the future)
    async isEnabled() {
      // Check if future flag is enabled
      const isFutureFlagEnabled = strapi.features.future.isEnabled('unstableAILocalizations');
      if (!isFutureFlagEnabled) {
        return false;
      }

      // Check if user disabled AI features globally
      const isAIEnabled = strapi.config.get('admin.ai.enabled', true);
      if (!isAIEnabled) {
        return false;
      }

      // Check if the user's license grants access to AI features
      const hasAccess = strapi.ee.features.isEnabled('cms-ai');
      if (!hasAccess) {
        return false;
      }

      return true;
    },
  };
};

export { createAILocalizationsService };
