import { Job } from 'node-schedule';
import { LoadedStrapi } from '@strapi/types';

import { Release } from '../../shared/contracts/releases';
import { getService } from './utils';

export const destroy = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (strapi.features.future.isEnabled('contentReleasesScheduling')) {
    const scheduledJobs: Map<Release['id'], Job> = getService('scheduling', {
      strapi,
    }).syncFromDatabase();

    for (const [, job] of scheduledJobs) {
      job.cancel();
    }
  }
};
