import type { Core } from '@strapi/strapi';

const auditLogController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /api/audit-logs
   * List audit logs with filtering, pagination, and sorting
   */
  async find(ctx) {
    try {
      const {
        contentType,
        userId,
        action,
        startDate,
        endDate,
        page,
        pageSize,
        sort,
      } = ctx.query;

      // Parse dates if provided
      const filters: any = {
        contentType,
        userId: userId ? parseInt(userId, 10) : undefined,
        action,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 25,
        sort: sort || 'createdAt:desc',
      };

      const result = await strapi
        .plugin('audit-log')
        .service('auditLog')
        .findMany(filters);

      ctx.body = result;
    } catch (error) {
      strapi.log.error('Error fetching audit logs:', error);
      ctx.throw(500, 'Failed to fetch audit logs');
    }
  },

  /**
   * GET /api/audit-logs/:id
   * Get a specific audit log entry
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;

      const auditLog = await strapi
        .plugin('audit-log')
        .service('auditLog')
        .findOne(id);

      if (!auditLog) {
        return ctx.notFound('Audit log not found');
      }

      ctx.body = { data: auditLog };
    } catch (error) {
      strapi.log.error('Error fetching audit log:', error);
      ctx.throw(500, 'Failed to fetch audit log');
    }
  },

  /**
   * POST /api/audit-logs/cleanup
   * Manually trigger cleanup of old audit logs
   */
  async cleanup(ctx) {
    try {
      const deletedCount = await strapi
        .plugin('audit-log')
        .service('auditLog')
        .cleanup();

      ctx.body = {
        message: 'Cleanup completed successfully',
        deletedCount,
      };
    } catch (error) {
      strapi.log.error('Error during cleanup:', error);
      ctx.throw(500, 'Failed to cleanup audit logs');
    }
  },

  /**
   * GET /api/audit-logs/stats
   * Get statistics about audit logs
   */
  async stats(ctx) {
    try {
      const { contentType, startDate, endDate } = ctx.query;

      const filters: any = {};

      if (contentType) {
        filters.contentType = contentType;
      }

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate);
        }
      }

      // Get total count
      const total = await strapi.documents('plugin::audit-log.audit-log').count({
        filters,
      });

      // Get counts by action
      const createCount = await strapi.documents('plugin::audit-log.audit-log').count({
        filters: { ...filters, action: 'create' },
      });

      const updateCount = await strapi.documents('plugin::audit-log.audit-log').count({
        filters: { ...filters, action: 'update' },
      });

      const deleteCount = await strapi.documents('plugin::audit-log.audit-log').count({
        filters: { ...filters, action: 'delete' },
      });

      // Get most active content types
      const allLogs = await strapi.documents('plugin::audit-log.audit-log').findMany({
        filters,
        limit: 1000, // Limit for performance
      });

      const contentTypeStats: Record<string, number> = {};
      allLogs.forEach((log: any) => {
        contentTypeStats[log.contentType] = (contentTypeStats[log.contentType] || 0) + 1;
      });

      const topContentTypes = Object.entries(contentTypeStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([contentType, count]) => ({ contentType, count }));

      ctx.body = {
        data: {
          total,
          byAction: {
            create: createCount,
            update: updateCount,
            delete: deleteCount,
          },
          topContentTypes,
        },
      };
    } catch (error) {
      strapi.log.error('Error fetching audit log stats:', error);
      ctx.throw(500, 'Failed to fetch audit log statistics');
    }
  },
});

export default auditLogController;

