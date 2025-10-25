import type { Core } from '@strapi/types';
import { sanitizeData, calculateDiff } from '../utils';

const auditLogsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create an audit log entry
   */
  async create(data: {
    contentType: string;
    recordId: string;
    action: string;
    userId?: number | null;
    userName?: string | null;
    userEmail?: string | null;
    changedFields?: string[];
    previousData?: any;
    newData?: any;
    payload?: any;
  }) {
    try {
      const auditLog = await strapi.documents('plugin::audit-logs.audit-log').create({
        data: {
          contentType: data.contentType,
          recordId: String(data.recordId),
          action: data.action,
          userId: data.userId || null,
          userName: data.userName || null,
          userEmail: data.userEmail || null,
          changedFields: data.changedFields || null,
          previousData: data.previousData ? sanitizeData(data.previousData) : null,
          newData: data.newData ? sanitizeData(data.newData) : null,
          payload: data.payload ? sanitizeData(data.payload) : null,
          timestamp: new Date(),
        },
      });

      return auditLog;
    } catch (error) {
      strapi.log.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  },

  /**
   * Find audit logs with filtering and pagination
   */
  async find(params: {
    contentType?: string;
    userId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
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
      sort = 'timestamp:desc',
    } = params;

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
      where.timestamp = {};
      if (startDate) {
        where.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.$lte = new Date(endDate);
      }
    }

    const [field, order] = sort.split(':');

    try {
      const results = await strapi.documents('plugin::audit-logs.audit-log').findMany({
        filters: where,
        sort: { [field]: order },
        start: (page - 1) * pageSize,
        limit: pageSize,
      });

      const total = await strapi.db.query('plugin::audit-logs.audit-log').count({
        where,
      });

      return {
        results,
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    } catch (error) {
      strapi.log.error('Failed to fetch audit logs:', error);
      throw error;
    }
  },

  /**
   * Get a single audit log by ID
   */
  async findOne(id: string) {
    try {
      return await strapi.documents('plugin::audit-logs.audit-log').findOne({
        documentId: id,
      });
    } catch (error) {
      strapi.log.error('Failed to fetch audit log:', error);
      throw error;
    }
  },

  /**
   * Log a create action
   */
  async logCreate(contentType: string, recordId: string, data: any, userInfo: any) {
    return this.create({
      contentType,
      recordId,
      action: 'create',
      userId: userInfo.userId,
      userName: userInfo.userName,
      userEmail: userInfo.userEmail,
      newData: data,
      payload: data,
    });
  },

  /**
   * Log an update action
   */
  async logUpdate(
    contentType: string,
    recordId: string,
    previousData: any,
    newData: any,
    userInfo: any
  ) {
    const changedFields = calculateDiff(previousData, newData);

    return this.create({
      contentType,
      recordId,
      action: 'update',
      userId: userInfo.userId,
      userName: userInfo.userName,
      userEmail: userInfo.userEmail,
      changedFields,
      previousData,
      newData,
    });
  },

  /**
   * Log a delete action
   */
  async logDelete(contentType: string, recordId: string, data: any, userInfo: any) {
    return this.create({
      contentType,
      recordId,
      action: 'delete',
      userId: userInfo.userId,
      userName: userInfo.userName,
      userEmail: userInfo.userEmail,
      previousData: data,
    });
  },

  /**
   * Log a publish action
   */
  async logPublish(contentType: string, recordId: string, data: any, userInfo: any) {
    return this.create({
      contentType,
      recordId,
      action: 'publish',
      userId: userInfo.userId,
      userName: userInfo.userName,
      userEmail: userInfo.userEmail,
      newData: data,
    });
  },

  /**
   * Log an unpublish action
   */
  async logUnpublish(contentType: string, recordId: string, data: any, userInfo: any) {
    return this.create({
      contentType,
      recordId,
      action: 'unpublish',
      userId: userInfo.userId,
      userName: userInfo.userName,
      userEmail: userInfo.userEmail,
      previousData: data,
    });
  },

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanup(retentionDays: number) {
    if (!retentionDays || retentionDays <= 0) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const oldLogs = await strapi.db.query('plugin::audit-logs.audit-log').findMany({
        where: {
          timestamp: {
            $lt: cutoffDate,
          },
        },
        select: ['id'],
      });

      for (const log of oldLogs) {
        await strapi.documents('plugin::audit-logs.audit-log').delete({
          documentId: log.id,
        });
      }

      strapi.log.info(`Cleaned up ${oldLogs.length} old audit logs`);
    } catch (error) {
      strapi.log.error('Failed to cleanup audit logs:', error);
    }
  },
});

export default auditLogsService;

