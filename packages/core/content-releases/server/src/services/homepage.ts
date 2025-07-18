import type { Core } from '@strapi/types';

import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response['data']> {
      const releases = await strapi.db.query('plugin::content-releases.release').findMany({
        filters: {
          scheduledAt: {
            $gte: new Date(),
          },
          status: {
            $ne: 'done',
          },
        },
      });

      return releases;
    },
  };
};

export default createHomepageService;
