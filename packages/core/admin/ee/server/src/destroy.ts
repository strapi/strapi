import type { Core } from '@strapi/types';
import executeCEDestroy from '../../../server/src/destroy';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  await executeCEDestroy();
};
