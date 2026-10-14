import type { Core } from '@strapi/types';
import type { GetRecentlyAssignedDocuments } from '../../../../shared/contracts/homepage';

const createHomepageController = () => {
  // The controller only exists with the `review-workflows` feature, where the service is defined.
  const homepageService = strapi
    .plugin('review-workflows')
    .service<NonNullable<Core.ServiceFor<'plugin::review-workflows.homepage'>>>('homepage');

  return {
    async getRecentlyAssignedDocuments(): Promise<GetRecentlyAssignedDocuments.Response> {
      return { data: await homepageService.getRecentlyAssignedDocuments() };
    },
  } satisfies Core.Controller;
};

export { createHomepageController };
