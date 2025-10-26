'use strict';

const { getService, handleControllerError } = require('../utils');
const { validatePagination, validateSort, validateFilters, validateId } = require('../utils/validation');

/**
 * Audit Log Controller
 * Handles HTTP requests for audit log endpoints
 */
module.exports = {
  /**
   * Find audit logs with filters, pagination, and sorting
   * GET /audit-logs
   */
  async find(ctx) {
    try {
      const { query } = ctx;

      // Validate and parse query parameters
      const filters = validateFilters(query);
      const pagination = validatePagination(query);
      const sort = validateSort(query);

      // Get data from service
      const auditLogService = getService('audit-log');
      const data = await auditLogService.find(filters, pagination, sort);

      ctx.body = {
        data: data.results,
        meta: {
          pagination: data.pagination,
        },
      };
    } catch (error) {
      return handleControllerError(ctx, error, 'find audit logs', strapi);
    }
  },

  /**
   * Find a single audit log entry by ID
   * GET /audit-logs/:id
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;

      // Validate ID parameter
      validateId(id);

      const auditLogService = getService('audit-log');
      const entry = await auditLogService.findOne(id);

      if (!entry) {
        return ctx.notFound('Audit log entry not found');
      }

      ctx.body = {
        data: entry,
      };
    } catch (error) {
      return handleControllerError(ctx, error, 'find audit log entry', strapi);
    }
  },

  /**
   * Get audit log statistics
   * GET /audit-logs/statistics
   */
  async getStatistics(ctx) {
    try {
      const { query } = ctx;

      // Validate filters
      const filters = validateFilters(query);

      const auditLogService = getService('audit-log');
      const stats = await auditLogService.getStatistics(filters);

      ctx.body = {
        data: stats,
      };
    } catch (error) {
      return handleControllerError(ctx, error, 'get statistics', strapi);
    }
  },
};
