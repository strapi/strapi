import type { Core } from '@strapi/types';
import { config } from './config';
import { bootstrap } from './bootstrap';
import { services } from './services';

async function softReset({ strapi }: { strapi: Core.Strapi }) {
  try {
    // Stop existing Apollo server if available
    if (typeof (strapi.plugin('graphql') as any).destroy === 'function') {
      await (strapi.plugin('graphql') as any).destroy();
    }

    // Rebuild GraphQL schema
    const contentApi = strapi.plugin('graphql').service('content-api');
    contentApi.buildSchema();

    // Re-register GraphQL route handlers without touching app-level middlewares
    await bootstrap({ strapi });
  } catch (e) {
    strapi.log.warn('GraphQL softReset failed');
    strapi.log.warn(e as any);
  }
}

export default {
  config,
  bootstrap,
  softReset,
  services,
};
