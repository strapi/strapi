import type { Core } from '@strapi/types';

import { Release } from '../../shared/contracts/releases';
import { getService } from './utils';

export const destroy = async ({ strapi }: { strapi: Core.Strapi }) => {
  const scheduledJobs: Map<Release['id'], string> = getService('scheduling', {
    strapi,
  }).getAll();

  for (const [, taskName] of scheduledJobs) {
    strapi.cron.remove(taskName);
  }
};
