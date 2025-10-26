'use strict';

module.exports = {
  async find(ctx) {
    const { query } = ctx;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const rolesToAllow = ['authenticated', 'superuser'];
    const userRoleName = user.role?.name?.toLowerCase() || '';

    if (!rolesToAllow.includes(userRoleName)) {
      return ctx.forbidden('You do not have permission to read audit logs');
    }

    const filters = {};
    if (query.contentType) filters['contentType'] = query.contentType;
    if (query.action) filters['action'] = query.action;
    if (query.startDate || query.endDate) {
      filters['timestamp'] = {};
      if (query.startDate)
        filters['timestamp']['$gte'] = new Date(query.startDate).toISOString();
      if (query.endDate)
        filters['timestamp']['$lte'] = new Date(query.endDate).toISOString();
    }

    const page = parseInt(query.page, 10) || 1;
    const pageSize = Math.min(parseInt(query.pageSize, 10) || 25, 100);
    const start = (page - 1) * pageSize;
    const sort = query.sort || 'timestamp:desc';

    // 👇 Typecast to bypass TypeScript validation safely
    const params = {
      filters,
      sort,
      start,
      limit: pageSize,
    };

    const results = await strapi.entityService.findMany(
      'api::audit-log.audit-log',
      params
    );

    const count = await strapi.entityService.count('api::audit-log.audit-log', {
      filters,
    });

    ctx.body = {
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(count / pageSize),
          total: count,
        },
      },
      data: results,
    };
  },
};
