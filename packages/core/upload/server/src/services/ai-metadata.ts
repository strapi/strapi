import type { Core } from '@strapi/types';

const createAIMetadataService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    isEnabled() {
      const isAIEnabled = strapi.config.get('admin.ai.enabled', false);

      // TODO replace by a specific feature check once it's set up in the license registry
      const { isEE } = strapi.ee;

      return isAIEnabled && isEE;
    },
  };
};

export { createAIMetadataService };
