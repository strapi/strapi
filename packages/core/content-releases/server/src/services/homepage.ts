import type { Core } from '@strapi/types';

import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  // Pending releases, tie-broken by `id` so the order is stable across DBs/engines.
  // (E2E and the admin widget assume a predictable first row — see with-admin seed.)
  const findPendingReleases = (
    scheduled: boolean,
    orderBy: Record<string, 'asc'>[],
    limit: number
  ) =>
    strapi.db.query('plugin::content-releases.release').findMany({
      filters: {
        releasedAt: { $notNull: false },
        scheduledAt: { $notNull: scheduled },
      },
      orderBy: [...orderBy, { id: 'asc' }],
      limit,
    });

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response['data']> {
      // Scheduled releases first (soonest first), then fill the remaining slots with undated ones.
      // Two queries because each database sorts nulls its own way.
      const scheduled = await findPendingReleases(true, [{ scheduledAt: 'asc' }], MAX_DOCUMENTS);
      const remaining = MAX_DOCUMENTS - scheduled.length;

      if (remaining === 0) {
        return scheduled;
      }

      return [...scheduled, ...(await findPendingReleases(false, [], remaining))];
    },
  };
};

export default createHomepageService;
