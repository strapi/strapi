import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx) {
    ctx.body = await strapi
      .plugin('audit-log')
      .service('auditLog')
      .find(ctx.query);
  },
});
