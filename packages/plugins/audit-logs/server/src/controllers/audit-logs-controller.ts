import type { Core } from '@strapi/types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get auditLog design action.
   *
   * @return {Object}
   */
  getAuditLogs: async (ctx: any) => {
    const auditLogs = await strapi.plugin('audit-logs').service('auditService').findMany(ctx.request.query);
    ctx.send(auditLogs);
  },

  /**
   * Get auditLog design action.
   *
   * @return {Object}
   */
  getAuditLog: async (ctx: any) => {
    const auditLog = await strapi.plugin('audit-logs').service('auditService').findOne({ id: ctx.params.id });
    ctx.send(auditLog);
  },
});