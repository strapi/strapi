'use strict';

/**
 * audit-log controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::audit-log.audit-log', ({ strapi }) => ({
  /**
   * Get audit logs with filtering and pagination
   * GET /api/audit-logs
   */
  async find(ctx) {
    try {
      console.log('Custom audit-log controller find method called!');
      console.log('Query params:', ctx.query);
      
      const {
        contentType,
        userId,
        action,
        startDate,
        endDate,
        page = 1,
        pageSize = 25,
        sort = 'timestamp:desc',
      } = ctx.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page));
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));

      // Validate sort parameter
      const allowedSortFields = ['timestamp', 'contentType', 'action', 'userId'];
      const sortField = sort.split(':')[0];
      const sortOrder = sort.split(':')[1] || 'desc';
      
      if (!allowedSortFields.includes(sortField)) {
        return ctx.badRequest('Invalid sort field. Allowed fields: ' + allowedSortFields.join(', '));
      }

      const validSortOrders = ['asc', 'desc'];
      if (!validSortOrders.includes(sortOrder)) {
        return ctx.badRequest('Invalid sort order. Allowed orders: asc, desc');
      }

      // Validate date parameters
      if (startDate && isNaN(Date.parse(startDate))) {
        return ctx.badRequest('Invalid startDate format. Use ISO 8601 format.');
      }
      
      if (endDate && isNaN(Date.parse(endDate))) {
        return ctx.badRequest('Invalid endDate format. Use ISO 8601 format.');
      }

      // Validate action parameter
      if (action && !['create', 'update', 'delete'].includes(action)) {
        return ctx.badRequest('Invalid action. Allowed actions: create, update, delete');
      }

      // Build filters
      const filters = {};
      
      if (contentType) {
        filters.contentType = contentType;
      }
      
      if (userId) {
        filters.userId = userId;
      }
      
      if (action) {
        filters.action = action;
      }
      
      if (startDate || endDate) {
        filters.timestamp = {};
        if (startDate) {
          filters.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          filters.timestamp.$lte = new Date(endDate);
        }
      }

      // Use findPage for proper pagination
      const { results: auditLogs, pagination } = await strapi.entityService.findPage('api::audit-log.audit-log', {
        filters,
        sort: [sort],
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
        },
      });

      const response = {
        data: auditLogs,
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: pagination.pageCount,
            total: pagination.total,
          },
          filters: {
            contentType,
            userId,
            action,
            startDate,
            endDate,
          },
          sort: {
            field: sortField,
            order: sortOrder,
          },
        },
      };

      return ctx.send(response);
    } catch (error) {
      strapi.log.error('Error retrieving audit logs:', error);
      return ctx.internalServerError('Failed to retrieve audit logs');
    }
  },

  /**
   * Get single audit log by ID
   * GET /api/audit-logs/:id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest('Audit log ID is required');
      }

      const auditLog = await strapi.entityService.findOne('api::audit-log.audit-log', id);

      if (!auditLog) {
        return ctx.notFound('Audit log not found');
      }

      return ctx.send({ data: auditLog });
    } catch (error) {
      strapi.log.error('Error retrieving audit log:', error);
      return ctx.internalServerError('Failed to retrieve audit log');
    }
  },

  /**
   * Get audit log statistics
   * GET /api/audit-logs/stats
   */
  async getStats(ctx) {
    try {
      const { startDate, endDate } = ctx.query;

      // Build date filters
      const filters = {};
      if (startDate || endDate) {
        filters.timestamp = {};
        if (startDate) {
          filters.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          filters.timestamp.$lte = new Date(endDate);
        }
      }

      // Get total count
      const totalCount = await strapi.entityService.count('api::audit-log.audit-log', {
        filters,
      });

      // Get counts by action
      const actionCounts = await Promise.all([
        strapi.entityService.count('api::audit-log.audit-log', {
          filters: { ...filters, action: 'create' },
        }),
        strapi.entityService.count('api::audit-log.audit-log', {
          filters: { ...filters, action: 'update' },
        }),
        strapi.entityService.count('api::audit-log.audit-log', {
          filters: { ...filters, action: 'delete' },
        }),
      ]);

      const response = {
        data: {
          total: totalCount,
          byAction: {
            create: actionCounts[0],
            update: actionCounts[1],
            delete: actionCounts[2],
          },
          period: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
      };

      return ctx.send(response);
    } catch (error) {
      strapi.log.error('Error retrieving audit log statistics:', error);
      return ctx.internalServerError('Failed to retrieve audit log statistics');
    }
  },
}));
