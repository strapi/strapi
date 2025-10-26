import type { Context } from 'koa';

import { validateFindMany } from '../validation/audit-logs';

export default {
  async findMany(ctx: Context) {
    const { query } = ctx.request;
    await validateFindMany(query);

    // Build filters understood by strapi query-params transform
    const filters: any = {};
    if (query.action) {
      filters.action = query.action;
    }
    if (query.userId) {
      filters.user = { id: query.userId };
    }
    // contentType is stored inside payload in many events; allow filtering by payload.contentType
    if (query.contentType) {
      filters['payload.contentType'] = query.contentType;
    }
    if (query.dateFrom || query.dateTo) {
      filters.date = {} as any;
      if (query.dateFrom) filters.date.$gte = query.dateFrom;
      if (query.dateTo) filters.date.$lte = query.dateTo;
    }

    const auditLogs = strapi.get('audit-logs');
    const q: any = { ...query };
    if (Object.keys(filters).length) {
      q.filters = filters;
    }

    const body = await auditLogs.findMany(q);

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
