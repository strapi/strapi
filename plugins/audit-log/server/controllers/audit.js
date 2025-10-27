'use strict';

module.exports = ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx.request;
    const {
      _start = 0,
      _limit = 25,
      _sort = 'timestamp:desc',
      contentType,
      userId,
      action,
      dateFrom,
      dateTo,
      q
    } = query;

    const filters = {};
    if (contentType) filters.contentType = contentType;
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (dateFrom || dateTo) {
      filters.timestamp = {};
      if (dateFrom) filters.timestamp.$gte = new Date(dateFrom).toISOString();
      if (dateTo) filters.timestamp.$lte = new Date(dateTo).toISOString();
    }

    const findParams = {
      filters,
      sort: [_sort],
      start: parseInt(_start, 10) || 0,
      limit: parseInt(_limit, 10) || 25
    };

    if (q) {
      findParams.filters.$or = [
        { diff: { $contains: q } },
        { meta: { $contains: q } }
      ];
    }

    const results = await strapi.entityService.findMany('plugin::audit-log.audit-log', findParams);
    const total = await strapi.entityService.count('plugin::audit-log.audit-log', { filters: findParams.filters });

    ctx.body = {
      data: results,
      meta: {
        pagination: {
          start: findParams.start,
          limit: findParams.limit,
          total
        }
      }
    };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const entity = await strapi.entityService.findOne('plugin::audit-log.audit-log', id);
    if (!entity) return ctx.notFound();
    ctx.body = { data: entity };
  }
});
