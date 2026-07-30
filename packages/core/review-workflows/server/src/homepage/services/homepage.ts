import type { Core } from '@strapi/types';

import type { GetRecentlyAssignedDocuments } from '../../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async getRecentlyAssignedDocuments(): Promise<GetRecentlyAssignedDocuments.Response['data']> {
      const userId = strapi.requestContext.get()?.state?.user.id;
      const { queryLastDocuments, addStatusToDocuments } = strapi
        .plugin('content-manager')
        .service('homepage');

      const recentlyAssignedDocuments = await queryLastDocuments({
        populate: ['strapi_stage'],
        filters: {
          strapi_assignee: {
            id: userId,
          },
        },
      });

      return addStatusToDocuments(recentlyAssignedDocuments);
    },
  };
};

export { createHomepageService };
