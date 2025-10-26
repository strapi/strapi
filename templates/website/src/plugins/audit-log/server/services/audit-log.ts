import type { Core } from '@strapi/strapi';
import type { AuditLogEntry, AuditLogQuery } from '../types/audit-log.d.ts';
import _default from '../config/default.js';

const CONFIG_KEY = 'plugin.audit-log';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find audit logs with filters and pagination
   */
  async findWithFilters(query: AuditLogQuery) {
    const {
      page = 1,
      pageSize = 10,
      contentType,
      user,
      action,
      startDate,
      endDate,
    } = query;

    const filters: any = {};
    if (contentType) filters.contentType = contentType;
    if (user) filters.user = user;
    if (action) filters.action = action;
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const [entries, total] = await Promise.all([
      strapi.db.query('plugin::audit-log.audit-log').findMany({
        where: filters,
        orderBy: { timestamp: 'DESC' },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query('plugin::audit-log.audit-log').count({ where: filters }),
    ]);

    return {
      entries,
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },

  /**
   * Create a new audit log entry for a content change
   */
  async createLog(params: {
    contentType: string;
    recordId: string | number;
    action: 'create' | 'update' | 'delete';
    userId?: number;
    diff?: Record<string, any>;
  }) {
    const { contentType, recordId, action, userId, diff } = params;
    const config = strapi.config.get(CONFIG_KEY, _default);

    // Skip logging if disabled or excluded
    if (!config.auditLog.enabled) return;
    if (config.auditLog.excludeContentTypes?.includes(contentType)) return;

    const entry: AuditLogEntry = {
      contentType,
      recordId: recordId.toString(),
      action,
      timestamp: new Date(),
      diff: diff || {},
    };

    if (userId) {
      entry.user = userId;
    }

    try {
      await strapi.db.query('plugin::audit-log.audit-log').create({
        data: entry,
      });
    } catch (error) {
      strapi.log.error('Failed to create audit log:', error);
    }
  },
});
