import type { Core } from '@strapi/types';

import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  // Pending releases, tie-broken by `id` so the order is stable across DBs/engines.
  // (E2E and the admin widget assume a predictable first row — see with-admin seed.)
  const findPendingReleases = (scheduled: boolean, orderBy: Record<string, 'asc'>[]) =>
    strapi.db.query('plugin::content-releases.release').findMany({
      filters: {
        releasedAt: { $notNull: false },
        scheduledAt: { $notNull: scheduled },
      },
      orderBy: [...orderBy, { id: 'asc' }],
      limit: MAX_DOCUMENTS,
    });

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response['data']> {
      // Unscheduled releases first, then by date: each database sorts nulls its own way
      const [unscheduled, scheduled] = await Promise.all([
        findPendingReleases(false, []),
        findPendingReleases(true, [{ scheduledAt: 'asc' }]),
      ]);

      return [...unscheduled, ...scheduled].slice(0, MAX_DOCUMENTS);
    },
  };
};

export default createHomepageService;
