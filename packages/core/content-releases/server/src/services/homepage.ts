import type { Core } from '@strapi/types';

import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

type UpcomingRelease = GetUpcomingReleases.Response['data'][number];

const scheduledTime = (release: UpcomingRelease) =>
  release.scheduledAt == null ? null : new Date(release.scheduledAt).getTime();

/**
 * Unscheduled releases first, then the soonest schedule, ties by id. Postgres
 * sorts nulls last in ASC and MySQL and SQLite sort them first, so the order
 * is applied here rather than in SQL.
 */
const compareUpcomingReleases = (a: UpcomingRelease, b: UpcomingRelease) => {
  const aTime = scheduledTime(a);
  const bTime = scheduledTime(b);

  if (aTime !== bTime) {
    if (aTime === null) return -1;
    if (bTime === null) return 1;
    return aTime - bTime;
  }

  return Number(a.id) - Number(b.id);
};

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response['data']> {
      // One query, so a release scheduled or unscheduled meanwhile is listed
      // once. Two queries would not share a snapshot outside MySQL.
      const releases: UpcomingRelease[] = await strapi.db
        .query('plugin::content-releases.release')
        .findMany({
          filters: {
            releasedAt: { $notNull: false },
          },
        });

      return [...releases].sort(compareUpcomingReleases).slice(0, MAX_DOCUMENTS);
    },
  };
};

export default createHomepageService;
