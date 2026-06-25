import type { Core } from '@strapi/types';

import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response['data']> {
      const releases = await strapi.db.query('plugin::content-releases.release').findMany({
        filters: {
          releasedAt: {
            $notNull: false,
          },
        },
        // `scheduledAt` is often null; tie-break by `id` so order is stable across DBs/engines.
        // (E2E and the admin widget assume a predictable first row in that case — see with-admin seed.)
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
        limit: MAX_DOCUMENTS,
      });

      return releases;
    },
  };
};

export default createHomepageService;
