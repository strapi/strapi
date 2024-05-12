import type { Strapi } from '@strapi/strapi';
import initSentryMiddleware from './middlewares/sentry';

export default async ({ strapi }: { strapi: Strapi }) => {
  // Initialize the Sentry service exposed by this plugin
  initSentryMiddleware({ strapi });
};
