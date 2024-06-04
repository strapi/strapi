import { Job } from 'node-schedule';
import { Core } from '@strapi/types';

import { Release } from '../../shared/contracts/releases';
import { getService } from './utils';

export const destroy = async ({ strapi }: { strapi: Core.Strapi }) => {
  const scheduledJobs: Map<Release['id'], Job> = getService('scheduling', {
    strapi,
  }).getAll();

  for (const [, job] of scheduledJobs) {
    job.cancel();
  }
};
