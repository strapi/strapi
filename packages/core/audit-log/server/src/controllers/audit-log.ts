import { Core } from '@strapi/types';

// Audit Log Controller - Handles API requests for audit logs with advanced filtering, pagination, and sorting
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('plugin::audit-log.audit-log', ({ strapi }: { strapi: Core.Strapi }) => ({
  // Enhanced find method with advanced filtering
  async find(ctx: any) {
    try {
      const sanitizedQuery = validateAndSanitizeQuery(ctx.query);
      const filters = buildFilters(sanitizedQuery);
      const pagination = buildPagination(sanitizedQuery);
      const sort = buildSort(sanitizedQuery);
      
      const populate = {
        user: {
          fields: ['id', 'username', 'email', 'firstname', 'lastname']
        }
      };

      const totalCount = await strapi.entityService.count('plugin::audit-log.audit-log', {
        filters
      });

      const results = await strapi.entityService.findMany('plugin::audit-log.audit-log', {
        filters,
        sort,
        populate,
        pagination
      });

      const pageCount = Math.ceil(totalCount / pagination.pageSize);
      const hasNextPage = pagination.page < pageCount;
      const hasPrevPage = pagination.page > 1;

      return {
        data: results,
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount,
            total: totalCount,
            hasNextPage,
            hasPrevPage
          },
          filters: {
            contentType: sanitizedQuery.contentType || null,
            userId: sanitizedQuery.userId || null,
            action: sanitizedQuery.action || null,
            startDate: sanitizedQuery.startDate || null,
            endDate: sanitizedQuery.endDate || null,
            recordId: sanitizedQuery.recordId || null,
            requestId: sanitizedQuery.requestId || null,
            ipAddress: sanitizedQuery.ipAddress || null,
            userAgent: sanitizedQuery.userAgent || null
          },
          sort: sort
        }
      };
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ctx.badRequest('Invalid query parameters', { error: error.message });
      }
      return ctx.badRequest('Failed to fetch audit logs', { error: error.message });
    }
  },

  // Get audit logs for a specific record
  async getRecordLogs(ctx: any) {
    const { contentType, recordId } = ctx.params;
    const { page = 1, pageSize = 25, sort = 'timestamp:desc' } = ctx.query;

    try {
      const logs = await strapi.service('plugin::audit-log.audit-log').getRecordAuditLogs(
        contentType,
        recordId,
        { page, pageSize, sort }
      );

      return logs;
    } catch (error: any) {
      return ctx.badRequest('Failed to fetch record audit logs', { error: error.message });
    }
  },

  // Get audit logs for a content type
  async getContentTypeLogs(ctx: any) {
    const { contentType } = ctx.params;
    const { page = 1, pageSize = 25, sort = 'timestamp:desc', action } = ctx.query;

    try {
      const logs = await strapi.service('plugin::audit-log.audit-log').getContentTypeAuditLogs(
        contentType,
        { page, pageSize, sort, action }
      );

      return logs;
    } catch (error: any) {
      return ctx.badRequest('Failed to fetch content type audit logs', { error: error.message });
    }
  },

  // Get audit logs for a user
  async getUserLogs(ctx: any) {
    const { userId } = ctx.params;
    const { page = 1, pageSize = 25, sort = 'timestamp:desc' } = ctx.query;

    try {
      const logs = await strapi.service('plugin::audit-log.audit-log').getUserAuditLogs(
        userId,
        { page, pageSize, sort }
      );

      return logs;
    } catch (error: any) {
      return ctx.badRequest('Failed to fetch user audit logs', { error: error.message });
    }
  },

  // Get audit statistics
  async getStats(ctx: any) {
    const { startDate, endDate, contentType, action, userId } = ctx.query;

    try {
      const stats = await strapi.service('plugin::audit-log.audit-log').getAuditStats({
        startDate,
        endDate,
        contentType,
        action,
        userId
      });

      return stats;
    } catch (error: any) {
      return ctx.badRequest('Failed to fetch audit statistics', { error: error.message });
    }
  },

  // Cleanup old audit logs
  async cleanup(ctx: any) {
    const { daysToKeep = 90 } = ctx.request.body;

    try {
      const deletedCount = await strapi.service('plugin::audit-log.audit-log').cleanupOldLogs(daysToKeep);
      
      return {
        message: `Successfully cleaned up ${deletedCount} old audit log entries`,
        deletedCount
      };
    } catch (error: any) {
      return ctx.badRequest('Failed to cleanup audit logs', { error: error.message });
    }
  }
}));

// Helper functions for query validation and processing
function validateAndSanitizeQuery(query: any) {
  const sanitized: any = {};

  // Validate and sanitize pagination
  sanitized.page = Math.max(1, parseInt(query.page) || 1);
  sanitized.pageSize = Math.min(
    Math.max(1, parseInt(query.pageSize) || 25),
    100
  );

  // Validate and sanitize sorting
  if (query.sort) {
    const sortFields = Array.isArray(query.sort) ? query.sort : [query.sort];
    sanitized.sort = sortFields
      .map((field: string) => {
        const [fieldName, direction = 'desc'] = field.split(':');
        return `${fieldName}:${direction}`;
      })
      .slice(0, 3);
  } else {
    sanitized.sort = ['timestamp:desc'];
  }

  // Validate other parameters
  if (query.contentType) sanitized.contentType = query.contentType.trim();
  if (query.userId) sanitized.userId = parseInt(query.userId);
  if (query.action) sanitized.action = query.action;
  if (query.startDate) sanitized.startDate = new Date(query.startDate).toISOString();
  if (query.endDate) sanitized.endDate = new Date(query.endDate).toISOString();
  if (query.recordId) sanitized.recordId = query.recordId.trim();
  if (query.requestId) sanitized.requestId = query.requestId.trim();
  if (query.ipAddress) sanitized.ipAddress = query.ipAddress.trim();
  if (query.userAgent) sanitized.userAgent = query.userAgent.trim();

  return sanitized;
}

function buildFilters(sanitizedQuery: any) {
  const filters: any = {};

  if (sanitizedQuery.contentType) filters.contentType = sanitizedQuery.contentType;
  if (sanitizedQuery.userId) filters.user = sanitizedQuery.userId;
  if (sanitizedQuery.action) filters.action = sanitizedQuery.action;
  if (sanitizedQuery.recordId) filters.recordId = sanitizedQuery.recordId;
  if (sanitizedQuery.requestId) filters.requestId = sanitizedQuery.requestId;
  if (sanitizedQuery.ipAddress) filters.ipAddress = sanitizedQuery.ipAddress;
  if (sanitizedQuery.userAgent) filters.userAgent = { $containsi: sanitizedQuery.userAgent };

  if (sanitizedQuery.startDate || sanitizedQuery.endDate) {
    filters.timestamp = {};
    if (sanitizedQuery.startDate) filters.timestamp.$gte = new Date(sanitizedQuery.startDate);
    if (sanitizedQuery.endDate) filters.timestamp.$lte = new Date(sanitizedQuery.endDate);
  }

  return filters;
}

function buildPagination(sanitizedQuery: any) {
  const page = sanitizedQuery.page;
  const pageSize = sanitizedQuery.pageSize;
  const start = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    start,
    limit: pageSize
  };
}

function buildSort(sanitizedQuery: any) {
  return sanitizedQuery.sort;
}
