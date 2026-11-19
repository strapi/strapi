import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async summary() {
    return { contentTypes: Object.keys(strapi.contentTypes).length, kind: 'summary' as const };
  },
});
