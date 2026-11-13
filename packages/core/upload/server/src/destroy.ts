import type { Core } from '@strapi/types';

import { getService } from './utils';

export async function destroy({ strapi }: { strapi: Core.Strapi }) {
  // The AI metadata jobs this process runs cannot complete once it stops. Failing them now lets
  // the admin show the failure at once instead of after their heartbeat goes stale.
  try {
    await getService('aiMetadataJobs').failOwnedJobs();
  } catch (error) {
    strapi.log.error('Could not fail the AI metadata jobs of the stopping server');
    strapi.log.error(error);
  }
}
