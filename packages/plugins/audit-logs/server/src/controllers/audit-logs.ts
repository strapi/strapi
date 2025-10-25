import type { Core } from '@strapi/types';
import { getService } from '../utils';

const controller: Core.Controller = {
  /**
   * Get audit logs with filtering, pagination, and sorting
   * GET /audit-logs/audit-logs
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

      const auditLogsService = getService('audit-logs');
      const result = await auditLogsService.find({
        contentType,
        userId: userId ? parseInt(userId, 10) : undefined,
        action,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        sort,
      });

      ctx.body = {
        data: result.results,
        meta: {
          pagination: result.pagination,
        },
      };
    } catch (error) {
      ctx.throw(500, `Failed to fetch audit logs: ${error.message}`);
    }
  },

  /**
   * Get a single audit log by ID
   * GET /audit-logs/audit-logs/:id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const auditLogsService = getService('audit-logs');
      const auditLog = await auditLogsService.findOne(id);

      if (!auditLog) {
        return ctx.notFound('Audit log not found');
      }

      ctx.body = {
        data: auditLog,
      };
    } catch (error) {
      ctx.throw(500, `Failed to fetch audit log: ${error.message}`);
    }
  },

  /**
   * Get audit log statistics
   * GET /audit-logs/audit-logs/stats
   */
  async stats(ctx) {
    try {
      const { startDate, endDate } = ctx.query;

      const where: any = {};
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          where.timestamp.$lte = new Date(endDate);
        }
      }

      // Get total count
      const totalCount = await strapi.db.query('plugin::audit-logs.audit-log').count({ where });

      // Get count by action
      const actionCounts = await strapi.db.connection
        .select('action')
        .count('* as count')
        .from('audit_logs')
        .where(builder => {
          if (where.timestamp) {
            if (where.timestamp.$gte) {
              builder.where('timestamp', '>=', where.timestamp.$gte);
            }
            if (where.timestamp.$lte) {
              builder.where('timestamp', '<=', where.timestamp.$lte);
            }
          }
        })
        .groupBy('action');

      // Get count by content type
      const contentTypeCounts = await strapi.db.connection
        .select('content_type')
        .count('* as count')
        .from('audit_logs')
        .where(builder => {
          if (where.timestamp) {
            if (where.timestamp.$gte) {
              builder.where('timestamp', '>=', where.timestamp.$gte);
            }
            if (where.timestamp.$lte) {
              builder.where('timestamp', '<=', where.timestamp.$lte);
            }
          }
        })
        .groupBy('content_type')
        .orderBy('count', 'desc')
        .limit(10);

      ctx.body = {
        data: {
          total: totalCount,
          byAction: actionCounts.reduce((acc, item) => {
            acc[item.action] = parseInt(item.count, 10);
            return acc;
          }, {}),
          byContentType: contentTypeCounts.reduce((acc, item) => {
            acc[item.content_type] = parseInt(item.count, 10);
            return acc;
          }, {}),
        },
      };
    } catch (error) {
      ctx.throw(500, `Failed to fetch audit log statistics: ${error.message}`);
    }
  },
};

export default controller;

