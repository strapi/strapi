export interface AuditLogData {
  contentType: string;
  contentId: number;
  action: 'create' | 'update' | 'delete';
  userId?: number;
  userEmail?: string;
  changedFields?: Record<string, any>;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

const auditService = ({ strapi }: { strapi: any }) => ({
  async createLog(data: AuditLogData) {
    try {
      // Check if audit logging is enabled
      const config = strapi.config.get('plugin::audit-logs', {});
      if (config.enabled === false) {
        return;
      }

      // Check if this action type is enabled
      const enabledActions = config.enabledActions || ['create', 'update', 'delete'];
      if (!enabledActions.includes(data.action)) {
        return;
      }

      // Check if this content type should be excluded
      const excludeContentTypes = config.excludeContentTypes || [];
      if (excludeContentTypes.includes(data.contentType)) {
        return;
      }

      // Prepare the audit log entry
      const auditLogEntry = {
        ...data,
        timestamp: new Date(),
      };

      // Create the audit log entry
      await strapi.db.query('plugin::audit-logs.audit-log').create({
        data: auditLogEntry,
      });

      if (config.logLevel === 'debug') {
        strapi.log.debug(`Audit log created for ${data.action} on ${data.contentType}:${data.contentId}`);
      }
    } catch (error) {
      strapi.log.error('Failed to create audit log:', error);
    }
  },

  async getLogs(filters = {}, pagination = {}, sort = {}) {
    try {
      const { where, limit, offset } = this.buildQuery(filters, pagination, sort);

      const [logs, total] = await Promise.all([
        strapi.db.query('plugin::audit-logs.audit-log').findMany({
          where,
          limit,
          offset,
          orderBy: sort,
        }),
        strapi.db.query('plugin::audit-logs.audit-log').count({ where }),
      ]);

      return {
        data: logs,
        meta: {
          pagination: {
            page: Math.floor(offset / limit) + 1,
            pageSize: limit,
            pageCount: Math.ceil(total / limit),
            total,
          },
        },
      };
    } catch (error) {
      strapi.log.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  },

  buildQuery(filters: Record<string, any>, pagination: Record<string, any>, sort: Record<string, any>) {
    const where: Record<string, any> = {};

    // Apply filters
    if (filters.contentType) {
      where.contentType = filters.contentType;
    }

    if (filters.userId) {
      where.userId = parseInt(filters.userId);
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      where.timestamp = {};
      if (start) {
        where.timestamp.$gte = new Date(start);
      }
      if (end) {
        where.timestamp.$lte = new Date(end);
      }
    }

    if (filters.contentId) {
      where.contentId = parseInt(filters.contentId);
    }

    // Apply pagination
    const limit = parseInt(pagination.pageSize) || 25;
    const page = parseInt(pagination.page) || 1;
    const offset = (page - 1) * limit;

    // Apply sorting
    const orderBy = [];
    if (sort.field) {
      const direction = sort.order === 'desc' ? 'desc' : 'asc';
      orderBy.push({ [sort.field]: direction });
    } else {
      // Default sort by timestamp descending
      orderBy.push({ timestamp: 'desc' });
    }

    return { where, limit, offset, orderBy };
  },

  async getLogById(id: string) {
    try {
      const log = await strapi.db.query('plugin::audit-logs.audit-log').findOne({
        where: { id: parseInt(id) },
      });

      return log;
    } catch (error) {
      strapi.log.error('Failed to retrieve audit log by ID:', error);
      throw error;
    }
  },

  // Helper method to extract user information from context
  extractUserInfo(ctx: any) {
    const user = ctx?.state?.user;
    if (!user) {
      return { userId: null, userEmail: null };
    }

    return {
      userId: user.id || null,
      userEmail: user.email || null,
    };
  },

  // Helper method to extract request metadata
  extractRequestMetadata(ctx: any) {
    return {
      ipAddress: this.getClientIP(ctx),
      userAgent: ctx?.headers?.['user-agent'] || null,
    };
  },

  getClientIP(ctx: any) {
    return (
      ctx?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      ctx?.headers?.['x-real-ip'] ||
      ctx?.connection?.remoteAddress ||
      ctx?.socket?.remoteAddress ||
      (ctx?.connection?.socket ? ctx.connection.socket.remoteAddress : null) ||
      null
    );
  },

  // Method to calculate changed fields between old and new data
  calculateChangedFields(oldData: Record<string, any>, newData: Record<string, any>) {
    const changedFields: Record<string, any> = {};

    // Get all unique keys from both objects
    const allKeys = Array.from(new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]));

    for (const key of allKeys) {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      // Skip system fields that shouldn't be tracked
      if (['id', 'createdAt', 'updatedAt', 'publishedAt'].indexOf(key) !== -1) {
        continue;
      }

      // Compare values (deep comparison for objects/arrays)
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    return Object.keys(changedFields).length > 0 ? changedFields : null;
  },

  // Check if user has required permissions
  async checkPermissions(ctx: any, action: string) {
    const { userAbility } = ctx.state;
    
    if (!userAbility) {
      throw { status: 401, message: 'Unauthorized' };
    }

    const canAccess = userAbility.can(action, {
      name: 'plugin::audit-logs.audit-log',
    });

    if (!canAccess) {
      throw { status: 403, message: 'Forbidden - insufficient permissions' };
    }

    return true;
  },

  // Cleanup old audit logs based on retention policy
  async cleanupOldLogs() {
    try {
      const config = strapi.config.get('plugin::audit-logs', {});
      const retentionDays = config.retentionDays;

      if (!retentionDays || !Number.isInteger(retentionDays) || retentionDays <= 0) {
        // No retention policy configured
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await strapi.db.query('plugin::audit-logs.audit-log').deleteMany({
        where: {
          timestamp: {
            $lt: cutoffDate,
          },
        },
      });

      if (config.logLevel === 'debug') {
        strapi.log.debug(`Cleaned up ${result.count} old audit logs older than ${retentionDays} days`);
      }

      return result;
    } catch (error) {
      strapi.log.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  },

  // Get statistics about audit logs
  async getStatistics() {
    try {
      const [totalLogs, actionStats, recentActivity] = await Promise.all([
        // Total count
        strapi.db.query('plugin::audit-logs.audit-log').count(),
        
        // Count by action type
        strapi.db.query('plugin::audit-logs.audit-log').groupBy(['action']),
        
        // Recent activity (last 24 hours)
        strapi.db.query('plugin::audit-logs.audit-log').count({
          where: {
            timestamp: {
              $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        totalLogs,
        actionStats,
        recentActivity,
        retentionPolicy: strapi.config.get('plugin::audit-logs.retentionDays'),
      };
    } catch (error) {
      strapi.log.error('Failed to get audit log statistics:', error);
      throw error;
    }
  },
});

export default auditService;