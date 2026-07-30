import type { Core } from '@strapi/types';
import type { GetRecentlyAssignedDocuments } from '../../../../shared/contracts/homepage';

const createHomepageController = () => {
  const homepageService = strapi.plugin('review-workflows').service('homepage');

  return {
    async getRecentlyAssignedDocuments(): Promise<GetRecentlyAssignedDocuments.Response> {
      return { data: await homepageService.getRecentlyAssignedDocuments() };
    },
  } satisfies Core.Controller;
};

export { createHomepageController };
