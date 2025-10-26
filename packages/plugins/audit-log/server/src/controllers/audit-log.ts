import type { Core } from '@strapi/types';

const controller: Core.Controller = {
  async find(ctx: any) {
    strapi.log.info('[audit-log] Controller find() called');
    strapi.log.info('[audit-log] User:', ctx.state.user ? `ID: ${ctx.state.user.id}, Email: ${ctx.state.user.email}` : 'Not authenticated');
    strapi.log.info('[audit-log] Query params:', JSON.stringify(ctx.query));
    
    const { contentType, userId, action, dateFrom, dateTo, page = 1, pageSize = 25, sort = 'timestamp:desc' } = ctx.query;

    const filters: any = {};
    if (contentType) filters.contentType = { $eq: contentType };
    if (userId) filters.userId = { $eq: Number(userId) };
    if (action) filters.action = { $eq: action };
    if (dateFrom || dateTo) {
      filters.timestamp = {};
      if (dateFrom) filters.timestamp.$gte = new Date(dateFrom as string);
      if (dateTo) filters.timestamp.$lte = new Date(dateTo as string);
    }

    ctx.body = await strapi.plugin('audit-log').service('audit-log').find({
      filters,
      pagination: { page: Number(page), pageSize: Number(pageSize) },
      sort,
    });
    
    strapi.log.info('[audit-log] Response:', `Returning ${ctx.body?.results?.length || 0} results`);
  },
};

export default controller;
