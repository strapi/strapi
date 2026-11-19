import type { Core } from '@strapi/strapi';

export default {
  // Type generation registers services, controllers, policies and middlewares, and lookups are
  // checked against them.
  strictTypes: true,
} satisfies Core.Config.TypeScript;
