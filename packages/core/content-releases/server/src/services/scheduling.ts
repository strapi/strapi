import { scheduleJob, Job } from 'node-schedule';
import { LoadedStrapi } from '@strapi/types';

import { errors } from '@strapi/utils';
import { Release } from '../../../shared/contracts/releases';
import { getService } from '../utils';
import { RELEASE_MODEL_UID } from '../constants';

const createSchedulingService = ({ strapi }: { strapi: LoadedStrapi }) => {
  const scheduledJobs = new Map<Release['id'], Job>();

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

      if (scheduledJobs.has(releaseId)) {
        this.cancel(releaseId);
      }

      scheduledJobs.set(releaseId, job);

      return scheduledJobs;
    },

    cancel(releaseId: Release['id']) {
      if (scheduledJobs.has(releaseId)) {
        scheduledJobs.get(releaseId)!.cancel();
        scheduledJobs.delete(releaseId);
      }

      return scheduledJobs;
    },
  };
};

export default createSchedulingService;
