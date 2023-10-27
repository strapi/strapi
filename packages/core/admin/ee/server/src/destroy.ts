import { Strapi } from '@strapi/types';
import executeCEDestroy from '../../../server/src/destroy';

export default async ({ strapi }: { strapi: Strapi }) => {
  if (strapi.EE?.features.isEnabled('audit-logs')) {
    strapi.container.get('audit-logs').destroy();
  }

  await executeCEDestroy();
};
