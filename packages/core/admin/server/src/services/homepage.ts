import type { Core } from '@strapi/types';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async getRecentUpdates() {
      return 'recent updates';
    },
  };
};

export { createHomepageService };
