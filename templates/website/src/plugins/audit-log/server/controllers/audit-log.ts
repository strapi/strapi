import { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { AuditLogQuery } from '../types/audit-log';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    try {
      const query = ctx.request.query as unknown as AuditLogQuery;
      const data = await strapi
        .plugin('audit-log')
        .service('audit-log')
        .findWithFilters(query);

      ctx.body = data;
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve audit logs');
    }
  },
});
