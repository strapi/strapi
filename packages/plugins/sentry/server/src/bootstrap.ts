import type { Core } from '@strapi/strapi';
import initSentryMiddleware from './middlewares/sentry';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Initialize the Sentry service exposed by this plugin
  initSentryMiddleware({ strapi });
};
