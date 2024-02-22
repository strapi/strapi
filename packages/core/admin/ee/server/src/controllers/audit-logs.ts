import type { Context } from 'koa';

import { validateFindMany } from '../validation/audit-logs';

export default {
  async findMany(ctx: Context) {
    const { query } = ctx.request;
    await validateFindMany(query);

    const auditLogs = strapi.get('audit-logs');
    const body = await auditLogs.findMany(query);

    ctx.body = body;
  },

  async findOne(ctx: Context) {
    const { id } = ctx.params;

    const auditLogs = strapi.get('audit-logs');
    const body = await auditLogs.findOne(id);

    ctx.body = body;

    strapi.telemetry.send('didWatchAnAuditLog');
  },
};
