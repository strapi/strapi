import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

interface AuditLogEntry {
  contentType: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  userId?: number;
  payload?: any;
  changedFields?: any;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

interface AuditLogFilters {
  contentType?: string;
  userId?: number;
  action?: string | string[];
  startDate?: string;
  endDate?: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
}

interface AuditLogQuery extends AuditLogFilters, PaginationParams {}

const createAuditLogService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create a new audit log entry
   */
  async createAuditEntry(entry: AuditLogEntry) {
    try {
      // Validate required fields
      if (!entry.contentType || !entry.recordId || !entry.action) {
        throw new ValidationError('Missing required fields: contentType, recordId, or action');
      }

      // Validate action type
      if (!['create', 'update', 'delete'].includes(entry.action)) {
        throw new ValidationError('Invalid action type. Must be create, update, or delete');
      }

      // Set timestamp if not provided
      if (!entry.timestamp) {
        entry.timestamp = new Date();
      }

      const auditLogEntry = await strapi.db
        .query('plugin::audit-logging.audit-log')
        .create({
          data: {
            contentType: entry.contentType,
            recordId: entry.recordId,
            action: entry.action,
            userId: entry.userId || null,
            payload: entry.payload || null,
            changedFields: entry.changedFields || null,
            timestamp: entry.timestamp,
            userAgent: entry.userAgent || null,
            ipAddress: entry.ipAddress || null,
          },
        });

      strapi.log.debug('Audit log entry created', {
        id: auditLogEntry.id,
        contentType: entry.contentType,
        recordId: entry.recordId,
        action: entry.action,
      });

      return auditLogEntry;
    } catch (error) {
      strapi.log.error('Failed to create audit log entry', {
        error: error.message,
        contentType: entry.contentType,
        recordId: entry.recordId,
        action: entry.action,
      });
      throw error;
    }
  },

  /**
   * Find audit logs with filtering and pagination
   */
  async findAuditLogs(query: AuditLogQuery = {}) {
    try {
      const {
        contentType,
        userId,
        action,
        startDate,
        endDate,
        page = 1,
        pageSize = 25,
        sort = 'timestamp:desc',
      } = query;

      // Validate pagination parameters
      const validatedPage = Math.max(1, page);
      const validatedPageSize = Math.min(Math.max(1, pageSize), 100); // Max 100 items per page

      // Build where clause
      const where: any = {};

      if (contentType) {
        where.contentType = contentType;
      }

      if (userId !== undefined) {
        where.userId = userId;
      }

      if (action) {
        if (Array.isArray(action)) {
          where.action = { $in: action };
        } else {
          where.action = action;
        }
      }

      // Date range filtering
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          where.timestamp.$lte = new Date(endDate);
        }
      }

      // Parse sort parameter
      const [sortField, sortOrder] = sort.split(':');
      const orderBy = {
        [sortField || 'timestamp']: sortOrder === 'asc' ? 'asc' : 'desc',
      };

      // Execute query with pagination
      const { results, pagination } = await strapi.db
        .query('plugin::audit-logging.audit-log')
        .findWithCount({
          where,
          orderBy,
          offset: (validatedPage - 1) * validatedPageSize,
          limit: validatedPageSize,
        });

      return {
        data: results,
        meta: {
          pagination: {
            page: validatedPage,
            pageSize: validatedPageSize,
            pageCount: Math.ceil(pagination.total / validatedPageSize),
            total: pagination.total,
          },
        },
      };
    } catch (error) {
      strapi.log.error('Failed to find audit logs', {
        error: error.message,
        query,
      });
      throw error;
    }
  },

  /**
   * Check if audit logging is enabled for a specific content type
   */
  isLoggingEnabled(contentType: string): boolean {
    try {
      const config = strapi.config.get('plugin::audit-logging', {});
      const auditLogConfig = config.auditLog || {};

      // Check if audit logging is globally disabled
      if (auditLogConfig.enabled === false) {
        return false;
      }

      // Check if content type is in the exclude list
      const excludeContentTypes = auditLogConfig.excludeContentTypes || [];
      if (excludeContentTypes.includes(contentType)) {
        return false;
      }

      return true;
    } catch (error) {
      strapi.log.error('Failed to check audit logging configuration', {
        error: error.message,
        contentType,
      });
      // Default to enabled if configuration check fails
      return true;
    }
  },

  /**
   * Get audit log statistics
   */
  async getAuditLogStats() {
    try {
      const totalLogs = await strapi.db
        .query('plugin::audit-logging.audit-log')
        .count();

      const actionStats = await strapi.db.connection.raw(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        GROUP BY action
      `);

      const recentActivity = await strapi.db
        .query('plugin::audit-logging.audit-log')
        .findMany({
          orderBy: { timestamp: 'desc' },
          limit: 10,
        });

      return {
        totalLogs,
        actionStats: actionStats.rows || actionStats,
        recentActivity,
      };
    } catch (error) {
      strapi.log.error('Failed to get audit log statistics', {
        error: error.message,
      });
      throw error;
    }
  },
});

export default createAuditLogService;