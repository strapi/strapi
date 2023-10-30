import { validateFindMany } from '../validation/audit-logs';

export default {
  async findMany(ctx: any) {
    const { query } = ctx.request;
    await validateFindMany(query);

    const auditLogs = strapi.container.get('audit-logs');
    const body = await auditLogs.findMany(query);

    ctx.body = body;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;

    const auditLogs = strapi.container.get('audit-logs');
    const body = await auditLogs.findOne(id);

    ctx.body = body;
  },
};
