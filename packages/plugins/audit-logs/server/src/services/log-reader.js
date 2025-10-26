'use strict';

const { CONTENT_TYPE_UID } = require('../constants');
const { createLogger } = require('../utils');

/**
 * Log Reader Service
 * Queries audit log entries with filters, pagination, and sorting
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  return {
  /**
   * Find many audit log entries with filters, pagination, and sorting
   * @param {object} filters - Query filters
   * @param {object} pagination - Pagination options
   * @param {object} sort - Sorting options
   * @returns {Promise<object>} Results with pagination metadata
   */
  async findMany(filters = {}, pagination = {}, sort = {}) {
    try {
      // Build where clause
      const where = this.buildWhereClause(filters);

      // Extract pagination params
      const page = Math.max(1, pagination.page || 1);
      const pageSize = Math.min(100, Math.max(1, pagination.pageSize || 25));

      // Extract sort params
      const sortField = sort.field || 'timestamp';
      const sortOrder = sort.order || 'desc';

      // Execute query with pagination
      const results = await strapi.db.query(CONTENT_TYPE_UID).findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });

      // Get total count
      const total = await strapi.db.query(CONTENT_TYPE_UID).count({ where });

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
      logger.error('Failed to query audit logs', error);
      throw error;
    }
  },

  /**
   * Find a single audit log entry by ID
   * @param {string} id - The audit log entry ID
   * @returns {Promise<object|null>} The audit log entry or null if not found
   */
  async findOne(id) {
    try {
      return await strapi.db.query(CONTENT_TYPE_UID).findOne({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to find audit log entry', error);
      throw error;
    }
  },

  /**
   * Build where clause from filters
   * @param {object} filters - Query filters
   * @returns {object} Where clause
   */
  buildWhereClause(filters) {
    const where = {};

    // Filter by content type
    if (filters.contentType) {
      where.contentType = filters.contentType;
    }

    // Filter by record ID
    if (filters.recordId) {
      where.recordId = filters.recordId;
    }

    // Filter by user ID
    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Filter by action
    if (filters.action) {
      where.action = filters.action;
    }

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};

      if (filters.dateFrom) {
        where.timestamp.$gte = new Date(filters.dateFrom);
      }

      if (filters.dateTo) {
        where.timestamp.$lte = new Date(filters.dateTo);
      }
    }

    return where;
  },

  /**
   * Get audit log statistics
   * @param {object} filters - Query filters
   * @returns {Promise<object>} Statistics
   */
  async getStatistics(filters = {}) {
    try {
      const where = this.buildWhereClause(filters);

      // Build WHERE clause for SQL
      const whereConditions = [];
      const bindings = [];

      if (where.contentType) {
        whereConditions.push('content_type = ?');
        bindings.push(where.contentType);
      }
      if (where.recordId) {
        whereConditions.push('record_id = ?');
        bindings.push(where.recordId);
      }
      if (where.userId) {
        whereConditions.push('user_id = ?');
        bindings.push(where.userId);
      }
      if (where.action) {
        whereConditions.push('action = ?');
        bindings.push(where.action);
      }
      if (where.timestamp?.$gte) {
        whereConditions.push('timestamp >= ?');
        bindings.push(where.timestamp.$gte);
      }
      if (where.timestamp?.$lte) {
        whereConditions.push('timestamp <= ?');
        bindings.push(where.timestamp.$lte);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Use a single query with GROUP BY for better performance
      const results = await strapi.db.connection.raw(
        `SELECT action, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY action`,
        bindings
      );

      // Parse results based on database type
      let rows = results;
      if (results.rows) {
        rows = results.rows; // PostgreSQL
      } else if (Array.isArray(results[0])) {
        rows = results[0]; // MySQL
      }

      // Initialize counts
      const byAction = {
        create: 0,
        update: 0,
        delete: 0,
      };

      let total = 0;

      // Populate counts from query results
      rows.forEach((row) => {
        const action = row.action;
        const count = parseInt(row.count, 10);
        if (byAction[action] !== undefined) {
          byAction[action] = count;
        }
        total += count;
      });

      return {
        total,
        byAction,
      };
    } catch (error) {
      logger.error('Failed to get statistics', error);
      throw error;
    }
  },
  };
};
