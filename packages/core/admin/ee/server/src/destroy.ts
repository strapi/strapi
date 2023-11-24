import { Strapi } from '@strapi/types';
import executeCEDestroy from '../../../server/src/destroy';

export default async ({ strapi }: { strapi: Strapi }) => {
  if (strapi.ee.features.isEnabled('audit-logs')) {
    strapi.get('audit-logs').destroy();
  }

  await executeCEDestroy();
};
