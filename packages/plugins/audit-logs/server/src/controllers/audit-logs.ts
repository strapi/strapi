type FindQuery = {
  contentType?: string;
  userId?: string | number;
  action?: 'create' | 'update' | 'delete';
  start?: string; // ISO date
  end?: string; // ISO date
  page?: string | number;
  pageSize?: string | number;
  sort?: string; // e.g. occurredAt:desc
};

export default {
  async find(ctx: any) {
    const q = ctx.query as unknown as FindQuery;

    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize ?? 25)));
    const start = q.start ? new Date(q.start) : undefined;
    const end = q.end ? new Date(q.end) : undefined;

    const where: any = {};
    if (q.contentType) where.contentType = q.contentType;
    if (q.userId) where.userId = Number(q.userId);
    if (q.action) where.action = q.action;
    if (start || end) {
      where.occurredAt = {};
      if (start) where.occurredAt['$gte'] = start;
      if (end) where.occurredAt['$lte'] = end;
    }

    const sortStr = q.sort || 'occurredAt:desc';
    const [sortField, sortOrder] = sortStr.split(':');

    const [data, total] = await Promise.all([
      strapi.db.query('plugin::audit-logs.audit-log').findMany({
        where,
        orderBy: { [sortField]: (sortOrder || 'desc').toLowerCase() },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query('plugin::audit-logs.audit-log').count({ where }),
    ]);

    ctx.body = {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
        sort: sortStr,
        filters: { contentType: q.contentType, userId: q.userId, action: q.action, start: q.start, end: q.end },
      },
    };
  },
};


