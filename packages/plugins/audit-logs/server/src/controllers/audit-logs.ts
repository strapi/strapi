import type { Core } from '@strapi/types';
import { getService } from '../utils';

const controller: Core.Controller = {
  /**
   * Get audit logs with filtering, pagination, and sorting
   * GET /audit-logs/audit-logs
   */
  async find(ctx) {
    console.log('🔍 [Audit Logs] find() controller called');
    console.log('🔍 [Audit Logs] ctx.query:', ctx.query);
    console.log('🔍 [Audit Logs] ctx.state.user:', ctx.state.user);
    
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

      // Ensure query params are strings
      const getString = (val: any): string | undefined => {
        return Array.isArray(val) ? val[0] : val;
      };

      const auditLogsService = getService('audit-logs');
      const result = await auditLogsService.find({
        contentType: getString(contentType),
        userId: userId ? parseInt(getString(userId) || '0', 10) : undefined,
        action: getString(action),
        startDate: getString(startDate),
        endDate: getString(endDate),
        page: page ? parseInt(getString(page) || '1', 10) : undefined,
        pageSize: pageSize ? parseInt(getString(pageSize) || '25', 10) : undefined,
        sort: getString(sort),
      });

      ctx.type = 'application/json';
      ctx.body = {
        data: result.results,
        meta: {
          pagination: result.pagination,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ctx.type = 'application/json';
      ctx.throw(500, `Failed to fetch audit logs: ${message}`);
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
        ctx.type = 'application/json';
        return ctx.notFound('Audit log not found');
      }

      ctx.type = 'application/json';
      ctx.body = {
        data: auditLog,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      ctx.type = 'application/json';
      ctx.throw(500, `Failed to fetch audit log: ${message}`);
    }
  },

  /**
   * Get audit log statistics
   * GET /audit-logs/audit-logs/stats
   */
  async stats(ctx) {
    try {
      const { startDate, endDate } = ctx.query;

      // Ensure query params are strings
      const getString = (val: any): string | undefined => {
        return Array.isArray(val) ? val[0] : val;
      };

      const startDateStr = getString(startDate);
      const endDateStr = getString(endDate);

      const where: any = {};
      if (startDateStr || endDateStr) {
        where.timestamp = {};
        if (startDateStr) {
          where.timestamp.$gte = new Date(startDateStr);
        }
        if (endDateStr) {
          where.timestamp.$lte = new Date(endDateStr);
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

      ctx.type = 'application/json';
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      ctx.type = 'application/json';
      ctx.throw(500, `Failed to fetch audit log statistics: ${message}`);
    }
  },
};

export default controller;

