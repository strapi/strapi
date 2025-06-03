import type { Core } from '@strapi/types';

import { addDocumentMiddlewares } from './middlewares/documentation';

export async function register({ strapi }: { strapi: Core.Strapi }) {
  await addDocumentMiddlewares({ strapi });
}
