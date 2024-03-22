import type { Core } from '@strapi/types';
import executeCEDestroy from '../../../server/src/destroy';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  if (strapi.ee.features.isEnabled('audit-logs')) {
    strapi.get('audit-logs').destroy();
  }

  await executeCEDestroy();
};
