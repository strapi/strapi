const auditLogController = ({ strapi }) => ({
  async find(ctx) {
    try {
      // Check permissions
      await strapi
        .plugin('audit-logs')
        .service('audit')
        .checkPermissions(ctx, 'read_audit_logs');

      const { query } = ctx;
      
      // Extract filters from query parameters
      const filters = {
        contentType: query.filters?.contentType || query.contentType,
        userId: query.filters?.userId || query.userId,
        action: query.filters?.action || query.action,
        contentId: query.filters?.contentId || query.contentId,
        dateRange: this.parseDateRange(query),
      };

      // Extract pagination parameters
      const pagination = {
        page: parseInt(query.pagination?.page || query.page) || 1,
        pageSize: Math.min(parseInt(query.pagination?.pageSize || query.pageSize) || 25, 100),
      };

      // Extract sorting parameters
      const sort = {
        field: query.sort?.field || query.sortBy || 'timestamp',
        order: query.sort?.order || query.sortOrder || 'desc',
      };

      // Remove undefined/null values from filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null) {
          delete filters[key];
        }
      });

      const auditService = strapi.plugin('audit-logs').service('audit');
      const result = await auditService.getLogs(filters, pagination, sort);

      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Error in audit logs controller (find):', error);
      
      if (error.status) {
        return ctx.throw(error.status, error.message);
      }
      
      return ctx.throw(500, 'Internal server error');
    }
  },

  async findOne(ctx) {
    try {
      // Check permissions
      await strapi
        .plugin('audit-logs')
        .service('audit')
        .checkPermissions(ctx, 'read_audit_logs');

      const { id } = ctx.params;

      if (!id) {
        return ctx.throw(400, 'ID parameter is required');
      }

      const auditService = strapi.plugin('audit-logs').service('audit');
      const log = await auditService.getLogById(id);

      if (!log) {
        return ctx.throw(404, 'Audit log not found');
      }

      return ctx.send(log);
    } catch (error) {
      strapi.log.error('Error in audit logs controller (findOne):', error);
      
      if (error.status) {
        return ctx.throw(error.status, error.message);
      }
      
      return ctx.throw(500, 'Internal server error');
    }
  },

  async getStatistics(ctx) {
    try {
      // Check permissions
      await strapi
        .plugin('audit-logs')
        .service('audit')
        .checkPermissions(ctx, 'read_audit_logs');

      const auditService = strapi.plugin('audit-logs').service('audit');
      const stats = await auditService.getStatistics();

      return ctx.send(stats);
    } catch (error) {
      strapi.log.error('Error in audit logs controller (getStatistics):', error);
      
      if (error.status) {
        return ctx.throw(error.status, error.message);
      }
      
      return ctx.throw(500, 'Internal server error');
    }
  },

  parseDateRange(query) {
    const dateFrom = query.filters?.dateFrom || query.dateFrom;
    const dateTo = query.filters?.dateTo || query.dateTo;

    if (!dateFrom && !dateTo) {
      return null;
    }

    const range: { start?: Date; end?: Date } = {};

    if (dateFrom) {
      const startDate = new Date(dateFrom);
      if (!isNaN(startDate.getTime())) {
        range.start = startDate;
      }
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      if (!isNaN(endDate.getTime())) {
        // Set to end of day if only date is provided
        endDate.setHours(23, 59, 59, 999);
        range.end = endDate;
      }
    }

    return Object.keys(range).length > 0 ? range : null;
  },
});

export default auditLogController;