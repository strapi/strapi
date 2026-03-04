import type { Core } from '@strapi/types';

import { errors } from '@strapi/utils';
import { Release } from '../../../shared/contracts/releases';
import { getService } from '../utils';
import { RELEASE_MODEL_UID } from '../constants';

const createSchedulingService = ({ strapi }: { strapi: Core.Strapi }) => {
  const scheduledJobs = new Map<Release['id'], string>();

  return {
    async set(releaseId: Release['id'], scheduleDate: Date) {
      const release = await strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId, releasedAt: null } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      const taskName = `publishRelease_${releaseId}`;

      strapi.cron.add({
        [taskName]: {
          async task() {
            try {
              await getService('release', { strapi }).publish(releaseId);
              // @TODO: Trigger webhook with success message
            } catch (error) {
              // @TODO: Trigger webhook with error message
            }
          },
          options: scheduleDate,
        },
      });

      if (scheduledJobs.has(releaseId)) {
        this.cancel(releaseId);
      }

      scheduledJobs.set(releaseId, taskName);

      return scheduledJobs;
    },

    cancel(releaseId: Release['id']) {
      if (scheduledJobs.has(releaseId)) {
        strapi.cron.remove(scheduledJobs.get(releaseId)!);
        scheduledJobs.delete(releaseId);
      }

      return scheduledJobs;
    },

    getAll() {
      return scheduledJobs;
    },

    /**
     * On bootstrap, we can use this function to make sure to sync the scheduled jobs from the database that are not yet released
     * This is useful in case the server was restarted and the scheduled jobs were lost
     * This also could be used to sync different Strapi instances in case of a cluster
     */
    async syncFromDatabase() {
      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          scheduledAt: {
            $gte: new Date(),
          },
          releasedAt: null,
        },
      });

      for (const release of releases) {
        this.set(release.id, release.scheduledAt);
      }

      return scheduledJobs;
    },
  };
};

export default createSchedulingService;
