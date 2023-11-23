import { Strapi } from '@strapi/types';
import EE from '@strapi/strapi/dist/utils/ee';
import executeCEDestroy from '../../../server/src/destroy';

export default async ({ strapi }: { strapi: Strapi }) => {
  if (EE.features.isEnabled('audit-logs')) {
    strapi.get('audit-logs').destroy();
  }

  await executeCEDestroy();
};
