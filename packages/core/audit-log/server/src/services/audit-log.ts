import { Core } from '@strapi/types';

// Audit Log Service - Handles automatic audit logging for Content API operations
const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('plugin::audit-log.audit-log', ({ strapi }: { strapi: Core.Strapi }) => ({
  // Log an audit entry for Content API operations
  async logContentApiOperation({
    contentType,
    recordId,
    action,
    user = null,
    changedFields = [],
    fullPayload = null,
    previousData = null,
    ipAddress = null,
    userAgent = null,
    requestId = null,
    metadata = {}
  }: {
    contentType: string;
    recordId: string;
    action: string;
    user?: any;
    changedFields?: string[];
    fullPayload?: any;
    previousData?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: any;
  }) {
    try {
      // Check if audit logging is enabled
      const isEnabled = strapi.config.get('auditLog.enabled', true);
      if (!isEnabled) {
        return null;
      }

      // Get excluded content types
      const excludedTypes = strapi.config.get('auditLog.excludeContentTypes', ['audit-log']);
      if (excludedTypes.includes(contentType)) {
        return null;
      }

      // Get current user from context if not provided
      let currentUser = user;
      if (!currentUser && strapi.requestContext && (strapi.requestContext as any).get('state')?.user) {
        currentUser = (strapi.requestContext as any).get('state').user;
      }

      let currentIpAddress = ipAddress;
      let currentUserAgent = userAgent;
      let currentRequestId = requestId;

      if (strapi.requestContext && (strapi.requestContext as any).get('request')) {
        const request = (strapi.requestContext as any).get('request');
        currentIpAddress = currentIpAddress || request.ip || request.connection?.remoteAddress;
        currentUserAgent = currentUserAgent || request.get('user-agent');
        currentRequestId = currentRequestId || request.get('x-request-id') || request.id;
      }

      const auditData = {
        contentType,
        recordId: String(recordId),
        action,
        timestamp: new Date(),
        user: currentUser?.id || null,
        changedFields,
        fullPayload,
        previousData,
        ipAddress: currentIpAddress,
        userAgent: currentUserAgent,
        requestId: currentRequestId,
        metadata: {
          ...metadata,
          version: '1.0',
          source: 'content-api'
        }
      };

      const auditEntry = await strapi.entityService.create('plugin::audit-log.audit-log', {
        data: auditData
      });

      return auditEntry;
    } catch (error: any) {
      strapi.log.error('Failed to create audit log entry:', error);
      return null;
    }
  },

  // Get audit logs for a specific record
  async getRecordAuditLogs(contentType: string, recordId: string, options: any = {}) {
    const { page = 1, pageSize = 25, sort = 'timestamp:desc' } = options;

    return await strapi.entityService.findMany('plugin::audit-log.audit-log', {
      filters: {
        contentType,
        recordId: String(recordId)
      },
      sort: [sort],
      pagination: {
        page,
        pageSize
      },
      populate: {
        user: {
          fields: ['id', 'username', 'email']
        }
      }
    });
  },

  // Get audit logs for a content type
  async getContentTypeAuditLogs(contentType: string, options: any = {}) {
    const { page = 1, pageSize = 25, sort = 'timestamp:desc', action } = options;

    const filters: any = { contentType };
    if (action) {
      filters.action = action;
    }

    return await strapi.entityService.findMany('plugin::audit-log.audit-log', {
      filters,
      sort: [sort],
      pagination: {
        page,
        pageSize
      },
      populate: {
        user: {
          fields: ['id', 'username', 'email']
        }
      }
    });
  },

  // Get audit logs for a user
  async getUserAuditLogs(userId: number, options: any = {}) {
    const { page = 1, pageSize = 25, sort = 'timestamp:desc' } = options;

    return await strapi.entityService.findMany('plugin::audit-log.audit-log', {
      filters: {
        user: userId
      },
      sort: [sort],
      pagination: {
        page,
        pageSize
      },
      populate: {
        user: {
          fields: ['id', 'username', 'email']
        }
      }
    });
  },

  // Get audit statistics
  async getAuditStats(filters: any = {}) {
    const { startDate, endDate, contentType, action, userId } = filters;

    const queryFilters: any = {};
    
    if (startDate || endDate) {
      queryFilters.timestamp = {};
      if (startDate) queryFilters.timestamp.$gte = new Date(startDate);
      if (endDate) queryFilters.timestamp.$lte = new Date(endDate);
    }
    
    if (contentType) queryFilters.contentType = contentType;
    if (action) queryFilters.action = action;
    if (userId) queryFilters.user = userId;

    const totalCount = await strapi.entityService.count('plugin::audit-log.audit-log', {
      filters: queryFilters
    });

    const actionStats = await strapi.db.query('plugin::audit-log.audit-log').findMany({
      where: queryFilters,
      select: ['action'],
      groupBy: ['action'],
      _count: true
    });

    const contentTypeStats = await strapi.db.query('plugin::audit-log.audit-log').findMany({
      where: queryFilters,
      select: ['contentType'],
      groupBy: ['contentType'],
      _count: true
    });

    return {
      totalCount,
      actionStats,
      contentTypeStats,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    };
  },

  // Clean up old audit logs
  async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await strapi.db.query('plugin::audit-log.audit-log').deleteMany({
      where: {
        timestamp: {
          $lt: cutoffDate
        }
      }
    });

    strapi.log.info(`Cleaned up ${deletedCount} old audit log entries`);
    return deletedCount;
  }
}));
