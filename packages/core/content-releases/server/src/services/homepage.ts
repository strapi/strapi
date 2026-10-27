import type { Core } from '@strapi/types';

import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response['data']> {
      // Postgres sorts nulls last in ASC. Unscheduled releases are the predictable
      // first rows (the homepage widget and API tests), then the soonest schedule.
      const unscheduled = await strapi.db.query('plugin::content-releases.release').findMany({
        filters: {
          releasedAt: { $notNull: false },
          scheduledAt: { $null: true },
        },
        orderBy: { id: 'asc' },
        limit: MAX_DOCUMENTS,
      });

      if (unscheduled.length >= MAX_DOCUMENTS) {
        return unscheduled;
      }

      const scheduled = await strapi.db.query('plugin::content-releases.release').findMany({
        filters: {
          releasedAt: { $notNull: false },
          scheduledAt: { $notNull: true },
        },
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
        limit: MAX_DOCUMENTS - unscheduled.length,
      });

      return [...unscheduled, ...scheduled];
    },
  };
};

export default createHomepageService;
