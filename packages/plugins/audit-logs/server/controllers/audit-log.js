'use strict';

module.exports = ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx;
    
    // Build filters
    const filters = {};
    
    if (query.content_type) {
      filters.content_type = query.content_type;
    }
    
    if (query.user_id) {
      filters.user_id = parseInt(query.user_id);
    }
    
    if (query.action) {
      filters.action = query.action;
    }
    
    // Date range filter
    if (query.start_date || query.end_date) {
      filters.created_at = {};
      if (query.start_date) {
        filters.created_at.$gte = new Date(query.start_date);
      }
      if (query.end_date) {
        filters.created_at.$lte = new Date(query.end_date);
      }
    }

    // Pagination
    const page = parseInt(query.page) || 1;
    const pageSize = Math.min(parseInt(query.pageSize) || 25, 100);

    // Sorting
    const sort = query.sort || 'created_at:desc';

    const sanitizedQuery = {
      filters,
      pagination: {
        page,
        pageSize,
      },
      sort,
    };

    const { results, pagination } = await strapi
      .plugin('audit-logs')
      .service('audit-log')
      .find(sanitizedQuery);
    
    return { data: results, meta: { pagination } };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    
    const data = await strapi
      .plugin('audit-logs')
      .service('audit-log')
      .findOne(id);

    return { data };
  }
});
