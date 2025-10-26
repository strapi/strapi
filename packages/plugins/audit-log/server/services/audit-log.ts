import type { Core } from '@strapi/strapi';

interface AuditLogEvent {
  model: string;
  entry: any;
  result?: any;
  state?: any;
  params?: any;
}

interface PluginConfig {
  enabled: boolean;
  excludeContentTypes: string[];
  storeFullPayload: boolean;
  retentionDays: number;
  asyncLogging: boolean;
  captureRequestMetadata: boolean;
}

const auditLogService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get plugin configuration
   */
  getConfig(): PluginConfig {
    return strapi.config.get('plugin::audit-log', {
      enabled: true,
      excludeContentTypes: [],
      storeFullPayload: true,
      retentionDays: 90,
      asyncLogging: true,
      captureRequestMetadata: true,
    });
  },

  /**
   * Check if logging is enabled for a content type
   */
  isLoggingEnabled(contentType: string): boolean {
    const config = this.getConfig();
    
    if (!config.enabled) {
      return false;
    }

    // Don't log audit logs themselves (prevent recursion)
    if (contentType === 'plugin::audit-log.audit-log') {
      return false;
    }

    // Check exclusion list
    if (config.excludeContentTypes.includes(contentType)) {
      return false;
    }

    return true;
  },

  /**
   * Calculate diff between old and new data
   */
  calculateDiff(oldData: any, newData: any): Record<string, any> {
    const changes: Record<string, any> = {};

    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
      // Skip internal Strapi fields
      if (['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy'].includes(key)) {
        continue;
      }

      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      // Deep comparison for objects and arrays
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old: oldValue,
          new: newValue,
        };
      }
    }

    return changes;
  },

  /**
   * Get user context from request
   */
  getUserContext(ctx?: any): { userId?: number; username?: string } {
    const user = ctx?.state?.user;
    
    if (!user) {
      return {};
    }

    return {
      userId: user.id,
      username: user.email || user.username || `User ${user.id}`,
    };
  },

  /**
   * Get request metadata
   */
  getRequestMetadata(ctx?: any): { ipAddress?: string; userAgent?: string } {
    const config = this.getConfig();

    if (!config.captureRequestMetadata || !ctx) {
      return {};
    }

    return {
      ipAddress: ctx.request.ip || ctx.request.socket?.remoteAddress,
      userAgent: ctx.request.headers?.['user-agent'],
    };
  },

  /**
   * Create an audit log entry
   */
  async createAuditLog(data: {
    contentType: string;
    recordId: string;
    action: 'create' | 'update' | 'delete';
    payload?: any;
    changedFields?: any;
    ctx?: any;
  }): Promise<void> {
    try {
      const { contentType, recordId, action, payload, changedFields, ctx } = data;

      if (!this.isLoggingEnabled(contentType)) {
        return;
      }

      const userContext = this.getUserContext(ctx);
      const requestMetadata = this.getRequestMetadata(ctx);

      const auditLogData = {
        contentType,
        recordId: String(recordId),
        action,
        ...userContext,
        ...requestMetadata,
        payload: payload || null,
        changedFields: changedFields || null,
        metadata: {
          timestamp: new Date().toISOString(),
          apiVersion: strapi.config.get('info.strapi'),
        },
      };

      // Create the audit log entry
      await strapi.documents('plugin::audit-log.audit-log').create({
        data: auditLogData,
      });

      strapi.log.debug(`Audit log created: ${action} on ${contentType}:${recordId}`);
    } catch (error) {
      // Don't throw errors - audit logging should not break the application
      strapi.log.error('Failed to create audit log:', error);
    }
  },

  /**
   * Log a CREATE operation
   */
  async logCreate(event: AuditLogEvent, ctx?: any): Promise<void> {
    const config = this.getConfig();
    const { model, result } = event;

    const logOperation = async () => {
      await this.createAuditLog({
        contentType: model,
        recordId: result?.documentId || result?.id,
        action: 'create',
        payload: config.storeFullPayload ? result : { id: result?.id },
        ctx,
      });
    };

    if (config.asyncLogging) {
      // Fire and forget
      logOperation().catch((err) => strapi.log.error('Async audit log failed:', err));
    } else {
      await logOperation();
    }
  },

  /**
   * Log an UPDATE operation
   */
  async logUpdate(event: AuditLogEvent, ctx?: any): Promise<void> {
    const config = this.getConfig();
    const { model, params, result } = event;

    const logOperation = async () => {
      // Get the old data before the update
      const oldData = params?.data || {};
      const newData = result || {};

      const changedFields = this.calculateDiff(oldData, newData);

      // Only log if there are actual changes
      if (Object.keys(changedFields).length === 0) {
        return;
      }

      await this.createAuditLog({
        contentType: model,
        recordId: result?.documentId || result?.id || params?.where?.id,
        action: 'update',
        changedFields,
        ctx,
      });
    };

    if (config.asyncLogging) {
      logOperation().catch((err) => strapi.log.error('Async audit log failed:', err));
    } else {
      await logOperation();
    }
  },

  /**
   * Log a DELETE operation
   */
  async logDelete(event: AuditLogEvent, ctx?: any): Promise<void> {
    const config = this.getConfig();
    const { model, result, params } = event;

    const logOperation = async () => {
      await this.createAuditLog({
        contentType: model,
        recordId: result?.documentId || result?.id || params?.where?.id,
        action: 'delete',
        payload: config.storeFullPayload ? result : { id: result?.id },
        ctx,
      });
    };

    if (config.asyncLogging) {
      logOperation().catch((err) => strapi.log.error('Async audit log failed:', err));
    } else {
      await logOperation();
    }
  },

  /**
   * Query audit logs with filters
   */
  async findMany(filters: {
    contentType?: string;
    userId?: number;
    action?: 'create' | 'update' | 'delete';
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
    sort?: string;
  }) {
    const {
      contentType,
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      pageSize = 25,
      sort = 'createdAt:desc',
    } = filters;

    const where: any = {};

    if (contentType) {
      where.contentType = contentType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.$gte = startDate;
      }
      if (endDate) {
        where.createdAt.$lte = endDate;
      }
    }

    // Limit page size to prevent abuse
    const limitedPageSize = Math.min(pageSize, 100);

    const result = await strapi.documents('plugin::audit-log.audit-log').findMany({
      filters: where,
      sort,
      limit: limitedPageSize,
      start: (page - 1) * limitedPageSize,
    });

    const total = await strapi.documents('plugin::audit-log.audit-log').count({
      filters: where,
    });

    return {
      data: result,
      meta: {
        pagination: {
          page,
          pageSize: limitedPageSize,
          pageCount: Math.ceil(total / limitedPageSize),
          total,
        },
      },
    };
  },

  /**
   * Find a single audit log by ID
   */
  async findOne(id: string | number) {
    return strapi.documents('plugin::audit-log.audit-log').findOne({
      documentId: String(id),
    });
  },

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanup(): Promise<number> {
    const config = this.getConfig();
    const { retentionDays } = config;

    if (!retentionDays || retentionDays <= 0) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldLogs = await strapi.documents('plugin::audit-log.audit-log').findMany({
      filters: {
        createdAt: {
          $lt: cutoffDate,
        },
      },
    });

    for (const log of oldLogs) {
      await strapi.documents('plugin::audit-log.audit-log').delete({
        documentId: log.documentId,
      });
    }

    strapi.log.info(`Cleaned up ${oldLogs.length} audit logs older than ${retentionDays} days`);

    return oldLogs.length;
  },
});

export default auditLogService;
export type AuditLogService = typeof auditLogService;

