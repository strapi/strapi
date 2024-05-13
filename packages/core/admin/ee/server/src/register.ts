import type { Core } from '@strapi/types';

import executeCERegister from '../../../server/src/register';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  await executeCERegister({ strapi });
};
