import { scheduleJob, Job } from 'node-schedule';
import { LoadedStrapi } from '@strapi/types';

import { errors } from '@strapi/utils';
import { Release } from '../../../shared/contracts/releases';
import { getService } from '../utils';
import { RELEASE_MODEL_UID } from '../constants';

const createSchedulingService = ({ strapi }: { strapi: LoadedStrapi }) => {
  const scheduleJobs = new Map<Release['id'], Job>();

  return {
    async set(releaseId: Release['id'], scheduleDate: Date) {
      const release = await strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId, releasedAt: null } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      const job = scheduleJob(scheduleDate, async () => {
        try {
          await getService('release').publish(releaseId);
          // @TODO: Trigger webhook with success message
        } catch (error) {
          // @TODO: Trigger webhook with error message
        }

        this.cancel(releaseId);
      });

      if (scheduleJobs.has(releaseId)) {
        this.cancel(releaseId);
      }

      scheduleJobs.set(releaseId, job);

      return scheduleJobs;
    },

    cancel(releaseId: Release['id']) {
      if (scheduleJobs.has(releaseId)) {
        scheduleJobs.get(releaseId)!.cancel();
        scheduleJobs.delete(releaseId);
      }

      return scheduleJobs;
    },
  };
};

export default createSchedulingService;
